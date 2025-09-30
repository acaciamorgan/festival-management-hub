-- Interview Link Sync Function
-- This function matches text fields in interviews to their corresponding IDs
-- No date/time handling - only text matching to establish foreign key relationships

-- Drop function if exists for clean slate
DROP FUNCTION IF EXISTS sync_interview_links();

-- Create the sync function
CREATE OR REPLACE FUNCTION sync_interview_links()
RETURNS jsonb AS $$
DECLARE
  journalist_updates int := 0;
  film_updates int := 0;
  program_updates int := 0;
  short_film_updates int := 0;
  result jsonb;
BEGIN
  -- Match journalist names to press IDs
  -- Only updates interviews where press_id is null but journalist_name matches a press card
  UPDATE interviews i
  SET press_id = p.id
  FROM press p
  WHERE i.press_id IS NULL
    AND i.journalist_name IS NOT NULL
    AND i.journalist_name != ''
    AND LOWER(TRIM(i.journalist_name)) = LOWER(TRIM(p.name));

  GET DIAGNOSTICS journalist_updates = ROW_COUNT;

  -- Match film titles to feature film IDs
  -- Only updates if film_id is null and no shorts_program_id exists
  UPDATE interviews i
  SET film_id = f.id
  FROM feature_films f
  WHERE i.film_id IS NULL
    AND i.shorts_program_id IS NULL
    AND i.short_film_id IS NULL
    AND i.film_title IS NOT NULL
    AND i.film_title != ''
    AND LOWER(TRIM(i.film_title)) = LOWER(TRIM(f.title));

  GET DIAGNOSTICS film_updates = ROW_COUNT;

  -- Match film titles to shorts program IDs
  -- Only updates if shorts_program_id is null and no film_id exists
  UPDATE interviews i
  SET shorts_program_id = sp.id
  FROM shorts_programs sp
  WHERE i.shorts_program_id IS NULL
    AND i.film_id IS NULL
    AND i.short_film_id IS NULL
    AND i.film_title IS NOT NULL
    AND i.film_title != ''
    AND LOWER(TRIM(i.film_title)) = LOWER(TRIM(sp.program_name));

  GET DIAGNOSTICS program_updates = ROW_COUNT;

  -- Match film titles to individual short films
  -- Only updates if short_film_id is null and no other film IDs exist
  UPDATE interviews i
  SET short_film_id = sf.id,
      shorts_program_id = sf.shorts_program_id  -- Also set the program ID for consistency
  FROM short_films sf
  WHERE i.short_film_id IS NULL
    AND i.film_id IS NULL
    AND i.shorts_program_id IS NULL
    AND i.film_title IS NOT NULL
    AND i.film_title != ''
    AND LOWER(TRIM(i.film_title)) = LOWER(TRIM(sf.title));

  GET DIAGNOSTICS short_film_updates = ROW_COUNT;

  -- Build result object
  result := jsonb_build_object(
    'success', true,
    'journalists_linked', journalist_updates,
    'films_linked', film_updates,
    'programs_linked', program_updates,
    'short_films_linked', short_film_updates,
    'total_updates', journalist_updates + film_updates + program_updates + short_film_updates,
    'synced_at', NOW()
  );

  -- Log the sync (optional - remove if you don't want any logging)
  RAISE NOTICE 'Interview sync completed: %', result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION sync_interview_links() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_interview_links() TO service_role;

-- Create an index on journalist_name for faster matching (if not exists)
CREATE INDEX IF NOT EXISTS idx_interviews_journalist_name ON interviews(LOWER(TRIM(journalist_name)));
CREATE INDEX IF NOT EXISTS idx_interviews_film_title ON interviews(LOWER(TRIM(film_title)));
CREATE INDEX IF NOT EXISTS idx_press_name ON press(LOWER(TRIM(name)));
CREATE INDEX IF NOT EXISTS idx_feature_films_title ON feature_films(LOWER(TRIM(title)));
CREATE INDEX IF NOT EXISTS idx_shorts_programs_name ON shorts_programs(LOWER(TRIM(program_name)));
CREATE INDEX IF NOT EXISTS idx_short_films_title ON short_films(LOWER(TRIM(title)));

-- ============================================
-- SCHEDULING (Requires pg_cron extension)
-- ============================================

-- Enable pg_cron extension (may require superuser)
-- Note: This might already be enabled in your Supabase instance
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the sync to run daily at 3 AM server time
-- Note: You may need to run this from Supabase dashboard SQL editor with appropriate permissions
SELECT cron.schedule(
  'sync-interview-links',           -- Job name
  '0 3 * * *',                      -- Cron expression: daily at 3 AM
  'SELECT sync_interview_links();'   -- Command to run
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule (if needed):
-- SELECT cron.unschedule('sync-interview-links');

-- ============================================
-- MANUAL EXECUTION
-- ============================================

-- To run the sync manually at any time, execute:
-- SELECT sync_interview_links();

-- The function returns a JSON object with the results:
-- {
--   "success": true,
--   "journalists_linked": 5,
--   "films_linked": 12,
--   "programs_linked": 3,
--   "short_films_linked": 2,
--   "total_updates": 22,
--   "synced_at": "2024-01-15T03:00:00Z"
-- }