-- =====================================================
-- MIGRATION: AJOUT DES CHAMPS DE VISIBILITÉ
-- Permet aux utilisateurs de choisir entre anonyme et visible
-- =====================================================

BEGIN;

-- =====================================================
-- 1. AJOUT DES CHAMPS À LA TABLE reports
-- =====================================================
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT true;

ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS visibility_mode VARCHAR(20) DEFAULT 'anonymous';

-- Commentaire sur les champs
COMMENT ON COLUMN reports.is_anonymous IS 'Indique si le signalement est anonyme (true) ou visible (false)';
COMMENT ON COLUMN reports.visibility_mode IS 'Mode de visibilité: anonymous ou visible';

-- =====================================================
-- 2. AJOUT DES CHAMPS À LA TABLE comments
-- =====================================================
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT true;

ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

COMMENT ON COLUMN comments.is_anonymous IS 'Hérité du signalement parent - indique si le commentaire est anonyme';
COMMENT ON COLUMN comments.is_edited IS 'Indique si le commentaire a été modifié';

-- =====================================================
-- 3. AJOUT DES CHAMPS À LA TABLE witnesses
-- =====================================================
ALTER TABLE witnesses 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT true;

COMMENT ON COLUMN witnesses.is_anonymous IS 'Hérité du signalement parent - indique si le témoignage est anonyme';

-- =====================================================
-- 4. AJOUT DES CHAMPS À LA TABLE shares
-- =====================================================
ALTER TABLE shares 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT true;

COMMENT ON COLUMN shares.is_anonymous IS 'Hérité du signalement parent - indique si le partage est anonyme';

-- =====================================================
-- 5. AJOUT DES CHAMPS À LA TABLE likes
-- =====================================================
-- Les likes suivent la visibilité du report parent, pas besoin de champ supplémentaire
-- Mais on ajoute un commentaire pour clarifier
COMMENT ON TABLE likes IS 'Les likes suivent la visibilité du signalement parent';

-- =====================================================
-- 6. CRÉATION D'UN INDEX POUR LES RECHERCHES PAR VISIBILITÉ
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_reports_visibility_mode ON reports(visibility_mode);
CREATE INDEX IF NOT EXISTS idx_reports_is_anonymous ON reports(is_anonymous);

-- =====================================================
-- 7. MISE À JOUR DES VALEURS EXISTANTES
-- =====================================================
-- Par défaut, tous les signalements existants sont en mode anonyme
UPDATE reports SET visibility_mode = 'anonymous' WHERE visibility_mode IS NULL;
UPDATE reports SET is_anonymous = true WHERE is_anonymous IS NULL;

UPDATE comments SET is_anonymous = true WHERE is_anonymous IS NULL;
UPDATE witnesses SET is_anonymous = true WHERE is_anonymous IS NULL;
UPDATE shares SET is_anonymous = true WHERE is_anonymous IS NULL;

COMMIT;

-- =====================================================
-- VÉRIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration des champs de visibilité terminée !';
    RAISE NOTICE '📊 Champs ajoutés :';
    RAISE NOTICE '   - reports.is_anonymous';
    RAISE NOTICE '   - reports.visibility_mode';
    RAISE NOTICE '   - comments.is_anonymous';
    RAISE NOTICE '   - comments.is_edited';
    RAISE NOTICE '   - witnesses.is_anonymous';
    RAISE NOTICE '   - shares.is_anonymous';
END $$;