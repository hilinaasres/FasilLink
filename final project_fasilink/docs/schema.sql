-- PostgreSQL Schema for SRMRS (FasilLink)

-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'owner', 'admin', 'SUPER_ADMIN', 'ADMIN', 'MODERATOR');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE trans_type AS ENUM ('rent', 'sell');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE item_status AS ENUM ('active', 'sold', 'rented', 'expired', 'suspended', 'removed', 'pending_approval', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS Users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'customer',
    is_seller BOOLEAN DEFAULT false,
    profile_image TEXT,
    phone VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Ethiopia',
    city VARCHAR(100) DEFAULT 'Gondar',
    admin_role VARCHAR(32),
    status VARCHAR(50) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_sent_at TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_sent_at TIMESTAMP,
    password_reset_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    icon VARCHAR(64),
    image_url TEXT
);

CREATE TABLE IF NOT EXISTS Items (
    id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES Users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT REFERENCES Categories(id),
    transaction_type trans_type NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    location VARCHAR(255) NOT NULL,
    status item_status DEFAULT 'active',
    rejection_reason TEXT,
    admin_note TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    payment_status payment_status DEFAULT 'pending',
    payment_method VARCHAR(64),
    transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE Payments ADD COLUMN IF NOT EXISTS customer_id INT;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payments_customer_fk'
    ) THEN
        ALTER TABLE Payments
        ADD CONSTRAINT payments_customer_fk
        FOREIGN KEY (customer_id) REFERENCES Users(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS Messages (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES Users(id) ON DELETE CASCADE,
    receiver_id INT REFERENCES Users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE Messages ADD COLUMN IF NOT EXISTS item_id INT;

CREATE TABLE IF NOT EXISTS user_favorites (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(id) ON DELETE CASCADE,
    item_id INT REFERENCES Items(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS Ratings (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(id) ON DELETE CASCADE,
    item_id INT REFERENCES Items(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS Settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS AuditLogs (
    id SERIAL PRIMARY KEY,
    admin_id INT REFERENCES Users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Recommendations (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(id) ON DELETE CASCADE,
    item_id INT REFERENCES Items(id) ON DELETE CASCADE,
    score DECIMAL(5, 4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Reports (
    id SERIAL PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data JSONB
);

CREATE TABLE IF NOT EXISTS Announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search Index Table for advanced search functionality
CREATE TABLE IF NOT EXISTS ItemSearchIndex (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES Items(id) ON DELETE CASCADE,
    search_text TEXT NOT NULL,
    search_vector TSVECTOR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_item_search_vector ON ItemSearchIndex USING GIN (search_vector);

-- Create trigram indexes for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_item_search_text_trgm ON ItemSearchIndex USING GIN (search_text gin_trgm_ops);

-- Function to update search index
CREATE OR REPLACE FUNCTION update_item_search_index()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete existing entries for this item
    DELETE FROM ItemSearchIndex WHERE item_id = COALESCE(NEW.id, OLD.id);

    -- Insert new search data if item is being inserted/updated and is active
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.status = 'active' THEN
        INSERT INTO ItemSearchIndex (item_id, search_text, search_vector)
        SELECT
            NEW.id,
            CONCAT_WS(' ',
                NEW.title,
                NEW.description,
                NEW.location,
                COALESCE(c.name, ''),
                NEW.transaction_type
            ),
            to_tsvector('english',
                CONCAT_WS(' ',
                    NEW.title,
                    NEW.description,
                    NEW.location,
                    COALESCE(c.name, ''),
                    NEW.transaction_type
                )
            )
        FROM Categories c
        WHERE c.id = NEW.category_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain search index
DROP TRIGGER IF EXISTS trigger_update_item_search_index ON Items;
CREATE TRIGGER trigger_update_item_search_index
    AFTER INSERT OR UPDATE OR DELETE ON Items
    FOR EACH ROW EXECUTE FUNCTION update_item_search_index();

-- Function for fuzzy search with ranking
CREATE OR REPLACE FUNCTION fuzzy_item_search(
    search_query TEXT,
    category_filter TEXT DEFAULT NULL,
    transaction_filter TEXT DEFAULT NULL,
    min_price NUMERIC DEFAULT NULL,
    max_price NUMERIC DEFAULT NULL,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(255),
    description TEXT,
    transaction_type trans_type,
    price DECIMAL(10, 2),
    location VARCHAR(255),
    status item_status,
    created_at TIMESTAMP,
    category VARCHAR(255),
    image_url TEXT,
    avg_rating NUMERIC,
    rating_count INTEGER,
    search_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.title,
        i.description,
        i.transaction_type,
        i.price,
        i.location,
        i.status,
        i.created_at,
        c.name AS category,
        m.media_url AS image_url,
        COALESCE(r.avg_rating, 0) AS avg_rating,
        COALESCE(r.rating_count, 0) AS rating_count,
        ts_rank(si.search_vector, plainto_tsquery('english', search_query)) +
        similarity(si.search_text, search_query) * 0.3 AS search_rank
    FROM Items i
    LEFT JOIN Categories c ON c.id = i.category_id
    LEFT JOIN ItemSearchIndex si ON si.item_id = i.id
    LEFT JOIN LATERAL (
        SELECT media_url
        FROM Media
        WHERE item_id = i.id
        ORDER BY id ASC
        LIMIT 1
    ) m ON true
    LEFT JOIN (
        SELECT item_id, AVG(rating)::numeric(10,2) AS avg_rating, COUNT(*)::int AS rating_count
        FROM Ratings
        GROUP BY item_id
    ) r ON r.item_id = i.id
    WHERE i.status = 'active'
      AND (search_query IS NULL OR search_query = '' OR
           si.search_vector @@ plainto_tsquery('english', search_query) OR
           si.search_text % search_query)
      AND (category_filter IS NULL OR c.name = category_filter)
      AND (transaction_filter IS NULL OR i.transaction_type::text = transaction_filter)
      AND (min_price IS NULL OR i.price >= min_price)
      AND (max_price IS NULL OR i.price <= max_price)
    ORDER BY search_rank DESC, i.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function for autocomplete suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
    prefix TEXT,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    suggestion TEXT,
    type TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    -- Title suggestions
    (SELECT DISTINCT
        i.title::TEXT as suggestion,
        'title'::TEXT as type,
        COUNT(*)::INTEGER as count
    FROM Items i
    WHERE i.status = 'active'
      AND i.title ILIKE prefix || '%'
    GROUP BY i.title
    ORDER BY count DESC, i.title
    LIMIT limit_count)

    UNION ALL

    -- Location suggestions
    (SELECT DISTINCT
        i.location::TEXT as suggestion,
        'location'::TEXT as type,
        COUNT(*)::INTEGER as count
    FROM Items i
    WHERE i.status = 'active'
      AND i.location ILIKE prefix || '%'
    GROUP BY i.location
    ORDER BY count DESC, i.location
    LIMIT limit_count)

    UNION ALL

    -- Category suggestions
    (SELECT DISTINCT
        c.name::TEXT as suggestion,
        'category'::TEXT as type,
        COUNT(*)::INTEGER as count
    FROM Items i
    JOIN Categories c ON c.id = i.category_id
    WHERE i.status = 'active'
      AND c.name ILIKE prefix || '%'
    GROUP BY c.name
    ORDER BY count DESC, c.name
    LIMIT limit_count)

    ORDER BY count DESC, suggestion
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;