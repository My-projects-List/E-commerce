package com.ecommerce.admin.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "product-service")
public interface ProductServiceClient {
    @GetMapping("/api/admin/products/count")
    long countProducts();

    @GetMapping("/api/admin/products/low-stock/count")
    long countLowStockProducts();

    @PostMapping("/api/products/{productId}/discount")
    void applyDiscount(@PathVariable String productId, @RequestParam double discountPercent);
}
