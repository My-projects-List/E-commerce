package com.ecommerce.admin.service;

import com.ecommerce.admin.client.OrderServiceClient;
import com.ecommerce.admin.client.ProductServiceClient;
import com.ecommerce.admin.client.UserServiceClient;
import com.ecommerce.admin.dto.SalesReportDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminReportService {

    private final OrderServiceClient orderClient;
    private final ProductServiceClient productClient;
    private final UserServiceClient userClient;

    public SalesReportDto generateSalesReport(LocalDate from, LocalDate to) {
        // Aggregate data from multiple services via Feign
        long totalOrders   = orderClient.countOrders(from, to);
        BigDecimal revenue = orderClient.sumRevenue(from, to);
        long newUsers      = userClient.countNewUsers(from, to);
        long totalProducts = productClient.countProducts();
        long lowStock      = productClient.countLowStockProducts();

        BigDecimal avgOrderValue = totalOrders > 0
                ? revenue.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return SalesReportDto.builder()
                .from(from).to(to)
                .totalOrders(totalOrders)
                .totalRevenue(revenue)
                .averageOrderValue(avgOrderValue)
                .newUsers(newUsers)
                .totalProducts(totalProducts)
                .lowStockProducts(lowStock)
                .build();
    }

    public void applyDiscount(String productId, double discountPercent) {
        productClient.applyDiscount(productId, discountPercent);
        log.info("Discount {}% applied to product {}", discountPercent, productId);
    }
}
