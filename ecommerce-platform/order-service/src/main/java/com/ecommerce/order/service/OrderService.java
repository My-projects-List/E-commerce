package com.ecommerce.order.service;

import com.ecommerce.common.dto.PageResponse;
import com.ecommerce.order.dto.CheckoutRequest;
import com.ecommerce.order.dto.OrderDto;
import com.ecommerce.order.entity.Order;

public interface OrderService {

    OrderDto checkout(String userId, String userEmail, CheckoutRequest request);

    OrderDto getOrder(String orderId, String userId);

    PageResponse<OrderDto> getUserOrders(String userId, int page, int size);

    OrderDto cancelOrder(String orderId, String userId, String reason);

    /** Called by payment-service via Kafka on payment success/failure */
    void handlePaymentSuccess(String orderId, String paymentId);
    void handlePaymentFailure(String orderId, String reason);

    /** Called by logistics/admin to advance order status */
    OrderDto updateStatus(String orderId, Order.OrderStatus newStatus, String trackingNumber);
}
