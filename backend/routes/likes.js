const express = require('express');
const likeController = require('../controllers/likeController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/:reportId', authMiddleware, likeController.setLike.bind(likeController));
router.delete('/:reportId', authMiddleware, likeController.removeLike.bind(likeController));
router.get('/:reportId/status', authMiddleware, likeController.getUserLikeStatus.bind(likeController));

module.exports = router;