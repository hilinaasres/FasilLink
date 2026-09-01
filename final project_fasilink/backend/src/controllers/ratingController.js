const db = require('../config/db');

const getAggregate = async (itemId) => {
  const agg = await db.query(
    `
    SELECT
      COALESCE(AVG(rating), 0)::numeric(10,2) AS avg_rating,
      COUNT(*)::int AS rating_count
    FROM Ratings
    WHERE item_id = $1
    `,
    [itemId]
  );
  return {
    avg_rating: Number(agg.rows[0]?.avg_rating ?? 0),
    rating_count: Number(agg.rows[0]?.rating_count ?? 0),
  };
};

const canUserRateItem = async ({ userId, itemId }) => {
  // Must have contacted the owner about THIS item.
  const itemRes = await db.query('SELECT owner_id FROM Items WHERE id = $1', [itemId]);
  const ownerId = itemRes.rows[0]?.owner_id;
  if (!ownerId) return false;

  const msgRes = await db.query(
    `
    SELECT 1
    FROM Messages
    WHERE item_id = $1
      AND ((sender_id = $2 AND receiver_id = $3)
        OR (sender_id = $3 AND receiver_id = $2))
    LIMIT 1
    `,
    [itemId, userId, ownerId]
  );

  return msgRes.rows.length > 0;
};

const getItemRatingPublic = async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    if (!Number.isFinite(itemId)) return res.status(400).json({ error: 'Invalid item id' });

    const itemRes = await db.query('SELECT id FROM Items WHERE id = $1', [itemId]);
    if (itemRes.rows.length === 0) return res.status(404).json({ error: 'Item not found' });

    const agg = await getAggregate(itemId);
    res.json({ ...agg });
  } catch (error) {
    console.error('Get Item Rating Error:', error);
    res.status(500).json({ error: 'Failed to load rating' });
  }
};

const getItemRatingMe = async (req, res) => {
  try {
    const userId = req.user?.id;
    const itemId = Number(req.params.itemId);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!Number.isFinite(itemId)) return res.status(400).json({ error: 'Invalid item id' });

    const itemRes = await db.query('SELECT id FROM Items WHERE id = $1', [itemId]);
    if (itemRes.rows.length === 0) return res.status(404).json({ error: 'Item not found' });

    const [agg, myRes, canRate] = await Promise.all([
      getAggregate(itemId),
      db.query('SELECT rating FROM Ratings WHERE user_id = $1 AND item_id = $2', [userId, itemId]),
      canUserRateItem({ userId, itemId }),
    ]);

    res.json({
      ...agg,
      my_rating: myRes.rows[0]?.rating ?? null,
      can_rate: canRate,
    });
  } catch (error) {
    console.error('Get Item Rating Me Error:', error);
    res.status(500).json({ error: 'Failed to load rating' });
  }
};

const rateItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const itemId = Number(req.body?.item_id);
    const rating = Number(req.body?.rating);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!Number.isFinite(itemId)) return res.status(400).json({ error: 'item_id is required' });
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1-5' });

    const itemRes = await db.query('SELECT id FROM Items WHERE id = $1', [itemId]);
    if (itemRes.rows.length === 0) return res.status(404).json({ error: 'Item not found' });

    const eligible = await canUserRateItem({ userId, itemId });
    if (!eligible) {
      return res.status(403).json({ error: 'You can rate an item only after contacting the owner about it.' });
    }

    await db.query(
      `
      INSERT INTO Ratings (user_id, item_id, rating)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, item_id)
      DO UPDATE SET rating = EXCLUDED.rating
      `,
      [userId, itemId, rating]
    );

    const agg = await getAggregate(itemId);
    res.json({ saved: true, ...agg, my_rating: rating });
  } catch (error) {
    console.error('Rate Item Error:', error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
};

module.exports = { getItemRatingPublic, getItemRatingMe, rateItem };
