import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { io } from '../index';

// Fonction utilitaire pour extraire l'ID des params en toute sécurité
function getParamId(params: any): string {
  return Array.isArray(params.id) ? params.id[0] : params.id;
}

export async function addWitness(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;
    const { testimony } = req.body;

    // Vérifier que le signalement existe et récupérer son mode de visibilité
    const reportResult = await query(
      'SELECT id, reporter_id, title, is_anonymous, visibility_mode FROM reports WHERE id = $1',
      [id]
    );

    if (reportResult.rows.length === 0) {
      res.status(404).json({ error: 'Signalement non trouvé' });
      return;
    }

    const report = reportResult.rows[0];
    const isAnonymous = report.is_anonymous;

    const existingWitness = await query(
      'SELECT id FROM witnesses WHERE report_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingWitness.rows.length > 0) {
      res.status(400).json({ error: 'Vous avez déjà témoigné sur ce signalement' });
      return;
    }

    const result = await query(
      `INSERT INTO witnesses (report_id, user_id, testimony, is_anonymous)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, userId, testimony, isAnonymous]
    );

    const witness = result.rows[0];

    const userResult = await query(
      'SELECT username, avatar FROM users WHERE id = $1',
      [userId]
    );

    const fullWitness = {
      ...witness,
      username: userResult.rows[0].username,
      avatar: userResult.rows[0].avatar,
      user_id: userId
    };

    // Notification (toujours envoyée)
    if (report.reporter_id !== userId) {
      const notificationContent = isAnonymous 
        ? `Un utilisateur a témoigné sur votre signalement "${report.title}"`
        : `${req.user!.username} a témoigné sur votre signalement "${report.title}"`;
        
      await query(
        `INSERT INTO notifications (user_id, type, content, related_id)
         VALUES ($1, 'new_witness', $2, $3)`,
        [report.reporter_id, notificationContent, id]
      );
    }

    // Émettre l'événement avec anonymisation si nécessaire
    const isAdmin = req.user?.is_admin || false;
    const isOwner = report.reporter_id === userId;
    const shouldAnonymize = !isAdmin && !isOwner && isAnonymous;
    
    const witnessForClients = shouldAnonymize 
      ? { ...fullWitness, username: 'Témoin anonyme', avatar: null }
      : fullWitness;
    
    io.to(`report:${id}`).emit('new_witness', witnessForClients);

    const responseWitness = isAdmin || isOwner ? fullWitness : witnessForClients;
    res.status(201).json(responseWitness);
  } catch (error) {
    logger.error('Add witness error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getWitnesses(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const { page = '1', limit = '50' } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    const isAdmin = req.user?.is_admin || false;
    const currentUserId = req.user?.id || null;

    // Récupérer le mode de visibilité du signalement
    const reportResult = await query(
      'SELECT reporter_id, is_anonymous FROM reports WHERE id = $1',
      [id]
    );
    
    const report = reportResult.rows[0];
    const isReportOwner = report?.reporter_id === currentUserId;
    const isAnonymous = report?.is_anonymous ?? true;

    const witnesses = await query(
      `SELECT w.*,
              u.id as witness_user_id,
              u.username,
              u.avatar
       FROM witnesses w
       LEFT JOIN users u ON w.user_id = u.id
       WHERE w.report_id = $1
       ORDER BY w.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limitNum, offset]
    );

    // Appliquer l'anonymisation selon les règles
    const processedWitnesses = witnesses.rows.map(witness => {
      const isWitnessOwner = witness.witness_user_id === currentUserId;
      const shouldAnonymize = !isAdmin && !isWitnessOwner && !isReportOwner && isAnonymous;
      
      if (shouldAnonymize) {
        return {
          ...witness,
          username: 'Témoin anonyme',
          avatar: null
        };
      }
      return witness;
    });

    const countResult = await query(
      'SELECT COUNT(*) as total FROM witnesses WHERE report_id = $1',
      [id]
    );

    res.json({
      witnesses: processedWitnesses,
      total: parseInt(countResult.rows[0].total),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get witnesses error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function deleteWitness(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;

    const witnessResult = await query(
      'SELECT user_id, report_id FROM witnesses WHERE id = $1',
      [id]
    );

    if (witnessResult.rows.length === 0) {
      res.status(404).json({ error: 'Témoignage non trouvé' });
      return;
    }

    if (witnessResult.rows[0].user_id !== userId && !req.user!.is_admin) {
      res.status(403).json({ error: 'Non autorisé' });
      return;
    }

    const reportId = witnessResult.rows[0].report_id;

    await query('DELETE FROM witnesses WHERE id = $1', [id]);

    io.to(`report:${reportId}`).emit('witness_deleted', { witnessId: id });

    res.json({ message: 'Témoignage supprimé avec succès' });
  } catch (error) {
    logger.error('Delete witness error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default {
  addWitness,
  getWitnesses,
  deleteWitness
};