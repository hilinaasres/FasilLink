const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { getItemRatingPublic, getItemRatingMe, rateItem } = require('../controllers/ratingController');

const router = express.Router();

router.get('/item/:itemId', getItemRatingPublic);
router.get('/item/:itemId/me', verifyToken, getItemRatingMe);
router.post('/', verifyToken, rateItem);

module.exports = router;
