package com.ecommerce.order.kafka;

import com.ecommerce.common.events.PaymentEvent;
import com.ecommerce.common.kafka.KafkaTopics;
import com.ecommerce.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

/**
 * Consumes payment events from payment-service and updates order status accordingly.
 * Uses manual acknowledgement to guarantee at-least-once processing.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventConsumer {

    private final OrderService orderService;

    @KafkaListener(
        topics = KafkaTopics.PAYMENT_SUCCESS,
        groupId = "order-service-payment",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void onPaymentSuccess(PaymentEvent event, Acknowledgment ack) {
        try {
            log.info("Payment SUCCESS received for order: {}", event.getOrderId());
            orderService.handlePaymentSuccess(event.getOrderId(), event.getPaymentId());
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Error processing payment success for order {}: {}", event.getOrderId(), e.getMessage());
            // Do NOT ack — Kafka will redeliver (with retry config in application.yml)
        }
    }

    @KafkaListener(
        topics = KafkaTopics.PAYMENT_FAILED,
        groupId = "order-service-payment",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void onPaymentFailed(PaymentEvent event, Acknowledgment ack) {
        try {
            log.warn("Payment FAILED for order: {}", event.getOrderId());
            orderService.handlePaymentFailure(event.getOrderId(), event.getFailureReason());
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Error processing payment failure for order {}: {}", event.getOrderId(), e.getMessage());
        }
    }
}
