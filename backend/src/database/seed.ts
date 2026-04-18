import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'denonciation_db',
  port: parseInt(process.env.DB_PORT || '5432'),
});

const sampleReports = [
  {
    title: 'Corruption dans l\'attribution des marchés publics',
    description: 'Des fonctionnaires exigent des pots-de-vin pour l\'attribution de marchés publics dans la région de Kinshasa.',
    category_id: 1,
    city_id: 1,
  },
  {
    title: 'Violence policière lors d\'une manifestation pacifique',
    description: 'Usage excessif de la force par les forces de l\'ordre contre des manifestants pacifiques.',
    category_id: 2,
    city_id: 1,
  },
  {
    title: 'Discrimination à l\'embauche basée sur l\'origine ethnique',
    description: 'Une entreprise refuse systématiquement les candidats de certaines origines ethniques.',
    category_id: 3,
    city_id: 3,
  },
  {
    title: 'Déforestation illégale dans une zone protégée',
    description: 'Des exploitants forestiers détruisent illégalement une réserve naturelle.',
    category_id: 7,
    city_id: 4,
  },
  {
    title: 'Fraude électorale lors des dernières élections',
    description: 'Bourrage d\'urnes et falsification des résultats dans plusieurs bureaux de vote.',
    category_id: 6,
    city_id: 2,
  },
];

async function seed() {
  try {
    logger.info('Starting database seeding...');
    
    // Créer un utilisateur test supplémentaire
    const hashedPassword = await bcrypt.hash('Test2024!', 10);
    
    const testUsers = [
      {
        username: 'citoyen1',
        email: 'citoyen1@example.com',
        first_name: 'Jean',
        last_name: 'Mutombo',
        phone: '+243812345678',
      },
      {
        username: 'citoyen2',
        email: 'citoyen2@example.com',
        first_name: 'Marie',
        last_name: 'Kabila',
        phone: '+243823456789',
      },
      {
        username: 'journaliste1',
        email: 'journaliste1@example.com',
        first_name: 'Pierre',
        last_name: 'Lumbi',
        phone: '+243834567890',
      },
    ];
    
    for (const user of testUsers) {
      await pool.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, phone)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (username) DO NOTHING`,
        [user.username, user.email, hashedPassword, user.first_name, user.last_name, user.phone]
      );
    }
    
    // Récupérer les IDs des utilisateurs test
    const usersResult = await pool.query(
      `SELECT id, username FROM users WHERE username IN ('citoyen1', 'citoyen2', 'journaliste1')`
    );
    const users = usersResult.rows;
    
    // Créer des signalements pour chaque utilisateur test
    for (const user of users) {
      for (const report of sampleReports.slice(0, 2)) {
        await pool.query(
          `INSERT INTO reports (user_id, title, description, category_id, city_id, status)
           VALUES ($1, $2, $3, $4, $5, 'approved')
           ON CONFLICT DO NOTHING`,
          [user.id, report.title, report.description, report.category_id, report.city_id]
        );
      }
    }
    
    // Ajouter quelques commentaires
    const reportsResult = await pool.query(`SELECT id, user_id FROM reports LIMIT 5`);
    const reports = reportsResult.rows;
    
    for (const report of reports) {
      const commenter = users.find(u => u.id !== report.user_id);
      if (commenter) {
        await pool.query(
          `INSERT INTO comments (report_id, user_id, content)
           VALUES ($1, $2, $3)`,
          [report.id, commenter.id, 'Je soutiens cette dénonciation. Il faut que justice soit faite !']
        );
      }
    }
    
    // Ajouter quelques likes
    for (const report of reports) {
      const liker = users.find(u => u.id !== report.user_id);
      if (liker) {
        await pool.query(
          `INSERT INTO likes (report_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT (report_id, user_id) DO NOTHING`,
          [report.id, liker.id]
        );
      }
    }
    
    logger.info('✅ Database seeding completed successfully');
    logger.info(`Created ${users.length} test users`);
    logger.info(`Created ${sampleReports.length * users.length} test reports`);
    
    await pool.end();
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

seed();