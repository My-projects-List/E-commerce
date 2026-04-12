-- Product Service — initial schema

CREATE TABLE IF NOT EXISTS categories (
    category_id        VARCHAR(36)  PRIMARY KEY,
    name               VARCHAR(100) NOT NULL UNIQUE,
    description        VARCHAR(500),
    image_url          VARCHAR(500),
    parent_category_id VARCHAR(36)  REFERENCES categories(category_id),
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
    product_id          VARCHAR(36)    PRIMARY KEY,
    name                VARCHAR(255)   NOT NULL,
    description         TEXT,
    price               NUMERIC(10,2)  NOT NULL,
    original_price      NUMERIC(10,2),
    category_id         VARCHAR(36)    REFERENCES categories(category_id),
    inventory_count     INTEGER        NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER        NOT NULL DEFAULT 10,
    average_rating      NUMERIC(3,2)   NOT NULL DEFAULT 0.00,
    review_count        INTEGER        NOT NULL DEFAULT 0,
    is_active           BOOLEAN        NOT NULL DEFAULT TRUE,
    brand               VARCHAR(100),
    sku                 VARCHAR(100)   UNIQUE,
    weight_kg           NUMERIC(6,3),
    vendor_id           VARCHAR(36),
    created_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_images (
    product_id VARCHAR(36)  NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    image_url  VARCHAR(500) NOT NULL
);

CREATE TABLE IF NOT EXISTS product_attributes (
    product_id VARCHAR(36)  NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    attr_key   VARCHAR(100) NOT NULL,
    attr_value VARCHAR(500),
    PRIMARY KEY (product_id, attr_key)
);

CREATE TABLE IF NOT EXISTS reviews (
    review_id         VARCHAR(36) PRIMARY KEY,
    product_id        VARCHAR(36) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    user_id           VARCHAR(36) NOT NULL,
    user_name         VARCHAR(100) NOT NULL,
    rating            INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment           VARCHAR(1000),
    verified_purchase BOOLEAN     NOT NULL DEFAULT FALSE,
    helpful_count     INTEGER     NOT NULL DEFAULT 0,
    created_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active     ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price      ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_rating     ON products(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_brand      ON products(brand);
CREATE INDEX IF NOT EXISTS idx_reviews_product     ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user        ON reviews(user_id);

-- Seed root categories
INSERT INTO categories (category_id, name, description, is_active) VALUES
    ('cat-electronics',   'Electronics',       'Electronic devices and accessories', TRUE),
    ('cat-clothing',      'Clothing',          'Men, women, and kids apparel',        TRUE),
    ('cat-home',          'Home & Garden',     'Furniture and home decor',            TRUE),
    ('cat-sports',        'Sports & Outdoors', 'Sports equipment and activewear',     TRUE),
    ('cat-books',         'Books',             'Books, eBooks and audiobooks',        TRUE)
ON CONFLICT DO NOTHING;
