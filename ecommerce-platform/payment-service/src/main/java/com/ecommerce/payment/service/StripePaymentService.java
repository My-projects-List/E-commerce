package com.ecommerce.payment.service;

import com.ecommerce.common.events.PaymentEvent;
import com.ecommerce.common.kafka.KafkaTopics;
import com.ecommerce.payment.dto.PaymentRequest;
import com.ecommerce.payment.dto.PaymentResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.repository.PaymentRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.param.PaymentIntentConfirmParams;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.RefundCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Stripe payment processor.
 *
 * PCI-DSS note: raw card numbers NEVER touch this service.
 * The frontend creates a Stripe PaymentMethod using Stripe.js
 * and sends only the PaymentMethod ID here.
 *
 * Flow:
 *   1. Create PaymentIntent (captures amount)
 *   2. Confirm PaymentIntent with the PaymentMethod token
 *   3. Publish payment.success or payment.failed Kafka event
 *   4. order-service consumes the event and updates order status
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StripePaymentService {

    @Value("${stripe.secret-key}")
    private String stripeSecretKey;

    private final PaymentRepository paymentRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    @Transactional
    @Retryable(retryFor = StripeException.class,
               maxAttempts = 3,
               backoff = @Backoff(delay = 1000, multiplier = 2))
    public PaymentResponse processPayment(PaymentRequest request) {
        Payment payment = Payment.builder()
                .orderId(request.getOrderId())
                .userId(request.getUserId())
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .status(Payment.PaymentStatus.INITIATED)
                .stripePaymentMethodId(request.getPaymentMethodId())
                .build();

        payment = paymentRepository.save(payment);

        try {
            // Step 1: Create PaymentIntent
            PaymentIntentCreateParams createParams = PaymentIntentCreateParams.builder()
                    .setAmount(request.getAmount().movePointRight(2).longValue()) // cents
                    .setCurrency(request.getCurrency().toLowerCase())
                    .setPaymentMethod(request.getPaymentMethodId())
                    .setConfirm(false)
                    .setIdempotencyKey(request.getIdempotencyKey())  // Stripe idempotency
                    .putMetadata("orderId",   request.getOrderId())
                    .putMetadata("userId",    request.getUserId())
                    .putMetadata("paymentId", payment.getPaymentId())
                    .build();

            PaymentIntent intent = PaymentIntent.create(createParams);

            payment.setStripePaymentIntentId(intent.getId());
            payment.setStatus(Payment.PaymentStatus.PROCESSING);
            paymentRepository.save(payment);

            // Step 2: Confirm the intent
            PaymentIntentConfirmParams confirmParams = PaymentIntentConfirmParams.builder()
                    .setPaymentMethod(request.getPaymentMethodId())
                    .build();

            intent = intent.confirm(confirmParams);

            if ("succeeded".equals(intent.getStatus())) {
                payment.setStatus(Payment.PaymentStatus.SUCCESS);
                paymentRepository.save(payment);

                publishPaymentEvent(payment, PaymentEvent.PaymentStatus.SUCCESS, null);
                log.info("Payment SUCCESS: paymentId={}, orderId={}", payment.getPaymentId(), payment.getOrderId());

                return PaymentResponse.success(payment.getPaymentId(), intent.getId());
            } else {
                throw new RuntimeException("PaymentIntent status: " + intent.getStatus());
            }

        } catch (StripeException e) {
            log.error("Stripe error for order {}: {} - {}", request.getOrderId(), e.getCode(), e.getMessage());
            payment.setStatus(Payment.PaymentStatus.FAILED);
            payment.setFailureCode(e.getCode());
            payment.setFailureMessage(e.getMessage());
            payment.setRetryCount(payment.getRetryCount() + 1);
            paymentRepository.save(payment);

            publishPaymentEvent(payment, PaymentEvent.PaymentStatus.FAILED, e.getMessage());
            return PaymentResponse.failure(payment.getPaymentId(), e.getCode(), e.getMessage());
        }
    }

    @Transactional
    public PaymentResponse refundPayment(String orderId, String reason) throws StripeException {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for order: " + orderId));

        if (payment.getStatus() != Payment.PaymentStatus.SUCCESS) {
            throw new IllegalStateException("Only successful payments can be refunded");
        }

        RefundCreateParams refundParams = RefundCreateParams.builder()
                .setPaymentIntent(payment.getStripePaymentIntentId())
                .setReason(RefundCreateParams.Reason.REQUESTED_BY_CUSTOMER)
                .putMetadata("orderId", orderId)
                .build();

        Refund refund = Refund.create(refundParams);

        payment.setStatus(Payment.PaymentStatus.REFUNDED);
        payment.setRefundId(refund.getId());
        paymentRepository.save(payment);

        publishPaymentEvent(payment, PaymentEvent.PaymentStatus.REFUNDED, null);
        log.info("Refund issued: paymentId={}, refundId={}", payment.getPaymentId(), refund.getId());

        return PaymentResponse.success(payment.getPaymentId(), refund.getId());
    }

    /**
     * Stripe webhook handler — receives async payment confirmations.
     * Called from the webhook controller after signature verification.
     */
    @Transactional
    public void handleWebhook(String paymentIntentId, String stripeStatus) {
        paymentRepository.findByStripePaymentIntentId(paymentIntentId).ifPresent(payment -> {
            if ("succeeded".equals(stripeStatus)) {
                payment.setStatus(Payment.PaymentStatus.SUCCESS);
                paymentRepository.save(payment);
                publishPaymentEvent(payment, PaymentEvent.PaymentStatus.SUCCESS, null);
            } else if ("payment_failed".equals(stripeStatus)) {
                payment.setStatus(Payment.PaymentStatus.FAILED);
                paymentRepository.save(payment);
                publishPaymentEvent(payment, PaymentEvent.PaymentStatus.FAILED, "Stripe webhook failure");
            }
        });
    }

    /**
     * Scheduled retry for payments that failed but have not exceeded max retries.
     * Runs every 5 minutes.
     */
    @Scheduled(fixedDelay = 300_000)
    public void retryFailedPayments() {
        List<Payment> failedPayments = paymentRepository
                .findByStatusAndRetryCountLessThan(Payment.PaymentStatus.FAILED, 3);

        if (!failedPayments.isEmpty()) {
            log.info("Retrying {} failed payments", failedPayments.size());
        }

        for (Payment payment : failedPayments) {
            log.info("Retrying payment: {} (attempt {})", payment.getPaymentId(), payment.getRetryCount() + 1);
            // In production: rebuild PaymentRequest from stored data and re-invoke processPayment
        }
    }

    // ---- Helpers ----

    private void publishPaymentEvent(Payment payment, PaymentEvent.PaymentStatus status, String failureReason) {
        String topic = status == PaymentEvent.PaymentStatus.SUCCESS
                ? KafkaTopics.PAYMENT_SUCCESS
                : (status == PaymentEvent.PaymentStatus.REFUNDED
                    ? KafkaTopics.PAYMENT_REFUNDED
                    : KafkaTopics.PAYMENT_FAILED);

        kafkaTemplate.send(topic, PaymentEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .paymentId(payment.getPaymentId())
                .orderId(payment.getOrderId())
                .userId(payment.getUserId())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .status(status)
                .gatewayTransactionId(payment.getStripePaymentIntentId())
                .failureReason(failureReason)
                .occurredAt(LocalDateTime.now())
                .build());
    }
}
