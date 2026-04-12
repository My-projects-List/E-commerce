package com.ecommerce.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class CheckoutRequest {

    @NotEmpty(message = "Order must contain at least one item")
    private List<OrderItemRequest> items;

    @NotBlank(message = "Address ID is required")
    private String shippingAddressId;

    @NotBlank(message = "Payment method is required")
    private String paymentMethodId;   // Stripe PaymentMethod ID

    private String couponCode;

    /** Client-generated UUID to prevent duplicate submissions */
    @NotBlank(message = "Idempotency key is required")
    private String idempotencyKey;

    @Data
    public static class OrderItemRequest {
        @NotBlank private String productId;
        private int quantity;
    }
}
