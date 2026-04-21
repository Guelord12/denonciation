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
import { getComments } from '../controllers/comment.controller';
import { getLikes } from '../controllers/like.controller';
import { getWitnesses, deleteWitness } from '../controllers/witness.controller';
import { getShares } from '../controllers/share.controller';

const router = Router();

// Routes publiques existantes
router.get('/', getReports);
router.get('/:id', getReportById);

// Nouvelles routes publiques pour les données liées
router.get('/:id/comments', getComments);
router.get('/:id/likes', getLikes);
router.get('/:id/witnesses', getWitnesses);
router.get('/:id/shares', getShares);

// Routes authentifiées existantes
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

// Nouvelle route authentifiée pour supprimer un témoignage
router.delete('/witnesses/:id', authenticate, deleteWitness);

export default router;