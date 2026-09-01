const jwt = require('jsonwebtoken');
const db = require('../config/db');

const STOPWORDS = new Set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your', 'yours',
    'a', 'an', 'the', 'and', 'or', 'but', 'to', 'for', 'of', 'in', 'on', 'at',
    'with', 'near', 'around', 'under', 'over', 'buy', 'rent', 'sell', 'looking',
    'need', 'want', 'gondar',
]);

const tokenize = (text) => {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
};

const inferCategoryFromQuery = (query) => {
    const q = String(query || '').toLowerCase();
    const has = (w) => q.includes(w);
    if (has('car') || has('toyota') || has('vehicle') || has('motor') || has('bike') || has('pickup') || has('isuzu')) return 'Vehicles';
    if (has('house') || has('home') || has('villa') || has('apartment') || has('land') || has('plot') || has('office') || has('shop')) return 'Homes';
    if (has('wedding') || has('tent') || has('chair') || has('chairs') || has('speaker') || has('sound') || has('stage') || has('lighting') || has('tables')) return 'Event Materials';
    return null;
};

const getOptionalUserId = (req) => {
    let token = req.header('Authorization');
    if (!token) return null;

    if (token.startsWith('Bearer ')) token = token.slice(7).trim();
    if (!token) return null;

    try {
        const secret = process.env.JWT_SECRET || 'fasillink_super_secret_key';
        const verified = jwt.verify(token, secret);
        return verified?.id || null;
    } catch {
        return null;
    }
};

const recommend = async (req, res) => {
    try {
        const query = String(req.body?.query || req.query?.query || '').trim();
        const limit = Math.min(Number(req.body?.limit || req.query?.limit || 6) || 6, 20);

        const userId = getOptionalUserId(req);

        // Purchase history (optional)
        let preferredCategories = [];
        let preferredLocations = [];
        let purchasedItemIds = [];

        if (userId) {
            const historyRes = await db.query(
                `
                SELECT p.item_id, i.location, c.name AS category
                FROM Payments p
                JOIN Items i ON i.id = p.item_id
                LEFT JOIN Categories c ON c.id = i.category_id
                WHERE p.customer_id = $1 AND p.payment_status = 'completed'
                ORDER BY p.created_at DESC
                LIMIT 25
                `,
                [userId]
            );

            purchasedItemIds = historyRes.rows.map((r) => r.item_id).filter(Boolean);
            preferredCategories = Array.from(new Set(historyRes.rows.map((r) => r.category).filter(Boolean)));
            preferredLocations = Array.from(new Set(historyRes.rows.map((r) => r.location).filter(Boolean)));
        }

        const queryCategory = inferCategoryFromQuery(query);
        const keywordTokens = tokenize(query);

        const where = [`i.status = 'active'`];
        const params = [];

        if (purchasedItemIds.length > 0) {
            params.push(purchasedItemIds);
            where.push(`i.id <> ALL($${params.length}::int[])`);
        }

        // Apply category preference: respect explicit query intent first; fall back to history.
        const categoryFilter = queryCategory ? [queryCategory] : (preferredCategories.length > 0 ? preferredCategories : []);
        if (categoryFilter.length > 0) {
            params.push(categoryFilter);
            where.push(`c.name = ANY($${params.length}::text[])`);
        }

        // Pull a candidate pool from DB
        params.push(80);
        const candidatesRes = await db.query(
            `
            SELECT
                i.id,
                i.title,
                i.description,
                i.transaction_type,
                i.price,
                i.location,
                c.name AS category,
                m.media_url AS image_url
            FROM Items i
            LEFT JOIN Categories c ON c.id = i.category_id
            LEFT JOIN LATERAL (
                SELECT media_url
                FROM Media
                WHERE item_id = i.id
                ORDER BY id ASC
                LIMIT 1
            ) m ON true
            WHERE ${where.join(' AND ')}
            ORDER BY i.created_at DESC
            LIMIT $${params.length}
            `,
            params
        );

        const candidates = candidatesRes.rows;

        const scored = candidates.map((item) => {
            let score = 0;

            if (preferredCategories.length > 0 && preferredCategories.includes(item.category)) score += 3;
            if (queryCategory && item.category === queryCategory) score += 2;

            if (preferredLocations.length > 0) {
                const loc = String(item.location || '').toLowerCase();
                if (preferredLocations.some((pl) => loc.includes(String(pl).toLowerCase()))) score += 2;
            }

            if (keywordTokens.length > 0) {
                const hay = `${item.title || ''} ${item.description || ''} ${item.location || ''}`.toLowerCase();
                for (const t of keywordTokens) {
                    if (hay.includes(t)) score += 1;
                }
            }

            return { ...item, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, limit);
        // Log impressions into Recommendations table so admin reports reflect real activity.
        (async () => {
            try {
                if (top.length > 0) {
                    const placeholders = [];
                    const params = [];
                    // Build bulk insert params: (user_id, item_id, score)
                    for (let i = 0; i < top.length; i++) {
                        const base = i * 3;
                        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
                        params.push(userId || null, top[i].id, top[i].score);
                    }
                    const insertSql = `INSERT INTO Recommendations (user_id, item_id, score) VALUES ${placeholders.join(',')}`;
                    await db.query(insertSql, params);
                }
            } catch (logErr) {
                console.warn('Failed to log recommendation impressions:', logErr);
            }
        })();

        res.json({
            userId: userId || null,
            usedHistory: Boolean(userId && purchasedItemIds.length > 0),
            recommendations: top,
        });
    } catch (error) {
        console.error('Recommendation Error:', error);
        res.status(500).json({ error: 'Failed to generate recommendations' });
    }
};

module.exports = { recommend };
