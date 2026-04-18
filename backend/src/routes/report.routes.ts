import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate, schemas } from '../middleware/validation.middleware';
import { uploadReportMedia, handleMulterError } from '../middleware/upload.middleware';
import { reportLimiter } from '../middleware/rateLimiter';
import {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  likeReport,
  addWitness,
  shareReport
} from '../controllers/report.controller';

const router = Router();

router.get('/', getReports);
router.get('/:id', getReportById);

router.post('/', 
  authenticate, 
  reportLimiter, 
  uploadReportMedia, 
  handleMulterError,
  validate(schemas.createReport), 
  createReport
);

router.put('/:id', authenticate, updateReport);
router.delete('/:id', authenticate, deleteReport);

router.post('/:id/like', authenticate, likeReport);
router.post('/:id/witness', authenticate, validate(schemas.addWitness), addWitness);
router.post('/:id/share', authenticate, shareReport);

export default router;