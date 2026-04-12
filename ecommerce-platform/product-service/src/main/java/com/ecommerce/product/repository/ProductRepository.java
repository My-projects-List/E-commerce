package com.ecommerce.product.repository;

import com.ecommerce.product.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {

    Page<Product> findByIsActiveTrue(Pageable pageable);

    Page<Product> findByCategoryCategoryIdAndIsActiveTrue(String categoryId, Pageable pageable);

    @Query("""
        SELECT p FROM Product p
        WHERE p.isActive = true
          AND (:categoryId IS NULL OR p.category.categoryId = :categoryId)
          AND (:minPrice IS NULL OR p.price >= :minPrice)
          AND (:maxPrice IS NULL OR p.price <= :maxPrice)
          AND (:minRating IS NULL OR p.averageRating >= :minRating)
          AND (:brand IS NULL OR LOWER(p.brand) = LOWER(:brand))
        """)
    Page<Product> findWithFilters(
            @Param("categoryId") String categoryId,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("minRating") BigDecimal minRating,
            @Param("brand") String brand,
            Pageable pageable);

    Optional<Product> findBySkuAndIsActiveTrue(String sku);

    List<Product> findByProductIdInAndIsActiveTrue(List<String> productIds);

    @Query("SELECT p FROM Product p WHERE p.inventoryCount <= p.lowStockThreshold AND p.isActive = true")
    List<Product> findLowStockProducts();

    @Modifying
    @Query("UPDATE Product p SET p.inventoryCount = p.inventoryCount - :quantity WHERE p.productId = :productId AND p.inventoryCount >= :quantity")
    int decrementInventory(@Param("productId") String productId, @Param("quantity") int quantity);

    @Modifying
    @Query("UPDATE Product p SET p.inventoryCount = p.inventoryCount + :quantity WHERE p.productId = :productId")
    void incrementInventory(@Param("productId") String productId, @Param("quantity") int quantity);

    @Modifying
    @Query("""
        UPDATE Product p SET
            p.averageRating = :avgRating,
            p.reviewCount   = :count
        WHERE p.productId = :productId
        """)
    void updateRatingStats(@Param("productId") String productId,
                           @Param("avgRating") BigDecimal avgRating,
                           @Param("count") int count);
}
