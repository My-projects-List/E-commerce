package com.ecommerce.cart.client;

import com.ecommerce.common.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Circuit-breaker fallback: if product-service is unreachable
 * return a null data response so the cart service can handle gracefully.
 */
@Slf4j
@Component
public class ProductServiceClientFallback implements ProductServiceClient {

    @Override
    public ApiResponse<ProductSummary> getProduct(String productId) {
        log.warn("product-service unavailable for productId: {}", productId);
        return ApiResponse.error("Product service temporarily unavailable", "SERVICE_UNAVAILABLE");
    }
}
