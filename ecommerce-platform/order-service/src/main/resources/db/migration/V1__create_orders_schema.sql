-- Order Service — initial schema

CREATE TABLE IF NOT EXISTS orders (
    order_id          VARCHAR(36)    PRIMARY KEY,
    user_id           VARCHAR(36)    NOT NULL,
    user_email        VARCHAR(255)   NOT NULL,
    status            VARCHAR(20)    NOT NULL DEFAULT 'CREATED',
    subtotal          NUMERIC(10,2)  NOT NULL,
    shipping_cost     NUMERIC(10,2)  NOT NULL DEFAULT 5.99,
    discount_amount   NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
    total_price       NUMERIC(10,2)  NOT NULL,
    currency          VARCHAR(3)     NOT NULL DEFAULT 'USD',
    shipping_full_name VARCHAR(100),
    shipping_street   VARCHAR(255),
    shipping_city     VARCHAR(100),
    shipping_state    VARCHAR(100),
    shipping_zip      VARCHAR(20),
    shipping_country  VARCHAR(100),
    payment_id        VARCHAR(100),
    tracking_number   VARCHAR(100),
    coupon_code       VARCHAR(50),
    idempotency_key   VARCHAR(100)   UNIQUE,
    cancelled_reason  VARCHAR(500),
    created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivered_at      TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id VARCHAR(36)   PRIMARY KEY,
    order_id      VARCHAR(36)   NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id    VARCHAR(36)   NOT NULL,
    product_name  VARCHAR(255)  NOT NULL,
    sku           VARCHAR(100),
    image_url     VARCHAR(500),
    unit_price    NUMERIC(10,2) NOT NULL,
    quantity      INTEGER       NOT NULL,
    line_total    NUMERIC(10,2) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id  ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_ord ON order_items(order_id);
