package com.ecommerce.order.service.impl;

import com.ecommerce.common.dto.PageResponse;
import com.ecommerce.common.events.OrderEvent;
import com.ecommerce.common.exception.EcommerceException;
import com.ecommerce.common.exception.ResourceNotFoundException;
import com.ecommerce.common.kafka.KafkaTopics;
import com.ecommerce.order.client.CartServiceClient;
import com.ecommerce.order.client.ProductServiceClient;
import com.ecommerce.order.client.UserServiceClient;
import com.ecommerce.order.dto.CheckoutRequest;
import com.ecommerce.order.dto.OrderDto;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.OrderItem;
import com.ecommerce.order.repository.OrderRepository;
import com.ecommerce.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private static final BigDecimal FLAT_SHIPPING_COST = new BigDecimal("5.99");

    private final OrderRepository orderRepository;
    private final ProductServiceClient productClient;
    private final CartServiceClient cartClient;
    private final UserServiceClient userClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Override
    @Transactional
    public OrderDto checkout(String userId, String userEmail, CheckoutRequest request) {

        // Idempotency check — same key returns the existing order
        var existing = orderRepository.findByIdempotencyKey(request.getIdempotencyKey());
        if (existing.isPresent()) {
            log.info("Idempotent checkout, returning existing order: {}", existing.get().getOrderId());
            return mapToDto(existing.get());
        }

        // Fetch shipping address from user service
        var address = userClient.getAddress(userId, request.getShippingAddressId());

        // Build order items (validate stock + prices in parallel in production)
        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (var itemReq : request.getItems()) {
            var product = productClient.getProduct(itemReq.getProductId());
            if (product == null) {
                throw new ResourceNotFoundException("Product", "productId", itemReq.getProductId());
            }

            // Reserve inventory atomically
            productClient.reserveInventory(itemReq.getProductId(), itemReq.getQuantity());

            OrderItem item = OrderItem.builder()
                    .productId(product.productId())
                    .productName(product.name())
                    .imageUrl(product.imageUrl())
                    .unitPrice(product.price())
                    .quantity(itemReq.getQuantity())
                    .sku(product.sku())
                    .build();
            orderItems.add(item);
            subtotal = subtotal.add(product.price().multiply(BigDecimal.valueOf(itemReq.getQuantity())));
        }

        BigDecimal totalPrice = subtotal.add(FLAT_SHIPPING_COST);

        Order order = Order.builder()
                .userId(userId)
                .userEmail(userEmail)
                .status(Order.OrderStatus.CREATED)
                .subtotal(subtotal)
                .shippingCost(FLAT_SHIPPING_COST)
                .discountAmount(BigDecimal.ZERO)
                .totalPrice(totalPrice)
                .shippingFullName(address.fullName())
                .shippingStreet(address.street())
                .shippingCity(address.city())
                .shippingState(address.state())
                .shippingZip(address.zipCode())
                .shippingCountry(address.country())
                .idempotencyKey(request.getIdempotencyKey())
                .couponCode(request.getCouponCode())
                .build();

        orderItems.forEach(item -> item.setOrder(order));
        order.setItems(orderItems);

        Order saved = orderRepository.save(order);

        // Clear user's cart after successful order creation
        cartClient.clearCart(userId);

        // Publish ORDER_CREATED event — payment-service listens and initiates charge
        publishOrderEvent(saved, OrderEvent.OrderStatus.CREATED);

        log.info("Order created: {} for user: {}", saved.getOrderId(), userId);
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderDto getOrder(String orderId, String userId) {
        Order order = orderRepository.findByOrderIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "orderId", orderId));
        return mapToDto(order);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderDto> getUserOrders(String userId, int page, int size) {
        Page<Order> orderPage = orderRepository.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(page, size));
        return PageResponse.of(
                orderPage.getContent().stream().map(this::mapToDto).collect(Collectors.toList()),
                page, size, orderPage.getTotalElements());
    }

    @Override
    @Transactional
    public OrderDto cancelOrder(String orderId, String userId, String reason) {
        Order order = orderRepository.findByOrderIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "orderId", orderId));

        if (!isCancellable(order.getStatus())) {
            throw new EcommerceException(
                "Order cannot be cancelled in status: " + order.getStatus(),
                HttpStatus.BAD_REQUEST, "ORDER_NOT_CANCELLABLE");
        }

        // Release inventory back
        order.getItems().forEach(item ->
                productClient.releaseInventory(item.getProductId(), item.getQuantity()));

        order.setStatus(Order.OrderStatus.CANCELLED);
        order.setCancelledReason(reason);
        orderRepository.save(order);

        publishOrderEvent(order, OrderEvent.OrderStatus.CANCELLED);
        log.info("Order cancelled: {}", orderId);
        return mapToDto(order);
    }

    @Override
    @Transactional
    public void handlePaymentSuccess(String orderId, String paymentId) {
        Order order = findById(orderId);
        order.setStatus(Order.OrderStatus.CONFIRMED);
        order.setPaymentId(paymentId);
        orderRepository.save(order);
        publishOrderEvent(order, OrderEvent.OrderStatus.CONFIRMED);
        log.info("Payment confirmed for order: {}", orderId);
    }

    @Override
    @Transactional
    public void handlePaymentFailure(String orderId, String reason) {
        Order order = findById(orderId);
        // Release reserved inventory on payment failure
        order.getItems().forEach(item ->
                productClient.releaseInventory(item.getProductId(), item.getQuantity()));

        order.setStatus(Order.OrderStatus.PAYMENT_FAILED);
        order.setCancelledReason(reason);
        orderRepository.save(order);
        publishOrderEvent(order, OrderEvent.OrderStatus.PAYMENT_FAILED);
        log.warn("Payment failed for order: {} — {}", orderId, reason);
    }

    @Override
    @Transactional
    public OrderDto updateStatus(String orderId, Order.OrderStatus newStatus, String trackingNumber) {
        Order order = findById(orderId);
        order.setStatus(newStatus);
        if (trackingNumber != null) order.setTrackingNumber(trackingNumber);
        if (newStatus == Order.OrderStatus.DELIVERED) order.setDeliveredAt(LocalDateTime.now());
        orderRepository.save(order);
        publishOrderEvent(order, OrderEvent.OrderStatus.valueOf(newStatus.name()));
        return mapToDto(order);
    }

    // ---- Helpers ----

    private Order findById(String orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "orderId", orderId));
    }

    private boolean isCancellable(Order.OrderStatus status) {
        return status == Order.OrderStatus.CREATED || status == Order.OrderStatus.CONFIRMED;
    }

    private void publishOrderEvent(Order order, OrderEvent.OrderStatus eventStatus) {
        kafkaTemplate.send(KafkaTopics.ORDER_STATUS_UPDATED,
                OrderEvent.builder()
                        .eventId(UUID.randomUUID().toString())
                        .orderId(order.getOrderId())
                        .userId(order.getUserId())
                        .userEmail(order.getUserEmail())
                        .status(eventStatus)
                        .totalAmount(order.getTotalPrice())
                        .occurredAt(LocalDateTime.now())
                        .build());
    }

    private OrderDto mapToDto(Order o) {
        return OrderDto.builder()
                .orderId(o.getOrderId())
                .userId(o.getUserId())
                .status(o.getStatus())
                .subtotal(o.getSubtotal())
                .shippingCost(o.getShippingCost())
                .discountAmount(o.getDiscountAmount())
                .totalPrice(o.getTotalPrice())
                .currency(o.getCurrency())
                .shippingFullName(o.getShippingFullName())
                .shippingStreet(o.getShippingStreet())
                .shippingCity(o.getShippingCity())
                .shippingState(o.getShippingState())
                .shippingZip(o.getShippingZip())
                .shippingCountry(o.getShippingCountry())
                .trackingNumber(o.getTrackingNumber())
                .paymentId(o.getPaymentId())
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .deliveredAt(o.getDeliveredAt())
                .items(o.getItems().stream().map(i -> OrderDto.OrderItemDto.builder()
                        .productId(i.getProductId())
                        .productName(i.getProductName())
                        .imageUrl(i.getImageUrl())
                        .unitPrice(i.getUnitPrice())
                        .quantity(i.getQuantity())
                        .lineTotal(i.getLineTotal())
                        .build()).collect(Collectors.toList()))
                .build();
    }
}
