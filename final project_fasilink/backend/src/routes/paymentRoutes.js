const express = require('express');
const router = express.Router();
const { 
    initializePayment, 
    verifyPayment,
    confirmRenewalPayment,
    postingFeeStatus, 
    getMyPaymentSummary,
    mockCompletePostingFee,
    payListing,
    initializeRenewal,
    chapaConfig,
} = require('../controllers/paymentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Posting initialization only requires authentication; the controller still
// enforces ownership for renewal and item-specific payment flows.
const ownerRoles = ['owner', 'admin', 'seller'];

router.get('/chapa-config', verifyToken, requireRole(ownerRoles), chapaConfig);
router.post('/initialize', verifyToken, initializePayment);

// Posting fee helpers
router.get('/posting-fee/status', verifyToken, requireRole(ownerRoles), postingFeeStatus);
router.get('/mine-summary', verifyToken, requireRole(ownerRoles), getMyPaymentSummary);
router.post('/posting-fee/mock-complete', verifyToken, requireRole(ownerRoles), mockCompletePostingFee);

// Active checkout / activation routes
router.post('/pay-listing', verifyToken, requireRole(ownerRoles), payListing);
router.post('/renew-listing', verifyToken, requireRole(ownerRoles), initializeRenewal);
router.post('/confirm-renewal', verifyToken, requireRole(ownerRoles), confirmRenewalPayment);

// Callback from Chapa API (also used after browser return; Chapa sends trx_ref in query)
router.get('/verify/:tx_ref', verifyPayment);

module.exports = router;