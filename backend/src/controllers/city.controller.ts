import { Request, Response } from 'express';
import { City } from '../models/City';
import { logger } from '../utils/logger';

export async function getCities(req: Request, res: Response): Promise<void> {
  try {
    const { country, search } = req.query;
    
    let cities;
    if (search) {
      cities = await City.search(search as string);
    } else if (country) {
      cities = await City.findByCountry(country as string);
    } else {
      cities = await City.findAll();
    }
    
    res.json(cities);
  } catch (error) {
    logger.error('Get cities error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getCity(req: Request, res: Response): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const city = await City.findById(parseInt(id));
    
    if (!city) {
      res.status(404).json({ error: 'Ville non trouvée' });
      return;
    }
    
    res.json(city);
  } catch (error) {
    logger.error('Get city error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getCitiesWithStats(req: Request, res: Response): Promise<void> {
  try {
    const cities = await City.getWithStats();
    res.json(cities);
  } catch (error) {
    logger.error('Get cities with stats error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getNearbyCities(req: Request, res: Response): Promise<void> {
  try {
    const { lat, lng, radius } = req.query;
    
    if (!lat || !lng) {
      res.status(400).json({ error: 'Latitude et longitude requises' });
      return;
    }
    
    const cities = await City.findNearby(
      parseFloat(lat as string),
      parseFloat(lng as string),
      radius ? parseFloat(radius as string) : 10
    );
    
    res.json(cities);
  } catch (error) {
    logger.error('Get nearby cities error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}