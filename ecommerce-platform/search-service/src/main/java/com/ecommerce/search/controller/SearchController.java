package com.ecommerce.search.controller;

import com.ecommerce.common.dto.ApiResponse;
import com.ecommerce.common.dto.PageResponse;
import com.ecommerce.search.document.ProductSearchDocument;
import com.ecommerce.search.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    /**
     * GET /api/search?q=laptop&categoryId=...&minPrice=100&maxPrice=2000
     *               &minRating=4.0&brand=Apple&inStock=true&sort=price_asc
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProductSearchDocument>>> search(
            @RequestParam(required = false)    String keyword,
            @RequestParam(required = false)    String categoryId,
            @RequestParam(required = false)    BigDecimal minPrice,
            @RequestParam(required = false)    BigDecimal maxPrice,
            @RequestParam(required = false)    BigDecimal minRating,
            @RequestParam(required = false)    String brand,
            @RequestParam(required = false)    Boolean inStock,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false)    String sort) {

        PageResponse<ProductSearchDocument> result = searchService.search(
                keyword, categoryId, minPrice, maxPrice,
                minRating, brand, inStock, page, size, sort);

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
