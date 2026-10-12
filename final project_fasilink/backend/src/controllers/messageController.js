const db = require('../config/db');
const { createMessageNotification } = require('../services/notificationService');

const getConversation = async (req, res) => {
    try {
        const me = req.user?.id;
        const other = Number(req.query.with);
        const itemIdRaw = req.query.item;
        const itemId = itemIdRaw === undefined || itemIdRaw === null || itemIdRaw === '' ? null : Number(itemIdRaw);

        if (!me) return res.status(401).json({ error: 'Unauthorized' });
        if (!Number.isFinite(other)) return res.status(400).json({ error: 'Missing or invalid with user id' });

        const params = [me, other];
        const itemFilter = Number.isFinite(itemId) ? (params.push(itemId), ` AND m.item_id = $${params.length}`) : '';

        const result = await db.query(
            `
            SELECT m.id, m.sender_id, m.receiver_id, m.message, m.timestamp, m.item_id, i.title AS item_title
            FROM Messages m
            LEFT JOIN Items i ON i.id = m.item_id
            WHERE ((m.sender_id = $1 AND m.receiver_id = $2)
               OR (m.sender_id = $2 AND m.receiver_id = $1))
            ${itemFilter}
            ORDER BY m.timestamp ASC, m.id ASC
            LIMIT 200
            `,
            params
        );

        res.json({ messages: result.rows });
    } catch (error) {
        console.error('Get Conversation Error:', error);
        res.status(500).json({ error: 'Failed to load messages' });
    }
};

const sendMessage = async (req, res) => {
    try {
        const senderId = req.user?.id;
        const receiverId = Number(req.body?.receiver_id);
        const message = String(req.body?.message || '').trim();
        const rawItemId = req.body?.item_id;
        let itemId = rawItemId === undefined || rawItemId === null || rawItemId === '' ? null : Number(rawItemId);
        if (!Number.isFinite(itemId) || itemId <= 0) itemId = null;

        if (!senderId) return res.status(401).json({ error: 'Unauthorized' });
        if (!Number.isFinite(receiverId)) return res.status(400).json({ error: 'receiver_id is required' });
        if (!message) return res.status(400).json({ error: 'message is required' });

        // If client didn't provide item_id (common when replying from a generic inbox link),
        // inherit the latest non-null item_id between these two users so threads stay per-item.
        if (!Number.isFinite(itemId)) {
            const latestCtx = await db.query(
                `
                SELECT item_id
                FROM Messages
                WHERE ((sender_id = $1 AND receiver_id = $2)
                    OR (sender_id = $2 AND receiver_id = $1))
                  AND item_id IS NOT NULL
                ORDER BY timestamp DESC, id DESC
                LIMIT 1
                `,
                [senderId, receiverId]
            );
            const inferred = latestCtx.rows[0]?.item_id;
            itemId = inferred !== undefined && inferred !== null ? Number(inferred) : null;
            if (!Number.isFinite(itemId) || itemId <= 0) itemId = null;
        }

        const insert = await db.query(
            `
            INSERT INTO Messages (sender_id, receiver_id, message, item_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, sender_id, receiver_id, message, timestamp, item_id
            `,
            [senderId, receiverId, message, itemId]
        );

        const saved = insert.rows[0];

        let item_title = null;
        if (Number.isFinite(itemId)) {
            const itemRes = await db.query('SELECT title FROM Items WHERE id = $1', [itemId]);
            item_title = itemRes.rows[0]?.title || null;
        }

        const payload = { ...saved, item_title };

        const io = req.app.get('io');
        if (io) {
            try {
                const roomName = `user_${receiverId}`;
                const room = io.sockets.adapter.rooms.get(roomName);
                const memberCount = room ? room.size : 0;
                io.to(roomName).emit('message:new', payload);

                if (memberCount === 0) {
                    const onlineUsers = req.app.get('onlineUsers');
                    const sockets = onlineUsers?.get(receiverId);
                    if (sockets && sockets.size > 0) {
                        console.log(`[MSG] Receiver ${receiverId} has socket IDs ${[...sockets].join(', ')}; sending directly as fallback.`);
                        sockets.forEach((socketId) => {
                            io.to(socketId).emit('message:new', payload);
                        });
                    }
                }

                try {
                    const notification = await createMessageNotification(
                        receiverId,
                        senderId,
                        message,
                        itemId,
                        item_title
                    );
                    io.to(roomName).emit('notification:new', notification);
                    if (memberCount === 0) {
                        const onlineUsers = req.app.get('onlineUsers');
                        const sockets = onlineUsers?.get(receiverId);
                        if (sockets && sockets.size > 0) {
                            sockets.forEach((socketId) => {
                                io.to(socketId).emit('notification:new', notification);
                            });
                        }
                    }
                } catch (notifErr) {
                    console.error('Message notification error:', notifErr);
                }
            } catch (emitErr) {
                console.error('Error while emitting message via socket.io:', emitErr);
            }
        } else {
            console.warn('[MSG] No socket.io instance available to emit message');
        }

        res.status(201).json({ message: payload });
    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

const getInbox = async (req, res) => {
    try {
        const me = req.user?.id;
        if (!me) return res.status(401).json({ error: 'Unauthorized' });

        const result = await db.query(
            `
            WITH convo AS (
                SELECT
                    CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_id,
                    sender_id,
                    receiver_id,
                    message,
                    timestamp,
                    id,
                    item_id
                FROM Messages
                WHERE sender_id = $1 OR receiver_id = $1
            ), latest AS (
                SELECT DISTINCT ON (other_id, item_id)
                    other_id,
                    sender_id,
                    receiver_id,
                    message,
                    timestamp,
                    id,
                    item_id
                FROM convo
                ORDER BY other_id, item_id, timestamp DESC, id DESC
            )
            SELECT
                l.other_id,
                l.sender_id AS last_sender_id,
                l.receiver_id AS last_receiver_id,
                l.message,
                l.timestamp,
                u.name AS other_name,
                u.email AS other_email,
                l.item_id,
                i.title AS item_title
            FROM latest l
            LEFT JOIN Users u ON u.id = l.other_id
            LEFT JOIN Items i ON i.id = l.item_id
            ORDER BY l.timestamp DESC, l.id DESC
            `,
            [me]
        );

        res.json({ conversations: result.rows });
    } catch (error) {
        console.error('Get Inbox Error:', error);
        res.status(500).json({ error: 'Failed to load inbox' });
    }
};

module.exports = { getConversation, sendMessage, getInbox };
