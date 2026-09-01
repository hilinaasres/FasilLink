const express = require('express');
const rateLimit = require('express-rate-limit');
const { adminLogin, forgotPassword } = require('../controllers/adminAuthController');

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication requests, please try again shortly.' },
});

router.post('/login', authLimiter, adminLogin);
router.post('/forgot-password', authLimiter, forgotPassword);

module.exports = router;
