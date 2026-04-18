import { Request, Response } from 'express';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { fetchAllNews, searchAllNews } from '../config/newsapi';

export async function getActualites(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '12', category, source, search } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    // Si recherche, utiliser la recherche
    if (search) {
      try {
        const articles = await searchAllNews(search as string);
        const paginatedArticles = articles.slice(offset, offset + limitNum);
        
        res.json({
          actualites: paginatedArticles,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: articles.length,
            pages: Math.ceil(articles.length / limitNum)
          }
        });
        return;
      } catch (searchError) {
        logger.error('Search news error:', searchError);
        res.json({
          actualites: [],
          pagination: { page: 1, limit: 12, total: 0, pages: 0 }
        });
        return;
      }
    }

    // Récupérer les actualités fraîches des APIs
    let freshArticles: any[] = [];
    try {
      freshArticles = await fetchAllNews(category as string);
    } catch (fetchError) {
      logger.error('Fetch all news error:', fetchError);
      freshArticles = [];
    }
    
    // Sauvegarder dans la base de données pour le cache
    try {
      for (const article of freshArticles.slice(0, 50)) {
        if (!article.title || !article.url) continue;
        
        const existing = await query(
          'SELECT id FROM actualites WHERE url = $1',
          [article.url]
        );

        if (existing.rows.length === 0) {
          await query(
            `INSERT INTO actualites 
             (title, description, content, url, image_url, source, category, published_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              article.title,
              article.description || article.content || '',
              article.content || article.description || '',
              article.url,
              article.urlToImage || null,
              typeof article.source === 'string' ? article.source : article.source?.name || 'Source inconnue',
              article.category || category || 'générale',
              article.publishedAt || new Date().toISOString()
            ]
          );
        } else {
          // ✅ Mettre à jour l'image si elle existe maintenant
          if (article.urlToImage) {
            await query(
              `UPDATE actualites 
               SET image_url = $1, published_at = $2
               WHERE url = $3`,
              [article.urlToImage, article.publishedAt || new Date().toISOString(), article.url]
            );
          }
        }
      }
    } catch (dbError) {
      logger.error('Database save error (non-blocking):', dbError);
    }

    // Filtrer par source si spécifié
    let filteredArticles = freshArticles;
    if (source) {
      filteredArticles = freshArticles.filter(a => {
        const sourceName = typeof a.source === 'string' ? a.source : a.source?.name || '';
        return sourceName.toLowerCase().includes((source as string).toLowerCase());
      });
    }

    // Pagination
    const paginatedArticles = filteredArticles.slice(offset, offset + limitNum);

    res.json({
      actualites: paginatedArticles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredArticles.length,
        pages: Math.ceil(filteredArticles.length / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get actualites error:', error);
    res.status(500).json({
      actualites: [],
      pagination: { page: 1, limit: 12, total: 0, pages: 0 },
      error: 'Erreur serveur'
    });
  }
}

export async function syncNews(req: Request, res: Response): Promise<void> {
  try {
    const articles = await fetchAllNews();
    
    let savedCount = 0;
    for (const article of articles) {
      if (!article.title || !article.url) continue;
      
      const existing = await query(
        'SELECT id FROM actualites WHERE url = $1',
        [article.url]
      );

      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO actualites 
           (title, description, content, url, image_url, source, category, published_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            article.title,
            article.description || '',
            article.content || '',
            article.url,
            article.urlToImage || null,
            typeof article.source === 'string' ? article.source : article.source?.name || 'Source inconnue',
            article.category || 'générale',
            article.publishedAt || new Date().toISOString()
          ]
        );
        savedCount++;
      } else {
        // ✅ Mettre à jour l'image si elle existe
        if (article.urlToImage) {
          await query(
            `UPDATE actualites 
             SET image_url = $1, published_at = $2
             WHERE url = $3`,
            [article.urlToImage, article.publishedAt || new Date().toISOString(), article.url]
          );
        }
      }
    }
    
    res.json({ 
      message: `${savedCount} actualités synchronisées avec succès`,
      total: articles.length 
    });
  } catch (error) {
    logger.error('Sync news error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getActualiteById(req: Request, res: Response): Promise<void> {
  try {
    const rawId = req.params.id;
    const id: string = Array.isArray(rawId) ? rawId[0] : rawId;

    const result = await query(
      'SELECT * FROM actualites WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Actualité non trouvée' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Get actualite by id error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const categories = [
      'générale',
      'politique',
      'sécuritaire',
      'économique',
      'santé',
      'technologie',
      'culturel',
      'sportif'
    ];
    
    res.json(categories);
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}