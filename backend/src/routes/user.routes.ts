import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate, schemas } from '../middleware/validation.middleware';
import { uploadAvatar, handleMulterError } from '../middleware/upload.middleware';
import {
  getUserProfile,
  updateProfile,
  uploadAvatar as uploadAvatarController,
  getUserReports,
  getUserStats,
  deleteAccount
} from '../controllers/user.controller';

const router = Router();

router.get('/profile/:id', getUserProfile);
router.get('/reports/:id?', authenticate, getUserReports);
router.get('/stats/:id', getUserStats);

router.put('/profile', authenticate, validate(schemas.updateProfile), updateProfile);
router.post('/avatar', authenticate, uploadAvatar, handleMulterError, uploadAvatarController);
router.delete('/account', authenticate, deleteAccount);

export default router;