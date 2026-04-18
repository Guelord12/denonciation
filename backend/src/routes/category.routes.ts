import { Router } from 'express';
import { 
  getCategories, 
  getCategory, 
  getCategoriesWithStats 
} from '../controllers/category.controller';

const router = Router();

router.get('/', getCategories);
router.get('/stats', getCategoriesWithStats);
router.get('/:id', getCategory);

export default router;