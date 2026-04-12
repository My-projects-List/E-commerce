package com.ecommerce.order.controller;

import com.ecommerce.common.dto.ApiResponse;
import com.ecommerce.common.dto.PageResponse;
import com.ecommerce.order.dto.CheckoutRequest;
import com.ecommerce.order.dto.OrderDto;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /** POST /api/checkout — place a new order */
    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<OrderDto>> checkout(
            @RequestHeader("X-User-Id")    String userId,
            @RequestHeader("X-User-Email") String userEmail,
            @Valid @RequestBody CheckoutRequest request) {
        OrderDto order = orderService.checkout(userId, userEmail, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Order placed successfully", order));
    }

    /** GET /api/orders/{orderId} */
    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<OrderDto>> getOrder(
            @PathVariable String orderId,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(ApiResponse.success(
                orderService.getOrder(orderId, userId)));
    }

    /** GET /api/users/orders — order history */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OrderDto>>> getUserOrders(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                orderService.getUserOrders(userId, page, size)));
    }

    /** PUT /api/orders/cancel/{orderId} */
    @PutMapping("/cancel/{orderId}")
    public ResponseEntity<ApiResponse<OrderDto>> cancelOrder(
            @PathVariable String orderId,
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(defaultValue = "Cancelled by customer") String reason) {
        return ResponseEntity.ok(ApiResponse.success(
                orderService.cancelOrder(orderId, userId, reason)));
    }

    /** Admin: advance order to next status */
    @PutMapping("/{orderId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrderDto>> updateStatus(
            @PathVariable String orderId,
            @RequestParam Order.OrderStatus status,
            @RequestParam(required = false) String trackingNumber) {
        return ResponseEntity.ok(ApiResponse.success(
                orderService.updateStatus(orderId, status, trackingNumber)));
    }
}
