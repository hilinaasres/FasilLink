const bcrypt = require('bcrypt');
const db = require('../config/db');

const ensureSchema = async () => {
  // Keep this idempotent and safe to run on every boot.
  // It allows new features to work without forcing users to re-run setup-db manually.

  await db.query(`ALTER TABLE IF EXISTS Messages ADD COLUMN IF NOT EXISTS item_id INT;`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS admin_role VARCHAR(32);`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS is_seller BOOLEAN DEFAULT false;`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS profile_image TEXT;`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Ethiopia';`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Gondar';`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS address TEXT;`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS bio TEXT;`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMP;`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS password_reset_sent_at TIMESTAMP;`);
  await db.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP;`);
  await db.query(`ALTER TABLE IF EXISTS Items ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);`);
  await db.query(`ALTER TABLE IF EXISTS Items ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`);
  await db.query(`ALTER TABLE IF EXISTS Items ADD COLUMN IF NOT EXISTS admin_note TEXT;`);
  await db.query(`ALTER TABLE IF EXISTS Payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(64);`);
  await db.query(`ALTER TABLE IF EXISTS Payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`);
  await db.query(`ALTER TABLE IF EXISTS Categories ADD COLUMN IF NOT EXISTS icon VARCHAR(64);`);
  await db.query(`ALTER TABLE IF EXISTS Categories ADD COLUMN IF NOT EXISTS image_url TEXT;`);
  await db.query(`ALTER TABLE IF EXISTS Categories ADD COLUMN IF NOT EXISTS description TEXT;`);
  await db.query(`ALTER TABLE IF EXISTS Categories ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;`);
  await db.query(`ALTER TABLE IF EXISTS Categories ADD COLUMN IF NOT EXISTS category_config JSONB DEFAULT '{}'::jsonb;`);
  await db.query(`ALTER TABLE IF EXISTS Items ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;`);
  await db.query(`ALTER TABLE IF EXISTS Items ADD COLUMN IF NOT EXISTS premium BOOLEAN DEFAULT false;`);
  await db.query(`ALTER TABLE IF EXISTS Items ADD COLUMN IF NOT EXISTS listing_fee NUMERIC;`);
  await db.query(`ALTER TABLE IF EXISTS Items ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`);
  await db.query(`ALTER TABLE IF EXISTS Items ADD COLUMN IF NOT EXISTS legal_document TEXT;`);
  await db.query(`ALTER TABLE IF EXISTS Items ADD COLUMN IF NOT EXISTS subcity VARCHAR(100);`);
  await db.query(`ALTER TABLE IF EXISTS Items ADD COLUMN IF NOT EXISTS kebele VARCHAR(50);`);
  await db.query(`ALTER TABLE IF EXISTS Items ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES Users(id) ON DELETE CASCADE,
      item_id INT REFERENCES Items(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, item_id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS Ratings (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES Users(id) ON DELETE CASCADE,
      item_id INT REFERENCES Items(id) ON DELETE CASCADE,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, item_id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS Settings (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
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
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id SERIAL PRIMARY KEY,
      email VARCHAR(320) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const defaultAdminEmail = process.env.ADMIN_EMAIL || 'admin@fasillink.com';
  const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const defaultAdminName = process.env.ADMIN_NAME || 'FasilLink Admin';

  const existingAdmin = await db.query(
    `SELECT 1 FROM Users WHERE UPPER(role::TEXT) IN ('ADMIN', 'SUPER_ADMIN', 'MODERATOR') LIMIT 1`
  );

  if (existingAdmin.rows.length === 0) {
    const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
    await db.query(
      `INSERT INTO Users (name, email, password, role, is_seller, status, admin_role)
       VALUES ($1, $2, $3, 'admin', FALSE, 'active', 'ADMIN')
       ON CONFLICT (email) DO NOTHING`,
      [defaultAdminName, defaultAdminEmail, hashedPassword]
    );
    console.log(`[DB] Default admin user ensured: ${defaultAdminEmail}`);
  }

  try {
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUPER_ADMIN' AND enumtypid = 'user_role'::regtype) THEN
          ALTER TYPE user_role ADD VALUE 'SUPER_ADMIN';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMIN' AND enumtypid = 'user_role'::regtype) THEN
          ALTER TYPE user_role ADD VALUE 'ADMIN';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MODERATOR' AND enumtypid = 'user_role'::regtype) THEN
          ALTER TYPE user_role ADD VALUE 'MODERATOR';
        END IF;
      END $$;
    `);
  } catch (error) {
    // ignore migration issues if enum values already exist or if the DB is locked.
  }

  try {
    await db.query(`
      DO $$
      BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_approval' AND enumtypid = 'item_status'::regtype) THEN
          ALTER TYPE item_status ADD VALUE 'pending_approval';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_payment' AND enumtypid = 'item_status'::regtype) THEN
          ALTER TYPE item_status ADD VALUE 'pending_payment';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = 'item_status'::regtype) THEN
          ALTER TYPE item_status ADD VALUE 'rejected';
        END IF;
      END $$;
    `);
  } catch (error) {
    // ignore migration issues if enum values already exist.
  }

  try {
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'refunded' AND enumtypid = 'payment_status'::regtype) THEN
          ALTER TYPE payment_status ADD VALUE 'refunded';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = 'payment_status'::regtype) THEN
          ALTER TYPE payment_status ADD VALUE 'cancelled';
        END IF;
      END $$;
    `);
  } catch (error) {
    // ignore migration issues if enum values already exist.
  }

  try {
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp') THEN
          CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        END IF;
      END $$;
    `);

    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_trigger
          WHERE tgname = 'ratings_set_updated_at'
        ) THEN
          CREATE TRIGGER ratings_set_updated_at
          BEFORE UPDATE ON Ratings
          FOR EACH ROW
          EXECUTE FUNCTION set_updated_at_timestamp();
        END IF;
      END $$;
    `);
  } catch {
    // ignore
  }

  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_ratings_item_id ON Ratings(item_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_messages_item_id ON Messages(item_id);`);

  // Create charging rules and payments tables
  await db.query(`
    CREATE TABLE IF NOT EXISTS charging_rules (
      id SERIAL PRIMARY KEY,
      listing_type VARCHAR(100) NOT NULL,
      transaction_type VARCHAR(100) NOT NULL,
      category VARCHAR(255) NOT NULL,
      min_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
      max_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
      fee_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS item_payments (
      id SERIAL PRIMARY KEY,
      item_id INT REFERENCES Items(id) ON DELETE CASCADE,
      owner_id INT REFERENCES Users(id) ON DELETE CASCADE,
      rule_id INT REFERENCES charging_rules(id) ON DELETE SET NULL,
      item_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
      fee_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
      payment_status VARCHAR(100) NOT NULL DEFAULT 'Pending',
      payment_method VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default charging rules if empty
  try {
    const existingRules = await db.query('SELECT 1 FROM charging_rules LIMIT 1');
    if (existingRules.rows.length === 0) {
      await db.query(`
        INSERT INTO charging_rules (listing_type, transaction_type, category, min_price, max_price, fee_percentage, is_active)
        VALUES 
          ('New Item', 'Rent', 'Homes', 0.00, 5000.00, 3.00, TRUE),
          ('New Item', 'Rent', 'Homes', 5001.00, 20000.00, 5.00, TRUE),
          ('Renewal', 'Sale', 'Vehicles', 0.00, 100000.00, 7.00, TRUE),
          ('New Item', 'Sale', 'Homes', 0.00, 200000.00, 2.00, TRUE),
          ('New Item', 'Sale', 'Electronics', 0.00, 5000.00, 3.00, TRUE),
          ('New Item', 'Sale', 'Electronics', 5001.00, 1000000.00, 5.00, TRUE)
      `);
      console.log('[DB] Seeded default charging rules.');
    }
  } catch (error) {
    console.error('[DB] Seeding charging rules failed:', error);
  }
};

module.exports = { ensureSchema };
