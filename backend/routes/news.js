const express = require('express');
const newsController = require('../controllers/newsController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, newsController.getNews.bind(newsController));
router.get('/category', authMiddleware, newsController.getNewsByCategory.bind(newsController));

module.exports = router;