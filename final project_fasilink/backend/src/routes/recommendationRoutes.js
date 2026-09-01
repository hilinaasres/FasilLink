const express = require('express');
const { recommend } = require('../controllers/recommendationController');

const router = express.Router();

// Works with or without JWT; if JWT exists, uses purchase history.
router.post('/', recommend);
router.get('/', recommend);

module.exports = router;
