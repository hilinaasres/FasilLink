const db = require('../config/db');

const ALLOWED_ITEM_STATUSES = new Set(['active', 'sold', 'rented', 'expired', 'suspended', 'removed', 'pending_approval', 'rejected']);
const ALLOWED_USER_STATUSES = new Set(['active', 'suspended', 'revoked']);

const DEFAULT_ADMIN_SETTINGS = {
  theme: 'dark',
  notifications: true,
  securityLevel: 'high',
  charging: {
    chargesEnabled: true,
    postingFee: 50,
    renewalFee: 8,
    premiumListingFee: 25,
    featuredFee: 18,
    rentalFeePerDay: 12,
    taxPercent: 12,
  },
};

const logAudit = async ({ adminId, actionType, resourceType, resourceId, ipAddress, details = {} }) => {
  try {
    await db.query(
      `INSERT INTO AuditLogs (admin_id, action_type, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, actionType, resourceType, resourceId, details, ipAddress]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

const createItemStatusNotification = async ({ userId, title, message }) => {
  if (!userId) return null;
  try {
    const result = await db.query(
      `INSERT INTO Notifications (user_id, title, message, type, is_read)
       VALUES ($1, $2, $3, 'warning', FALSE)
       RETURNING id, user_id, title, message, type, is_read, created_at`,
      [userId, title, message]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Admin Item Notification Error:', error);
    return null;
  }
};

const getSettings = async (req, res) => {
  try {
    const result = await db.query('SELECT value FROM Settings WHERE key = $1', ['admin_settings']);
    const settings = result.rows[0] ? result.rows[0].value : DEFAULT_ADMIN_SETTINGS;
    res.json({ settings });
  } catch (error) {
    console.error('Admin Settings Error:', error);
    res.status(500).json({ error: 'Failed to load settings' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const settings = req.body.settings;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings payload.' });
    }
    await db.query(
      `INSERT INTO Settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      ['admin_settings', settings]
    );
    res.json({ settings });
  } catch (error) {
    console.error('Admin Update Settings Error:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    // Basic business metrics (revenue, users, categories)
    const [revenueTrend, userGrowth, categoryPopularity] = await Promise.all([
      db.query(
        `SELECT to_char(created_at, 'Mon') AS period, COALESCE(SUM(amount), 0)::numeric AS total
         FROM Payments
         WHERE created_at >= NOW() - INTERVAL '6 months'
         GROUP BY to_char(created_at, 'Mon')
         ORDER BY MIN(created_at)`
      ),
      db.query(
        `SELECT to_char(created_at, 'Mon DD') AS day, COUNT(*)::int AS total
         FROM Users
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY to_char(created_at, 'Mon DD')
         ORDER BY MIN(created_at)`
      ),
      db.query(
        `SELECT c.name, COUNT(i.id)::int AS count
         FROM Categories c
         LEFT JOIN Items i ON i.category_id = c.id
         GROUP BY c.name
         ORDER BY count DESC
         LIMIT 8`
      ),
    ]);

    // Recommendation analytics derived from Recommendations log
    const recStatsRes = await db.query(
      `SELECT COUNT(*)::int AS impressions,
              COUNT(DISTINCT user_id)::int AS unique_users,
              COALESCE(AVG(score)::numeric, 0) AS avg_score
       FROM Recommendations
       WHERE created_at >= NOW() - INTERVAL '30 days'`
    );

    const impressions = recStatsRes.rows[0]?.impressions || 0;
    const uniqueUsers = recStatsRes.rows[0]?.unique_users || 0;
    const avgScore = Number(recStatsRes.rows[0]?.avg_score || 0);

    // Engagement proxy: count of favorites for items that were recommended in the window
    const clicksRes = await db.query(
      `SELECT COUNT(*)::int AS clicks
       FROM user_favorites uf
       WHERE uf.created_at >= NOW() - INTERVAL '30 days'
         AND EXISTS (
           SELECT 1 FROM Recommendations r
           WHERE r.item_id = uf.item_id
             AND r.created_at >= NOW() - INTERVAL '30 days'
         )`
    );
    const clicks = clicksRes.rows[0]?.clicks || 0;

    // Conversions: payments where the recommended item was purchased by the same user within 30 days
    const convRes = await db.query(
      `SELECT COUNT(DISTINCT p.id)::int AS conversions
       FROM Payments p
       JOIN Recommendations r ON p.item_id = r.item_id AND p.customer_id = r.user_id
       WHERE r.created_at >= NOW() - INTERVAL '30 days'
         AND p.created_at >= r.created_at
         AND p.created_at <= r.created_at + INTERVAL '30 days'`
    );
    const conversions = convRes.rows[0]?.conversions || 0;

    const recommendationAccuracy = impressions > 0 ? Math.round((conversions / impressions) * 100) : 0;
    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 100) : 0;

    // aiTrend: daily average recommendation score over last 14 days
    const aiTrendRes = await db.query(
      `SELECT to_char(created_at, 'Mon DD') AS day,
              AVG(score)::numeric AS avg_score,
              COUNT(*)::int AS impressions
       FROM Recommendations
       WHERE created_at >= NOW() - INTERVAL '14 days'
       GROUP BY to_char(created_at, 'Mon DD')
       ORDER BY MIN(created_at)`
    );

    const aiTrendData = aiTrendRes.rows.map((row) => ({ day: row.day, score: Math.round(Number(row.avg_score || 0) * 100) }));

    res.json({
      recommendationAccuracy,
      ctr,
      popularClicks: clicks,
      impressions,
      uniqueUsers,
      avgRecommendationScore: Math.round(avgScore * 100) / 100,
      revenueTrend: revenueTrend.rows.map((row) => ({ period: row.period, total: Number(row.total) })),
      userGrowth: userGrowth.rows.map((row) => ({ day: row.day, users: row.total })),
      categoryPopularity: categoryPopularity.rows,
      aiTrend: aiTrendData,
    });
  } catch (error) {
    console.error('Admin Analytics Error:', error);
    res.status(500).json({ error: 'Failed to load analytics data' });
  }
};

const getReports = async (req, res) => {
  try {
    const type = String(req.query.type || 'Sales');
    const period = String(req.query.period || 'Daily');

    // Map period to date_trunc and formatting
    let trunc;
    let labelFormat;
    let lookback;
    let limitCount = 30;
    if (period === 'Daily') {
      trunc = 'day';
      labelFormat = 'YYYY-MM-DD';
      lookback = "NOW() - INTERVAL '30 days'";
      limitCount = 30;
    } else if (period === 'Weekly') {
      trunc = 'week';
      labelFormat = 'YYYY-MM-DD';
      lookback = "NOW() - INTERVAL '90 days'";
      limitCount = 12;
    } else if (period === 'Monthly') {
      trunc = 'month';
      labelFormat = 'Mon YYYY';
      lookback = "NOW() - INTERVAL '12 months'";
      limitCount = 12;
    } else {
      trunc = 'year';
      labelFormat = 'YYYY';
      lookback = "NOW() - INTERVAL '5 years'";
      limitCount = 5;
    }

    let query;
    if (type === 'AI') {
      query = `SELECT to_char(date_trunc('${trunc}', created_at), '${labelFormat}') AS day,
                       COUNT(*)::int AS impressions,
                       COALESCE(AVG(score)::numeric,0) AS avg_score
                FROM Recommendations
                WHERE created_at >= ${lookback}
                GROUP BY date_trunc('${trunc}', created_at)
                ORDER BY MIN(created_at) DESC
                LIMIT ${limitCount}`;
    } else if (type === 'Users') {
      query = `SELECT to_char(date_trunc('${trunc}', created_at), '${labelFormat}') AS day,
                       COUNT(*)::int AS users
                FROM Users
                WHERE created_at >= ${lookback}
                GROUP BY date_trunc('${trunc}', created_at)
                ORDER BY MIN(created_at) DESC
                LIMIT ${limitCount}`;
    } else if (type === 'Categories') {
      query = `SELECT to_char(date_trunc('${trunc}', i.created_at), '${labelFormat}') AS day,
                       COUNT(*)::int AS items
                FROM Items i
                WHERE i.created_at >= ${lookback}
                GROUP BY date_trunc('${trunc}', i.created_at)
                ORDER BY MIN(i.created_at) DESC
                LIMIT ${limitCount}`;
    } else {
      // Sales / Rentals / Revenue
      const rentalFilter = type === 'Rentals' ? "AND i.transaction_type = 'rent'" : '';
      query = `SELECT to_char(date_trunc('${trunc}', p.created_at), '${labelFormat}') AS day,
                       COUNT(*)::int AS sales,
                       COALESCE(SUM(p.amount),0)::numeric AS revenue,
                       SUM((EXISTS (
                         SELECT 1 FROM Recommendations r
                         WHERE r.item_id = p.item_id
                           AND r.user_id = p.customer_id
                           AND r.created_at <= p.created_at
                           AND p.created_at <= r.created_at + INTERVAL '30 days'
                       ))::int)::int AS conversions
                FROM Payments p
                LEFT JOIN Items i ON i.id = p.item_id
                WHERE p.created_at >= ${lookback}
                  ${rentalFilter}
                GROUP BY date_trunc('${trunc}', p.created_at)
                ORDER BY MIN(p.created_at) DESC
                LIMIT ${limitCount}`;
    }

    const result = await db.query(query);

    res.json({ reports: result.rows });
  } catch (error) {
    console.error('Admin Reports Error:', error);
    res.status(500).json({ error: 'Failed to load reports' });
  }
};

const getNotifications = async (req, res) => {
  try {
    const [pendingItems, recentPayments, recentAuditLogs] = await Promise.all([
      db.query(
        `SELECT i.id, i.title, i.price, i.status, u.name AS owner_name, i.created_at
         FROM Items i
         LEFT JOIN Users u ON u.id = i.owner_id
         WHERE i.status = 'pending_approval'::item_status
         ORDER BY i.created_at DESC
         LIMIT 4`
      ),
      db.query(
        `SELECT p.id, p.amount, p.transaction_id, p.payment_status, p.created_at,
                u.name AS owner_name, i.title AS item_title
         FROM Payments p
         LEFT JOIN Users u ON u.id = p.owner_id
         LEFT JOIN Items i ON i.id = p.item_id
         ORDER BY p.created_at DESC
         LIMIT 4`
      ),
      db.query(
        `SELECT a.id, a.action_type, a.resource_type, a.resource_id, a.details, a.created_at,
                u.name AS admin_name
         FROM AuditLogs a
         LEFT JOIN Users u ON u.id = a.admin_id
         ORDER BY a.created_at DESC
         LIMIT 4`
      ),
    ]);

    const notifications = [
      ...pendingItems.rows.map((item) => ({
        id: `pending-${item.id}`,
        title: 'Pending approval',
        message: `${item.title} from ${item.owner_name || 'Unknown owner'} is waiting for review.`,
        category: 'Moderation',
        amount: item.price ? `$${Number(item.price).toLocaleString()}` : null,
        time: item.created_at,
      })),
      ...recentPayments.rows.map((payment) => ({
        id: `payment-${payment.id}`,
        title: payment.payment_status === 'completed' ? 'Payment completed' : 'Payment update',
        message: `${payment.owner_name || 'A user'} paid ${Number(payment.amount || 0).toLocaleString()} for ${payment.item_title || 'an item'}.`,
        category: 'Finance',
        amount: `$${Number(payment.amount || 0).toLocaleString()}`,
        time: payment.created_at,
      })),
      ...recentAuditLogs.rows.map((entry) => ({
        id: `audit-${entry.id}`,
        title: `Admin ${String(entry.action_type || 'activity').replace(/_/g, ' ')}`,
        message: `${entry.admin_name || 'An admin'} updated ${entry.resource_type || 'a resource'} ${entry.resource_id ? `#${entry.resource_id}` : ''}`.trim(),
        category: 'Activity',
        time: entry.created_at,
      })),
    ];

    res.json({ notifications });
  } catch (error) {
    console.error('Admin Notifications Error:', error);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.action_type, a.resource_type, a.resource_id, a.ip_address, a.details, a.created_at, u.name AS admin_name
       FROM AuditLogs a
       LEFT JOIN Users u ON u.id = a.admin_id
       ORDER BY a.created_at DESC
       LIMIT 50`
    );

    res.json({ logs: result.rows });
  } catch (error) {
    console.error('Admin Audit Logs Error:', error);
    res.status(500).json({ error: 'Failed to load audit logs' });
  }
};

const getSummary = async (req, res) => {
  try {
    const [usersRes, ownersRes, activeRes, soldRes, rentedRes, revenueRes, pendingRes, expiredRes, suspendedRes] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM Users WHERE role != $1::user_role', ['customer']),
      db.query("SELECT COUNT(*)::int AS count FROM Users WHERE role = 'owner'"),
      db.query("SELECT COUNT(*)::int AS count FROM Items WHERE status = 'active'::item_status"),
      db.query("SELECT COUNT(*)::int AS count FROM Items WHERE status = 'sold'::item_status"),
      db.query("SELECT COUNT(*)::int AS count FROM Items WHERE status = 'rented'::item_status"),
      db.query("SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM Payments WHERE payment_status = 'completed'::payment_status"),
      db.query("SELECT COUNT(*)::int AS count FROM Items WHERE status = 'pending_approval'::item_status"),
      db.query("SELECT COUNT(*)::int AS count FROM Items WHERE status = 'expired'::item_status"),
      db.query("SELECT COUNT(*)::int AS count FROM Users WHERE status = 'suspended'"),
    ]);

    res.json({
      stats: {
        totalUsers: usersRes.rows[0]?.count ?? 0,
        totalOwners: ownersRes.rows[0]?.count ?? 0,
        activeListings: activeRes.rows[0]?.count ?? 0,
        soldCount: soldRes.rows[0]?.count ?? 0,
        rentedCount: rentedRes.rows[0]?.count ?? 0,
        revenue: Number(revenueRes.rows[0]?.total ?? 0),
        pendingApprovals: pendingRes.rows[0]?.count ?? 0,
        expiredListings: expiredRes.rows[0]?.count ?? 0,
        suspendedAccounts: suspendedRes.rows[0]?.count ?? 0,
      },
    });
  } catch (error) {
    console.error('Admin Summary Error:', error);
    res.status(500).json({ error: 'Failed to load admin summary' });
  }
};

const listItems = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT i.id, i.title, i.status, i.transaction_type, i.price, i.location, i.created_at,
              u.id AS owner_id, u.name AS owner_name, u.email AS owner_email, c.name AS category
       FROM Items i
       LEFT JOIN Users u ON u.id = i.owner_id
       LEFT JOIN Categories c ON c.id = i.category_id
       ORDER BY i.created_at DESC, i.id DESC`
    );
    res.json({ items: result.rows });
  } catch (error) {
    console.error('Admin List Items Error:', error);
    res.status(500).json({ error: 'Failed to load items' });
  }
};

const listUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.admin_role,
              COALESCE(COUNT(i.id), 0)::int AS item_count
       FROM Users u
       LEFT JOIN Items i ON i.owner_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC, u.id DESC`
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Admin List Users Error:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
};

const getPayments = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.amount, p.transaction_id, p.payment_method, p.payment_status, p.payment_status AS status, p.created_at,
              u.name AS owner_name, i.title AS item_title
       FROM Payments p
       LEFT JOIN Users u ON u.id = p.owner_id
       LEFT JOIN Items i ON i.id = p.item_id
       ORDER BY p.created_at DESC
       LIMIT 100`
    );
    res.json({ payments: result.rows });
  } catch (error) {
    console.error('Admin Payments Error:', error);
    res.status(500).json({ error: 'Failed to load payments' });
  }
};

const getCategories = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.name, c.icon, c.image_url, c.category_config, COALESCE(COUNT(i.id), 0)::int AS item_count
       FROM Categories c
       LEFT JOIN Items i ON i.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Admin Categories Error:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, icon = null, image_url = null, category_config = {} } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const safeConfig = category_config && typeof category_config === 'object' ? category_config : {};
    const result = await db.query(
      `INSERT INTO Categories (name, icon, image_url, category_config) VALUES ($1, $2, $3, $4) RETURNING id, name, icon, image_url, category_config`,
      [name.trim(), icon, image_url, safeConfig]
    );
    await logAudit({
      adminId: req.user.id,
      actionType: 'create_category',
      resourceType: 'Category',
      resourceId: result.rows[0].id,
      ipAddress: req.ip,
      details: { name: name.trim() },
    });
    res.status(201).json({ category: result.rows[0] });
  } catch (error) {
    console.error('Admin Create Category Error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const categoryId = Number(req.params.id);
    const { name, icon, image_url, category_config } = req.body;
    if (!Number.isFinite(categoryId)) return res.status(400).json({ error: 'Invalid category id' });

    const result = await db.query(
      `UPDATE Categories
       SET name = COALESCE(NULLIF($2, ''), name),
           icon = COALESCE($3, icon),
           image_url = COALESCE($4, image_url),
           category_config = COALESCE($5::jsonb, category_config)
       WHERE id = $1
       RETURNING id, name, icon, image_url, category_config`,
      [categoryId, name, icon, image_url, category_config === undefined ? null : category_config]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    await logAudit({
      adminId: req.user.id,
      actionType: 'update_category',
      resourceType: 'Category',
      resourceId: categoryId,
      ipAddress: req.ip,
      details: { name, icon, image_url },
    });
    res.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Admin Update Category Error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const categoryId = Number(req.params.id);
    if (!Number.isFinite(categoryId)) return res.status(400).json({ error: 'Invalid category id' });

    const linkedItems = await db.query('SELECT COUNT(*)::int AS count FROM Items WHERE category_id = $1', [categoryId]);
    const itemCount = linkedItems.rows[0]?.count || 0;
    if (itemCount > 0) {
      return res.status(400).json({
        error: `This category cannot be deleted while it still has ${itemCount} item${itemCount === 1 ? '' : 's'}. Remove or reassign those items first.`,
      });
    }

    const result = await db.query('DELETE FROM Categories WHERE id = $1 RETURNING id', [categoryId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    await logAudit({
      adminId: req.user.id,
      actionType: 'delete_category',
      resourceType: 'Category',
      resourceId: categoryId,
      ipAddress: req.ip,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Admin Delete Category Error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

const createAdminAccount = async (req, res) => {
  try {
    const callerRole = String(req.user?.adminRole || req.user?.role || '').trim().toUpperCase();
    if (callerRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only super admins can create admin accounts.' });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const nameInput = String(req.body?.name || '').trim();
    const adminRoleInput = String(req.body?.adminRole || 'ADMIN').trim().toUpperCase();
    const adminRole = ['ADMIN', 'MODERATOR'].includes(adminRoleInput) ? adminRoleInput : 'ADMIN';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const existing = await db.query('SELECT id FROM Users WHERE LOWER(email) = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const derivedName = nameInput || email.split('@')[0].replace(/[._-]+/g, ' ').trim() || 'Admin User';

    const result = await db.query(
      `INSERT INTO Users (name, email, password, role, admin_role, status, email_verified, is_seller)
       VALUES ($1, $2, $3, 'admin', $4, 'active', TRUE, FALSE)
       RETURNING id, name, email, role, admin_role, status, created_at`,
      [derivedName, email, hashedPassword, adminRole]
    );

    await logAudit({
      adminId: req.user.id,
      actionType: 'create_admin_account',
      resourceType: 'User',
      resourceId: result.rows[0].id,
      ipAddress: req.ip,
      details: { email, adminRole },
    });

    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    console.error('Admin Create Account Error:', error);
    res.status(500).json({ error: 'Failed to create admin account' });
  }
};

const updateItemStatus = async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const status = String(req.body?.status || '').toLowerCase();
    const rejectionReason = String(req.body?.rejectionReason || '').trim();

    if (!Number.isFinite(itemId)) return res.status(400).json({ error: 'Invalid item id' });
    if (!ALLOWED_ITEM_STATUSES.has(status)) return res.status(400).json({ error: 'Invalid item status' });

    const result = await db.query(
      `UPDATE Items
       SET status = $2::item_status,
           rejection_reason = COALESCE(NULLIF($3, ''), rejection_reason)
       WHERE id = $1
       RETURNING id, status, rejection_reason, admin_note, title, owner_id`,
      [itemId, status, rejectionReason]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });

    const updatedItem = result.rows[0];

    const notificationPayload = (() => {
      const itemTitle = updatedItem.title || 'your item';
      if (status === 'suspended') {
        return {
          title: 'Item Suspended',
          message: `Your item "${itemTitle}" was suspended by an admin. Please review the listing before reactivating it.`,
        };
      }
      if (status === 'removed') {
        return {
          title: 'Item Removed',
          message: `Your item "${itemTitle}" was removed by an admin and is no longer visible on the platform.`,
        };
      }
      if (status === 'active') {
        const adminNote = String(updatedItem.admin_note || '').trim();
        return {
          title: 'Item Reactivated',
          message: adminNote
            ? `Your item "${itemTitle}" (Item ID: ${itemId}) is active again and visible to users. Admin note: ${adminNote}`
            : `Your item "${itemTitle}" (Item ID: ${itemId}) is active again and visible to users.`,
        };
      }
      if (status === 'rejected') {
        return {
          title: 'Item Rejected',
          message: rejectionReason
            ? `Your item "${itemTitle}" (Item ID: ${itemId}) was rejected. Reason: ${rejectionReason}.`
            : `Your item "${itemTitle}" (Item ID: ${itemId}) was rejected by an admin.`,
        };
      }
      return null;
    })();

    if (notificationPayload) {
      const notification = await createItemStatusNotification({
        userId: updatedItem.owner_id,
        title: notificationPayload.title,
        message: notificationPayload.message,
      });

      if (notification) {
        const io = req.app.get('io');
        if (io) {
          const roomName = `user_${updatedItem.owner_id}`;
          io.to(roomName).emit('notification:new', notification);
          const onlineUsers = req.app.get('onlineUsers');
          const sockets = onlineUsers?.get(updatedItem.owner_id);
          if (sockets && sockets.size > 0) {
            sockets.forEach((socketId) => {
              io.to(socketId).emit('notification:new', notification);
            });
          }
        }
      }
    }

    await logAudit({
      adminId: req.user.id,
      actionType: 'update_item_status',
      resourceType: 'Item',
      resourceId: itemId,
      ipAddress: req.ip,
      details: { status, rejectionReason },
    });
    res.json({ item: updatedItem });
  } catch (error) {
    console.error('Admin Update Item Status Error:', error);
    res.status(500).json({ error: 'Failed to update item status' });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const status = String(req.body?.status || '').toLowerCase();

    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user id' });
    if (!ALLOWED_USER_STATUSES.has(status)) return res.status(400).json({ error: 'Invalid user status' });
    if (Number(req.user?.id) === userId) return res.status(400).json({ error: 'You cannot change your own status' });

    const result = await db.query(
      `UPDATE Users SET status = $2 WHERE id = $1 RETURNING id, status`,
      [userId, status]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    await logAudit({
      adminId: req.user.id,
      actionType: 'update_user_status',
      resourceType: 'User',
      resourceId: userId,
      ipAddress: req.ip,
      details: { status },
    });
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Admin Update User Status Error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

const updateItemNote = async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const { note } = req.body;
    if (!Number.isFinite(itemId)) return res.status(400).json({ error: 'Invalid item id' });

    await db.query(
      `UPDATE Items SET admin_note = $2 WHERE id = $1 RETURNING id, admin_note`,
      [itemId, note]
    );

    await logAudit({
      adminId: req.user.id,
      actionType: 'update_item_admin_note',
      resourceType: 'Item',
      resourceId: itemId,
      ipAddress: req.ip,
      details: { note: note ? String(note).slice(0, 1000) : null },
    });

    const result = await db.query('SELECT id, admin_note FROM Items WHERE id = $1', [itemId]);
    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Admin Update Item Note Error:', error);
    res.status(500).json({ error: 'Failed to update item note' });
  }
};

module.exports = {
  getSummary,
  getAnalytics,
  getReports,
  getNotifications,
  getAuditLogs,
  getSettings,
  updateSettings,
  listItems,
  listUsers,
  getPayments,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createAdminAccount,
  updateItemStatus,
  updateUserStatus,
  updateItemNote,
};
