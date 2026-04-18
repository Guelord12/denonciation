import { query } from '../database/connection';

export interface ICategory {
  id?: number;
  name: string;
  icon?: string;
  color?: string;
  created_at?: Date;
}

export class Category {
  static async findById(id: number): Promise<ICategory | null> {
    const result = await query('SELECT * FROM categories WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findAll(): Promise<ICategory[]> {
    const result = await query('SELECT * FROM categories ORDER BY name');
    return result.rows;
  }

  static async getWithStats(): Promise<any[]> {
    const result = await query(
      `SELECT c.*, 
              COUNT(r.id) as report_count,
              COUNT(DISTINCT r.user_id) as unique_reporters
       FROM categories c
       LEFT JOIN reports r ON r.category_id = c.id
       GROUP BY c.id
       ORDER BY report_count DESC`
    );
    return result.rows;
  }
}