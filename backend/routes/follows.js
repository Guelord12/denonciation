const express = require('express');
const followController = require('../controllers/followController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/:userId', authMiddleware, followController.follow.bind(followController));
router.delete('/:userId', authMiddleware, followController.unfollow.bind(followController));
router.get('/:userId/status', authMiddleware, followController.isFollowing.bind(followController));
router.get('/:userId/followers', authMiddleware, followController.getFollowers.bind(followController));
router.get('/:userId/following', authMiddleware, followController.getFollowing.bind(followController));

module.exports = router;