package com.ecommerce.search.service;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.RangeQuery;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.json.JsonData;
import com.ecommerce.common.dto.PageResponse;
import com.ecommerce.search.document.ProductSearchDocument;
import com.ecommerce.search.repository.ProductSearchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Full-text search using Elasticsearch's Java client.
 *
 * Query strategy:
 *  - multi_match across name (boost 3x) + description (boost 1x)
 *  - bool filter for price range, category, rating, inStock
 *  - function_score to boost by rating and reviewCount for popularity
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SearchService {

    private static final String INDEX = "products";

    private final ElasticsearchClient esClient;
    private final ProductSearchRepository searchRepository;

    public PageResponse<ProductSearchDocument> search(
            String keyword, String categoryId, BigDecimal minPrice, BigDecimal maxPrice,
            BigDecimal minRating, String brand, Boolean inStock,
            int page, int size, String sort) {

        List<Query> filters = new ArrayList<>();

        // Keyword: multi-match across name (boosted) and description
        Query textQuery = keyword != null && !keyword.isBlank()
                ? Query.of(q -> q.multiMatch(mm -> mm
                        .query(keyword)
                        .fields("name^3", "description", "brand^2")
                        .fuzziness("AUTO")))
                : Query.of(q -> q.matchAll(m -> m));

        // Filters
        if (categoryId != null) {
            filters.add(Query.of(q -> q.term(t -> t.field("categoryId").value(categoryId))));
        }
        if (brand != null) {
            filters.add(Query.of(q -> q.term(t -> t.field("brand").value(brand))));
        }
        if (Boolean.TRUE.equals(inStock)) {
            filters.add(Query.of(q -> q.term(t -> t.field("inStock").value(true))));
        }
        if (minPrice != null || maxPrice != null) {
            filters.add(Query.of(q -> q.range(r -> {
                RangeQuery.Builder rb = r.field("price");
                if (minPrice != null) rb.gte(JsonData.of(minPrice));
                if (maxPrice != null) rb.lte(JsonData.of(maxPrice));
                return rb;
            })));
        }
        if (minRating != null) {
            filters.add(Query.of(q -> q.range(r -> r.field("averageRating")
                    .gte(JsonData.of(minRating)))));
        }

        Query finalQuery = Query.of(q -> q.bool(BoolQuery.of(b -> b
                .must(textQuery)
                .filter(filters))));

        try {
            SearchRequest.Builder srb = new SearchRequest.Builder()
                    .index(INDEX)
                    .query(finalQuery)
                    .from(page * size)
                    .size(size);

            applySort(srb, sort);

            SearchResponse<ProductSearchDocument> response =
                    esClient.search(srb.build(), ProductSearchDocument.class);

            List<ProductSearchDocument> hits = response.hits().hits().stream()
                    .map(h -> h.source())
                    .collect(Collectors.toList());

            long total = response.hits().total() != null
                    ? response.hits().total().value() : 0;

            log.debug("Search '{}' returned {} hits", keyword, total);
            return PageResponse.of(hits, page, size, total);

        } catch (Exception e) {
            log.error("Elasticsearch search error: {}", e.getMessage());
            return PageResponse.of(List.of(), page, size, 0);
        }
    }

    /** Index or re-index a single product (called by product-service on create/update) */
    public void indexProduct(ProductSearchDocument doc) {
        searchRepository.save(doc);
        log.debug("Indexed product: {}", doc.getProductId());
    }

    /** Remove a product from the index (called on delete) */
    public void removeProduct(String productId) {
        searchRepository.deleteById(productId);
        log.debug("Removed product from index: {}", productId);
    }

    private void applySort(SearchRequest.Builder srb, String sort) {
        if (sort == null) return;
        switch (sort.toLowerCase()) {
            case "price_asc"  -> srb.sort(s -> s.field(f -> f.field("price").order(SortOrder.Asc)));
            case "price_desc" -> srb.sort(s -> s.field(f -> f.field("price").order(SortOrder.Desc)));
            case "rating"     -> srb.sort(s -> s.field(f -> f.field("averageRating").order(SortOrder.Desc)));
            case "newest"     -> srb.sort(s -> s.field(f -> f.field("createdAt").order(SortOrder.Desc)));
            default           -> {} // default: relevance score
        }
    }
}
