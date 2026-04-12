package com.ecommerce.cart.controller;

import com.ecommerce.cart.dto.AddToCartRequest;
import com.ecommerce.cart.model.Cart;
import com.ecommerce.cart.service.CartService;
import com.ecommerce.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<ApiResponse<Cart>> getCart(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(ApiResponse.success(cartService.getCart(userId)));
    }

    @PostMapping("/add")
    public ResponseEntity<ApiResponse<Cart>> addItem(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody AddToCartRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Item added to cart",
                cartService.addItem(userId, request)));
    }

    @PatchMapping("/items/{productId}")
    public ResponseEntity<ApiResponse<Cart>> updateQuantity(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String productId,
            @RequestParam int quantity) {
        return ResponseEntity.ok(ApiResponse.success(
                cartService.updateItemQuantity(userId, productId, quantity)));
    }

    @DeleteMapping("/remove/{productId}")
    public ResponseEntity<ApiResponse<Cart>> removeItem(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String productId) {
        return ResponseEntity.ok(ApiResponse.success("Item removed",
                cartService.removeItem(userId, productId)));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clearCart(
            @RequestHeader("X-User-Id") String userId) {
        cartService.clearCart(userId);
        return ResponseEntity.ok(ApiResponse.success("Cart cleared", null));
    }

    @PostMapping("/save-for-later/{productId}")
    public ResponseEntity<ApiResponse<Cart>> saveForLater(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String productId) {
        return ResponseEntity.ok(ApiResponse.success(
                cartService.saveForLater(userId, productId)));
    }

    @PostMapping("/move-to-cart/{productId}")
    public ResponseEntity<ApiResponse<Cart>> moveToCart(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String productId) {
        return ResponseEntity.ok(ApiResponse.success(
                cartService.moveToCart(userId, productId)));
    }

    @PostMapping("/coupon")
    public ResponseEntity<ApiResponse<Cart>> applyCoupon(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam String code) {
        return ResponseEntity.ok(ApiResponse.success(
                cartService.applyCoupon(userId, code)));
    }
}
