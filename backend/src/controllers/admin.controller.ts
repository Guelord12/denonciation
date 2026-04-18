import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { query } from '../database/connection';
import { sendSMS } from '../services/sms.service';
import { logger } from '../utils/logger';
import { io } from '../index';
import { learnFromManualModeration } from '../services/aiModeration.service';

// =====================================================
// FONCTIONS UTILITAIRES POUR REMPLACER REDIS
// =====================================================

async function getActiveUsersCount(): Promise<number> {
  try {
    const result = await query(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM activity_logs 
       WHERE created_at > NOW() - INTERVAL '15 minutes'`
    );
    return parseInt(result.rows[0]?.count || '0');
  } catch (error) {
    logger.warn('Failed to get active users count:', error);
    return 0;
  }
}

async function getActiveStreamsCount(): Promise<number> {
  try {
    const result = await query(
      "SELECT COUNT(*) as count FROM live_streams WHERE status = 'active'"
    );
    return parseInt(result.rows[0]?.count || '0');
  } catch (error) {
    logger.warn('Failed to get active streams count:', error);
    return 0;
  }
}

async function getTotalViewersCount(): Promise<number> {
  try {
    const result = await query(
      "SELECT COALESCE(SUM(viewer_count), 0) as total FROM live_streams WHERE status = 'active'"
    );
    return parseInt(result.rows[0]?.total || '0');
  } catch (error) {
    logger.warn('Failed to get total viewers count:', error);
    return 0;
  }
}

async function getTodayReportsCount(): Promise<number> {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM reports WHERE DATE(created_at) = CURRENT_DATE'
    );
    return parseInt(result.rows[0]?.count || '0');
  } catch (error) {
    return 0;
  }
}

async function getTodayUsersCount(): Promise<number> {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURRENT_DATE'
    );
    return parseInt(result.rows[0]?.count || '0');
  } catch (error) {
    return 0;
  }
}

// =====================================================
// DASHBOARD STATS
// =====================================================

export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const stats = await Promise.all([
      query('SELECT COUNT(*) as total FROM users'),
      query('SELECT COUNT(*) as total FROM reports'),
      query('SELECT COUNT(*) as total FROM reports WHERE status = $1', ['pending']),
      query('SELECT COUNT(*) as total FROM live_streams WHERE status = $1', ['active']),
      query(`
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at) 
        ORDER BY date ASC
      `),
      query(`
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM reports 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at) 
        ORDER BY date ASC
      `),
      query(`
        SELECT c.name, c.color, COUNT(r.id) as count
        FROM categories c
        LEFT JOIN reports r ON r.category_id = c.id
        GROUP BY c.id, c.name, c.color
        ORDER BY count DESC
      `)
    ]);

    const activeUsers = await getActiveUsersCount();
    const totalViewers = await getTotalViewersCount();

    res.json({
      totalUsers: parseInt(stats[0].rows[0]?.total || '0'),
      totalReports: parseInt(stats[1].rows[0]?.total || '0'),
      pendingReports: parseInt(stats[2].rows[0]?.total || '0'),
      activeStreams: parseInt(stats[3].rows[0]?.total || '0'),
      activeUsers: activeUsers,
      totalLiveViewers: totalViewers,
      userGrowth: stats[4].rows || [],
      reportGrowth: stats[5].rows || [],
      reportsByCategory: stats[6].rows || []
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// GET ALL USERS
// =====================================================

export async function getAllUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20', search = '', banned } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    let whereClause = '';
    const params: any[] = [];
    
    if (search) {
      whereClause += ` AND (username ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1} OR first_name ILIKE $${params.length + 1} OR last_name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    
    if (banned !== undefined) {
      whereClause += ` AND is_banned = $${params.length + 1}`;
      params.push(banned === 'true');
    }

    const users = await query(
      `SELECT id, username, email, first_name, last_name, avatar, phone,
              country, city, is_banned, is_admin, created_at, updated_at,
              (SELECT COUNT(*) FROM reports WHERE reporter_id = users.id) as reports_count,
              (SELECT COUNT(*) FROM comments WHERE user_id = users.id) as comments_count
       FROM users 
       WHERE 1=1 ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM users WHERE 1=1 ${whereClause}`,
      params
    );

    res.json({
      users: users.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0]?.total || '0'),
        pages: Math.ceil(parseInt(countResult.rows[0]?.total || '0') / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// BAN USER
// =====================================================

export async function banUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    await query(
      'UPDATE users SET is_banned = true, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user!.id, 'BAN_USER', 'user', userId, JSON.stringify({ reason }), req.ip || 'unknown', req.headers['user-agent'] || 'unknown']
    );

    const userResult = await query('SELECT phone FROM users WHERE id = $1', [userId]);
    if (userResult.rows[0]?.phone) {
      try {
        await sendSMS(
          userResult.rows[0].phone,
          `Votre compte Dénonciation a été banni. Raison: ${reason}. Contactez l'administration.`
        );
      } catch (smsError) {
        logger.warn('Failed to send ban SMS:', smsError);
      }
    }

    io.to(`user:${userId}`).emit('account_banned', { reason });

    logger.info(`User ${userId} banned by admin ${req.user!.id}`);
    res.json({ message: 'User banned successfully' });
  } catch (error) {
    logger.error('Ban user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// UNBAN USER
// =====================================================

export async function unbanUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    await query(
      'UPDATE users SET is_banned = false, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user!.id, 'UNBAN_USER', 'user', userId, req.ip || 'unknown', req.headers['user-agent'] || 'unknown']
    );

    logger.info(`User ${userId} unbanned by admin ${req.user!.id}`);
    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    logger.error('Unban user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// SEND WARNING SMS
// =====================================================

export async function sendWarningSMS(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { message, violationType } = req.body;

    const userResult = await query(
      'SELECT phone, first_name, last_name, username FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult.rows[0]?.phone) {
      res.status(400).json({ error: 'User has no phone number' });
      return;
    }

    const user = userResult.rows[0];
    
    const violationsResult = await query(
      `SELECT COUNT(*) as count FROM activity_logs 
       WHERE user_id = $1 AND action = 'SEND_WARNING' AND created_at > NOW() - INTERVAL '30 days'`,
      [userId]
    );
    
    const violationCount = parseInt(violationsResult.rows[0]?.count || '0') + 1;
    
    let warningMessage = `[DENONCIATION] Avertissement #${violationCount}: ${message}`;
    
    if (violationCount >= 3) {
      warningMessage += ' Prochain manquement entraînera un bannissement.';
    }

    await sendSMS(user.phone, warningMessage);

    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user!.id, 'SEND_WARNING', 'user', userId, 
       JSON.stringify({ message: warningMessage, violationType, violationCount }), 
       req.ip || 'unknown', req.headers['user-agent'] || 'unknown']
    );

    await query(
      `INSERT INTO notifications (user_id, type, content, related_id) 
       VALUES ($1, $2, $3, $4)`,
      [userId, 'system', warningMessage, userId]
    );

    io.to(`user:${userId}`).emit('warning_received', { 
      message: warningMessage, 
      violationCount,
      nextAction: violationCount >= 3 ? 'ban_warning' : 'warning'
    });

    res.json({ 
      message: 'Warning sent successfully',
      violationCount
    });
  } catch (error) {
    logger.error('Send warning SMS error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// GET REALTIME STATS (SANS REDIS)
// =====================================================

export async function getRealtimeStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [
      activeUsers,
      activeStreams,
      totalViewers,
      todayReports,
      todayUsers
    ] = await Promise.all([
      getActiveUsersCount(),
      getActiveStreamsCount(),
      getTotalViewersCount(),
      getTodayReportsCount(),
      getTodayUsersCount()
    ]);

    res.json({
      activeUsers: activeUsers,
      activeStreams: activeStreams,
      totalViewers: totalViewers,
      todayReports: todayReports,
      todayUsers: todayUsers,
      pendingModeration: 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get realtime stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// GET REPORTS
// =====================================================

export async function getReports(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20', status, category } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    let whereClause = '';
    const params: any[] = [];
    
    if (status) {
      whereClause += ` AND r.status = $${params.length + 1}`;
      params.push(status);
    }
    
    if (category) {
      whereClause += ` AND r.category_id = $${params.length + 1}`;
      params.push(category);
    }

    const reports = await query(
      `SELECT r.*, 
              u.username, u.avatar as user_avatar,
              c.name as category_name, c.icon as category_icon, c.color as category_color,
              city.name as city_name,
              (SELECT COUNT(*) FROM likes WHERE report_id = r.id) as likes_count,
              (SELECT COUNT(*) FROM comments WHERE report_id = r.id) as comments_count,
              (SELECT COUNT(*) FROM witnesses WHERE report_id = r.id) as witnesses_count
       FROM reports r
       LEFT JOIN users u ON r.reporter_id = u.id
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN cities city ON r.city_id = city.id
       WHERE 1=1 ${whereClause}
       ORDER BY r.created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM reports r WHERE 1=1 ${whereClause}`,
      params
    );

    res.json({
      reports: reports.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0]?.total || '0'),
        pages: Math.ceil(parseInt(countResult.rows[0]?.total || '0') / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// UPDATE REPORT STATUS
// =====================================================

export async function updateReportStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const rawReportId = req.params.reportId;
    const reportId = Array.isArray(rawReportId) ? rawReportId[0] : rawReportId;
    const { status, reason } = req.body;

    const result = await query(
      `UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING reporter_id, title`,
      [status, reportId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user!.id, 'UPDATE_REPORT_STATUS', 'report', reportId, 
       JSON.stringify({ status, reason }), req.ip || 'unknown', req.headers['user-agent'] || 'unknown']
    );

    await query(
      `INSERT INTO notifications (user_id, type, content, related_id) 
       VALUES ($1, $2, $3, $4)`,
      [result.rows[0].reporter_id, 'report_status', 
       `Votre signalement "${result.rows[0].title}" a été ${status === 'approved' ? 'approuvé' : 'rejeté'}. ${reason || ''}`, 
       reportId]
    );

    io.to(`user:${result.rows[0].reporter_id}`).emit('report_status_updated', { reportId, status, reason });

    if (status === 'approved' || status === 'rejected') {
      try {
        await learnFromManualModeration(parseInt(reportId), status, req.user!.id);
        logger.info(`🧠 [AI Learning] Recorded manual moderation for report ${reportId}: ${status}`);
      } catch (aiError) {
        logger.error('AI learning error:', aiError);
      }
    }

    res.json({ message: 'Report status updated successfully' });
  } catch (error) {
    logger.error('Update report status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// GET MODERATION REPORTS
// =====================================================

export async function getModerationReports(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20', status } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    let whereClause = '';
    const params: any[] = [];
    
    if (status) {
      whereClause += ` AND mr.status = $${params.length + 1}`;
      params.push(status);
    }

    const reports = await query(
      `SELECT mr.*,
              reporter.username as reporter_username,
              resolver.username as resolver_username,
              CASE 
                WHEN mr.target_type = 'report' THEN (SELECT title FROM reports WHERE id = mr.target_id)
                WHEN mr.target_type = 'comment' THEN (SELECT LEFT(content, 50) FROM comments WHERE id = mr.target_id)
                WHEN mr.target_type = 'user' THEN (SELECT username FROM users WHERE id = mr.target_id)
                WHEN mr.target_type = 'live' THEN (SELECT title FROM live_streams WHERE id = mr.target_id)
              END as target_preview
       FROM moderation_reports mr
       LEFT JOIN users reporter ON mr.reporter_id = reporter.id
       LEFT JOIN users resolver ON mr.resolved_by = resolver.id
       WHERE 1=1 ${whereClause}
       ORDER BY mr.created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM moderation_reports mr WHERE 1=1 ${whereClause}`,
      params
    );

    res.json({
      reports: reports.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0]?.total || '0'),
        pages: Math.ceil(parseInt(countResult.rows[0]?.total || '0') / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get moderation reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// RESOLVE MODERATION REPORT
// =====================================================

export async function resolveModerationReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { reportId } = req.params;
    const { resolution, action } = req.body;

    await query(
      `UPDATE moderation_reports 
       SET status = 'resolved', resolved_by = $1, resolved_at = NOW() 
       WHERE id = $2`,
      [req.user!.id, reportId]
    );

    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user!.id, 'RESOLVE_MODERATION', 'moderation_report', reportId, 
       JSON.stringify({ resolution, action }), req.ip || 'unknown', req.headers['user-agent'] || 'unknown']
    );

    res.json({ message: 'Moderation report resolved successfully' });
  } catch (error) {
    logger.error('Resolve moderation report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// GET ACTIVITY LOGS
// =====================================================

export async function getActivityLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '50', userId, action } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    let whereClause = '';
    const params: any[] = [];
    
    if (userId) {
      whereClause += ` AND al.user_id = $${params.length + 1}`;
      params.push(userId);
    }
    
    if (action) {
      whereClause += ` AND al.action = $${params.length + 1}`;
      params.push(action);
    }

    const logs = await query(
      `SELECT al.*, u.username, u.email
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE 1=1 ${whereClause}
       ORDER BY al.created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM activity_logs al WHERE 1=1 ${whereClause}`,
      params
    );

    res.json({
      logs: logs.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0]?.total || '0'),
        pages: Math.ceil(parseInt(countResult.rows[0]?.total || '0') / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// EXPORT DATA
// =====================================================

export async function exportData(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    
    let data: any[] = [];
    
    switch (type) {
      case 'users':
        const usersResult = await query(`
          SELECT id, username, email, first_name, last_name, phone, 
                 is_banned, is_admin, created_at,
                 (SELECT COUNT(*) FROM reports WHERE reporter_id = users.id) as reports_count
          FROM users
          WHERE created_at BETWEEN $1 AND $2
          ORDER BY created_at DESC
        `, [startDate || '2000-01-01', endDate || new Date().toISOString()]);
        data = usersResult.rows;
        break;
        
      case 'reports':
        const reportsResult = await query(`
          SELECT r.*, u.username, c.name as category_name, city.name as city_name
          FROM reports r
          LEFT JOIN users u ON r.reporter_id = u.id
          LEFT JOIN categories c ON r.category_id = c.id
          LEFT JOIN cities city ON r.city_id = city.id
          WHERE r.created_at BETWEEN $1 AND $2
          ORDER BY r.created_at DESC
        `, [startDate || '2000-01-01', endDate || new Date().toISOString()]);
        data = reportsResult.rows;
        break;
        
      default:
        res.status(400).json({ error: 'Invalid export type' });
        return;
    }
    
    if (data.length > 0) {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_export_${new Date().toISOString()}.csv`);
      res.send(csv);
    } else {
      res.status(404).json({ error: 'No data found' });
    }
  } catch (error) {
    logger.error('Export data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];
  
  csvRows.push(headers.join(','));
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
      if (value instanceof Date) return value.toISOString();
      return String(value);
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// =====================================================
// UPDATE SETTINGS
// =====================================================

export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const settings = req.body;
    
    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, details, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user!.id, 'UPDATE_SETTINGS', 'settings', JSON.stringify(settings), 
       req.ip || 'unknown', req.headers['user-agent'] || 'unknown']
    );

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// CLEAR CACHE (SANS REDIS)
// =====================================================

export async function clearCache(req: AuthRequest, res: Response): Promise<void> {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user!.id, 'CLEAR_CACHE', 'cache', req.ip || 'unknown', req.headers['user-agent'] || 'unknown']
    );

    res.json({ message: 'Cache cleared successfully (no-op, Redis disabled)' });
  } catch (error) {
    logger.error('Clear cache error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}