const express = require('express');
const statsController = require('../controllers/statsController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, statsController.getStats.bind(statsController));
router.get('/temporal', authMiddleware, statsController.getTemporalStats.bind(statsController));
router.get('/top', authMiddleware, statsController.getTopReports.bind(statsController));
router.get('/categories', authMiddleware, statsController.getCategoryStats.bind(statsController));
router.get('/cities', authMiddleware, statsController.getCityStats.bind(statsController));

module.exports = router;