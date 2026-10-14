const express = require('express');
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/mine', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await db.query(
      `SELECT * FROM Notifications
       WHERE user_id = $1 AND type <> 'message'
       ORDER BY created_at DESC LIMIT 30`,
      [userId]
    );

    const unread = result.rows.filter((n) => !n.is_read).length;
    res.json({ notifications: result.rows, unreadCount: unread });
  } catch (err) {
    console.error('My Notifications Error:', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

router.patch('/read', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const type = req.body?.type || null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (type) {
      await db.query(
        'UPDATE Notifications SET is_read = TRUE WHERE user_id = $1 AND type = $2 AND is_read = FALSE',
        [userId, type]
      );
    } else {
      await db.query(
        'UPDATE Notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
        [userId]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Mark Notifications Read Error:', err);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const userRes = await db.query('SELECT created_at FROM Users WHERE id = $1', [userId]);
    const announcements = await db.query(
      `SELECT * FROM Announcements
       WHERE created_at >= COALESCE($1, '-infinity'::timestamp)
       ORDER BY created_at DESC LIMIT 10`,
      [userRes.rows[0]?.created_at || null]
    );
    let notifications = [];
    
    if (userId) {
      const userRes = await db.query(
        `SELECT * FROM Notifications
         WHERE user_id = $1 AND type <> 'message'
         ORDER BY created_at DESC LIMIT 20`,
        [userId]
      );
      notifications = userRes.rows;
    }
    
    res.json({ announcements: announcements.rows, notifications });
  } catch (err) {
    console.error('Announcements Error:', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

module.exports = router;