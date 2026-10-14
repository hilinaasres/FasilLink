const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '..', '.env') });
const { ensureSchema } = require('./services/ensureSchema');

ensureSchema()
    .then(() => console.log('[DB] Schema ensured (favorites/ratings).'))
    .catch((e) => console.error('[DB] ensureSchema failed:', e));

const app = express();
// Render places the application behind one trusted reverse-proxy hop.
app.set('trust proxy', 1);
const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    'http://localhost:3000',
    'http://localhost:5173',
].filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.originalUrl} - Auth: ${req.headers.authorization ? 'Present' : 'Missing'}`);
    if (process.env.NODE_ENV !== 'production') {
        const originalJson = res.json;
        res.json = function(body) {
            console.log(`[RES] ${req.method} ${req.originalUrl} - Status: ${res.statusCode}`);
            return originalJson.apply(this, arguments);
        };
    }
    next();
});
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static hosting for uploaded media
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const db = require('./config/db');

app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'FasilLink API is running. Use /api/health for backend health and /api/items, /api/auth, etc. for API endpoints.',
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    return res.json({ status: 'ok', db: true });
  } catch (error) {
    console.error('[HEALTH] DB check failed:', error);
    return res.status(503).json({ status: 'error', db: false, error: 'Database unreachable' });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: allowedOrigins }
});

const onlineUsers = new Map();

const addSocketForUser = (userId, socketId) => {
    const sockets = onlineUsers.get(userId) || new Set();
    sockets.add(socketId);
    onlineUsers.set(userId, sockets);
};

const removeSocketForUser = (userId, socketId) => {
    const sockets = onlineUsers.get(userId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) {
        onlineUsers.delete(userId);
    } else {
        onlineUsers.set(userId, sockets);
    }
};

// Allow controllers to emit events
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// Setup WebSockets for Chat
io.on('connection', (socket) => {
    console.log(`[SOCKET] connected: ${socket.id}`);

    socket.on('auth', (payload) => {
        const userId = Number(payload?.userId);
        if (Number.isFinite(userId)) {
            socket.data.userId = userId;
            const userRoom = `user_${userId}`;
            socket.join(userRoom);
            addSocketForUser(userId, socket.id);
            const sockets = onlineUsers.get(userId);
            console.log(`[SOCKET] ${userRoom} joined by socket ${socket.id} (total sockets: ${sockets?.size ?? 0})`);
        }
    });
    
    socket.on('join_room', (roomId) => {
        if (typeof roomId !== 'string' || !roomId.trim()) return;
        socket.join(roomId);
        console.log(`[SOCKET] socket ${socket.id} joined room ${roomId}`);
    });

    socket.on('send_message', async (data, ack) => {
        try {
            const senderId = Number(socket.data.userId);
            const receiverId = Number(data?.receiverId);
            const message = String(data?.message || '').trim();
            const rawItemId = data?.itemId;
            let itemId = rawItemId === undefined || rawItemId === null || rawItemId === '' ? null : Number(rawItemId);
            if (!Number.isFinite(itemId) || itemId <= 0) itemId = null;

            if (!Number.isFinite(senderId) || !Number.isFinite(receiverId) || !message) {
                if (typeof ack === 'function') ack({ ok: false });
                return;
            }

            const savedRes = await require('./config/db').query(
                `
                WITH ins AS (
                    INSERT INTO Messages (sender_id, receiver_id, message, item_id)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id, sender_id, receiver_id, message, timestamp, item_id
                )
                SELECT ins.*, i.title AS item_title
                FROM ins
                LEFT JOIN Items i ON i.id = ins.item_id
                `,
                [senderId, receiverId, message, itemId]
            );

            const row = savedRes.rows[0];
            const payload = { ...row, clientId: data?.clientId };
            const receiverRoom = `user_${receiverId}`;
            if (typeof ack === 'function') ack({ ok: true, message: payload });
            io.to(receiverRoom).emit('message:new', payload);

            const { createMessageNotification } = require('./services/notificationService');
            createMessageNotification(
                    receiverId,
                    senderId,
                    message,
                    itemId,
                    row.item_title
                )
                .then((notification) => {
                io.to(receiverRoom).emit('notification:new', notification);
                })
                .catch((notifErr) => console.error('Socket message notification error:', notifErr));
        } catch (e) {
            console.error('Socket send_message error:', e);
            if (typeof ack === 'function') ack({ ok: false });
        }
    });

    socket.on('disconnect', () => {
        const userId = Number(socket.data.userId);
        if (Number.isFinite(userId)) {
            removeSocketForUser(userId, socket.id);
            console.log(`[SOCKET] user_${userId} disconnected and removed socket ${socket.id}`);
        } else {
            console.log(`[SOCKET] disconnected: ${socket.id}`);
        }
    });
});

const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const itemRoutes = require('./routes/itemRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const discoveryRoutes = require('./routes/discoveryRoutes');
const chargingRoutes = require('./routes/chargingRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', announcementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/discover', discoveryRoutes);
app.use('/api/charging', chargingRoutes);
app.use('/api/newsletter', newsletterRoutes);

// Proxy AI service under /api/ai -> forwards to the AI microservice
const aiTarget = process.env.AI_SERVICE_URL || 'http://localhost:5001';
app.use('/api/ai', createProxyMiddleware({
    target: aiTarget,
    changeOrigin: true,
    pathRewrite: { '^/api/ai': '/' },
    logLevel: 'warn',
}));

// Serve admin-dashboard build at /admin if present
const adminBuildPath = path.join(__dirname, '..', '..', 'admin-dashboard', 'dist');
if (fs.existsSync(adminBuildPath)) {
    app.use('/admin', express.static(adminBuildPath));
    // Use a regex route to avoid path-to-regexp parsing issues with wildcard patterns
    app.get(/^\/admin\/.*$/, (req, res) => {
        res.sendFile(path.join(adminBuildPath, 'index.html'));
    });
}

// Start background workers
require('./services/scheduler');

const buildPath = path.join(__dirname, '..', '..', 'frontend', 'build');
if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.use((req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
            return next();
        }
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`FasilLink API is running on port ${PORT}`);
});
