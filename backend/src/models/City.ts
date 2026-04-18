import { query } from '../database/connection';

export interface ICity {
  id?: number;
  name: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  created_at?: Date;
}

export class City {
  static async findById(id: number): Promise<ICity | null> {
    const result = await query('SELECT * FROM cities WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findAll(): Promise<ICity[]> {
    const result = await query('SELECT * FROM cities ORDER BY name');
    return result.rows;
  }

  static async findByCountry(country: string): Promise<ICity[]> {
    const result = await query('SELECT * FROM cities WHERE country = $1 ORDER BY name', [country]);
    return result.rows;
  }

  static async search(searchTerm: string): Promise<ICity[]> {
    const result = await query(
      'SELECT * FROM cities WHERE name ILIKE $1 OR country ILIKE $1 ORDER BY name LIMIT 20',
      [`%${searchTerm}%`]
    );
    return result.rows;
  }

  static async getWithStats(): Promise<any[]> {
    const result = await query(
      `SELECT ci.*, 
              COUNT(r.id) as report_count,
              COUNT(DISTINCT r.user_id) as active_reporters
       FROM cities ci
       LEFT JOIN reports r ON r.city_id = ci.id
       GROUP BY ci.id
       HAVING COUNT(r.id) > 0
       ORDER BY report_count DESC`
    );
    return result.rows;
  }

  static async findNearby(latitude: number, longitude: number, radiusKm: number = 10): Promise<ICity[]> {
    const result = await query(
      `SELECT *, 
              (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * 
              cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) AS distance
       FROM cities
       WHERE (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * 
              cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) < $3
       ORDER BY distance`,
      [latitude, longitude, radiusKm]
    );
    return result.rows;
  }
}