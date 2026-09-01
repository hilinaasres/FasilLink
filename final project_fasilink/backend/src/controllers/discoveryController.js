const db = require('../config/db');

const listCategories = async (req, res) => {
  try {
    // Fetch distinct categories that have active items
    const result = await db.query(`
      SELECT DISTINCT
        c.id,
        c.name,
        c.description,
        c.icon,
        c.category_config,
        COUNT(i.id) as listing_count
      FROM categories c
      LEFT JOIN items i ON i.category_id = c.id AND i.status = 'active'
      GROUP BY c.id, c.name, c.description, c.icon, c.category_config
      HAVING COUNT(i.id) > 0 OR c.active = true
      ORDER BY listing_count DESC, c.name ASC
    `);
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('List Categories Error:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
};

const listLocations = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT
        i.location,
        COUNT(*) as listing_count,
        MIN(i.price) as min_price,
        MAX(i.price) as max_price
      FROM items i
      WHERE i.status = 'active'
        AND i.location IS NOT NULL
        AND TRIM(i.location) != ''
      GROUP BY i.location
      ORDER BY listing_count DESC, i.location ASC
      LIMIT 20
    `);
    res.json({ locations: result.rows });
  } catch (error) {
    console.error('List Locations Error:', error);
    res.status(500).json({ error: 'Failed to load locations' });
  }
};

const getAISuggestions = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 10);

    // Get popular categories
    const catResult = await db.query(`
      SELECT c.name as suggestion, 'category' as type, COUNT(i.id) as count
      FROM categories c
      LEFT JOIN items i ON i.category_id = c.id AND i.status = 'active'
      GROUP BY c.name
      HAVING COUNT(i.id) > 0
      ORDER BY count DESC, c.name
      LIMIT $1
    `, [limit]);

    // Get popular locations
    const locResult = await db.query(`
      SELECT location as suggestion, 'location' as type, COUNT(*) as count
      FROM items
      WHERE status = 'active'
        AND location IS NOT NULL
        AND TRIM(location) != ''
      GROUP BY location
      ORDER BY count DESC
      LIMIT $1
    `, [limit]);

    const suggestions = [
      ...catResult.rows,
      ...locResult.rows
    ].sort((a, b) => b.count - a.count).slice(0, limit);

    res.json({ suggestions });
  } catch (error) {
    console.error('AI Suggestions Error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
};

module.exports = {
  listCategories,
  listLocations,
  getAISuggestions,
};
