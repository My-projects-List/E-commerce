package com.ecommerce.payment.controller;

import com.ecommerce.common.dto.ApiResponse;
import com.ecommerce.payment.dto.PaymentRequest;
import com.ecommerce.payment.dto.PaymentResponse;
import com.ecommerce.payment.service.StripePaymentService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final StripePaymentService paymentService;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    @PostMapping("/process")
    public ResponseEntity<ApiResponse<PaymentResponse>> processPayment(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody PaymentRequest request) {
        request.setUserId(userId);
        PaymentResponse response = paymentService.processPayment(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/refund/{orderId}")
    public ResponseEntity<ApiResponse<PaymentResponse>> refundPayment(
            @PathVariable String orderId,
            @RequestParam(defaultValue = "Requested by customer") String reason) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.refundPayment(orderId, reason)));
    }

    /**
     * Stripe webhook endpoint — receives async payment status updates.
     * Stripe signs every request; we verify the signature before processing.
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            Event event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
            log.info("Stripe webhook received: {}", event.getType());

            switch (event.getType()) {
                case "payment_intent.succeeded" -> {
                    PaymentIntent intent = (PaymentIntent) event.getDataObjectDeserializer()
                            .getObject().orElseThrow();
                    paymentService.handleWebhook(intent.getId(), "succeeded");
                }
                case "payment_intent.payment_failed" -> {
                    PaymentIntent intent = (PaymentIntent) event.getDataObjectDeserializer()
                            .getObject().orElseThrow();
                    paymentService.handleWebhook(intent.getId(), "payment_failed");
                }
                default -> log.debug("Unhandled Stripe event type: {}", event.getType());
            }

            return ResponseEntity.ok("OK");
        } catch (SignatureVerificationException e) {
            log.error("Invalid Stripe webhook signature");
            return ResponseEntity.badRequest().body("Invalid signature");
        }
    }
}
