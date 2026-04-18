import { Request, Response } from 'express';
import { Category } from '../models/Category';
import { logger } from '../utils/logger';

export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const categories = await Category.findAll();
    res.json(categories);
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const category = await Category.findById(parseInt(id));
    
    if (!category) {
      res.status(404).json({ error: 'Catégorie non trouvée' });
      return;
    }
    
    res.json(category);
  } catch (error) {
    logger.error('Get category error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getCategoriesWithStats(req: Request, res: Response): Promise<void> {
  try {
    const categories = await Category.getWithStats();
    res.json(categories);
  } catch (error) {
    logger.error('Get categories with stats error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}