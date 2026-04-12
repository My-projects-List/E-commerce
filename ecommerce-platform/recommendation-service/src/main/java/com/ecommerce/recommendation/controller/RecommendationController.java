package com.ecommerce.recommendation.controller;

import com.ecommerce.common.dto.ApiResponse;
import com.ecommerce.recommendation.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<String>>> getRecommendations(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(ApiResponse.success(
                recommendationService.getRecommendations(userId, limit)));
    }

    @GetMapping("/also-viewed/{productId}")
    public ResponseEntity<ApiResponse<List<String>>> getAlsoViewed(
            @PathVariable String productId,
            @RequestParam(defaultValue = "8") int limit) {
        return ResponseEntity.ok(ApiResponse.success(
                recommendationService.getAlsoViewed(productId, limit)));
    }
}
