const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const {
    getRules,
    createRule,
    updateRule,
    toggleRule,
    deleteRule,
    getPayments,
    calculateFee
} = require('../controllers/chargingController');

// Admin CRUD routes for charging rules
router.get('/rules', verifyToken, requireRole(['admin']), getRules);
router.post('/rules', verifyToken, requireRole(['admin']), createRule);
router.patch('/rules/:id', verifyToken, requireRole(['admin']), updateRule);
router.delete('/rules/:id', verifyToken, requireRole(['admin']), deleteRule);
router.patch('/rules/:id/toggle', verifyToken, requireRole(['admin']), toggleRule);

// Admin Payment Monitoring
router.get('/payments', verifyToken, requireRole(['admin']), getPayments);

// Public / Owner Route to dynamically calculate fee before posting
router.post('/calculate', verifyToken, calculateFee);

module.exports = router;
