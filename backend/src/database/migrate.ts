import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'denonciation_db',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function migrate() {
  try {
    logger.info('Starting database migration...');
    
    const schemaPath = path.join(__dirname, '../../schemas.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    await pool.query(schema);
    
    logger.info('✅ Database migration completed successfully');
    
    await pool.end();
  } catch (error) {
    logger.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

migrate();