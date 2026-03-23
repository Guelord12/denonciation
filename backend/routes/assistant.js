const express = require('express');
const assistantController = require('../controllers/assistantController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/ask', authMiddleware, assistantController.ask.bind(assistantController));

module.exports = router;