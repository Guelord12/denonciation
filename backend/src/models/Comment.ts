import { query } from '../database/connection';

export interface IComment {
  id?: number;
  report_id: number;
  user_id: number;
  parent_id?: number;
  content: string;
  is_edited?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class Comment {
  static async findById(id: number): Promise<any | null> {
    const result = await query(
      `SELECT c.*, u.username, u.avatar
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(data: IComment): Promise<IComment> {
    const result = await query(
      `INSERT INTO comments (report_id, user_id, parent_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.report_id, data.user_id, data.parent_id, data.content]
    );
    return result.rows[0];
  }

  static async update(id: number, content: string): Promise<IComment | null> {
    const result = await query(
      `UPDATE comments 
       SET content = $1, is_edited = true, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [content, id]
    );
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM comments WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async findByReport(reportId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
    const result = await query(
      `WITH RECURSIVE comment_tree AS (
        SELECT c.*, u.username, u.avatar, 0 as level
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.report_id = $1 AND c.parent_id IS NULL
        
        UNION ALL
        
        SELECT c.*, u.username, u.avatar, ct.level + 1
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        INNER JOIN comment_tree ct ON c.parent_id = ct.id
        WHERE c.report_id = $1
      )
      SELECT * FROM comment_tree
      ORDER BY level, created_at DESC
      LIMIT $2 OFFSET $3`,
      [reportId, limit, offset]
    );
    return result.rows;
  }

  static async countByReport(reportId: number): Promise<number> {
    const result = await query(
      'SELECT COUNT(*) as count FROM comments WHERE report_id = $1',
      [reportId]
    );
    return parseInt(result.rows[0].count);
  }

  static async findByUser(userId: number, limit: number = 20, offset: number = 0): Promise<any[]> {
    const result = await query(
      `SELECT c.*, r.title as report_title, r.id as report_id
       FROM comments c
       LEFT JOIN reports r ON c.report_id = r.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }
}