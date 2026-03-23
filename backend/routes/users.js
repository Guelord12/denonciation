const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/me', authMiddleware, userController.getProfile.bind(userController));
router.put('/me', authMiddleware, userController.updateProfile.bind(userController));
router.put('/me/password', authMiddleware, userController.changePassword.bind(userController));
router.delete('/me', authMiddleware, userController.deleteAccount.bind(userController));
router.put('/:userId/ban', authMiddleware, adminMiddleware, userController.banUser.bind(userController));

module.exports = router;