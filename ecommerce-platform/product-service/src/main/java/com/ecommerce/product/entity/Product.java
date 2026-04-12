package com.ecommerce.product.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Product entity. Stored in PostgreSQL with Redis caching for hot items.
 * Images are stored as URLs pointing to CDN (e.g., S3 + CloudFront).
 */
@Entity
@Table(name = "products", indexes = {
        @Index(name = "idx_product_category", columnList = "category_id"),
        @Index(name = "idx_product_name",     columnList = "name"),
        @Index(name = "idx_product_active",   columnList = "is_active")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @Column(name = "product_id")
    private String productId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "original_price", precision = 10, scale = 2)
    private BigDecimal originalPrice;  // For showing discounts

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "inventory_count", nullable = false)
    @Builder.Default
    private int inventoryCount = 0;

    @Column(name = "low_stock_threshold")
    @Builder.Default
    private int lowStockThreshold = 10;

    @Column(name = "average_rating", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal averageRating = BigDecimal.ZERO;

    @Column(name = "review_count")
    @Builder.Default
    private int reviewCount = 0;

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "brand", length = 100)
    private String brand;

    @Column(name = "sku", unique = true, length = 100)
    private String sku;

    @Column(name = "weight_kg", precision = 6, scale = 3)
    private BigDecimal weightKg;

    // CDN image URLs stored as CSV; a proper impl would use a separate table
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_images", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "image_url")
    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();

    // Flexible attributes as key=value pairs (e.g., "color=red", "size=XL")
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "product_attributes", joinColumns = @JoinColumn(name = "product_id"))
    @MapKeyColumn(name = "attr_key")
    @Column(name = "attr_value")
    private java.util.Map<String, String> attributes = new java.util.HashMap<>();

    @Column(name = "vendor_id")
    private String vendorId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.productId == null) {
            this.productId = UUID.randomUUID().toString();
        }
    }
}
