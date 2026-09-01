// --- AI Similar Items Recommendation ---
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// ── Cloudinary setup ──────────────────────────────────────────────────────────
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (buffer, publicId) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'fasillink', public_id: publicId, resource_type: 'auto' },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};

const placeholderImageUrl = 'https://via.placeholder.com/800x600?text=No+Image+Available';

const STOPWORDS = new Set([
    'and', 'or', 'the', 'a', 'an', 'to', 'for', 'of', 'in', 'on', 'at', 'with', 'near', 'around',
    'buy', 'sell', 'rent', 'listing', 'item', 'items', 'house', 'home', 'property', 'properties',
]);

const tokenize = (text) => String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));

const normalizeLocationText = (value) => String(value || '').trim().toLowerCase();
const normalizeText = (value) => String(value || '').trim().toLowerCase();

const getLocationTokens = (item) => {
    const tokens = new Set();
    [item?.location, item?.subcity, item?.kebele].forEach((value) => {
        const text = normalizeLocationText(value);
        if (!text) return;
        tokens.add(text);
        text.split(/[,\-/]+/).map((part) => part.trim()).filter(Boolean).forEach((part) => tokens.add(part));
    });
    return tokens;
};

const stringHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const sanitizeMediaUrl = (mediaUrl) => {
    if (!mediaUrl) return placeholderImageUrl;
    if (typeof mediaUrl === 'string' && mediaUrl.includes('source.unsplash.com')) {
        const randomId = stringHash(mediaUrl) % 1000;
        return `https://picsum.photos/800/600?random=${randomId}`;
    }
    if (typeof mediaUrl === 'string' && mediaUrl.includes('cloudinary.com')) {
        return mediaUrl;
    }
    const uploadsSegment = '/uploads/';
    const uploadsIndex = String(mediaUrl).indexOf(uploadsSegment);
    if (uploadsIndex === -1) return mediaUrl;
    const relativePath = mediaUrl.substring(uploadsIndex + uploadsSegment.length);
    const localPath = path.join(__dirname, '..', '..', 'uploads', relativePath);
    if (fs.existsSync(localPath)) return mediaUrl;
    return placeholderImageUrl;
};

const normalizeCategory = (category) => {
    if (!category) return null;
    const c = String(category).toLowerCase();
    if (c === 'homes' || c === 'home' || c === 'properties' || c === 'property') return 'Homes';
    if (c === 'land' || c === 'lands' || c === 'plot' || c === 'plots' || c === 'lot' || c === 'lots') return 'Land';
    if (c === 'vehicles' || c === 'vehicle' || c === 'cars' || c === 'car') return 'Vehicles';
    if (c === 'events' || c === 'event' || c === 'event-materials' || c === 'event rentals' || c === 'event materials') return 'Event Materials';
    return category;
};

// ── Unique tx_ref helper ──────────────────────────────────────────────────────
const makeTxRef = (prefix) =>
    `${prefix}_${Math.random().toString(36).slice(2, 12)}_${Math.random().toString(36).slice(2, 12)}`;
// ─────────────────────────────────────────────────────────────────────────────

const publicItemSelect = `
    SELECT
        i.id,
        i.category_id,
        i.title,
        i.description,
        i.transaction_type,
        i.transaction_type AS purpose,
        i.price,
        i.location,
        i.subcity,
        i.kebele,
        i.metadata,
        i.status,
        i.created_at,
        i.featured,
        i.premium,
        c.name AS category,
        m.media_url AS image_url,
        m.media_url AS image,
        COALESCE(r.avg_rating, 0) AS avg_rating,
        COALESCE(r.avg_rating, 0) AS rating,
        COALESCE(r.rating_count, 0) AS rating_count,
        COALESCE(r.rating_count, 0) AS reviews
    FROM Items i
    LEFT JOIN Categories c ON c.id = i.category_id
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
`;

const mapPublicItem = (row) => {
    const imageUrl = sanitizeMediaUrl(row.image_url || row.image);
    return {
        ...row,
        image_url: imageUrl,
        image: imageUrl,
        isPremium: Boolean(row.premium),
        rating: Number(row.rating || row.avg_rating || 0),
        reviews: Number(row.reviews || row.rating_count || 0),
    };
};

const getSimilarItems = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: 'Invalid item id' });
        }
        const targetRes = await db.query(`${publicItemSelect} WHERE i.id = $1`, [id]);
        const target = targetRes.rows[0];
        if (!target) return res.status(404).json({ error: 'Item not found' });
        const candidateRes = await db.query(
            `${publicItemSelect} WHERE i.status = 'active' AND i.id != $1 ORDER BY i.premium DESC, i.featured DESC, i.created_at DESC LIMIT 120`,
            [id]
        );
        const targetTokens = new Set(tokenize(`${target.title} ${target.description}`));
        const targetLocationTokens = getLocationTokens(target);
        const targetPrice = Number(target.price || 0);
        const targetTx = String(target.transaction_type || target.purpose || '').toLowerCase();
        const targetCategoryId = Number(target.category_id || 0);
        const targetCategory = normalizeText(target.category || '');

        const scored = candidateRes.rows.map((candidate) => {
            let score = 0;

            const candidateCategoryId = Number(candidate.category_id || 0);
            const candidateCategory = normalizeText(candidate.category || '');
            const candidateTx = String(candidate.transaction_type || candidate.purpose || '').toLowerCase();
            const candidatePrice = Number(candidate.price || 0);
            const candidateTokens = new Set(tokenize(`${candidate.title} ${candidate.description}`));
            const candidateLocationTokens = getLocationTokens(candidate);

            if (targetCategoryId && candidateCategoryId && targetCategoryId === candidateCategoryId) score += 40;
            else if (targetCategory && candidateCategory && targetCategory === candidateCategory) score += 25;

            if (targetTx && candidateTx && targetTx === candidateTx) score += 20;

            if (targetPrice > 0 && Number.isFinite(candidatePrice) && candidatePrice > 0) {
                const diffRatio = Math.abs(candidatePrice - targetPrice) / targetPrice;
                if (diffRatio <= 0.1) score += 15;
                else if (diffRatio <= 0.2) score += 12;
                else if (diffRatio <= 0.35) score += 8;
                else if (diffRatio <= 0.5) score += 4;
            }

            let locationScore = 0;
            for (const token of targetLocationTokens) {
                if (candidateLocationTokens.has(token)) locationScore += 10;
                else {
                    const candidateLocation = normalizeLocationText(candidate.location);
                    const candidateSubcity = normalizeLocationText(candidate.subcity);
                    const candidateKebele = normalizeLocationText(candidate.kebele);
                    if (token && (
                        candidateLocation.includes(token) || token.includes(candidateLocation) ||
                        candidateSubcity.includes(token) || token.includes(candidateSubcity) ||
                        candidateKebele.includes(token) || token.includes(candidateKebele)
                    )) {
                        locationScore += 6;
                    }
                }
            }
            score += Math.min(locationScore, 20);

            let keywordScore = 0;
            for (const token of targetTokens) {
                if (candidateTokens.has(token)) keywordScore += 2;
            }
            score += Math.min(keywordScore, 12);

            if (candidate.premium) score += 2;
            if (candidate.featured) score += 1;

            return { ...candidate, score };
        });

        scored.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (Boolean(b.premium) !== Boolean(a.premium)) return Number(Boolean(b.premium)) - Number(Boolean(a.premium));
            if (Boolean(b.featured) !== Boolean(a.featured)) return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });

        const topMatches = scored.slice(0, 12).map((row) => mapPublicItem(row));
        res.json({ items: topMatches });
    } catch (error) {
        console.error('Get Similar Items Error:', error);
        res.status(500).json({ error: 'Failed to get similar items' });
    }
};

const listItems = async (req, res) => {
    try {
        const q = req.query.q ? String(req.query.q).trim() : '';
        const categoryFilter = req.query.category ? normalizeCategory(req.query.category) : null;
        const limit = req.query.limit ? Math.min(Number(req.query.limit) || 20, 500) : 20;
        const offset = req.query.offset ? Math.max(Number(req.query.offset) || 0, 0) : 0;
        const baseWhere = ['i.status = $1'];
        const params = ['active'];
        let sql = publicItemSelect;
        if (categoryFilter) {
            baseWhere.push(`LOWER(c.name) = LOWER($${params.length + 1})`);
            params.push(categoryFilter);
        }
        if (q && q.length > 0) {
            baseWhere.push(`(i.title ILIKE $${params.length + 1} OR i.description ILIKE $${params.length + 1} OR i.location ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`);
            params.push(`%${q}%`);
        }
        sql += `WHERE ${baseWhere.join(' AND ')} ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const result = await db.query(sql, params);
        res.json({ items: result.rows.map(mapPublicItem) });
    } catch (error) {
        console.error('List Items Error:', error);
        res.status(500).json({ error: 'Failed to load items' });
    }
};

const mapDbStatusToLabel = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'active') return 'Active';
    if (s === 'pending_approval' || s === 'pending' || s === 'pending_payment') return 'Pending';
    if (s === 'sold') return 'Sold';
    if (s === 'rented') return 'Rented';
    if (s === 'rejected') return 'Pending';
    return 'Pending';
};

const mapLabelToDbStatus = (label) => {
    const s = String(label || '').toLowerCase();
    if (s === 'active') return 'active';
    if (s === 'pending' || s === 'pending_approval') return 'pending_approval';
    if (s === 'sold') return 'sold';
    if (s === 'rented') return 'rented';
    if (s === 'pending_payment') return 'pending_payment';
    return null;
};

const listMyItems = async (req, res) => {
    try {
        const ownerId = req.user?.id;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });
        const result = await db.query(
            `SELECT i.id, i.title, i.description, i.price, i.status, i.transaction_type,
                    i.location, i.subcity, i.kebele, i.metadata, i.contact_phone,
                    i.featured, i.premium, i.created_at, c.name AS category, m.media_url AS image_url
             FROM Items i
             LEFT JOIN Categories c ON c.id = i.category_id
             LEFT JOIN LATERAL (
                 SELECT media_url FROM Media WHERE item_id = i.id ORDER BY id ASC LIMIT 1
             ) m ON true
             WHERE i.owner_id = $1 AND i.status != 'removed'::item_status
             ORDER BY i.created_at DESC LIMIT 100`,
            [ownerId]
        );
        const items = result.rows.map((row) => ({
            ...row,
            status_label: mapDbStatusToLabel(row.status),
            image_url: sanitizeMediaUrl(row.image_url),
        }));
        res.json({ items });
    } catch (error) {
        console.error('List My Items Error:', error);
        res.status(500).json({ error: 'Failed to load your items' });
    }
};

const validateOwnerStatusChange = (currentStatus, nextStatus, transactionType) => {
    const current = String(currentStatus || '').toLowerCase();
    const next = String(nextStatus || '').toLowerCase();
    const tx = String(transactionType || 'sell').toLowerCase();
    if (next === current) return { ok: true };
    if (current === 'pending_approval' || current === 'pending_payment' || current === 'rejected') {
        return { ok: false, error: 'This listing is pending admin approval. You cannot change its status yet.' };
    }
    if (next === 'pending_approval' || next === 'pending') {
        return { ok: false, error: 'Only admins can set pending approval status.' };
    }
    if ((current === 'sold' || current === 'rented') && next === 'active') {
        return { ok: false, requires_renewal: true, error: 'Pay the renewal fee to reactivate this listing.' };
    }
    if (current === 'active' && next === 'sold') {
        if (tx !== 'sell') return { ok: false, error: 'Only sale listings can be marked as Sold.' };
        return { ok: true };
    }
    if (current === 'active' && next === 'rented') {
        if (tx !== 'rent') return { ok: false, error: 'Only rent listings can be marked as Rented.' };
        return { ok: true };
    }
    if (current === 'active' && next === 'active') return { ok: true };
    if (current === 'sold' || current === 'rented') {
        return { ok: false, error: 'Use the renewal page to list this item as active again.' };
    }
    return { ok: false, error: 'This status change is not allowed.' };
};

const getRenewalPreview = async (req, res) => {
    try {
        const ownerId = req.user?.id;
        const itemId = Number(req.params.id);
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });
        if (!Number.isFinite(itemId)) return res.status(400).json({ error: 'Invalid item id' });
        const itemRes = await db.query(
            `SELECT i.id, i.title, i.price, i.status, i.transaction_type, i.location, c.name AS category, m.media_url AS image_url
             FROM Items i
             LEFT JOIN Categories c ON c.id = i.category_id
             LEFT JOIN LATERAL (SELECT media_url FROM Media WHERE item_id = i.id ORDER BY id ASC LIMIT 1) m ON true
             WHERE i.id = $1 AND i.owner_id = $2`,
            [itemId, ownerId]
        );
        const item = itemRes.rows[0];
        if (!item) return res.status(404).json({ error: 'Item not found' });
        const status = String(item.status || '').toLowerCase();
        if (status !== 'sold' && status !== 'rented') {
            return res.status(400).json({ error: 'Renewal is only available for listings marked Sold or Rented.' });
        }
        const { findMatchingRule } = require('./chargingController');
        const price = Number(item.price);
        const rule = await findMatchingRule('Renewal', item.transaction_type, item.category, price);
        let feeAmount = 0, feePercentage = 0, ruleId = null;
        if (rule) {
            feePercentage = Number(rule.fee_percentage) || 0;
            feeAmount = Math.round((price * feePercentage) / 100 * 100) / 100;
            ruleId = rule.id;
        }
        res.json({
            item: { ...item, image_url: sanitizeMediaUrl(item.image_url), status_label: mapDbStatusToLabel(item.status) },
            renewal: { fee_amount: feeAmount, fee_percentage: feePercentage, rule_id: ruleId, requires_payment: feeAmount > 0, listing_type: 'Renewal', transaction_type: item.transaction_type, category: item.category },
        });
    } catch (error) {
        console.error('Renewal Preview Error:', error);
        res.status(500).json({ error: 'Failed to load renewal details' });
    }
};

const updateMyItem = async (req, res) => {
    try {
        const ownerId = req.user?.id;
        const itemId = Number(req.params.id);
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });
        if (!Number.isFinite(itemId)) return res.status(400).json({ error: 'Invalid item id' });
        const { title, description, category, price, location, status } = req.body;
        const existingRes = await db.query(
            `SELECT i.id, i.owner_id, i.status, i.transaction_type FROM Items i WHERE i.id = $1 AND i.owner_id = $2`,
            [itemId, ownerId]
        );
        if (!existingRes.rows[0]) return res.status(404).json({ error: 'Item not found' });
        const existing = existingRes.rows[0];
        const normalizedCategory = category ? normalizeCategory(category) : null;
        let categoryId = null;
        if (normalizedCategory) {
            const catRes = await db.query('SELECT id FROM Categories WHERE name = $1', [normalizedCategory]);
            categoryId = catRes.rows[0]?.id;
            if (!categoryId) {
                const insertCat = await db.query('INSERT INTO Categories (name, active) VALUES ($1, true) RETURNING id', [normalizedCategory]);
                categoryId = insertCat.rows[0].id;
            }
        }
        const dbStatus = status ? mapLabelToDbStatus(status) : null;
        const numericPrice = price !== undefined ? Number(price) : null;
        if (status && !dbStatus) return res.status(400).json({ error: 'Invalid item status.' });
        if (dbStatus) {
            const check = validateOwnerStatusChange(existing.status, dbStatus, existing.transaction_type);
            if (!check.ok) {
                if (check.requires_renewal) return res.status(402).json({ error: check.error, requires_renewal: true, item_id: itemId });
                return res.status(400).json({ error: check.error });
            }
        }
        const update = await db.query(
            `UPDATE Items SET title = COALESCE($3, title), description = COALESCE($4, description),
             category_id = COALESCE($5, category_id), price = COALESCE($6, price),
             location = COALESCE($7, location), status = COALESCE($8::item_status, status)
             WHERE id = $1 AND owner_id = $2
             RETURNING id, title, description, price, status, transaction_type, location, featured, premium, created_at`,
            [itemId, ownerId, title || null, description !== undefined ? description : null, categoryId, Number.isFinite(numericPrice) ? numericPrice : null, location || null, dbStatus]
        );
        const row = update.rows[0];
        if (!row) return res.status(404).json({ error: 'Item not found or could not be updated.' });
        const catRow = await db.query(
            `SELECT c.name AS category, m.media_url AS image_url FROM Items i
             LEFT JOIN Categories c ON c.id = i.category_id
             LEFT JOIN LATERAL (SELECT media_url FROM Media WHERE item_id = i.id ORDER BY id ASC LIMIT 1) m ON true
             WHERE i.id = $1`,
            [itemId]
        );
        res.json({ item: { ...row, category: catRow.rows[0]?.category, status_label: mapDbStatusToLabel(row.status), image_url: sanitizeMediaUrl(catRow.rows[0]?.image_url) } });
    } catch (error) {
        console.error('Update My Item Error:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
};

const deleteMyItem = async (req, res) => {
    try {
        const ownerId = req.user?.id;
        const itemId = Number(req.params.id);
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });
        if (!Number.isFinite(itemId)) return res.status(400).json({ error: 'Invalid item id' });
        const result = await db.query(
            `UPDATE Items SET status = 'removed'::item_status WHERE id = $1 AND owner_id = $2 RETURNING id`,
            [itemId, ownerId]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Item not found' });
        res.json({ ok: true });
    } catch (error) {
        console.error('Delete My Item Error:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
};

const listRecentItems = async (req, res) => {
    try {
        const limit = req.query.limit ? Math.min(Number(req.query.limit) || 20, 50) : 20;
        const result = await db.query(`${publicItemSelect} WHERE i.status = 'active'::item_status ORDER BY i.created_at DESC LIMIT $1`, [limit]);
        res.json({ items: result.rows.map(mapPublicItem) });
    } catch (error) {
        console.error('List Recent Items Error:', error);
        res.status(500).json({ error: 'Failed to load recent items' });
    }
};

const listTrendingItems = async (req, res) => {
    try {
        const limit = req.query.limit ? Math.min(Number(req.query.limit) || 20, 50) : 20;
        const result = await db.query(`${publicItemSelect} WHERE i.status = 'active'::item_status ORDER BY i.premium DESC, i.featured DESC, i.created_at DESC LIMIT $1`, [limit]);
        res.json({ items: result.rows.map(mapPublicItem) });
    } catch (error) {
        console.error('List Trending Items Error:', error);
        res.status(500).json({ error: 'Failed to load trending items' });
    }
};

const listRecommendedItems = async (req, res) => {
    try {
        const limit = req.query.limit ? Math.min(Number(req.query.limit) || 20, 50) : 20;
        const result = await db.query(`${publicItemSelect} WHERE i.status = 'active'::item_status ORDER BY i.featured DESC, i.created_at DESC LIMIT $1`, [limit]);
        res.json({ items: result.rows.map(mapPublicItem) });
    } catch (error) {
        console.error('List Recommended Items Error:', error);
        res.status(500).json({ error: 'Failed to load recommended items' });
    }
};

const getSearchSuggestions = async (req, res) => {
    try {
        const prefix = req.query.q ? String(req.query.q).trim() : '';
        const limit = req.query.limit ? Math.min(Number(req.query.limit) || 10, 20) : 10;
        if (!prefix || prefix.length < 1) return res.json({ suggestions: [] });
        const suggestions = [];
        const pattern = `%${prefix}%`;
        const titleRes = await db.query(
            `SELECT DISTINCT i.title as suggestion, 'title' as type, COUNT(*)::int as count FROM items i WHERE i.status = 'active' AND i.title ILIKE $1 GROUP BY i.title ORDER BY count DESC, i.title LIMIT $2`,
            [pattern, limit]
        );
        suggestions.push(...titleRes.rows);
        if (suggestions.length < limit) {
            const locRes = await db.query(
                `SELECT DISTINCT i.location as suggestion, 'location' as type, COUNT(*)::int as count FROM items i WHERE i.status = 'active' AND i.location ILIKE $1 GROUP BY i.location ORDER BY count DESC, i.location LIMIT $2`,
                [pattern, limit - suggestions.length]
            );
            suggestions.push(...locRes.rows);
        }
        if (suggestions.length < limit) {
            const catRes = await db.query(
                `SELECT DISTINCT c.name as suggestion, 'category' as type, COUNT(*)::int as count FROM items i JOIN categories c ON c.id = i.category_id WHERE i.status = 'active' AND c.name ILIKE $1 GROUP BY c.name ORDER BY count DESC, c.name LIMIT $2`,
                [pattern, limit - suggestions.length]
            );
            suggestions.push(...catRes.rows);
        }
        res.json({ suggestions: suggestions.slice(0, limit) });
    } catch (error) {
        console.error('Search Suggestions Error:', error);
        res.status(500).json({ error: 'Failed to get search suggestions' });
    }
};

const getItemById = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid item id' });
        const itemRes = await db.query(
            `SELECT i.id, i.title, i.description, i.transaction_type, i.price, i.location, i.subcity, i.kebele,
                    i.metadata, i.legal_document, i.contact_phone, i.status, i.created_at,
                    c.name AS category, u.name AS owner_name, u.id AS owner_id, u.phone AS owner_phone,
                    COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.rating_count, 0) AS rating_count
             FROM Items i
             LEFT JOIN Categories c ON c.id = i.category_id
             LEFT JOIN Users u ON u.id = i.owner_id
             LEFT JOIN (SELECT item_id, AVG(rating)::numeric(10,2) AS avg_rating, COUNT(*)::int AS rating_count FROM Ratings GROUP BY item_id) r ON r.item_id = i.id
             WHERE i.id = $1`,
            [id]
        );
        const item = itemRes.rows[0];
        if (!item) return res.status(404).json({ error: 'Item not found' });
        const mediaRes = await db.query('SELECT media_url, type FROM Media WHERE item_id = $1 ORDER BY id ASC', [id]);
        const images = mediaRes.rows.map((m) => sanitizeMediaUrl(m.media_url)).filter(Boolean);
        res.json({ item: { ...item, contact_phone: item.contact_phone || item.owner_phone || null, images: images.length > 0 ? images : [placeholderImageUrl] } });
    } catch (error) {
        console.error('Get Item Error:', error);
        res.status(500).json({ error: 'Failed to load item' });
    }
};

const createItem = async (req, res) => {
    try {
        const ownerId = req.user?.id;
        const { title, description, category, transaction_type, price, location, contact_phone, image_url, image_urls, subcity, kebele, metadata } = req.body;

        let parsedMetadata = {};
        if (metadata) {
            try { parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata; }
            catch (e) { console.warn('Failed to parse metadata:', e); }
        }

        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });
        if (!title || !transaction_type || !price || !location) {
            return res.status(400).json({ error: 'title, transaction_type, price, and location are required' });
        }

        const tx = String(transaction_type).toLowerCase();
        if (tx !== 'rent' && tx !== 'sell') return res.status(400).json({ error: 'transaction_type must be rent or sell' });

        const numericPrice = Number(price);
        if (!Number.isFinite(numericPrice) || numericPrice <= 0) return res.status(400).json({ error: 'price must be a positive number' });

        const reqFiles = req.files || {};
        const imageFiles = reqFiles['images'] || [];
        const documentFiles = reqFiles['legal_document'] || [];

        const fileUrls = await Promise.all(
            imageFiles.map((f) => uploadToCloudinary(f.buffer, `item_${Date.now()}_${Math.random().toString(36).slice(2)}`))
        );

        let documentUrl = null;
        if (documentFiles.length > 0) {
            documentUrl = await uploadToCloudinary(documentFiles[0].buffer, `doc_${Date.now()}`);
        }

        const urlsFromArray = Array.isArray(image_urls) ? image_urls : null;
        const urlsFromBody = (urlsFromArray || (image_url ? [image_url] : [])).map((u) => String(u || '').trim()).filter(Boolean);
        const urls = fileUrls.length > 0 ? fileUrls : urlsFromBody;

        if (urls.length < 1 || urls.length > 5) return res.status(400).json({ error: 'Please upload 1–5 images.' });

        const featured = Boolean(req.body.featured);
        const premium = Boolean(req.body.premium);
        const normalizedCategory = normalizeCategory(category) || 'Homes';
        const catRes = await db.query('SELECT id FROM Categories WHERE name = $1', [normalizedCategory]);
        let categoryId = catRes.rows[0]?.id;
        if (!categoryId) {
            const insertCat = await db.query('INSERT INTO Categories (name, active) VALUES ($1, true) RETURNING id', [normalizedCategory]);
            categoryId = insertCat.rows[0].id;
        }

        const { findMatchingRule } = require('./chargingController');
        const matchingRule = await findMatchingRule('New Item', tx, normalizedCategory, numericPrice);
        let feeAmount = 0, ruleId = null;
        if (matchingRule) {
            const feePercentage = Number(matchingRule.fee_percentage) || 0;
            const adjustedFeePercentage = premium ? feePercentage + 1 : feePercentage;
            feeAmount = Math.round((numericPrice * adjustedFeePercentage) / 100 * 100) / 100;
            ruleId = matchingRule.id;
        }

        const initialStatus = feeAmount > 0 ? 'pending_payment' : 'pending_approval';

        let listingPhone = contact_phone ? String(contact_phone).trim() : null;
        if (!listingPhone) {
            const ownerRes = await db.query('SELECT phone FROM Users WHERE id = $1', [ownerId]);
            listingPhone = ownerRes.rows[0]?.phone || null;
        }

        const insertItem = await db.query(
            `INSERT INTO Items (owner_id, title, description, category_id, transaction_type, price, location, contact_phone, status, featured, premium, listing_fee, subcity, kebele, metadata, legal_document)
             VALUES ($1, $2, $3, $4, $5::trans_type, $6, $7, $8, $9::item_status, $10, $11, $12, $13, $14, $15, $16)
             RETURNING id`,
            [ownerId, title, description || '', categoryId, tx, numericPrice, location, listingPhone, initialStatus, featured, premium, feeAmount, subcity || null, kebele || null, parsedMetadata, documentUrl]
        );

        const itemId = insertItem.rows[0].id;
        for (const url of urls) {
            await db.query('INSERT INTO Media (item_id, media_url, type) VALUES ($1, $2, $3)', [itemId, url, 'image']);
        }

        if (feeAmount > 0) {
            const tx_ref = makeTxRef('posting_fee');
            await db.query(
                `INSERT INTO item_payments (item_id, owner_id, rule_id, item_price, fee_amount, payment_status, payment_method) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [itemId, ownerId, ruleId, numericPrice, feeAmount, 'Pending', 'Chapa']
            );
            await db.query(
                'INSERT INTO Payments (owner_id, item_id, amount, payment_status, transaction_id) VALUES ($1, $2, $3, $4, $5)',
                [ownerId, itemId, feeAmount, 'pending', tx_ref]
            );
            res.status(201).json({ message: 'Item created successfully. Complete payment to publish it.', requires_payment: true, item_id: itemId, fee_amount: feeAmount, tx_ref });
        } else {
            await db.query(
                `INSERT INTO item_payments (item_id, owner_id, rule_id, item_price, fee_amount, payment_status, payment_method) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [itemId, ownerId, ruleId, numericPrice, 0, 'Pending', 'Free']
            );
            const tx_ref = makeTxRef('free_listing');
            await db.query(
                'INSERT INTO Payments (owner_id, item_id, amount, payment_status, transaction_id) VALUES ($1, $2, $3, $4, $5)',
                [ownerId, itemId, 0, 'completed', tx_ref]
            );
            res.status(201).json({ message: 'Item created successfully and is pending admin approval.', requires_payment: false, item_id: itemId });
        }
    } catch (error) {
        console.error('Create Item Error:', error);
        res.status(500).json({ error: 'Failed to create item' });
    }
};

module.exports = {
    listItems,
    listRecentItems,
    listTrendingItems,
    listRecommendedItems,
    listMyItems,
    getRenewalPreview,
    updateMyItem,
    deleteMyItem,
    getItemById,
    createItem,
    getSearchSuggestions,
    getSimilarItems,
};