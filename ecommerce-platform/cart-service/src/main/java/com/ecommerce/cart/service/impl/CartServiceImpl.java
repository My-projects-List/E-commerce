package com.ecommerce.cart.service.impl;

import com.ecommerce.cart.client.ProductServiceClient;
import com.ecommerce.cart.dto.AddToCartRequest;
import com.ecommerce.cart.model.Cart;
import com.ecommerce.cart.model.CartItem;
import com.ecommerce.cart.service.CartService;
import com.ecommerce.common.events.UserActivityEvent;
import com.ecommerce.common.exception.EcommerceException;
import com.ecommerce.common.exception.ResourceNotFoundException;
import com.ecommerce.common.kafka.KafkaTopics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private static final String CART_KEY_PREFIX  = "cart:";
    private static final long   CART_TTL_DAYS    = 30;

    private final RedisTemplate<String, Cart> redisTemplate;
    private final ProductServiceClient productClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Override
    public Cart getCart(String userId) {
        Cart cart = redisTemplate.opsForValue().get(cartKey(userId));
        if (cart == null) {
            cart = Cart.builder()
                    .userId(userId)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
        }
        return cart;
    }

    @Override
    public Cart addItem(String userId, AddToCartRequest request) {
        // Validate product exists and is in stock
        var response = productClient.getProduct(request.getProductId());
        if (!response.isSuccess() || response.getData() == null) {
            throw new ResourceNotFoundException("Product", "productId", request.getProductId());
        }

        var product = response.getData();
        if (!product.inStock() || product.inventoryCount() < request.getQuantity()) {
            throw new EcommerceException(
                "Insufficient stock for product: " + product.name(),
                HttpStatus.CONFLICT, "INSUFFICIENT_STOCK");
        }

        Cart cart = getCart(userId);

        // If item already exists, increment quantity
        cart.getItems().stream()
                .filter(i -> i.getProductId().equals(request.getProductId()))
                .findFirst()
                .ifPresentOrElse(
                        existing -> {
                            int newQty = existing.getQuantity() + request.getQuantity();
                            if (newQty > product.inventoryCount()) {
                                throw new EcommerceException(
                                    "Cannot add more than available stock",
                                    HttpStatus.CONFLICT, "EXCEEDS_STOCK");
                            }
                            existing.setQuantity(newQty);
                        },
                        () -> cart.getItems().add(CartItem.builder()
                                .productId(product.productId())
                                .productName(product.name())
                                .imageUrl(product.imageUrl())
                                .unitPrice(product.price())
                                .quantity(request.getQuantity())
                                .maxQuantity(product.inventoryCount())
                                .sku(product.sku())
                                .addedAt(LocalDateTime.now())
                                .build())
                );

        cart.setUpdatedAt(LocalDateTime.now());
        saveCart(cart);

        // Publish activity event so recommendation-service can update
        // weighted Redis scores for this user's product interactions.
        kafkaTemplate.send(KafkaTopics.USER_ACTIVITY, UserActivityEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .userId(userId)
                .productId(request.getProductId())
                .activityType(UserActivityEvent.ActivityType.CART_ADD)
                .occurredAt(LocalDateTime.now())
                .build());

        return cart;
    }

    @Override
    public Cart updateItemQuantity(String userId, String productId, int quantity) {
        Cart cart = getCart(userId);
        CartItem item = findItem(cart, productId);

        if (quantity <= 0) {
            return removeItem(userId, productId);
        }

        item.setQuantity(quantity);
        cart.setUpdatedAt(LocalDateTime.now());
        saveCart(cart);
        return cart;
    }

    @Override
    public Cart removeItem(String userId, String productId) {
        Cart cart = getCart(userId);
        boolean removed = cart.getItems().removeIf(i -> i.getProductId().equals(productId));
        if (!removed) {
            throw new ResourceNotFoundException("Cart item", "productId", productId);
        }

        kafkaTemplate.send(KafkaTopics.USER_ACTIVITY, UserActivityEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .userId(userId)
                .productId(productId)
                .activityType(UserActivityEvent.ActivityType.CART_REMOVE)
                .occurredAt(LocalDateTime.now())
                .build());

        cart.setUpdatedAt(LocalDateTime.now());
        saveCart(cart);
        return cart;
    }

    @Override
    public void clearCart(String userId) {
        redisTemplate.delete(cartKey(userId));
        log.info("Cart cleared for user: {}", userId);
    }

    @Override
    public Cart saveForLater(String userId, String productId) {
        Cart cart = getCart(userId);
        CartItem item = findItem(cart, productId);
        cart.getItems().remove(item);
        cart.getSavedForLater().add(item);
        cart.setUpdatedAt(LocalDateTime.now());
        saveCart(cart);
        return cart;
    }

    @Override
    public Cart moveToCart(String userId, String productId) {
        Cart cart = getCart(userId);
        CartItem item = cart.getSavedForLater().stream()
                .filter(i -> i.getProductId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Saved item", "productId", productId));

        cart.getSavedForLater().remove(item);
        cart.getItems().add(item);
        cart.setUpdatedAt(LocalDateTime.now());
        saveCart(cart);
        return cart;
    }

    @Override
    public Cart applyCoupon(String userId, String couponCode) {
        // Coupon validation would call a dedicated discount service;
        // stubbed here — a real implementation performs HTTP lookup.
        Cart cart = getCart(userId);
        cart.setCouponCode(couponCode);
        cart.setUpdatedAt(LocalDateTime.now());
        saveCart(cart);
        return cart;
    }

    // ---- Helpers ----

    private void saveCart(Cart cart) {
        redisTemplate.opsForValue().set(cartKey(cart.getUserId()), cart, CART_TTL_DAYS, TimeUnit.DAYS);
    }

    private String cartKey(String userId) {
        return CART_KEY_PREFIX + userId;
    }

    private CartItem findItem(Cart cart, String productId) {
        return cart.getItems().stream()
                .filter(i -> i.getProductId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Cart item", "productId", productId));
    }
}
