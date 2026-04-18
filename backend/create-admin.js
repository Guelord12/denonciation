const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Olgambukula20',
  database: 'denonciation_db',
  port: 5432,
});

async function createAdmin() {
  try {
    const password = 'Admin2024!';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('🔐 Hash généré:', hash);
    
    // Vérifier si l'admin existe
    const checkResult = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    
    if (checkResult.rows.length === 0) {
      // Créer l'admin
      await pool.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, is_admin, is_banned)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['admin', 'admin@denonciation.com', hash, 'Administrateur', 'Système', true, false]
      );
      console.log('✅ Compte admin créé avec succès !');
    } else {
      // Mettre à jour le mot de passe
      await pool.query(
        'UPDATE users SET password_hash = $1, is_admin = true WHERE username = $2',
        [hash, 'admin']
      );
      console.log('✅ Mot de passe admin mis à jour !');
    }
    
    // Afficher les infos
    const result = await pool.query('SELECT id, username, email, is_admin FROM users WHERE username = $1', ['admin']);
    console.log('📋 Compte admin:', result.rows[0]);
    console.log('🔑 Mot de passe: Admin2024!');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createAdmin();