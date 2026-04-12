package com.ecommerce.cart.service;

import com.ecommerce.cart.dto.AddToCartRequest;
import com.ecommerce.cart.model.Cart;

public interface CartService {

    Cart getCart(String userId);

    Cart addItem(String userId, AddToCartRequest request);

    Cart updateItemQuantity(String userId, String productId, int quantity);

    Cart removeItem(String userId, String productId);

    void clearCart(String userId);

    Cart saveForLater(String userId, String productId);

    Cart moveToCart(String userId, String productId);

    Cart applyCoupon(String userId, String couponCode);
}
