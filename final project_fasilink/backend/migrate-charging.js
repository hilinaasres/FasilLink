const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
    console.log("Connecting to PostgreSQL database...");
    
    let clientConfig;
    if (process.env.DATABASE_URL) {
        clientConfig = {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        };
    } else {
        clientConfig = {
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'fasil_link',
            password: process.env.DB_PASSWORD || 'password',
            port: process.env.DB_PORT || 5432,
        };
    }

    const client = new Client(clientConfig);

    try {
        await client.connect();
        console.log("Connected successfully. Running migrations...");

        // 1. Create charging_rules table
        console.log("Creating 'charging_rules' table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS charging_rules (
                id SERIAL PRIMARY KEY,
                listing_type VARCHAR(50) NOT NULL,
                transaction_type VARCHAR(50) NOT NULL,
                category VARCHAR(100) NOT NULL,
                min_price DECIMAL(12, 2) NOT NULL,
                max_price DECIMAL(12, 2) NOT NULL,
                fee_percentage DECIMAL(5, 2) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Create item_payments table
        console.log("Creating 'item_payments' table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS item_payments (
                id SERIAL PRIMARY KEY,
                item_id INT REFERENCES Items(id) ON DELETE SET NULL,
                owner_id INT REFERENCES Users(id) ON DELETE CASCADE,
                rule_id INT REFERENCES charging_rules(id) ON DELETE SET NULL,
                item_price DECIMAL(12, 2) NOT NULL,
                fee_amount DECIMAL(12, 2) NOT NULL,
                payment_status VARCHAR(50) DEFAULT 'Pending',
                payment_method VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Seed default charging rules if empty
        const rulesCheck = await client.query('SELECT COUNT(*)::int AS count FROM charging_rules');
        if (rulesCheck.rows[0].count === 0) {
            console.log("Seeding default charging rules...");
            const defaultRules = [
                // New Item Rent Homes
                ['New Item', 'Rent', 'Homes', 0, 5000, 3.00, true],
                ['New Item', 'Rent', 'Homes', 5001, 20000, 5.00, true],
                ['New Item', 'Rent', 'Homes', 20001, 99999999, 8.00, true],
                
                // Renewal Sale Vehicles
                ['Renewal', 'Sale', 'Vehicles', 0, 100000, 7.00, true],
                ['New Item', 'Sale', 'Vehicles', 0, 99999999, 5.00, true],

                // Other generic categories to ensure immediate functionality
                ['New Item', 'Sale', 'Homes', 0, 99999999, 2.00, true],
                ['New Item', 'Rent', 'Vehicles', 0, 99999999, 4.00, true],
                ['New Item', 'Sale', 'Land', 0, 99999999, 6.00, true],
                ['New Item', 'Rent', 'Event Materials', 0, 99999999, 5.00, true],
                ['New Item', 'Sale', 'Electronics', 0, 99999999, 3.00, true],
                ['New Item', 'Sale', 'Fashion', 0, 99999999, 2.50, true],
                ['New Item', 'Sale', 'Services', 0, 99999999, 4.00, true],
                
                ['Renewal', 'Rent', 'Homes', 0, 99999999, 3.00, true],
                ['Renewal', 'Sale', 'Homes', 0, 99999999, 1.50, true],
                ['Renewal', 'Rent', 'Vehicles', 0, 99999999, 3.50, true],
            ];

            for (const r of defaultRules) {
                await client.query(`
                    INSERT INTO charging_rules (listing_type, transaction_type, category, min_price, max_price, fee_percentage, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, r);
            }
            console.log("Successfully seeded default rules.");
        } else {
            console.log("Charging rules already exist in DB. Skipping seed.");
        }

        console.log("Migration complete!");

    } catch (err) {
        console.error("Migration error:", err.message || err);
    } finally {
        await client.end();
        console.log("Database connection closed.");
    }
}

migrate();
