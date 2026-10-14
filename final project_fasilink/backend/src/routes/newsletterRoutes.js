const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../config/db');

const router = express.Router();
const newsletterLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many subscription attempts. Please try again later.' },
});
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', newsletterLimiter, async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!emailPattern.test(email) || email.length > 320) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    try {
        await db.query(
            `INSERT INTO newsletter_subscribers (email) VALUES ($1)
             ON CONFLICT (email) DO NOTHING`,
            [email]
        );
        return res.status(201).json({ message: 'You have been subscribed successfully.' });
    } catch (error) {
        console.error('Newsletter subscription error:', error.message);
        return res.status(500).json({ error: 'Unable to subscribe right now. Please try again.' });
    }
});

module.exports = router;
