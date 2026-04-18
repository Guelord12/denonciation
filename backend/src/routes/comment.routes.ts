import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate, schemas } from '../middleware/validation.middleware';
import { commentLimiter } from '../middleware/rateLimiter';
import {
  createComment,
  getComments,
  updateComment,
  deleteComment
} from '../controllers/comment.controller';

const router = Router();

router.get('/report/:report_id', getComments);

router.post('/', 
  authenticate, 
  commentLimiter, 
  validate(schemas.createComment), 
  createComment
);

router.put('/:id', authenticate, updateComment);
router.delete('/:id', authenticate, deleteComment);

export default router;