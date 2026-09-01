const db = require('../config/db');

const checkExpirations = async () => {
    try {
        console.log('[Schedule] Running Item Expiration and Suspension Check...');

        // 1. Find items older than 2 months that are 'active'
        // Logic: active -> suspended
        const toSuspend = await db.query(`
            UPDATE Items 
            SET status = 'suspended'
            WHERE status = 'active'
              AND created_at < NOW() - INTERVAL '2 months'
            RETURNING id, owner_id, title
        `);

        for (const item of toSuspend.rows) {
            console.log(`[Schedule] Suspending item ${item.id} (${item.title})`);
            await db.query(`
                INSERT INTO Notifications (user_id, title, message, type)
                VALUES ($1, $2, $3, $4)
            `, [
                item.owner_id, 
                'Action Required: Item Suspended', 
                `Your item "${item.title}" (Item ID: ${item.id}) has been active for 2 months. It is now suspended for 3 days. Please pay the renewal fee to reactivate it, or it will expire automatically.`, 
                'warning'
            ]);
        }

        // 2. Find items that have been 'suspended' for 3 days or more
        // Logic: suspended -> expired
        const toExpire = await db.query(`
            UPDATE Items
            SET status = 'expired'
            WHERE status = 'suspended'
              AND id IN (
                  SELECT item_id FROM (
                      -- This is a simplification; in a real system we'd track status_changed_at
                      -- For now we check original created_at exceeds 2 months + 3 days
                      SELECT id as item_id FROM Items 
                      WHERE status = 'suspended' 
                        AND created_at < NOW() - INTERVAL '2 months' - INTERVAL '3 days'
                  ) temp
              )
            RETURNING id, owner_id, title
        `);

        for (const item of toExpire.rows) {
            console.log(`[Schedule] Expiring item ${item.id} (${item.title})`);
            await db.query(`
                INSERT INTO Notifications (user_id, title, message, type)
                VALUES ($1, $2, $3, $4)
            `, [
                item.owner_id, 
                'Item Expired', 
                `Your item "${item.title}" (Item ID: ${item.id}) has expired and is no longer search-able. Contact support to renew.`, 
                'alert'
            ]);
        }

    } catch (err) {
        console.error('[Schedule] Error in checkExpirations:', err);
    }
};

// Run immediately on boot, then every hour (3600000ms)
setInterval(checkExpirations, 3600000);
setTimeout(checkExpirations, 5000); 

module.exports = { checkExpirations };