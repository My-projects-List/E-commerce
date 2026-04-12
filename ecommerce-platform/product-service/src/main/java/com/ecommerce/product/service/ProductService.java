package com.ecommerce.product.service;

import com.ecommerce.common.dto.PageResponse;
import com.ecommerce.product.dto.CreateProductRequest;
import com.ecommerce.product.dto.ProductDto;
import com.ecommerce.product.dto.ReviewDto;

import java.math.BigDecimal;
import java.util.List;

public interface ProductService {

    // ---- Product CRUD ----
    ProductDto createProduct(CreateProductRequest request);
    ProductDto getProductById(String productId);
    PageResponse<ProductDto> getProducts(int page, int size, String sort);
    PageResponse<ProductDto> getProductsByCategory(String categoryId, int page, int size);
    PageResponse<ProductDto> filterProducts(String categoryId, BigDecimal minPrice,
                                            BigDecimal maxPrice, BigDecimal minRating,
                                            String brand, int page, int size, String sort);
    ProductDto updateProduct(String productId, CreateProductRequest request);
    void deleteProduct(String productId);
    List<ProductDto> getProductsByIds(List<String> productIds);

    // ---- Inventory ----
    void reserveInventory(String productId, int quantity);
    void releaseInventory(String productId, int quantity);

    // ---- Reviews ----
    ReviewDto addReview(String productId, String userId, String userName, ReviewDto reviewDto);
    PageResponse<ReviewDto> getReviews(String productId, int page, int size);
}
