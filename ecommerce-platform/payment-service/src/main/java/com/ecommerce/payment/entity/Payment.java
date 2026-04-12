package com.ecommerce.payment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Payment record — one row per payment attempt.
 * Sensitive card data is NEVER stored here; Stripe tokens are used instead.
 */
@Entity
@Table(name = "payments", indexes = {
        @Index(name = "idx_payment_order",  columnList = "order_id"),
        @Index(name = "idx_payment_user",   columnList = "user_id"),
        @Index(name = "idx_payment_stripe", columnList = "stripe_payment_intent_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    @Column(name = "payment_id")
    private String paymentId;

    @Column(name = "order_id",   nullable = false) private String orderId;
    @Column(name = "user_id",    nullable = false) private String userId;

    @Column(name = "amount",   nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "USD";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    /** Stripe PaymentIntent ID — used for idempotency and capture/refund operations */
    @Column(name = "stripe_payment_intent_id")
    private String stripePaymentIntentId;

    /** Stripe PaymentMethod ID (tokenised, not raw card data) */
    @Column(name = "stripe_payment_method_id")
    private String stripePaymentMethodId;

    @Column(name = "failure_code")    private String failureCode;
    @Column(name = "failure_message") private String failureMessage;

    @Column(name = "retry_count")
    @Builder.Default
    private int retryCount = 0;

    @Column(name = "refund_id")       private String refundId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.paymentId == null) {
            this.paymentId = UUID.randomUUID().toString();
        }
    }

    public enum PaymentStatus {
        INITIATED,
        PROCESSING,
        SUCCESS,
        FAILED,
        REFUNDED,
        PARTIALLY_REFUNDED
    }
}
