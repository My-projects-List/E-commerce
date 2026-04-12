package com.ecommerce.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductDto {
    private String productId;
    private String name;
    private String description;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private String categoryId;
    private String categoryName;
    private int inventoryCount;
    private boolean inStock;
    private BigDecimal averageRating;
    private int reviewCount;
    private String brand;
    private String sku;
    private List<String> imageUrls;
    private Map<String, String> attributes;
    private LocalDateTime createdAt;
}
