const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { toggleFavorite, listFavoriteIds, listFavorites } = require('../controllers/favoriteController');

const router = express.Router();

router.get('/ids', verifyToken, listFavoriteIds);
router.get('/', verifyToken, listFavorites);
router.post('/', verifyToken, toggleFavorite);

module.exports = router;
