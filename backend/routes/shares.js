const express = require('express');
const shareController = require('../controllers/shareController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/reports/:reportId', authMiddleware, shareController.shareReport.bind(shareController));
router.get('/reports/:reportId/count', authMiddleware, shareController.getShareCount.bind(shareController));

module.exports = router;