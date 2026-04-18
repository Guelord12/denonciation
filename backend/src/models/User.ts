import { query } from '../database/connection';
import bcrypt from 'bcryptjs';

export interface IUser {
  id?: number;
  username: string;
  email: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  phone?: string;
  country?: string;
  city?: string;
  nationality?: string;
  birth_date?: Date;
  gender?: string;
  is_admin?: boolean;
  is_banned?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class User {
  static async findById(id: number): Promise<IUser | null> {
    const result = await query(
      `SELECT id, username, email, first_name, last_name, avatar, phone, 
              country, city, nationality, birth_date, gender, 
              is_admin, is_banned, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findByUsername(username: string): Promise<IUser | null> {
    const result = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  }

  static async findByEmailOrUsername(identifier: string): Promise<IUser | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [identifier]
    );
    return result.rows[0] || null;
  }

  static async create(userData: IUser): Promise<IUser> {
    const result = await query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, country, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userData.username,
        userData.email,
        userData.password_hash,
        userData.first_name,
        userData.last_name,
        userData.phone,
        userData.country,
        userData.city
      ]
    );
    return result.rows[0];
  }

  static async update(id: number, data: Partial<IUser>): Promise<IUser | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'password_hash') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async updatePassword(id: number, newPassword: string): Promise<boolean> {
    const password_hash = await bcrypt.hash(newPassword, 10);
    const result = await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async ban(id: number, reason?: string): Promise<boolean> {
    const result = await query(
      'UPDATE users SET is_banned = true, updated_at = NOW() WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async unban(id: number): Promise<boolean> {
    const result = await query(
      'UPDATE users SET is_banned = false, updated_at = NOW() WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async search(searchTerm: string, limit: number = 20, offset: number = 0): Promise<IUser[]> {
    const result = await query(
      `SELECT id, username, email, first_name, last_name, avatar, is_admin, is_banned, created_at
       FROM users 
       WHERE username ILIKE $1 OR email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${searchTerm}%`, limit, offset]
    );
    return result.rows;
  }

  static async getStats(id: number): Promise<any> {
    const result = await query(
      `SELECT 
        (SELECT COUNT(*) FROM reports WHERE user_id = $1) as total_reports,
        (SELECT COUNT(*) FROM reports WHERE user_id = $1 AND status = 'approved') as approved_reports,
        (SELECT COUNT(*) FROM reports WHERE user_id = $1 AND status = 'pending') as pending_reports,
        (SELECT COUNT(*) FROM comments WHERE user_id = $1) as total_comments,
        (SELECT COUNT(*) FROM likes WHERE user_id = $1) as total_likes_given,
        (SELECT COUNT(*) FROM likes l JOIN reports r ON l.report_id = r.id WHERE r.user_id = $1) as total_likes_received,
        (SELECT COUNT(*) FROM live_streams WHERE user_id = $1) as total_streams,
        (SELECT COALESCE(SUM(views_count), 0) FROM reports WHERE user_id = $1) as total_views
      `,
      [id]
    );
    return result.rows[0];
  }
}