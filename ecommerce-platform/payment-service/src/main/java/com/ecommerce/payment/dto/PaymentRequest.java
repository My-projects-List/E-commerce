package com.ecommerce.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentRequest {

    @NotBlank private String orderId;
    @NotBlank private String userId;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amount;

    @NotBlank
    private String currency;

    /** Stripe PaymentMethod token — never raw card data */
    @NotBlank
    private String paymentMethodId;

    /** Client-generated idempotency key forwarded to Stripe */
    @NotBlank
    private String idempotencyKey;
}
