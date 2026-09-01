const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function initDb() {
    console.log("Connecting to PostgreSQL...");

    let clientConfig;

    if (process.env.DATABASE_URL) {
        clientConfig = {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false } // Required for Neon
        };
        console.log("Using DATABASE_URL for connection.");
    } else {
        const dbName = process.env.DB_NAME || 'fasil_link';
        const dbNameSql = String(dbName).replace(/"/g, '""');
        // Connect to default 'postgres' database to create 'fasil_link'
        const adminClient = new Client({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_ADMIN_DATABASE || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
            port: process.env.DB_PORT || 5432,
        });

        try {
            await adminClient.connect();
            
            // Check if database exists
            const res = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
            if (res.rowCount === 0) {
                console.log(`Creating database ${dbName}...`);
                await adminClient.query(`CREATE DATABASE "${dbNameSql}"`);
                console.log("Database created.");
            } else {
                console.log(`Database ${dbName} already exists.`);
            }
        } catch (err) {
            console.error("Error creating database (check DB_USER/DB_PASSWORD in backend/.env):", err);
            process.exit(1);
        } finally {
            await adminClient.end();
        }

        // Connect to the new database to run schema
        clientConfig = {
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: dbName,
            password: process.env.DB_PASSWORD || 'password',
            port: process.env.DB_PORT || 5432,
        };
    }

    const client = new Client(clientConfig);

    try {
        await client.connect();
        console.log("Connected to database.");
        
        const schemaPath = path.join(__dirname, '..', 'docs', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schema);
        console.log("Schema successfully loaded.");
    } catch (err) {
        console.error("Error loading schema:", err);
    } finally {
        await client.end();
        console.log("DB Setup Complete.");
    }
}

initDb();
