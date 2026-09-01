const express = require('express');
const router = express.Router();
const { listCategories, listLocations, getAISuggestions } = require('../controllers/discoveryController');

// Public endpoints - no auth required
router.get('/categories', listCategories);
router.get('/locations', listLocations);
router.get('/suggestions', getAISuggestions);

module.exports = router;
