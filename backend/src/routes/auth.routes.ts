import { Router } from 'express';
import { 
  register, 
  login, 
  logout, 
  refresh, 
  me, 
  changePassword 
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, schemas } from '../middleware/validation.middleware';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, validate(schemas.register), register);
router.post('/login', authLimiter, validate(schemas.login), login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, validate(schemas.changePassword), changePassword);

export default router;