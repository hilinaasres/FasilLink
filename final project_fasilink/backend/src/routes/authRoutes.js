const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
    register,
    login,
    verifyEmailRedirect,
    verifyEmail,
    resendVerification,
    passwordResetRedirect,
    requestPasswordReset,
    resetPassword,
    becomeSeller,
    getMe,
    updateProfile,
} = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many registration attempts. Please try again in 15 minutes.' },
});

const accountRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP. Please try again later.' },
});

// Public Routes
router.post('/register', registerLimiter, register);
router.post('/login', accountRequestLimiter, login);
router.get('/verify-email/:token', verifyEmailRedirect);
router.post('/verify-email', accountRequestLimiter, verifyEmail);
router.post('/resend-verification', accountRequestLimiter, resendVerification);
router.get('/password-reset/:token', passwordResetRedirect);
router.post('/password-reset-request', accountRequestLimiter, requestPasswordReset);
router.post('/password-reset', accountRequestLimiter, resetPassword);

// Protected Customer Profile Route Example
router.get('/profile', verifyToken, (req, res) => {
    // Should fetch the authenticated user profile using req.user.id
    res.json({ message: 'Secure Profile Data Accessed', user_context: req.user });
});

router.get('/me', verifyToken, getMe);
router.patch('/profile', verifyToken, updateProfile);
router.put('/profile', verifyToken, updateProfile);
router.post('/become-seller', verifyToken, becomeSeller);

// Protected Owner Route Example
router.post('/post-item', verifyToken, requireRole(['owner', 'admin']), (req, res) => {
    res.json({ message: 'Authorized to access owner endpoint' });
});

// Protected Admin Dashboard Example
router.get('/admin', verifyToken, requireRole(['admin']), (req, res) => {
    res.json({ message: 'Admin dashboard data securely loaded' });
});

module.exports = router;
