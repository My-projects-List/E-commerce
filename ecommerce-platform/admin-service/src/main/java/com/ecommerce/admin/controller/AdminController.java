package com.ecommerce.admin.controller;

import com.ecommerce.admin.dto.SalesReportDto;
import com.ecommerce.admin.service.AdminReportService;
import com.ecommerce.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * Admin-only endpoints for reports and platform management.
 * All routes require ADMIN role — enforced by the gateway + Spring Security.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminReportService reportService;

    /** GET /api/admin/reports?from=2024-01-01&to=2024-12-31 */
    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<SalesReportDto>> getSalesReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(reportService.generateSalesReport(from, to)));
    }

    /** GET /api/admin/reports/dashboard — quick metrics for the dashboard */
    @GetMapping("/reports/dashboard")
    public ResponseEntity<ApiResponse<SalesReportDto>> getDashboard() {
        LocalDate today = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(
                reportService.generateSalesReport(today.minusDays(30), today)));
    }

    /** POST /api/admin/manage-discounts */
    @PostMapping("/manage-discounts")
    public ResponseEntity<ApiResponse<Void>> manageDiscount(
            @RequestBody DiscountRequest request) {
        reportService.applyDiscount(request.getProductId(), request.getDiscountPercent());
        return ResponseEntity.ok(ApiResponse.success("Discount applied", null));
    }

    record DiscountRequest(String productId, double discountPercent) {}
}
