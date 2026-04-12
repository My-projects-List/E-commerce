package com.ecommerce.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponse {
    private boolean success;
    private String paymentId;
    private String transactionId;
    private String failureCode;
    private String failureMessage;

    public static PaymentResponse success(String paymentId, String transactionId) {
        return PaymentResponse.builder()
                .success(true).paymentId(paymentId).transactionId(transactionId).build();
    }

    public static PaymentResponse failure(String paymentId, String code, String message) {
        return PaymentResponse.builder()
                .success(false).paymentId(paymentId)
                .failureCode(code).failureMessage(message).build();
    }
}
