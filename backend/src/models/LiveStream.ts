import { query } from '../database/connection';
import crypto from 'crypto';

export interface ILiveStream {
  id?: number;
  user_id: number;
  title: string;
  description?: string;
  is_premium?: boolean;
  price?: number;
  start_time?: Date;
  end_time?: Date;
  status?: 'active' | 'ended' | 'cancelled';
  stream_key?: string;
  stream_url?: string;
  viewer_count?: number;
  like_count?: number;
  thumbnail_path?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class LiveStream {
  static generateStreamKey(userId: number): string {
    const prefix = process.env.STREAM_KEY_PREFIX || 'live_';
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}${userId}_${random}`;
  }

  static async findById(id: number): Promise<any | null> {
    const result = await query(
      `SELECT ls.*, 
              u.username, u.avatar, u.first_name, u.last_name,
              (SELECT COUNT(*) FROM subscriptions WHERE live_stream_id = ls.id AND payment_status = 'completed') as subscriber_count
       FROM live_streams ls
       LEFT JOIN users u ON ls.user_id = u.id
       WHERE ls.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByStreamKey(streamKey: string): Promise<ILiveStream | null> {
    const result = await query(
      'SELECT * FROM live_streams WHERE stream_key = $1',
      [streamKey]
    );
    return result.rows[0] || null;
  }

  static async create(data: ILiveStream): Promise<ILiveStream> {
    const streamKey = this.generateStreamKey(data.user_id);
    const streamUrl = `${process.env.STREAM_SERVER_URL}/${streamKey}`;

    const result = await query(
      `INSERT INTO live_streams (user_id, title, description, is_premium, price, stream_key, stream_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING *`,
      [
        data.user_id,
        data.title,
        data.description,
        data.is_premium || false,
        data.price || 0,
        streamKey,
        streamUrl
      ]
    );
    return result.rows[0];
  }

  static async update(id: number, data: Partial<ILiveStream>): Promise<ILiveStream | null> {
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
      `UPDATE live_streams SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async endStream(id: number): Promise<boolean> {
    const result = await query(
      `UPDATE live_streams 
       SET status = 'ended', end_time = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async incrementViewers(id: number): Promise<void> {
    await query(
      'UPDATE live_streams SET viewer_count = viewer_count + 1 WHERE id = $1',
      [id]
    );
  }

  static async decrementViewers(id: number): Promise<void> {
    await query(
      'UPDATE live_streams SET viewer_count = GREATEST(viewer_count - 1, 0) WHERE id = $1',
      [id]
    );
  }

  static async incrementLikes(id: number): Promise<number> {
    const result = await query(
      'UPDATE live_streams SET like_count = like_count + 1 WHERE id = $1 RETURNING like_count',
      [id]
    );
    return result.rows[0]?.like_count || 0;
  }

  static async findActive(limit: number = 20, offset: number = 0): Promise<any[]> {
    const result = await query(
      `SELECT ls.*, 
              u.username, u.avatar,
              (SELECT COUNT(*) FROM subscriptions WHERE live_stream_id = ls.id AND payment_status = 'completed') as subscriber_count
       FROM live_streams ls
       LEFT JOIN users u ON ls.user_id = u.id
       WHERE ls.status = 'active'
       ORDER BY ls.viewer_count DESC, ls.start_time DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  static async findByUser(userId: number, limit: number = 20, offset: number = 0): Promise<ILiveStream[]> {
    const result = await query(
      `SELECT * FROM live_streams 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  static async addChatMessage(streamId: number, userId: number, message: string): Promise<any> {
    const result = await query(
      `INSERT INTO live_chat_messages (live_stream_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [streamId, userId, message]
    );
    return result.rows[0];
  }

  static async getChatMessages(streamId: number, limit: number = 100): Promise<any[]> {
    const result = await query(
      `SELECT cm.*, u.username, u.avatar
       FROM live_chat_messages cm
       LEFT JOIN users u ON cm.user_id = u.id
       WHERE cm.live_stream_id = $1
       ORDER BY cm.created_at DESC
       LIMIT $2`,
      [streamId, limit]
    );
    return result.rows.reverse();
  }
}