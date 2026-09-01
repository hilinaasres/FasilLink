const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { getConversation, sendMessage, getInbox } = require('../controllers/messageController');

const router = express.Router();

router.get('/inbox', verifyToken, getInbox);
router.get('/conversation', verifyToken, getConversation);
router.post('/', verifyToken, sendMessage);

module.exports = router;
