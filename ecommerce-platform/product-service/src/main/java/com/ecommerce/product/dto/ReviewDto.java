package com.ecommerce.product.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewDto {
    private String reviewId;
    private String productId;
    private String userId;
    private String userName;

    @Min(1) @Max(5)
    private int rating;

    @Size(max = 1000)
    private String comment;

    private boolean verifiedPurchase;
    private int helpfulCount;
    private LocalDateTime createdAt;
}
