const express = require('express');
const router = express.Router();

const {
	listItems,
	listRecentItems,
	listTrendingItems,
	listRecommendedItems,
	listMyItems,
	getRenewalPreview,
	updateMyItem,
	deleteMyItem,
	getItemById,
	createItem,
	getSearchSuggestions,
	getSimilarItems,
} = require('../controllers/itemController');
// AI-powered similar items
router.get('/similar/:id', getSimilarItems);
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const multer = require('multer');

// Use memory storage so files can be uploaded to Cloudinary
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { files: 6, fileSize: 10 * 1024 * 1024 }, // up to 10MB each
	fileFilter: (req, file, cb) => {
		// Allow images for the `images` field and documents for `legal_document`.
		if (file.fieldname === 'legal_document') {
			const allowedDocTypes = [
				'application/pdf',
				'application/msword',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
			];
			if (!file.mimetype || !allowedDocTypes.includes(file.mimetype)) {
				return cb(new Error('Only PDF/DOC/DOCX uploads are allowed for legal documents'));
			}
			return cb(null, true);
		}

		// Default: images only
		if (!file.mimetype || !file.mimetype.startsWith('image/')) {
			return cb(new Error('Only image uploads are allowed for image files'));
		}
		cb(null, true);
	},
});

router.get('/', listItems);
router.get('/suggestions', getSearchSuggestions);
router.get('/recent', listRecentItems);
router.get('/trending', listTrendingItems);
router.get('/recommended', listRecommendedItems);
// Customer-scoped owner actions: authenticated users can perform owner-like actions
// without changing their role. These mirror the protected owner routes but
// only require a valid token.
router.get('/mine-customer', verifyToken, listMyItems);
router.get('/:id/renewal-preview-customer', verifyToken, getRenewalPreview);
router.patch('/:id/customer', verifyToken, updateMyItem);
router.delete('/:id/customer', verifyToken, deleteMyItem);
router.post('/customer', verifyToken, upload.fields([
	{ name: 'images', maxCount: 5 },
	{ name: 'legal_document', maxCount: 1 }
]), createItem);

router.get('/mine', verifyToken, requireRole(['owner', 'admin', 'seller']), listMyItems);
router.get('/:id/renewal-preview', verifyToken, requireRole(['owner', 'admin', 'seller']), getRenewalPreview);
router.patch('/:id', verifyToken, requireRole(['owner', 'admin', 'seller']), updateMyItem);
router.delete('/:id', verifyToken, requireRole(['owner', 'admin', 'seller']), deleteMyItem);
router.get('/:id', getItemById);
router.post('/', verifyToken, requireRole(['owner', 'admin', 'seller']), upload.fields([
	{ name: 'images', maxCount: 5 },
	{ name: 'legal_document', maxCount: 1 }
]), createItem);

// Multer errors otherwise bubble up as generic 500s
router.use((err, req, res, next) => {
	if (!err) return next();

	if (err instanceof multer.MulterError) {
		if (err.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({ error: 'Each image must be 10MB or less.' });
		}
		if (err.code === 'LIMIT_FILE_COUNT') {
			return res.status(400).json({ error: 'You can upload up to 5 images and 1 document.' });
		}
		return res.status(400).json({ error: err.message || 'Invalid upload.' });
	}

	return res.status(400).json({ error: err.message || 'Invalid upload.' });
});

module.exports = router;