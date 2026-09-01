const db = require('../config/db');

const createMessageNotification = async (receiverId, senderId, messageText, itemId = null, itemTitle = null) => {
    const senderRes = await db.query('SELECT name, email FROM Users WHERE id = $1', [senderId]);
    const senderName = senderRes.rows[0]?.name || senderRes.rows[0]?.email || 'Someone';
    const preview = String(messageText || '').trim().slice(0, 120);
    const title = 'New customer message';
    const body = itemTitle
        ? `${senderName} asked about "${itemTitle}": ${preview}`
        : `${senderName}: ${preview}`;

    const insert = await db.query(
        `
        INSERT INTO Notifications (user_id, title, message, type, is_read)
        VALUES ($1, $2, $3, 'message', FALSE)
        RETURNING id, user_id, title, message, type, is_read, created_at
        `,
        [receiverId, title, body]
    );

    return insert.rows[0];
};

module.exports = { createMessageNotification };
