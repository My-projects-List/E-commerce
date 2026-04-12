package com.ecommerce.search.repository;

import com.ecommerce.search.document.ProductSearchDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductSearchRepository
        extends ElasticsearchRepository<ProductSearchDocument, String> {

    Page<ProductSearchDocument> findByCategoryIdAndInStockTrue(String categoryId, Pageable pageable);

    Page<ProductSearchDocument> findByBrandIgnoreCaseAndInStockTrue(String brand, Pageable pageable);
}
