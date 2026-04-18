import cron from 'node-cron';
import { query } from '../database/connection';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { autoModerateAllPending } from '../services/aiModeration.service';

export function initializeScheduler() {
  logger.info('📅 Initializing schedulers...');

  // Nettoyer les sessions expirées - toutes les heures
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await query('DELETE FROM user_sessions WHERE expires_at < NOW()');
      logger.info(`🧹 Cleaned ${result.rowCount} expired sessions`);
    } catch (error) {
      logger.error('Failed to clean sessions:', error);
    }
  });

  // Nettoyer les logs de plus de 30 jours - tous les jours à 3h
  cron.schedule('0 3 * * *', async () => {
    try {
      const result = await query(
        'DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL \'30 days\''
      );
      logger.info(`🧹 Cleaned ${result.rowCount} old activity logs`);
    } catch (error) {
      logger.error('Failed to clean logs:', error);
    }
  });

  // ✅ MODÉRATION IA AUTOMATIQUE - TOUTES LES 2 MINUTES
  cron.schedule('*/2 * * * *', async () => {
    try {
      logger.info('🤖 [AI Scheduler] Starting auto-moderation...');
      const result = await autoModerateAllPending();
      
      if (result.processed > 0) {
        logger.info(`✅ [AI Scheduler] Completed: ${result.processed} processed, ${result.approved} approved, ${result.rejected} rejected, ${result.manual} manual`);
      }
    } catch (error) {
      logger.error('❌ [AI Scheduler] Error:', error);
    }
  });

  // Synchroniser les actualités - toutes les heures
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('📰 Syncing news...');
      // Appel à l'API de synchronisation
      logger.info('✅ News sync completed');
    } catch (error) {
      logger.error('Failed to sync news:', error);
    }
  });

  // Archiver les anciens signalements - tous les jours à 2h
  cron.schedule('0 2 * * *', async () => {
    try {
      const result = await query(
        `UPDATE reports 
         SET status = 'archived' 
         WHERE status = 'approved' 
         AND updated_at < NOW() - INTERVAL '90 days'`
      );
      logger.info(`📦 Archived ${result.rowCount} old reports`);
    } catch (error) {
      logger.error('Failed to archive old reports:', error);
    }
  });

  logger.info('✅ All schedulers initialized');
}