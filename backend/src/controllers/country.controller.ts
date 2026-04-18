import { Request, Response } from 'express';
import { COUNTRIES_SORTED, NATIONALITIES, PHONE_CODES } from '../data/countries';
import { logger } from '../utils/logger';

export async function getCountries(req: Request, res: Response): Promise<void> {
  try {
    const { search } = req.query;
    
    let countries = COUNTRIES_SORTED;
    
    if (search) {
      const searchLower = String(search).toLowerCase();
      countries = countries.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        (c.nativeName && c.nativeName.toLowerCase().includes(searchLower)) ||
        c.code.toLowerCase().includes(searchLower)
      );
    }
    
    res.json(countries);
  } catch (error) {
    logger.error('Get countries error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getPhoneCodes(req: Request, res: Response): Promise<void> {
  try {
    const { search } = req.query;
    
    let codes = PHONE_CODES;
    
    if (search) {
      const searchLower = String(search).toLowerCase();
      codes = codes.filter(c => 
        c.country.toLowerCase().includes(searchLower) ||
        c.code.includes(String(search))
      );
    }
    
    res.json(codes);
  } catch (error) {
    logger.error('Get phone codes error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getNationalities(req: Request, res: Response): Promise<void> {
  try {
    const { search } = req.query;
    
    let nationalities = NATIONALITIES;
    
    if (search) {
      const searchLower = String(search).toLowerCase();
      nationalities = nationalities.filter(n => 
        n.toLowerCase().includes(searchLower)
      );
    }
    
    res.json(nationalities);
  } catch (error) {
    logger.error('Get nationalities error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getCountryByCode(req: Request, res: Response): Promise<void> {
  try {
    const rawCode = req.params.code;
    const code: string = Array.isArray(rawCode) ? rawCode[0] : rawCode;
    const upperCode = code.toUpperCase();
    
    const country = COUNTRIES_SORTED.find(c => c.code === upperCode);
    
    if (!country) {
      res.status(404).json({ error: 'Pays non trouvé' });
      return;
    }
    
    res.json(country);
  } catch (error) {
    logger.error('Get country by code error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}