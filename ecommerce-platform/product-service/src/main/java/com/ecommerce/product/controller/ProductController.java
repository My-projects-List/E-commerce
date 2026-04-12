package com.ecommerce.product.controller;

import com.ecommerce.common.dto.ApiResponse;
import com.ecommerce.common.dto.PageResponse;
import com.ecommerce.product.dto.CreateProductRequest;
import com.ecommerce.product.dto.ProductDto;
import com.ecommerce.product.dto.ReviewDto;
import com.ecommerce.product.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    /** Public: browse paginated product list with optional filters */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProductDto>>> getProducts(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false)    String sort,
            @RequestParam(required = false)    String categoryId,
            @RequestParam(required = false)    BigDecimal minPrice,
            @RequestParam(required = false)    BigDecimal maxPrice,
            @RequestParam(required = false)    BigDecimal minRating,
            @RequestParam(required = false)    String brand) {

        PageResponse<ProductDto> result = (categoryId != null || minPrice != null
                || maxPrice != null || minRating != null || brand != null)
                ? productService.filterProducts(categoryId, minPrice, maxPrice, minRating, brand, page, size, sort)
                : productService.getProducts(page, size, sort);

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /** Public: single product detail */
    @GetMapping("/{productId}")
    public ResponseEntity<ApiResponse<ProductDto>> getProduct(@PathVariable String productId) {
        return ResponseEntity.ok(ApiResponse.success(productService.getProductById(productId)));
    }

    /** Public: batch fetch (used by cart/order services) */
    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<List<ProductDto>>> getProductsByIds(
            @RequestBody List<String> productIds) {
        return ResponseEntity.ok(ApiResponse.success(productService.getProductsByIds(productIds)));
    }

    /** Admin: create product */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('VENDOR')")
    public ResponseEntity<ApiResponse<ProductDto>> createProduct(
            @Valid @RequestBody CreateProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Product created", productService.createProduct(request)));
    }

    /** Admin: update product */
    @PutMapping("/{productId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VENDOR')")
    public ResponseEntity<ApiResponse<ProductDto>> updateProduct(
            @PathVariable String productId,
            @Valid @RequestBody CreateProductRequest request) {
        return ResponseEntity.ok(ApiResponse.success(productService.updateProduct(productId, request)));
    }

    /** Admin: soft-delete product */
    @DeleteMapping("/{productId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable String productId) {
        productService.deleteProduct(productId);
        return ResponseEntity.ok(ApiResponse.success("Product deleted", null));
    }

    // ---- Reviews ----

    /** Public: fetch product reviews */
    @GetMapping("/{productId}/reviews")
    public ResponseEntity<ApiResponse<PageResponse<ReviewDto>>> getReviews(
            @PathVariable String productId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                productService.getReviews(productId, page, size)));
    }

    /** Authenticated: submit a review */
    @PostMapping("/{productId}/reviews")
    public ResponseEntity<ApiResponse<ReviewDto>> addReview(
            @PathVariable String productId,
            @RequestHeader("X-User-Id")   String userId,
            @RequestHeader("X-User-Name") String userName,
            @Valid @RequestBody ReviewDto reviewDto) {
        ReviewDto saved = productService.addReview(productId, userId, userName, reviewDto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Review submitted", saved));
    }

    // ---- Internal inventory endpoints (called by order-service) ----

    @PostMapping("/{productId}/inventory/reserve")
    public ResponseEntity<ApiResponse<Void>> reserveInventory(
            @PathVariable String productId,
            @RequestParam int quantity) {
        productService.reserveInventory(productId, quantity);
        return ResponseEntity.ok(ApiResponse.success("Inventory reserved", null));
    }

    @PostMapping("/{productId}/inventory/release")
    public ResponseEntity<ApiResponse<Void>> releaseInventory(
            @PathVariable String productId,
            @RequestParam int quantity) {
        productService.releaseInventory(productId, quantity);
        return ResponseEntity.ok(ApiResponse.success("Inventory released", null));
    }
}
