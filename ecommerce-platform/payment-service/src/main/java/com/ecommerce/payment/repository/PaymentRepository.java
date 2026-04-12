package com.ecommerce.payment.repository;

import com.ecommerce.payment.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, String> {

    Optional<Payment> findByOrderId(String orderId);

    List<Payment> findByUserId(String userId);

    Optional<Payment> findByStripePaymentIntentId(String intentId);

    List<Payment> findByStatusAndRetryCountLessThan(Payment.PaymentStatus status, int maxRetries);
}
