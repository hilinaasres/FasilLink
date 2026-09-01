const jwt = require('jsonwebtoken');
const db = require('../config/db');

const userIsSeller = (userRow) => {
    if (!userRow) return false;
    if (userRow.is_seller) return true;
    const role = String(userRow.role || '').toLowerCase();
    return role === 'owner' || role === 'item_owner';
};

const verifyToken = async (req, res, next) => {
    // Get token from Authorization header (Bearer token)
    let token = req.header('Authorization');
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length).trimLeft();
    }

    try {
        const secret = process.env.JWT_SECRET || 'fasillink_super_secret_key';
        const verified = jwt.verify(token, secret);
        req.user = verified;

        const userRes = await db.query(
            'SELECT status, role, is_seller FROM Users WHERE id = $1',
            [verified.id]
        );
        if (userRes.rows.length === 0) {
            return res.status(401).json({ error: 'User no longer exists.' });
        }
        const dbUser = userRes.rows[0];
        const status = String(dbUser.status || 'active').toLowerCase();
        if (status !== 'active') {
            return res.status(403).json({ error: `Account is ${status}.` });
        }

        req.user.isSeller = userIsSeller(dbUser);
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

const requireRole = (roles) => {
    return async (req, res, next) => {
        if (!req.user?.id) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }

        let isSeller = Boolean(req.user.isSeller);
        if (!isSeller && (roles.includes('owner') || roles.includes('seller'))) {
            try {
                const userRes = await db.query(
                    'SELECT role, is_seller FROM Users WHERE id = $1',
                    [req.user.id]
                );
                isSeller = userIsSeller(userRes.rows[0]);
            } catch (error) {
                console.error('requireRole seller lookup failed:', error.message);
            }
        }

        const hasAdmin = roles.includes('admin') && req.user.role === 'admin';
        const hasUser = roles.includes('user') && req.user.role === 'user';
        const hasOwner = roles.includes('owner') && isSeller;
        const hasSeller = roles.includes('seller') && isSeller;

        if (hasAdmin || hasUser || hasOwner || hasSeller) {
            return next();
        }

        return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    };
};

module.exports = { verifyToken, requireRole };
