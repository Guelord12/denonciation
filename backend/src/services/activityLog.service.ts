// Activity Logging Service
// Centralized logging of user activities with location tracking

import { Request } from 'express';
import { query } from '../database/connection';
import { getLocationFromIP } from './geolocation.service';
import { logger } from '../utils/logger';

export interface ActivityLogData {
  userId: number | null;
  action: string;
  entityType: string;
  entityId: number;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  latitude?: number;
  longitude?: number;
}

/**
 * Log user activity to database with optional location data
 * Automatically retrieves location from IP if available
 */
export async function logUserActivity(
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number,
  req: Request,
  details?: Record<string, any>
): Promise<void> {
  try {
    // Extract IP address
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown';

    const userAgent = req.headers['user-agent'] || 'unknown';

    // Get location from IP
    let latitude: number | undefined;
    let longitude: number | undefined;

    try {
      const locationData = await getLocationFromIP(ipAddress);
      if (locationData) {
        latitude = locationData.latitude;
        longitude = locationData.longitude;
      }
    } catch (error) {
      logger.warn('Failed to get location from IP:', error);
      // Continue without location data
    }

    // Insert activity log
    await query(
      `INSERT INTO activity_logs 
       (user_id, action, entity_type, entity_id, ip_address, user_agent, details, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        action,
        entityType,
        entityId,
        ipAddress,
        userAgent,
        details ? JSON.stringify(details) : null,
        latitude || null,
        longitude || null,
      ]
    );

    logger.info(`Activity logged: ${action} by user ${userId || 'anonymous'} from ${ipAddress}`);
  } catch (error) {
    logger.error('Error logging activity:', error);
    // Don't throw - logging should not break the main operation
  }
}

/**
 * Get formatted activity logs with user information and location data
 */
export async function getActivityLogsWithLocation(
  page: number = 1,
  limit: number = 50,
  filters?: {
    userId?: number;
    action?: string;
  }
): Promise<{
  logs: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  try {
    const offset = (page - 1) * limit;
    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    if (filters?.userId) {
      whereConditions.push(`al.user_id = $${paramCounter}`);
      params.push(filters.userId);
      paramCounter++;
    }

    if (filters?.action) {
      whereConditions.push(`al.action = $${paramCounter}`);
      params.push(filters.action);
      paramCounter++;
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const logsResult = await query(
      `SELECT 
         al.id,
         al.user_id,
         al.action,
         al.entity_type,
         al.entity_id,
         al.ip_address,
         al.user_agent,
         al.details,
         al.latitude,
         al.longitude,
         al.created_at,
         u.username,
         u.email,
         u.first_name,
         u.last_name
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM activity_logs al ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0]?.total || '0');

    return {
      logs: logsResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Error fetching activity logs:', error);
    throw error;
  }
}
