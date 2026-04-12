package com.ecommerce.product.repository;

import com.ecommerce.product.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, String> {

    Page<Review> findByProductProductId(String productId, Pageable pageable);

    long countByProductProductId(String productId);

    Optional<Review> findByProductProductIdAndUserId(String productId, String userId);

    boolean existsByProductProductIdAndUserId(String productId, String userId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.productId = :productId")
    Double calculateAverageRating(@Param("productId") String productId);
}
