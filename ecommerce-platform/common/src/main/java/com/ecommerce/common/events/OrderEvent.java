package com.ecommerce.common.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Kafka event published when an order's status changes.
 * Consumed by: notification-service, recommendation-service.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderEvent {

    private String eventId;
    private String orderId;
    private String userId;
    private String userEmail;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private LocalDateTime occurredAt;

    public enum OrderStatus {
        CREATED,
        CONFIRMED,
        PAYMENT_FAILED,
        PROCESSING,
        SHIPPED,
        DELIVERED,
        CANCELLED,
        REFUNDED
    }
}
