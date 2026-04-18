import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { uploadMemory, uploadMultipleMedia, handleMulterError } from '../middleware/upload.middleware';
import {
  uploadFile,
  uploadMultipleFiles,
  deleteFile
} from '../controllers/upload.controller';

const router = Router();

router.use(authenticate);

router.post('/single', uploadMemory.single('file'), handleMulterError, uploadFile);
router.post('/multiple', uploadMultipleMedia, handleMulterError, uploadMultipleFiles);
router.delete('/', deleteFile);

export default router;