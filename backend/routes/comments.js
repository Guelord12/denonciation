const express = require('express');
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middleware/authMiddleware');
const { moderateMessage } = require('../middleware/moderationMiddleware');

const router = express.Router();

router.post('/:reportId', authMiddleware, moderateMessage, commentController.addComment.bind(commentController));
router.get('/:reportId', authMiddleware, commentController.getComments.bind(commentController));
router.delete('/:commentId', authMiddleware, commentController.deleteComment.bind(commentController));

module.exports = router;