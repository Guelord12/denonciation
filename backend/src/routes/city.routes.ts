import { Router } from 'express';
import { 
  getCities, 
  getCity, 
  getCitiesWithStats,
  getNearbyCities 
} from '../controllers/city.controller';

const router = Router();

router.get('/', getCities);
router.get('/stats', getCitiesWithStats);
router.get('/nearby', getNearbyCities);
router.get('/:id', getCity);

export default router;