-- FasilLink PostgreSQL schema.
-- This file creates structure only. It does not insert users, passwords, or other data.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
    CREATE TYPE user_role AS ENUM (
        'customer', 'owner', 'admin', 'SUPER_ADMIN', 'ADMIN', 'MODERATOR'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE trans_type AS ENUM ('rent', 'sell');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE item_status AS ENUM (
        'active', 'sold', 'rented', 'expired', 'suspended', 'removed',
        'pending_approval', 'pending_payment', 'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE payment_status AS ENUM (
        'pending', 'completed', 'failed', 'refunded', 'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS Users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    is_seller BOOLEAN NOT NULL DEFAULT FALSE,
    profile_image TEXT,
    phone VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Ethiopia',
    city VARCHAR(100) DEFAULT 'Gondar',
    admin_role VARCHAR(32),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_sent_at TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_sent_at TIMESTAMP,
    password_reset_expires_at TIMESTAMP,
    business_name VARCHAR(255),
    address TEXT,
    bio TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    icon VARCHAR(64),
    image_url TEXT,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    category_config JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS Items (
    id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES Users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT REFERENCES Categories(id) ON DELETE SET NULL,
    transaction_type trans_type NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    location VARCHAR(255) NOT NULL,
    status item_status NOT NULL DEFAULT 'active',
    rejection_reason TEXT,
    admin_note TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    contact_phone VARCHAR(20),
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    premium BOOLEAN NOT NULL DEFAULT FALSE,
    listing_fee NUMERIC,
    legal_document TEXT,
    subcity VARCHAR(100),
    kebele VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Media (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES Items(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    type VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS Payments (
    id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES Users(id) ON DELETE CASCADE,
    customer_id INT REFERENCES Users(id) ON DELETE SET NULL,
    item_id INT REFERENCES Items(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(64),
    transaction_id VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Messages (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES Users(id) ON DELETE CASCADE,
    receiver_id INT REFERENCES Users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    item_id INT REFERENCES Items(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_favorites (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(id) ON DELETE CASCADE,
    item_id INT REFERENCES Items(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS Ratings (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(id) ON DELETE CASCADE,
    item_id INT REFERENCES Items(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS Settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS AuditLogs (
    id SERIAL PRIMARY KEY,
    admin_id INT REFERENCES Users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Recommendations (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(id) ON DELETE CASCADE,
    item_id INT REFERENCES Items(id) ON DELETE CASCADE,
    score DECIMAL(5, 4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Reports (
    id SERIAL PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data JSONB
);

CREATE TABLE IF NOT EXISTS Announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ItemSearchIndex (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES Items(id) ON DELETE CASCADE,
    search_text TEXT NOT NULL,
    search_vector TSVECTOR,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS charging_rules (
    id SERIAL PRIMARY KEY,
    listing_type VARCHAR(100) NOT NULL,
    transaction_type VARCHAR(100) NOT NULL,
    category VARCHAR(255) NOT NULL,
    min_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    max_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    fee_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS item_payments (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES Items(id) ON DELETE SET NULL,
    owner_id INT REFERENCES Users(id) ON DELETE CASCADE,
    rule_id INT REFERENCES charging_rules(id) ON DELETE SET NULL,
    item_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    fee_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(100) NOT NULL DEFAULT 'Pending',
    payment_method VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_items_owner_id ON Items (owner_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON Items (status);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON Items (category_id);
CREATE INDEX IF NOT EXISTS idx_media_item_id ON Media (item_id);
CREATE INDEX IF NOT EXISTS idx_messages_item_id ON Messages (item_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver_item
    ON Messages (sender_id, receiver_id, item_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_item_id ON Ratings (item_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read
    ON Notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_item_payments_item_id ON item_payments (item_id);
CREATE INDEX IF NOT EXISTS idx_item_payments_owner_id ON item_payments (owner_id);
CREATE INDEX IF NOT EXISTS idx_item_search_vector
    ON ItemSearchIndex USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_item_search_text_trgm
    ON ItemSearchIndex USING GIN (search_text gin_trgm_ops);

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ratings_set_updated_at ON Ratings;
CREATE TRIGGER ratings_set_updated_at
BEFORE UPDATE ON Ratings
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE OR REPLACE FUNCTION update_item_search_index()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM ItemSearchIndex
    WHERE item_id = COALESCE(NEW.id, OLD.id);

    IF TG_OP <> 'DELETE' AND NEW.status = 'active' THEN
        INSERT INTO ItemSearchIndex (item_id, search_text, search_vector)
        SELECT
            NEW.id,
            CONCAT_WS(' ', NEW.title, NEW.description, NEW.location,
                      COALESCE(c.name, ''), NEW.transaction_type),
            to_tsvector(
                'english',
                CONCAT_WS(' ', NEW.title, NEW.description, NEW.location,
                          COALESCE(c.name, ''), NEW.transaction_type)
            )
        FROM Categories c
        WHERE c.id = NEW.category_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_item_search_index ON Items;
CREATE TRIGGER trigger_update_item_search_index
AFTER INSERT OR UPDATE OR DELETE ON Items
FOR EACH ROW EXECUTE FUNCTION update_item_search_index();

-- Tables created:
-- Users, Categories, Items, Media, Payments, Messages, user_favorites,
-- Ratings, Settings, AuditLogs, Recommendations, Reports, Announcements,
-- Notifications, ItemSearchIndex, charging_rules, item_payments.
--
-- Notes and uncertainties:
-- 1. Existing deployments may already have different enum/table definitions;
--    CREATE TABLE IF NOT EXISTS does not alter an existing table.
-- 2. item_payments.item_id was defined with conflicting delete behavior in
--    older scripts; this schema uses ON DELETE SET NULL because the column is
--    nullable and payment history should survive item deletion.
-- 3. Items.listing_fee has no precision specified by application code, so it
--    remains NUMERIC.
-- 4. The application does not require uniqueness for Payments.transaction_id
--    or ItemSearchIndex.item_id, so neither is made unique here.
-- 5. No seed data or default admin row is included.
