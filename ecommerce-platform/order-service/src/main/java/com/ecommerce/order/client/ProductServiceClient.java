package com.ecommerce.order.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.GetMapping;

import java.math.BigDecimal;

@FeignClient(name = "product-service")
public interface ProductServiceClient {

    @GetMapping("/api/products/{productId}")
    ProductSummary getProduct(@PathVariable String productId);

    @PostMapping("/api/products/{productId}/inventory/reserve")
    void reserveInventory(@PathVariable String productId, @RequestParam int quantity);

    @PostMapping("/api/products/{productId}/inventory/release")
    void releaseInventory(@PathVariable String productId, @RequestParam int quantity);

    record ProductSummary(
        String productId, String name, String imageUrl,
        BigDecimal price, int inventoryCount, boolean inStock, String sku
    ) {}
}
