import { Router } from 'express';
import {
  getCountries,
  getPhoneCodes,
  getNationalities,
  getCountryByCode,
} from '../controllers/country.controller';

const router = Router();

router.get('/', getCountries);
router.get('/phone-codes', getPhoneCodes);
router.get('/nationalities', getNationalities);
router.get('/:code', getCountryByCode);

export default router;