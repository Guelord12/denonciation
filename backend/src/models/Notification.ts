import { query } from '../database/connection';

export interface INotification {
  id?: number;
  user_id: number;
  type: 'welcome' | 'new_report' | 'new_comment' | 'new_like' | 'new_witness' | 'new_live' | 'report_status' | 'system';
  content: string;
  related_id?: number;
  is_read?: boolean;
  created_at?: Date;
}

export class Notification {
  static async findById(id: number): Promise<INotification | null> {
    const result = await query(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(data: INotification): Promise<INotification> {
    const result = await query(
      `INSERT INTO notifications (user_id, type, content, related_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.user_id, data.type, data.content, data.related_id]
    );
    return result.rows[0];
  }

  static async markAsRead(id: number, userId: number): Promise<boolean> {
    const result = await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async markAllAsRead(userId: number): Promise<number> {
    const result = await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return result.rowCount || 0;
  }

  static async delete(id: number, userId: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async findByUser(
    userId: number, 
    unreadOnly: boolean = false, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<INotification[]> {
    let sql = 'SELECT * FROM notifications WHERE user_id = $1';
    const params: any[] = [userId];
    
    if (unreadOnly) {
      sql += ' AND is_read = false';
    }
    
    sql += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    params.push(limit, offset);
    
    const result = await query(sql, params);
    return result.rows;
  }

  static async getUnreadCount(userId: number): Promise<number> {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  static async deleteOld(daysOld: number = 90): Promise<number> {
    const result = await query(
      `DELETE FROM notifications 
       WHERE is_read = true 
       AND created_at < NOW() - INTERVAL '${daysOld} days'`
    );
    return result.rowCount || 0;
  }
}