const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create', authMiddleware, subscriptionController.createSubscription.bind(subscriptionController));
router.post('/verify-mobile', authMiddleware, subscriptionController.verifyMobilePayment.bind(subscriptionController));
router.get('/status', authMiddleware, subscriptionController.getPremiumStatus.bind(subscriptionController));

module.exports = router;