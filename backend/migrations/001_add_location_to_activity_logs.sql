-- Migration: Add location tracking to activity_logs
-- Date: 2026-06-01
-- Description: Add latitude and longitude columns to track user location during activities

-- =====================================================
-- ALTER TABLE: Add Location Columns
-- =====================================================

-- Check if columns don't already exist before adding them
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' AND column_name = 'latitude'
    ) THEN
        ALTER TABLE activity_logs ADD COLUMN latitude DECIMAL(10,8);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' AND column_name = 'longitude'
    ) THEN
        ALTER TABLE activity_logs ADD COLUMN longitude DECIMAL(11,8);
    END IF;
END $$;

-- =====================================================
-- CREATE INDEX for Location Queries
-- =====================================================

-- Check if index doesn't exist before creating it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'activity_logs' AND indexname = 'idx_activity_location'
    ) THEN
        CREATE INDEX idx_activity_location ON activity_logs(latitude, longitude);
    END IF;
END $$;

-- =====================================================
-- VERIFY MIGRATION
-- =====================================================

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activity_logs' 
ORDER BY ordinal_position;
