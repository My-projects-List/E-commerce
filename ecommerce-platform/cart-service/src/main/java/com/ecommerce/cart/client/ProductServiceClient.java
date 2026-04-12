package com.ecommerce.cart.client;

import com.ecommerce.common.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Feign client to call product-service for price/stock validation
 * when items are added to the cart.
 */
@FeignClient(name = "product-service", fallback = ProductServiceClientFallback.class)
public interface ProductServiceClient {

    @GetMapping("/api/products/{productId}")
    ApiResponse<ProductSummary> getProduct(@PathVariable String productId);

    /** Minimal product summary used by the cart */
    record ProductSummary(
            String productId,
            String name,
            String imageUrl,
            java.math.BigDecimal price,
            int inventoryCount,
            boolean inStock,
            String sku
    ) {}
}
