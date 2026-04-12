package com.ecommerce.order.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Order entity — each row represents one customer order.
 * Uses an idempotency key to prevent duplicate submissions.
 */
@Entity
@Table(name = "orders", indexes = {
        @Index(name = "idx_order_user",        columnList = "user_id"),
        @Index(name = "idx_order_status",      columnList = "status"),
        @Index(name = "idx_order_idempotency", columnList = "idempotency_key", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @Column(name = "order_id")
    private String orderId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @Column(name = "subtotal",       nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "shipping_cost",  nullable = false, precision = 10, scale = 2)
    private BigDecimal shippingCost;

    @Column(name = "discount_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "total_price",    nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice;

    @Column(name = "currency", length = 3)
    @Builder.Default
    private String currency = "USD";

    // Shipping address snapshot (denormalised so address changes don't affect history)
    @Column(name = "shipping_full_name")   private String shippingFullName;
    @Column(name = "shipping_street")      private String shippingStreet;
    @Column(name = "shipping_city")        private String shippingCity;
    @Column(name = "shipping_state")       private String shippingState;
    @Column(name = "shipping_zip")         private String shippingZip;
    @Column(name = "shipping_country")     private String shippingCountry;

    @Column(name = "payment_id")
    private String paymentId;

    @Column(name = "tracking_number")
    private String trackingNumber;

    @Column(name = "coupon_code")
    private String couponCode;

    /** Unique client-supplied token — prevents duplicate order submissions */
    @Column(name = "idempotency_key", unique = true)
    private String idempotencyKey;

    @Column(name = "cancelled_reason")
    private String cancelledReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @PrePersist
    public void prePersist() {
        if (this.orderId == null) {
            this.orderId = UUID.randomUUID().toString();
        }
        if (this.status == null) {
            this.status = OrderStatus.CREATED;
        }
    }

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
