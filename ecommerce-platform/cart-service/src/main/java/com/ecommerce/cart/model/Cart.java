package com.ecommerce.cart.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Cart model stored entirely in Redis as a serialised JSON blob.
 * Key pattern:  cart:{userId}
 * TTL:          30 days (refreshed on every write)
 *
 * A separate "saved-for-later" key (cart:saved:{userId}) holds items
 * the user explicitly moved out of the active cart.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Cart implements Serializable {

    private String userId;

    @Builder.Default
    private List<CartItem> items = new ArrayList<>();

    @Builder.Default
    private List<CartItem> savedForLater = new ArrayList<>();

    private String couponCode;
    private BigDecimal discountAmount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ---- Computed helpers ----

    public BigDecimal getSubtotal() {
        return items.stream()
                .map(CartItem::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public int getTotalItemCount() {
        return items.stream().mapToInt(CartItem::getQuantity).sum();
    }

    public boolean isEmpty() {
        return items.isEmpty();
    }
}
