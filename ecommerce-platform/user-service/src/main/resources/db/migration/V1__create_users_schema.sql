-- User Service — initial schema migration
-- Uses Flyway for versioned DB migrations

CREATE TABLE IF NOT EXISTS users (
    user_id         VARCHAR(36)  PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    phone_number    VARCHAR(20),
    role            VARCHAR(20)  NOT NULL DEFAULT 'CUSTOMER',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS addresses (
    address_id    VARCHAR(36)  PRIMARY KEY,
    user_id       VARCHAR(36)  NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    full_name     VARCHAR(100) NOT NULL,
    street        VARCHAR(255) NOT NULL,
    city          VARCHAR(100) NOT NULL,
    state         VARCHAR(100) NOT NULL,
    zip_code      VARCHAR(20)  NOT NULL,
    country       VARCHAR(100) NOT NULL,
    phone_number  VARCHAR(20),
    is_default    BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS user_wishlist (
    user_id    VARCHAR(36) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (user_id, product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_email     ON users(email);
CREATE INDEX IF NOT EXISTS idx_address_user   ON addresses(user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
