package com.ecommerce.notification.service;

import com.ecommerce.common.events.OrderEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;

/**
 * Sends transactional emails using JavaMail + Thymeleaf HTML templates.
 * In production, replace SMTP config with SendGrid / SES for scale.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailNotificationService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    public void sendOrderStatusEmail(String to, String orderId,
                                     OrderEvent.OrderStatus status, String userName) {
        String subject  = buildSubject(status, orderId);
        String template = resolveTemplate(status);

        Context ctx = new Context();
        ctx.setVariables(Map.of(
                "userName",  userName,
                "orderId",   orderId,
                "status",    status.name(),
                "statusMsg", buildStatusMessage(status)
        ));

        String body = templateEngine.process(template, ctx);
        sendHtmlEmail(to, subject, body);
    }

    public void sendWelcomeEmail(String to, String userName) {
        Context ctx = new Context();
        ctx.setVariable("userName", userName);
        String body = templateEngine.process("email/welcome", ctx);
        sendHtmlEmail(to, "Welcome to E-Shop!", body);
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            var message = mailSender.createMimeMessage();
            var helper  = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            helper.setFrom("noreply@eshop.com");
            mailSender.send(message);
            log.info("Email sent to {} — subject: {}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    private String buildSubject(OrderEvent.OrderStatus status, String orderId) {
        return switch (status) {
            case CONFIRMED      -> "Order Confirmed — #" + orderId;
            case SHIPPED        -> "Your Order is on its Way — #" + orderId;
            case DELIVERED      -> "Order Delivered — #" + orderId;
            case CANCELLED      -> "Order Cancelled — #" + orderId;
            case PAYMENT_FAILED -> "Payment Failed — Action Required";
            case REFUNDED       -> "Refund Processed — #" + orderId;
            default             -> "Order Update — #" + orderId;
        };
    }

    private String resolveTemplate(OrderEvent.OrderStatus status) {
        return switch (status) {
            case CONFIRMED      -> "email/order-confirmed";
            case SHIPPED        -> "email/order-shipped";
            case DELIVERED      -> "email/order-delivered";
            case CANCELLED      -> "email/order-cancelled";
            case PAYMENT_FAILED -> "email/payment-failed";
            default             -> "email/order-update";
        };
    }

    private String buildStatusMessage(OrderEvent.OrderStatus status) {
        return switch (status) {
            case CONFIRMED      -> "Your order has been confirmed and is being prepared.";
            case SHIPPED        -> "Great news! Your order is on its way.";
            case DELIVERED      -> "Your order has been delivered. Enjoy!";
            case CANCELLED      -> "Your order has been cancelled. A refund will be processed if applicable.";
            case PAYMENT_FAILED -> "We couldn't process your payment. Please update your payment method.";
            case REFUNDED       -> "Your refund has been processed and will appear within 5–10 business days.";
            default             -> "Your order status has been updated.";
        };
    }
}
