const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const bcrypt = require('bcrypt');
const db = require('./src/config/db');

const categories = ['Homes', 'Land', 'Vehicles', 'Event Materials'];

const makeUnsplashUrl = (keywords, sig) => {
    const q = encodeURIComponent(keywords.join(','));
    return `https://source.unsplash.com/800x600/?${q}&sig=${sig}`;
};

const owners = [
    { name: 'Abebe Kebede', email: 'owner1@fasillink.com', phone: '0911000001' },
    { name: 'Ebetu Alem', email: 'owner2@fasillink.com', phone: '0911000002' },
    { name: 'Mulugeta Tesfaye', email: 'owner3@fasillink.com', phone: '0911000003' },
    { name: 'Selamawit Demissie', email: 'owner4@fasillink.com', phone: '0911000004' },
    { name: 'Tadesse Worku', email: 'owner5@fasillink.com', phone: '0911000005' },
];

const buildItems = () => {
    const items = [];
    let sig = 1;

    // Homes (19)
    const homeTemplates = [
        ['Modern Villa in Gondar', 'Newly built villa with parking and garden.', 'sell', 3200000, 'Gondar - Kebele 18', ['gondar', 'house', 'villa']],
        ['2-Bedroom Apartment (Azezo)', 'Clean apartment near main road, family-friendly.', 'rent', 12000, 'Gondar - Azezo', ['apartment', 'interior', 'livingroom']],
        ['Studio Room Near Piazza', 'Affordable studio, close to shops and transport.', 'rent', 6500, 'Gondar - Piazza', ['apartment', 'room', 'city']],
        ['Traditional House Renovated', 'Classic style with updated finishing and kitchen.', 'sell', 1800000, 'Gondar - Fasil', ['house', 'architecture', 'ethiopia']],
        ['Family Home 3-Bed', 'Spacious rooms, good ventilation, secure neighborhood.', 'rent', 16000, 'Gondar - Maraki', ['house', 'home', 'garden']],
        ['Office Space (Small)', 'Quiet office space suitable for small business.', 'rent', 9000, 'Gondar - Piazza', ['office', 'workspace', 'desk']],
        ['Shop for Rent', 'Front-facing shop with high foot traffic.', 'rent', 11000, 'Gondar - Arada', ['shop', 'storefront', 'market']],
        ['Guest House Room', 'Short stay room with water and electricity.', 'rent', 3000, 'Gondar - Azezo', ['hotel', 'room', 'bed']],
        ['Luxury Apartment 3-Bed', 'Modern finishing, balcony, and security.', 'rent', 22000, 'Gondar - Kebele 18', ['apartment', 'balcony', 'modern']],
    ];

    for (let i = 0; i < 20; i++) {
        const t = homeTemplates[i % homeTemplates.length];
        items.push({
            title: `${t[0]}${i >= homeTemplates.length ? ` #${i + 1}` : ''}`,
            description: t[1],
            category: 'Homes',
            transaction_type: t[2],
            price: t[3],
            location: t[4],
            keywords: t[5],
            sig: sig++,
        });
    }

    // Land (5)
    const landTemplates = [
        ['Land Plot (200m²)', 'Good location for building a family home.', 'sell', 950000, 'Gondar - Arada', ['land', 'plot', 'construction']],
        ['Residential Land (150m²)', 'Flat land ideal for a new house.', 'sell', 780000, 'Gondar - Azezo', ['land', 'plot', 'residential']],
        ['Commercial Lot Near Road', 'Prime roadside lot for business use.', 'sell', 1650000, 'Gondar - Piazza', ['land', 'commercial', 'lot']],
        ['Agricultural Land Parcel', 'Open parcel suitable for farming use.', 'sell', 540000, 'Gondar - Maraki', ['land', 'farm', 'parcel']],
        ['Land for Lease', 'Long-term lease option in a growing area.', 'sell', 680000, 'Gondar - Fasil', ['land', 'lease', 'plot']],
    ];

    for (let i = 0; i < 5; i++) {
        const t = landTemplates[i % landTemplates.length];
        items.push({
            title: `${t[0]}${i >= landTemplates.length ? ` #${i + 1}` : ''}`,
            description: t[1],
            category: 'Land',
            transaction_type: t[2],
            price: t[3],
            location: t[4],
            keywords: t[5],
            sig: sig++,
        });
    }

    // Vehicles (15)
    const carTemplates = [
        ['Toyota Corolla 2015', 'Well maintained, fuel efficient, city driving.', 'sell', 1200000, 'Gondar - Piazza', ['toyota', 'car', 'sedan']],
        ['Toyota Corolla 2020', 'Clean interior, AC working, low mileage.', 'rent', 1000, 'Gondar - Azezo', ['toyota', 'car', 'rental']],
        ['Bajaj Three Wheeler', 'Good for city transport and small deliveries.', 'sell', 450000, 'Gondar - Arada', ['bajaj', 'tuk-tuk', 'vehicle']],
        ['Motorbike 150cc', 'Strong engine, good for daily commute.', 'sell', 190000, 'Gondar - Maraki', ['motorcycle', 'bike', 'street']],
        ['Isuzu Pickup', 'Powerful pickup for business and transport.', 'rent', 2500, 'Gondar - Fasil', ['pickup', 'truck', 'cargo']],
    ];

    for (let i = 0; i < 15; i++) {
        const t = carTemplates[i % carTemplates.length];
        items.push({
            title: `${t[0]}${i >= carTemplates.length ? ` #${i + 1}` : ''}`,
            description: t[1],
            category: 'Vehicles',
            transaction_type: t[2],
            price: t[3],
            location: t[4],
            keywords: t[5],
            sig: sig++,
        });
    }

    // Event Materials (15)
    const eventTemplates = [
        ['Wedding Tent (Large)', 'Large tent suitable for weddings and ceremonies.', 'rent', 5000, 'Gondar - Arada', ['wedding', 'tent', 'event']],
        ['Plastic Chairs (200 pcs)', 'Clean chairs for events, delivery available.', 'rent', 1200, 'Gondar - Piazza', ['chairs', 'event', 'party']],
        ['Sound System (DJ)', 'Speakers + mixer for parties and announcements.', 'rent', 3000, 'Gondar - Azezo', ['speaker', 'sound system', 'dj']],
        ['Stage Lighting Set', 'LED lights for weddings and concerts.', 'rent', 1800, 'Gondar - Maraki', ['stage', 'lights', 'concert']],
        ['Round Tables (10 pcs)', 'Event tables, good condition.', 'rent', 900, 'Gondar - Fasil', ['table', 'event', 'banquet']],
    ];

    for (let i = 0; i < 15; i++) {
        const t = eventTemplates[i % eventTemplates.length];
        items.push({
            title: `${t[0]}${i >= eventTemplates.length ? ` #${i + 1}` : ''}`,
            description: t[1],
            category: 'Event Materials',
            transaction_type: t[2],
            price: t[3],
            location: t[4],
            keywords: t[5],
            sig: sig++,
        });
    }

    // Attach image URLs
    return items.map((it) => ({
        ...it,
        image_url: makeUnsplashUrl(it.keywords, it.sig),
    }));
};

async function ensureCategories() {
    for (const name of categories) {
        await db.query('INSERT INTO Categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
    }
}

async function upsertOwner(owner, hashedPassword) {
    await db.query(
        `
        INSERT INTO Users (name, email, password, role, is_seller, phone)
        VALUES ($1, $2, $3, 'customer', true, $4)
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            role = 'customer',
            is_seller = true
        `,
        [owner.name, owner.email, hashedPassword, owner.phone]
    );

    const res = await db.query('SELECT id FROM Users WHERE email = $1', [owner.email]);
    return res.rows[0].id;
}

async function upsertCustomer() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const customer = { name: 'Demo Customer', email: 'customer@fasillink.com', phone: '0911999999' };

    await db.query(
        `
        INSERT INTO Users (name, email, password, role, is_seller, phone)
        VALUES ($1, $2, $3, 'customer', false, $4)
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            role = 'customer',
            is_seller = false
        `,
        [customer.name, customer.email, hashedPassword, customer.phone]
    );

    const res = await db.query('SELECT id FROM Users WHERE email = $1', [customer.email]);
    return { id: res.rows[0].id, email: customer.email };
}

async function seedPurchaseHistory(customerId) {
    // Pick a few items across categories to simulate a purchase history.
    const picks = await db.query(
        `
        SELECT i.id, i.owner_id, i.price
        FROM Items i
        ORDER BY i.created_at DESC
        LIMIT 6
        `
    );

    const items = picks.rows;
    if (items.length === 0) return 0;

    let inserted = 0;
    for (let idx = 0; idx < Math.min(items.length, 4); idx++) {
        const it = items[idx];
        const txId = `seed_tx_${idx + 1}`;

        const exists = await db.query('SELECT id FROM Payments WHERE transaction_id = $1', [txId]);
        if (exists.rows.length > 0) continue;

        await db.query(
            `
            INSERT INTO Payments (owner_id, customer_id, item_id, amount, payment_status, transaction_id)
            VALUES ($1, $2, $3, $4, 'completed'::payment_status, $5)
            `,
            [it.owner_id, customerId, it.id, it.price, txId]
        );
        inserted++;
    }

    return inserted;
}

async function seed() {
    console.log('Seeding categories, owners, and items...');
    await ensureCategories();

    const ownerPassword = await bcrypt.hash('password123', 10);
    const ownerIds = [];
    for (const o of owners) {
        const id = await upsertOwner(o, ownerPassword);
        ownerIds.push(id);
    }

    const items = buildItems();

    let inserted = 0;
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const ownerId = ownerIds[i % ownerIds.length];

        const catRes = await db.query('SELECT id FROM Categories WHERE name = $1', [it.category]);
        const categoryId = catRes.rows[0].id;

        const exists = await db.query('SELECT id FROM Items WHERE title = $1 AND owner_id = $2', [it.title, ownerId]);
        if (exists.rows.length > 0) continue;

        const itemRes = await db.query(
            `
            INSERT INTO Items (owner_id, title, description, category_id, transaction_type, price, location, status)
            VALUES ($1, $2, $3, $4, $5::trans_type, $6, $7, 'active')
            RETURNING id
            `,
            [ownerId, it.title, it.description, categoryId, it.transaction_type, it.price, it.location]
        );

        const itemId = itemRes.rows[0].id;
        await db.query('INSERT INTO Media (item_id, media_url, type) VALUES ($1, $2, $3)', [itemId, it.image_url, 'image']);
        inserted++;
    }

    console.log(`Seed complete. Inserted ${inserted} new items.`);
    console.log('Owner login (for posting items): use any owner*@fasillink.com with password: password123');
    const customer = await upsertCustomer();
    const paymentsInserted = await seedPurchaseHistory(customer.id);
    console.log(`Demo customer login: ${customer.email} with password: password123`);
    console.log(`Seeded ${paymentsInserted} completed payments for demo customer (purchase history).`);
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
