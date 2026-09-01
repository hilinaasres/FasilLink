const db = require('../config/db');

const toggleFavorite = async (req, res) => {
  try {
    const userId = req.user?.id;
    const itemId = Number(req.body?.item_id);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!Number.isFinite(itemId)) return res.status(400).json({ error: 'item_id is required' });

    // Ensure item exists
    const itemRes = await db.query('SELECT id FROM Items WHERE id = $1', [itemId]);
    if (itemRes.rows.length === 0) return res.status(404).json({ error: 'Item not found' });

    const existing = await db.query(
      'SELECT 1 FROM user_favorites WHERE user_id = $1 AND item_id = $2',
      [userId, itemId]
    );

    if (existing.rows.length > 0) {
      await db.query('DELETE FROM user_favorites WHERE user_id = $1 AND item_id = $2', [userId, itemId]);
      return res.json({ favorited: false });
    }

    await db.query('INSERT INTO user_favorites (user_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, itemId]);
    res.json({ favorited: true });
  } catch (error) {
    console.error('Toggle Favorite Error:', error);
    res.status(500).json({ error: 'Failed to update favorites' });
  }
};

const listFavoriteIds = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await db.query('SELECT item_id FROM user_favorites WHERE user_id = $1 ORDER BY created_at DESC, id DESC', [userId]);
    res.json({ ids: result.rows.map((r) => r.item_id) });
  } catch (error) {
    console.error('List Favorite Ids Error:', error);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
};

const listFavorites = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await db.query(
      `
      SELECT
        i.id,
        i.title,
        i.transaction_type,
        i.price,
        i.location,
        i.status,
        i.created_at,
        c.name AS category,
        m.media_url AS image_url,
        COALESCE(r.avg_rating, 0) AS avg_rating,
        COALESCE(r.rating_count, 0) AS rating_count
      FROM user_favorites f
      JOIN Items i ON i.id = f.item_id
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
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC, f.id DESC
      `,
      [userId]
    );

    res.json({ items: result.rows });
  } catch (error) {
    console.error('List Favorites Error:', error);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
};

module.exports = { toggleFavorite, listFavoriteIds, listFavorites };
