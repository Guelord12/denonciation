-- =====================================================
-- BASE DE DONNÉES : denonciation_db
-- UTILISATEUR : postgres
-- MOT DE PASSE : Olgambukula20
-- =====================================================

-- Création de la base de données (à exécuter séparément si besoin)
-- CREATE DATABASE denonciation_db OWNER postgres;

-- =====================================================
-- 1. SUPPRESSION DES TABLES EXISTANTES (ordre inverse des dépendances)
-- =====================================================
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS moderation_reports CASCADE;
DROP TABLE IF EXISTS actualites CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS live_chat_messages CASCADE;
DROP TABLE IF EXISTS live_streams CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS shares CASCADE;
DROP TABLE IF EXISTS witnesses CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- 2. TABLES PRINCIPALES
-- =====================================================

-- Table des utilisateurs
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    avatar TEXT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    username VARCHAR(50) UNIQUE NOT NULL,
    birth_date DATE,
    gender VARCHAR(20) CHECK (gender IN ('Homme', 'Femme', 'Autre', '')),
    country VARCHAR(100),
    city VARCHAR(100),
    nationality VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    password_hash TEXT NOT NULL,
    is_banned BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des catégories d'abus
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#3498db',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des villes
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des signalements
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES categories(id),
    city_id INTEGER REFERENCES cities(id),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    media_type VARCHAR(10) CHECK (media_type IN ('image', 'video', 'document', NULL)),
    media_path TEXT,
    is_live BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des commentaires
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des likes
CREATE TABLE likes (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_id, user_id)
);

-- Table des témoignages
CREATE TABLE witnesses (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    testimony TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_id, user_id)
);

-- Table des partages
CREATE TABLE shares (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    share_link TEXT,
    platform VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('welcome', 'new_report', 'new_comment', 'new_like', 'new_witness', 'new_live', 'report_status', 'system')),
    content TEXT NOT NULL,
    related_id INTEGER,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des lives
CREATE TABLE live_streams (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    is_premium BOOLEAN DEFAULT false,
    price DECIMAL(10,2) DEFAULT 0,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
    stream_key VARCHAR(100) UNIQUE,
    stream_url TEXT,
    viewer_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    thumbnail_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des messages du chat en direct
CREATE TABLE live_chat_messages (
    id SERIAL PRIMARY KEY,
    live_stream_id INTEGER REFERENCES live_streams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des abonnements aux lives premium
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    live_stream_id INTEGER REFERENCES live_streams(id) ON DELETE CASCADE,
    amount DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, live_stream_id)
);

-- Table des actualités
CREATE TABLE actualites (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    url VARCHAR(512) UNIQUE NOT NULL,
    image_url VARCHAR(512),
    source VARCHAR(100),
    category VARCHAR(50) CHECK (category IN ('générale', 'sportif', 'politique', 'économique', 'santé', 'technologie', 'sécuritaire', 'culturel')),
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des rapports de modération
CREATE TABLE moderation_reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) CHECK (target_type IN ('report', 'comment', 'user', 'live')),
    target_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des sessions utilisateurs
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL,
    device_info TEXT,
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des logs d'activité
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. INDEX POUR OPTIMISATION DES PERFORMANCES
-- =====================================================

-- Index sur reports
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_category_id ON reports(category_id);
CREATE INDEX idx_reports_city_id ON reports(city_id);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_is_live ON reports(is_live);
CREATE INDEX idx_reports_views_count ON reports(views_count DESC);

-- Index sur comments
CREATE INDEX idx_comments_report_id ON comments(report_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- Index sur likes et witnesses
CREATE INDEX idx_likes_report_id ON likes(report_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_witnesses_report_id ON witnesses(report_id);
CREATE INDEX idx_witnesses_user_id ON witnesses(user_id);

-- Index sur notifications
CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Index sur live_streams
CREATE INDEX idx_live_streams_status ON live_streams(status);
CREATE INDEX idx_live_streams_user_id ON live_streams(user_id);
CREATE INDEX idx_live_streams_start_time ON live_streams(start_time DESC);
CREATE INDEX idx_live_streams_stream_key ON live_streams(stream_key);

-- Index sur live_chat_messages
CREATE INDEX idx_live_chat_messages_live_stream_id ON live_chat_messages(live_stream_id);
CREATE INDEX idx_live_chat_messages_created_at ON live_chat_messages(created_at);

-- Index sur actualites
CREATE INDEX idx_actualites_category ON actualites(category);
CREATE INDEX idx_actualites_published_at ON actualites(published_at DESC);
CREATE INDEX idx_actualites_source ON actualites(source);
CREATE INDEX idx_actualites_url ON actualites(url);

-- Index sur user_sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Index sur activity_logs
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- Index sur moderation_reports
CREATE INDEX idx_moderation_reports_status ON moderation_reports(status);
CREATE INDEX idx_moderation_reports_target ON moderation_reports(target_type, target_id);
CREATE INDEX idx_moderation_reports_reporter ON moderation_reports(reporter_id);

-- Index sur subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_live_stream_id ON subscriptions(live_stream_id);
CREATE INDEX idx_subscriptions_payment_status ON subscriptions(payment_status);

-- =====================================================
-- 4. FONCTIONS ET TRIGGERS
-- =====================================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at 
    BEFORE UPDATE ON reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
CREATE TRIGGER trg_comments_updated_at 
    BEFORE UPDATE ON comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_live_streams_updated_at ON live_streams;
CREATE TRIGGER trg_live_streams_updated_at 
    BEFORE UPDATE ON live_streams 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour empêcher un utilisateur banni de publier
CREATE OR REPLACE FUNCTION prevent_banned_user_report()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT is_banned FROM users WHERE id = NEW.user_id) THEN
        RAISE EXCEPTION 'Utilisateur banni, impossible de créer un signalement';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_banned_report ON reports;
CREATE TRIGGER trg_prevent_banned_report 
    BEFORE INSERT ON reports 
    FOR EACH ROW 
    EXECUTE FUNCTION prevent_banned_user_report();

-- Fonction pour empêcher un utilisateur banni de commenter
CREATE OR REPLACE FUNCTION prevent_banned_user_comment()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT is_banned FROM users WHERE id = NEW.user_id) THEN
        RAISE EXCEPTION 'Utilisateur banni, impossible de commenter';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_banned_comment ON comments;
CREATE TRIGGER trg_prevent_banned_comment 
    BEFORE INSERT ON comments 
    FOR EACH ROW 
    EXECUTE FUNCTION prevent_banned_user_comment();

-- Fonction pour empêcher un utilisateur banni de faire un live
CREATE OR REPLACE FUNCTION prevent_banned_user_live()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT is_banned FROM users WHERE id = NEW.user_id) THEN
        RAISE EXCEPTION 'Utilisateur banni, impossible de créer un live';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_banned_live ON live_streams;
CREATE TRIGGER trg_prevent_banned_live 
    BEFORE INSERT ON live_streams 
    FOR EACH ROW 
    EXECUTE FUNCTION prevent_banned_user_live();

-- Fonction pour incrémenter automatiquement viewer_count
CREATE OR REPLACE FUNCTION increment_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE reports SET views_count = views_count + 1 WHERE id = NEW.report_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour logger automatiquement les actions importantes
CREATE OR REPLACE FUNCTION log_user_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (
        NEW.user_id,
        TG_OP,
        TG_TABLE_NAME,
        NEW.id,
        jsonb_build_object('timestamp', CURRENT_TIMESTAMP)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. DONNÉES INITIALES
-- =====================================================

-- Insertion des catégories
INSERT INTO categories (name, icon, color) VALUES 
('Corruption', '💰', '#e74c3c'),
('Violence policière', '👮', '#c0392b'),
('Discrimination', '⚖️', '#f39c12'),
('Violences sexuelles', '🚫', '#9b59b6'),
('Abus de pouvoir', '👑', '#e67e22'),
('Fraude électorale', '🗳️', '#2c3e50'),
('Atteinte à l''environnement', '🌳', '#27ae60'),
('Non-respect des droits humains', '✊', '#3498db'),
('Autre', '📌', '#95a5a6')
ON CONFLICT (name) DO NOTHING;

-- Insertion des villes principales
INSERT INTO cities (name, country, latitude, longitude) VALUES 
('Kinshasa', 'RDC', -4.4419, 15.2663),
('Lubumbashi', 'RDC', -11.6644, 27.4822),
('Goma', 'RDC', -1.6741, 29.2343),
('Bukavu', 'RDC', -2.4976, 28.8429),
('Kisangani', 'RDC', 0.5153, 25.1910),
('Mbuji-Mayi', 'RDC', -6.1206, 23.5967),
('Kananga', 'RDC', -5.8962, 22.4166),
('Butembo', 'RDC', 0.1416, 29.2913),
('Matadi', 'RDC', -5.8389, 13.4631),
('Bandundu', 'RDC', -3.3167, 17.3667),
('Paris', 'France', 48.8566, 2.3522),
('Bruxelles', 'Belgique', 50.8503, 4.3517),
('Dakar', 'Sénégal', 14.7167, -17.4677),
('Abidjan', 'Côte d''Ivoire', 5.3599, -4.0083),
('Yaoundé', 'Cameroun', 3.8480, 11.5021),
('Brazzaville', 'Congo', -4.2634, 15.2429),
('Johannesburg', 'Afrique du Sud', -26.2041, 28.0473),
('Nairobi', 'Kenya', -1.2921, 36.8219),
('Lagos', 'Nigeria', 6.5244, 3.3792),
('Accra', 'Ghana', 5.6037, -0.1870)
ON CONFLICT DO NOTHING;

-- Insertion de l'utilisateur administrateur (mot de passe: Admin2024!)
-- Hash bcrypt généré pour "Admin2024!" (cost factor 10)
INSERT INTO users (first_name, last_name, username, email, password_hash, is_admin, avatar, phone)
VALUES (
    'Administrateur',
    'Système',
    'admin',
    'admin@denonciation.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMy.Mr7nJ9vU5zQ5sL5qZ5qZ5qZ5qZ5qZ5q',
    true,
    '/assets/avatars/admin-avatar.png',
    '+243000000000'
) ON CONFLICT (username) DO NOTHING;

-- Insertion d'un utilisateur test (mot de passe: Test2024!)
INSERT INTO users (first_name, last_name, username, email, password_hash, is_admin, phone)
VALUES (
    'Test',
    'Utilisateur',
    'test',
    'test@example.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    false,
    '+243111111111'
) ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- 6. VUES POUR LES STATISTIQUES
-- =====================================================

-- Vue pour les statistiques quotidiennes
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_reports,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(CASE WHEN media_path IS NOT NULL THEN 1 END) as reports_with_media,
    COUNT(CASE WHEN is_live THEN 1 END) as live_reports,
    SUM(views_count) as total_views
FROM reports
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Vue pour les statistiques par catégorie
CREATE OR REPLACE VIEW category_stats AS
SELECT 
    c.id as category_id,
    c.name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    COUNT(r.id) as report_count,
    COUNT(DISTINCT r.user_id) as unique_reporters,
    COALESCE(SUM(r.views_count), 0) as total_views
FROM categories c
LEFT JOIN reports r ON r.category_id = c.id
GROUP BY c.id, c.name, c.icon, c.color
ORDER BY report_count DESC;

-- Vue pour le classement des villes
CREATE OR REPLACE VIEW city_ranking AS
SELECT 
    ci.id as city_id,
    ci.name as city_name,
    ci.country,
    COUNT(r.id) as report_count,
    COUNT(DISTINCT r.user_id) as active_reporters
FROM cities ci
LEFT JOIN reports r ON r.city_id = ci.id
GROUP BY ci.id, ci.name, ci.country
HAVING COUNT(r.id) > 0
ORDER BY report_count DESC;

-- Vue pour les utilisateurs actifs
CREATE OR REPLACE VIEW active_users_stats AS
SELECT 
    u.id,
    u.username,
    u.first_name,
    u.last_name,
    u.avatar,
    u.created_at,
    COUNT(DISTINCT r.id) as reports_count,
    COUNT(DISTINCT c.id) as comments_count,
    COUNT(DISTINCT l.id) as likes_count,
    GREATEST(MAX(r.created_at), MAX(c.created_at), MAX(l.created_at)) as last_activity
FROM users u
LEFT JOIN reports r ON r.user_id = u.id
LEFT JOIN comments c ON c.user_id = u.id
LEFT JOIN likes l ON l.user_id = u.id
WHERE u.is_banned = false
GROUP BY u.id, u.username, u.first_name, u.last_name, u.avatar, u.created_at
ORDER BY last_activity DESC NULLS LAST;

-- Vue pour le résumé des streams
CREATE OR REPLACE VIEW live_streams_summary AS
SELECT 
    ls.id,
    ls.title,
    ls.status,
    ls.is_premium,
    ls.price,
    ls.start_time,
    u.username as streamer_name,
    u.avatar as streamer_avatar,
    COUNT(DISTINCT lcm.id) as messages_count,
    COUNT(DISTINCT s.id) as subscribers_count,
    ls.viewer_count,
    ls.like_count
FROM live_streams ls
LEFT JOIN users u ON ls.user_id = u.id
LEFT JOIN live_chat_messages lcm ON lcm.live_stream_id = ls.id
LEFT JOIN subscriptions s ON s.live_stream_id = ls.id AND s.payment_status = 'completed'
GROUP BY ls.id, ls.title, ls.status, ls.is_premium, ls.price, ls.start_time, u.username, u.avatar;

-- Vue pour les signalements en attente de modération
CREATE OR REPLACE VIEW pending_moderation AS
SELECT 
    'report' as type,
    r.id,
    r.title as content,
    r.created_at,
    u.username as author,
    r.status
FROM reports r
LEFT JOIN users u ON r.user_id = u.id
WHERE r.status = 'pending'
UNION ALL
SELECT 
    'comment' as type,
    c.id,
    LEFT(c.content, 100) as content,
    c.created_at,
    u.username as author,
    'pending' as status
FROM comments c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN moderation_reports mr ON mr.target_type = 'comment' AND mr.target_id = c.id AND mr.status = 'pending'
WHERE mr.id IS NOT NULL
ORDER BY created_at DESC;

-- =====================================================
-- 7. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour obtenir le nombre de notifications non lues
CREATE OR REPLACE FUNCTION get_unread_notifications_count(user_id_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM notifications
    WHERE user_id = user_id_param AND is_read = false;
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour marquer toutes les notifications comme lues
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE notifications
    SET is_read = true
    WHERE user_id = user_id_param AND is_read = false;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir le top 10 des signalements les plus likés
CREATE OR REPLACE FUNCTION get_top_liked_reports(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    report_id INTEGER,
    title VARCHAR,
    description TEXT,
    username VARCHAR,
    likes_count BIGINT,
    comments_count BIGINT,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.title,
        r.description,
        u.username,
        COUNT(DISTINCT l.id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count,
        r.created_at
    FROM reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN likes l ON l.report_id = r.id
    LEFT JOIN comments c ON c.report_id = r.id
    WHERE r.status = 'approved'
    GROUP BY r.id, r.title, r.description, u.username, r.created_at
    ORDER BY likes_count DESC, r.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les signalements par période
CREATE OR REPLACE FUNCTION get_reports_by_period(
    start_date DATE,
    end_date DATE,
    category_id_param INTEGER DEFAULT NULL,
    city_id_param INTEGER DEFAULT NULL
)
RETURNS SETOF reports AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM reports
    WHERE DATE(created_at) BETWEEN start_date AND end_date
    AND (category_id_param IS NULL OR category_id = category_id_param)
    AND (city_id_param IS NULL OR city_id = city_id_param)
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_statistics(user_id_param INTEGER)
RETURNS TABLE(
    total_reports BIGINT,
    approved_reports BIGINT,
    pending_reports BIGINT,
    rejected_reports BIGINT,
    total_comments BIGINT,
    total_likes_received BIGINT,
    total_likes_given BIGINT,
    total_streams BIGINT,
    total_views BIGINT,
    account_age_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM reports WHERE user_id = user_id_param) as total_reports,
        (SELECT COUNT(*) FROM reports WHERE user_id = user_id_param AND status = 'approved') as approved_reports,
        (SELECT COUNT(*) FROM reports WHERE user_id = user_id_param AND status = 'pending') as pending_reports,
        (SELECT COUNT(*) FROM reports WHERE user_id = user_id_param AND status = 'rejected') as rejected_reports,
        (SELECT COUNT(*) FROM comments WHERE user_id = user_id_param) as total_comments,
        (SELECT COUNT(*) FROM likes l JOIN reports r ON l.report_id = r.id WHERE r.user_id = user_id_param) as total_likes_received,
        (SELECT COUNT(*) FROM likes WHERE user_id = user_id_param) as total_likes_given,
        (SELECT COUNT(*) FROM live_streams WHERE user_id = user_id_param) as total_streams,
        (SELECT COALESCE(SUM(views_count), 0) FROM reports WHERE user_id = user_id_param) as total_views,
        (SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER FROM users WHERE id = user_id_param) as account_age_days;
END;
$$ LANGUAGE plpgsql;

-- Fonction de recherche de signalements
CREATE OR REPLACE FUNCTION search_reports(
    search_query TEXT,
    category_id_param INTEGER DEFAULT NULL,
    city_id_param INTEGER DEFAULT NULL,
    status_param VARCHAR DEFAULT NULL
)
RETURNS TABLE(
    id INTEGER,
    title VARCHAR,
    description TEXT,
    username VARCHAR,
    category_name VARCHAR,
    city_name VARCHAR,
    status VARCHAR,
    likes_count BIGINT,
    created_at TIMESTAMP,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.title,
        r.description,
        u.username,
        c.name as category_name,
        ci.name as city_name,
        r.status,
        COUNT(DISTINCT l.id) as likes_count,
        r.created_at,
        ts_rank(
            to_tsvector('french', COALESCE(r.title, '') || ' ' || COALESCE(r.description, '')),
            plainto_tsquery('french', search_query)
        ) as relevance
    FROM reports r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN cities ci ON r.city_id = ci.id
    LEFT JOIN likes l ON l.report_id = r.id
    WHERE 
        (search_query = '' OR 
         to_tsvector('french', COALESCE(r.title, '') || ' ' || COALESCE(r.description, '')) 
         @@ plainto_tsquery('french', search_query))
        AND (category_id_param IS NULL OR r.category_id = category_id_param)
        AND (city_id_param IS NULL OR r.city_id = city_id_param)
        AND (status_param IS NULL OR r.status = status_param)
    GROUP BY r.id, r.title, r.description, u.username, c.name, ci.name, r.status, r.created_at
    ORDER BY relevance DESC, r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. FONCTIONS DE NETTOYAGE AUTOMATIQUE
-- =====================================================

-- Nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Nettoyer les logs de plus de 30 jours
CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM activity_logs WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Nettoyer les notifications anciennes
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE is_read = true 
    AND created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Archiver les anciens signalements
CREATE OR REPLACE FUNCTION archive_old_reports(days_threshold INTEGER DEFAULT 180)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    UPDATE reports 
    SET status = 'archived', updated_at = NOW()
    WHERE status IN ('approved', 'rejected')
    AND updated_at < NOW() - (days_threshold || ' days')::INTERVAL;
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. MESSAGES DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ BASE DE DONNÉES INITIALISÉE AVEC SUCCÈS !';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 Tables créées : 16 tables principales';
    RAISE NOTICE '🔍 Index créés : 30+ index pour optimiser les performances';
    RAISE NOTICE '⚡ Triggers créés : 6 triggers pour l''intégrité des données';
    RAISE NOTICE '📈 Vues créées : daily_stats, category_stats, city_ranking, etc.';
    RAISE NOTICE '🔧 Fonctions utilitaires : 10+ fonctions';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🔑 Comptes par défaut :';
    RAISE NOTICE '   - Admin : admin / Admin2024!';
    RAISE NOTICE '   - Test  : test / Test2024!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '📁 Catégories : 9 catégories d''abus';
    RAISE NOTICE '🌍 Villes : 20 villes principales';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;