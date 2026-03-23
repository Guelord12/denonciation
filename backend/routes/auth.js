const express = require('express');
const authController = require('../controllers/authController');
const { checkAge } = require('../middleware/ageVerification');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', checkAge, authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/forgot-password', authController.forgotPassword.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));
router.get('/verify', authMiddleware, authController.verifyToken.bind(authController));

module.exports = router;