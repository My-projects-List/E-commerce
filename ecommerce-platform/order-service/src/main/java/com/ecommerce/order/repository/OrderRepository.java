package com.ecommerce.order.repository;

import com.ecommerce.order.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, String> {

    Page<Order> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    Optional<Order> findByIdempotencyKey(String idempotencyKey);

    Optional<Order> findByOrderIdAndUserId(String orderId, String userId);

    @Query("""
        SELECT COUNT(o) FROM Order o
        WHERE o.createdAt BETWEEN :from AND :to
        """)
    long countOrdersBetween(@Param("from") LocalDateTime from,
                             @Param("to")   LocalDateTime to);

    @Query("""
        SELECT COALESCE(SUM(o.totalPrice), 0) FROM Order o
        WHERE o.status = 'DELIVERED'
          AND o.createdAt BETWEEN :from AND :to
        """)
    java.math.BigDecimal sumRevenueBetween(@Param("from") LocalDateTime from,
                                            @Param("to")   LocalDateTime to);
}
