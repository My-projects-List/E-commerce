-- Payment Service — initial schema

CREATE TABLE IF NOT EXISTS payments (
    payment_id                VARCHAR(36)   PRIMARY KEY,
    order_id                  VARCHAR(36)   NOT NULL,
    user_id                   VARCHAR(36)   NOT NULL,
    amount                    NUMERIC(10,2) NOT NULL,
    currency                  VARCHAR(3)    NOT NULL DEFAULT 'USD',
    status                    VARCHAR(30)   NOT NULL DEFAULT 'INITIATED',
    stripe_payment_intent_id  VARCHAR(100),
    stripe_payment_method_id  VARCHAR(100),
    failure_code              VARCHAR(100),
    failure_message           VARCHAR(500),
    retry_count               INTEGER       NOT NULL DEFAULT 0,
    refund_id                 VARCHAR(100),
    created_at                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_order   ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user    ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_intent  ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status  ON payments(status);
