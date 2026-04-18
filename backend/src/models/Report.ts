import { query } from '../database/connection';

export interface IReport {
  id?: number;
  user_id: number;
  title: string;
  description: string;
  category_id: number;
  city_id?: number;
  latitude?: number;
  longitude?: number;
  media_type?: 'image' | 'video' | 'document';
  media_path?: string;
  is_live?: boolean;
  status?: 'pending' | 'approved' | 'rejected' | 'archived';
  views_count?: number;
  created_at?: Date;
  updated_at?: Date;
}

export class Report {
  static async findById(id: number): Promise<any | null> {
    const result = await query(
      `SELECT r.*, 
              u.username, u.avatar as user_avatar, u.first_name, u.last_name,
              c.name as category_name, c.icon as category_icon, c.color as category_color,
              ci.name as city_name, ci.country as city_country,
              (SELECT COUNT(*) FROM likes WHERE report_id = r.id) as likes_count,
              (SELECT COUNT(*) FROM comments WHERE report_id = r.id) as comments_count,
              (SELECT COUNT(*) FROM witnesses WHERE report_id = r.id) as witnesses_count
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN cities ci ON r.city_id = ci.id
       WHERE r.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(data: IReport): Promise<IReport> {
    const result = await query(
      `INSERT INTO reports (user_id, title, description, category_id, city_id, 
                           latitude, longitude, media_type, media_path, is_live)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.user_id,
        data.title,
        data.description,
        data.category_id,
        data.city_id,
        data.latitude,
        data.longitude,
        data.media_type,
        data.media_path,
        data.is_live || false
      ]
    );
    return result.rows[0];
  }

  static async update(id: number, data: Partial<IReport>): Promise<IReport | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE reports SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM reports WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async incrementViews(id: number): Promise<void> {
    await query('UPDATE reports SET views_count = views_count + 1 WHERE id = $1', [id]);
  }

  static async findByUser(userId: number, limit: number = 20, offset: number = 0): Promise<IReport[]> {
    const result = await query(
      `SELECT r.*, 
              c.name as category_name, c.icon as category_icon,
              (SELECT COUNT(*) FROM likes WHERE report_id = r.id) as likes_count,
              (SELECT COUNT(*) FROM comments WHERE report_id = r.id) as comments_count
       FROM reports r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  static async findAll(filters: any = {}, limit: number = 20, offset: number = 0): Promise<any[]> {
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.category_id) {
      whereClause += ` AND r.category_id = $${paramIndex}`;
      values.push(filters.category_id);
      paramIndex++;
    }

    if (filters.city_id) {
      whereClause += ` AND r.city_id = $${paramIndex}`;
      values.push(filters.city_id);
      paramIndex++;
    }

    if (filters.status) {
      whereClause += ` AND r.status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    if (filters.user_id) {
      whereClause += ` AND r.user_id = $${paramIndex}`;
      values.push(filters.user_id);
      paramIndex++;
    }

    if (filters.is_live !== undefined) {
      whereClause += ` AND r.is_live = $${paramIndex}`;
      values.push(filters.is_live);
      paramIndex++;
    }

    const orderBy = filters.orderBy || 'created_at';
    const orderDir = filters.orderDir || 'DESC';

    values.push(limit, offset);

    const result = await query(
      `SELECT r.*, 
              u.username, u.avatar as user_avatar,
              c.name as category_name, c.icon as category_icon, c.color as category_color,
              ci.name as city_name,
              (SELECT COUNT(*) FROM likes WHERE report_id = r.id) as likes_count,
              (SELECT COUNT(*) FROM comments WHERE report_id = r.id) as comments_count
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN cities ci ON r.city_id = ci.id
       ${whereClause}
       ORDER BY r.${orderBy} ${orderDir}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      values
    );
    return result.rows;
  }

  static async count(filters: any = {}): Promise<number> {
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.category_id) {
      whereClause += ` AND category_id = $${paramIndex}`;
      values.push(filters.category_id);
      paramIndex++;
    }

    if (filters.status) {
      whereClause += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    const result = await query(
      `SELECT COUNT(*) as count FROM reports ${whereClause}`,
      values
    );
    return parseInt(result.rows[0].count);
  }

  static async getTopLiked(limit: number = 10): Promise<any[]> {
    const result = await query(
      `SELECT r.id, r.title, r.description, r.media_path, r.created_at,
              u.username, u.avatar,
              c.name as category_name,
              COUNT(l.id) as likes_count
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN likes l ON l.report_id = r.id
       WHERE r.status = 'approved'
       GROUP BY r.id, u.username, u.avatar, c.name
       ORDER BY likes_count DESC, r.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async getRecent(limit: number = 10): Promise<any[]> {
    const result = await query(
      `SELECT r.*, 
              u.username, u.avatar,
              c.name as category_name, c.icon as category_icon,
              (SELECT COUNT(*) FROM likes WHERE report_id = r.id) as likes_count,
              (SELECT COUNT(*) FROM comments WHERE report_id = r.id) as comments_count
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.status = 'approved'
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}