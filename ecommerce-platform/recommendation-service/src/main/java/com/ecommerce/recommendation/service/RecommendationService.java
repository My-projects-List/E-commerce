package com.ecommerce.recommendation.service;

import com.ecommerce.common.events.UserActivityEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Recommendation engine using Redis sorted sets.
 * Algorithm: collaborative filtering via user-interaction scoring.
 * Cold-start fallback: global popularity sorted set.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final String GLOBAL_POP_KEY  = "rec:global:popular";
    private static final String USER_KEY_PREFIX = "rec:user:";
    private static final String COVIEW_PREFIX   = "rec:coview:";

    private final RedisTemplate<String, String> redisTemplate;

    public void trackActivity(UserActivityEvent event) {
        if (event.getProductId() == null) return;
        double weight = scoreWeight(event.getActivityType());
        redisTemplate.opsForZSet().incrementScore(GLOBAL_POP_KEY, event.getProductId(), weight);
        String userKey = USER_KEY_PREFIX + event.getUserId();
        redisTemplate.opsForZSet().incrementScore(userKey, event.getProductId(), weight);
        redisTemplate.expire(userKey, 90, TimeUnit.DAYS);
    }

    public List<String> getRecommendations(String userId, int limit) {
        String userKey = USER_KEY_PREFIX + userId;
        Long count = redisTemplate.opsForZSet().size(userKey);
        if (count == null || count < 3) return getGlobalPopular(limit);
        Set<String> personal = redisTemplate.opsForZSet().reverseRange(userKey, 0, limit - 1L);
        List<String> result = personal != null ? new ArrayList<>(personal) : new ArrayList<>();
        if (result.size() < limit) {
            getGlobalPopular(limit).stream()
                .filter(p -> !result.contains(p))
                .limit(limit - result.size())
                .forEach(result::add);
        }
        return result;
    }

    public List<String> getAlsoViewed(String productId, int limit) {
        Set<String> coviewed = redisTemplate.opsForZSet()
            .reverseRange(COVIEW_PREFIX + productId, 0, limit - 1L);
        return coviewed != null ? new ArrayList<>(coviewed) : getGlobalPopular(limit);
    }

    private List<String> getGlobalPopular(int limit) {
        Set<String> popular = redisTemplate.opsForZSet().reverseRange(GLOBAL_POP_KEY, 0, limit - 1L);
        return popular != null ? new ArrayList<>(popular) : List.of();
    }

    private double scoreWeight(UserActivityEvent.ActivityType type) {
        return switch (type) {
            case PRODUCT_VIEW     -> 1.0;
            case CART_ADD         -> 3.0;
            case PURCHASE         -> 10.0;
            case WISHLIST_ADD     -> 2.0;
            case REVIEW_SUBMITTED -> 5.0;
            default               -> 1.0;
        };
    }
}
