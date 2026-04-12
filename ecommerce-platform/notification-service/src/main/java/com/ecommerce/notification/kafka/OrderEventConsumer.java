package com.ecommerce.notification.kafka;

import com.ecommerce.common.events.OrderEvent;
import com.ecommerce.common.kafka.KafkaTopics;
import com.ecommerce.notification.service.EmailNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

/**
 * Listens to all order status change events and dispatches
 * the appropriate email notifications to the customer.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventConsumer {

    private final EmailNotificationService emailService;

    @KafkaListener(
        topics = KafkaTopics.ORDER_STATUS_UPDATED,
        groupId = "notification-service-orders",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void onOrderStatusChanged(OrderEvent event, Acknowledgment ack) {
        try {
            log.info("Processing order event: orderId={}, status={}", event.getOrderId(), event.getStatus());

            // Only send emails for meaningful status changes
            if (shouldNotify(event.getStatus())) {
                emailService.sendOrderStatusEmail(
                        event.getUserEmail(),
                        event.getOrderId(),
                        event.getStatus(),
                        "Customer"   // in production, fetch name from user-service or embed in event
                );
            }

            ack.acknowledge();
        } catch (Exception e) {
            log.error("Error processing order event for orderId {}: {}",
                    event.getOrderId(), e.getMessage());
            // Do NOT ack — will be redelivered
        }
    }

    private boolean shouldNotify(OrderEvent.OrderStatus status) {
        return switch (status) {
            case CONFIRMED, SHIPPED, DELIVERED, CANCELLED, PAYMENT_FAILED, REFUNDED -> true;
            default -> false;
        };
    }
}
