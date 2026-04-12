package com.ecommerce.common.kafka;

/**
 * Centralized Kafka topic name constants.
 * All microservices reference these constants to avoid hardcoded strings.
 */
public final class KafkaTopics {

    private KafkaTopics() {}

    // Order topics
    public static final String ORDER_CREATED        = "order.created";
    public static final String ORDER_CONFIRMED      = "order.confirmed";
    public static final String ORDER_CANCELLED      = "order.cancelled";
    public static final String ORDER_STATUS_UPDATED = "order.status.updated";

    // Payment topics
    public static final String PAYMENT_SUCCESS      = "payment.success";
    public static final String PAYMENT_FAILED       = "payment.failed";
    public static final String PAYMENT_REFUNDED     = "payment.refunded";

    // User activity topics (for recommendation engine)
    public static final String USER_ACTIVITY        = "user.activity";
    public static final String USER_REGISTERED      = "user.registered";

    // Notification topics
    public static final String NOTIFICATION_EMAIL   = "notification.email";
    public static final String NOTIFICATION_SMS     = "notification.sms";
    public static final String NOTIFICATION_PUSH    = "notification.push";

    // Inventory topics
    public static final String INVENTORY_UPDATED    = "inventory.updated";
    public static final String INVENTORY_LOW_STOCK  = "inventory.low_stock";
}
