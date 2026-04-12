package com.ecommerce.product.service.impl;

import com.ecommerce.common.dto.PageResponse;
import com.ecommerce.common.exception.EcommerceException;
import com.ecommerce.common.exception.ResourceNotFoundException;
import com.ecommerce.common.kafka.KafkaTopics;
import com.ecommerce.product.dto.CreateProductRequest;
import com.ecommerce.product.dto.ProductDto;
import com.ecommerce.product.dto.ReviewDto;
import com.ecommerce.product.entity.Category;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.entity.Review;
import com.ecommerce.product.repository.CategoryRepository;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.repository.ReviewRepository;
import com.ecommerce.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ReviewRepository reviewRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // ---- Product CRUD ----

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductDto createProduct(CreateProductRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));

        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .originalPrice(request.getOriginalPrice())
                .category(category)
                .inventoryCount(request.getInventoryCount())
                .brand(request.getBrand())
                .sku(request.getSku())
                .weightKg(request.getWeightKg())
                .imageUrls(request.getImageUrls() != null ? request.getImageUrls() : List.of())
                .attributes(request.getAttributes() != null ? request.getAttributes() : Map.of())
                .vendorId(request.getVendorId())
                .build();

        product = productRepository.save(product);
        log.info("Product created: {}", product.getProductId());
        return mapToDto(product);
    }

    @Override
    @Cacheable(value = "products", key = "#productId")
    @Transactional(readOnly = true)
    public ProductDto getProductById(String productId) {
        return mapToDto(findActiveProduct(productId));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductDto> getProducts(int page, int size, String sort) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<Product> productPage = productRepository.findByIsActiveTrue(pageable);
        return toPageResponse(productPage);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductDto> getProductsByCategory(String categoryId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Product> productPage = productRepository.findByCategoryCategoryIdAndIsActiveTrue(categoryId, pageable);
        return toPageResponse(productPage);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductDto> filterProducts(String categoryId, BigDecimal minPrice,
                                                    BigDecimal maxPrice, BigDecimal minRating,
                                                    String brand, int page, int size, String sort) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<Product> productPage = productRepository.findWithFilters(
                categoryId, minPrice, maxPrice, minRating, brand, pageable);
        return toPageResponse(productPage);
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", key = "#productId")
    public ProductDto updateProduct(String productId, CreateProductRequest request) {
        Product product = findActiveProduct(productId);

        if (request.getName() != null)          product.setName(request.getName());
        if (request.getDescription() != null)   product.setDescription(request.getDescription());
        if (request.getPrice() != null)         product.setPrice(request.getPrice());
        if (request.getInventoryCount() >= 0)   product.setInventoryCount(request.getInventoryCount());
        if (request.getBrand() != null)         product.setBrand(request.getBrand());
        if (request.getImageUrls() != null)     product.setImageUrls(request.getImageUrls());

        return mapToDto(productRepository.save(product));
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", key = "#productId")
    public void deleteProduct(String productId) {
        Product product = findActiveProduct(productId);
        product.setActive(false);
        productRepository.save(product);
        log.info("Product soft-deleted: {}", productId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductDto> getProductsByIds(List<String> productIds) {
        return productRepository.findByProductIdInAndIsActiveTrue(productIds)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // ---- Inventory ----

    @Override
    @Transactional
    public void reserveInventory(String productId, int quantity) {
        int updated = productRepository.decrementInventory(productId, quantity);
        if (updated == 0) {
            throw new EcommerceException(
                "Insufficient inventory for product: " + productId,
                HttpStatus.CONFLICT, "INSUFFICIENT_INVENTORY");
        }

        // Check for low stock and emit event
        Product product = findActiveProduct(productId);
        if (product.getInventoryCount() <= product.getLowStockThreshold()) {
            kafkaTemplate.send(KafkaTopics.INVENTORY_LOW_STOCK,
                    Map.of("productId", productId, "remaining", product.getInventoryCount()));
        }
    }

    @Override
    @Transactional
    public void releaseInventory(String productId, int quantity) {
        productRepository.incrementInventory(productId, quantity);
    }

    // ---- Reviews ----

    @Override
    @Transactional
    public ReviewDto addReview(String productId, String userId, String userName, ReviewDto dto) {
        Product product = findActiveProduct(productId);

        Review review = Review.builder()
                .product(product)
                .userId(userId)
                .userName(userName)
                .rating(dto.getRating())
                .comment(dto.getComment())
                .build();

        review = reviewRepository.save(review);

        // Recalculate and persist aggregate rating
        Double avgRating = reviewRepository.calculateAverageRating(productId);
        long count = reviewRepository.countByProductProductId(productId);
        productRepository.updateRatingStats(
                productId,
                BigDecimal.valueOf(avgRating).setScale(2, RoundingMode.HALF_UP),
                (int) count);

        return mapReviewToDto(review);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ReviewDto> getReviews(String productId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Review> reviewPage = reviewRepository.findByProductProductId(productId, pageable);
        return PageResponse.of(
                reviewPage.getContent().stream().map(this::mapReviewToDto).collect(Collectors.toList()),
                page, size, reviewPage.getTotalElements());
    }

    // ---- Helpers ----

    private Product findActiveProduct(String productId) {
        return productRepository.findById(productId)
                .filter(Product::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "productId", productId));
    }

    private ProductDto mapToDto(Product p) {
        return ProductDto.builder()
                .productId(p.getProductId())
                .name(p.getName())
                .description(p.getDescription())
                .price(p.getPrice())
                .originalPrice(p.getOriginalPrice())
                .categoryId(p.getCategory() != null ? p.getCategory().getCategoryId() : null)
                .categoryName(p.getCategory() != null ? p.getCategory().getName() : null)
                .inventoryCount(p.getInventoryCount())
                .inStock(p.getInventoryCount() > 0)
                .averageRating(p.getAverageRating())
                .reviewCount(p.getReviewCount())
                .brand(p.getBrand())
                .sku(p.getSku())
                .imageUrls(p.getImageUrls())
                .attributes(p.getAttributes())
                .createdAt(p.getCreatedAt())
                .build();
    }

    private ReviewDto mapReviewToDto(Review r) {
        return ReviewDto.builder()
                .reviewId(r.getReviewId())
                .productId(r.getProduct().getProductId())
                .userId(r.getUserId())
                .userName(r.getUserName())
                .rating(r.getRating())
                .comment(r.getComment())
                .verifiedPurchase(r.isVerifiedPurchase())
                .helpfulCount(r.getHelpfulCount())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private PageResponse<ProductDto> toPageResponse(Page<Product> page) {
        return PageResponse.of(
                page.getContent().stream().map(this::mapToDto).collect(Collectors.toList()),
                page.getNumber(), page.getSize(), page.getTotalElements());
    }

    private Sort parseSort(String sort) {
        if (sort == null) return Sort.by("createdAt").descending();
        return switch (sort.toLowerCase()) {
            case "price_asc"    -> Sort.by("price").ascending();
            case "price_desc"   -> Sort.by("price").descending();
            case "rating"       -> Sort.by("averageRating").descending();
            case "newest"       -> Sort.by("createdAt").descending();
            case "popular"      -> Sort.by("reviewCount").descending();
            default             -> Sort.by("createdAt").descending();
        };
    }
}
