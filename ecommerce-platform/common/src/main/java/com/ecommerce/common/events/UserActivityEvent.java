package com.ecommerce.common.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Kafka event for user activity (browsing, adding to cart, etc.).
 * Consumed by: recommendation-service for personalization.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserActivityEvent {

    private String eventId;
    private String userId;
    private String productId;
    private ActivityType activityType;
    private String categoryId;
    private LocalDateTime occurredAt;

    public enum ActivityType {
        PRODUCT_VIEW,
        CART_ADD,
        CART_REMOVE,
        WISHLIST_ADD,
        PURCHASE,
        SEARCH,
        REVIEW_SUBMITTED
    }
}
