package com.ecommerce.product.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class CreateProductRequest {

    @NotBlank(message = "Product name is required")
    @Size(max = 255)
    private String name;

    private String description;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    private BigDecimal price;

    private BigDecimal originalPrice;

    @NotBlank(message = "Category ID is required")
    private String categoryId;

    @Min(value = 0, message = "Inventory count cannot be negative")
    private int inventoryCount;

    private String brand;

    @NotBlank(message = "SKU is required")
    private String sku;

    private BigDecimal weightKg;
    private List<String> imageUrls;
    private Map<String, String> attributes;
    private String vendorId;
}
