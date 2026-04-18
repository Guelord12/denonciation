import { Router } from 'express';
import {
  getActualites,
  syncNews,
  getActualiteById,
  getCategories
} from '../controllers/actualite.controller';

const router = Router();

router.get('/', getActualites);
router.get('/categories', getCategories);
router.get('/:id', getActualiteById);
router.post('/sync', syncNews);

export default router;