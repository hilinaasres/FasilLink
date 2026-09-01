const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const {
  getSummary,
  getAnalytics,
  getReports,
  getNotifications,
  getAuditLogs,
  getSettings,
  updateSettings,
  listItems,
  listUsers,
  getPayments,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createAdminAccount,
  updateItemStatus,
  updateItemNote,
  updateUserStatus,
} = require('../controllers/adminController');

const router = express.Router();

router.get('/summary', verifyToken, requireRole(['admin']), getSummary);
router.get('/analytics', verifyToken, requireRole(['admin']), getAnalytics);
router.get('/reports', verifyToken, requireRole(['admin']), getReports);
router.get('/notifications', verifyToken, requireRole(['admin']), getNotifications);
router.get('/audit', verifyToken, requireRole(['admin']), getAuditLogs);
router.get('/settings', verifyToken, requireRole(['admin']), getSettings);
router.patch('/settings', verifyToken, requireRole(['admin']), updateSettings);

router.get('/items', verifyToken, requireRole(['admin']), listItems);
router.get('/users', verifyToken, requireRole(['admin']), listUsers);
router.get('/payments', verifyToken, requireRole(['admin']), getPayments);
router.get('/categories', verifyToken, requireRole(['admin']), getCategories);

router.post('/categories', verifyToken, requireRole(['admin']), createCategory);
router.patch('/categories/:id', verifyToken, requireRole(['admin']), updateCategory);
router.delete('/categories/:id', verifyToken, requireRole(['admin']), deleteCategory);

router.patch('/items/:id/status', verifyToken, requireRole(['admin']), updateItemStatus);
router.patch('/items/:id/note', verifyToken, requireRole(['admin']), updateItemNote);
router.patch('/users/:id/status', verifyToken, requireRole(['admin']), updateUserStatus);
router.post('/users/create-admin', verifyToken, requireRole(['admin']), createAdminAccount);

module.exports = router;
