-- Performance Indexes for Film Festival System
-- Run this SQL in your Supabase SQL Editor to improve query performance

-- 1. Index for shorts program lookups (critical for the new Shorts Program column)
CREATE INDEX IF NOT EXISTS idx_short_films_program_id 
ON short_films (shorts_program_id);

-- 2. Title indexes for sorting and searching
CREATE INDEX IF NOT EXISTS idx_feature_films_title 
ON feature_films (title);

CREATE INDEX IF NOT EXISTS idx_short_films_title 
ON short_films (title);

-- 3. User permissions lookup (eliminates the timeout issue)
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id 
ON user_permissions (user_id);

-- 4. Press and guest filtering indexes
CREATE INDEX IF NOT EXISTS idx_press_requests_status 
ON press_requests (status);

CREATE INDEX IF NOT EXISTS idx_guests_confirmed 
ON guests (confirmed);

-- 5. Film program assignments (for filtering by programs)
CREATE INDEX IF NOT EXISTS idx_feature_films_program_1 
ON feature_films (program_1);

CREATE INDEX IF NOT EXISTS idx_short_films_program_1 
ON short_films (program_1);

-- 6. Date-based queries for events
CREATE INDEX IF NOT EXISTS idx_press_screenings_date 
ON press_screenings (screening_date);

CREATE INDEX IF NOT EXISTS idx_published_screenings_date 
ON published_screenings (screening_date);

-- 7. Compound index for shorts by program and order (for grouped display)
CREATE INDEX IF NOT EXISTS idx_short_films_program_order 
ON short_films (shorts_program_id, program_order);

-- 8. Guest check-in status for quick filtering
CREATE INDEX IF NOT EXISTS idx_guests_checked_in 
ON guests (checked_in);

-- Verify indexes were created
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%' 
ORDER BY tablename, indexname;