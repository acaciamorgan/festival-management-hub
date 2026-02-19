BEGIN;

-- =====================================================
-- Phase 7: Merge guest junction tables into guest_films
-- This establishes the film card as single source of
-- truth for all guest-film associations.
-- =====================================================

-- Step 1: Add film_type column to guest_films
ALTER TABLE guest_films ADD COLUMN IF NOT EXISTS film_type TEXT;

-- Step 2: Set all existing rows to 'feature' (they were all feature film links before)
UPDATE guest_films SET film_type = 'feature' WHERE film_type IS NULL;

-- Step 3: Set NOT NULL constraint
ALTER TABLE guest_films ALTER COLUMN film_type SET NOT NULL;

-- Step 4: Drop FK constraint on guest_films.film_id (so it can reference any film table)
DO $$
DECLARE c_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO c_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND kcu.table_name = tc.table_name
  WHERE tc.table_name = 'guest_films'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'film_id'
  LIMIT 1;
  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE guest_films DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

-- Step 5: Migrate guest_short_films → guest_films with film_type = 'short'
-- guest_short_films only has film_title (string), so we look up short_films by title
INSERT INTO guest_films (guest_id, film_id, film_type, festival_year)
SELECT DISTINCT gsf.guest_id, sf.id, 'short', sf.festival_year
FROM guest_short_films gsf
JOIN short_films sf ON sf.title = gsf.film_title
WHERE NOT EXISTS (
  SELECT 1 FROM guest_films gf2
  WHERE gf2.guest_id = gsf.guest_id AND gf2.film_id = sf.id AND gf2.film_type = 'short'
);

-- Step 6: Migrate guest_programs (with program_id) → guest_films with film_type = 'program'
INSERT INTO guest_films (guest_id, film_id, film_type, festival_year)
SELECT DISTINCT gp.guest_id, gp.program_id, 'program', gp.festival_year
FROM guest_programs gp
WHERE gp.program_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM guest_films gf2
  WHERE gf2.guest_id = gp.guest_id AND gf2.film_id = gp.program_id AND gf2.film_type = 'program'
);

-- Step 7: Migrate guest_programs (without program_id, by program title) → guest_films
-- Match to programs table first
INSERT INTO guest_films (guest_id, film_id, film_type, festival_year)
SELECT DISTINCT gp.guest_id, p.id, 'program', p.festival_year
FROM guest_programs gp
JOIN programs p ON p.title = gp.program_title
WHERE gp.program_id IS NULL
AND NOT EXISTS (
  SELECT 1 FROM guest_films gf2
  WHERE gf2.guest_id = gp.guest_id AND gf2.film_id = p.id AND gf2.film_type = 'program'
);

-- Step 8: Migrate guest_programs (shorts programs by name) → guest_films with film_type = 'shorts_program'
INSERT INTO guest_films (guest_id, film_id, film_type, festival_year)
SELECT DISTINCT gp.guest_id, sp.id, 'shorts_program', sp.festival_year
FROM guest_programs gp
JOIN shorts_programs sp ON sp.program_name = gp.program_title
WHERE gp.program_id IS NULL
AND NOT EXISTS (
  SELECT 1 FROM guest_films gf2
  WHERE gf2.guest_id = gp.guest_id AND gf2.film_id = sp.id AND gf2.film_type = 'shorts_program'
);

-- Step 9: Drop guest_short_films table
DROP TABLE IF EXISTS guest_short_films;

-- Step 10: Drop guest_programs table
DROP TABLE IF EXISTS guest_programs;

-- Step 11: Drop film_title cache column from guest_films (title now comes from film card via view)
ALTER TABLE guest_films DROP COLUMN IF EXISTS film_title;

-- Step 12: Create guest_film_titles view (replaces guest_films_with_details)
-- Resolves film title from the actual film card table — the single source of truth
DROP VIEW IF EXISTS guest_films_with_details CASCADE;
DROP VIEW IF EXISTS guest_film_titles CASCADE;

CREATE VIEW guest_film_titles AS
SELECT
  gf.id,
  gf.guest_id,
  gf.film_id,
  gf.film_type,
  gf.festival_year,
  COALESCE(ff.title, sf.title, sp.program_name, p.title) AS film_title
FROM guest_films gf
LEFT JOIN feature_films ff ON gf.film_id = ff.id AND gf.film_type = 'feature'
LEFT JOIN short_films sf ON gf.film_id = sf.id AND gf.film_type = 'short'
LEFT JOIN shorts_programs sp ON gf.film_id = sp.id AND gf.film_type = 'shorts_program'
LEFT JOIN programs p ON gf.film_id = p.id AND gf.film_type = 'program';

-- Step 13: Create guests_with_details view
-- Aggregates film titles from film cards via junction table, using ' || ' separator
DROP VIEW IF EXISTS guests_with_details CASCADE;

CREATE VIEW guests_with_details AS
SELECT
  g.*,
  COALESCE(
    (
      SELECT string_agg(
        COALESCE(ff.title, sf.title, sp.program_name, p.title),
        ' || '
        ORDER BY COALESCE(ff.title, sf.title, sp.program_name, p.title)
      )
      FROM guest_films gf
      LEFT JOIN feature_films ff ON gf.film_id = ff.id AND gf.film_type = 'feature' AND ff.festival_year = g.festival_year
      LEFT JOIN short_films sf ON gf.film_id = sf.id AND gf.film_type = 'short' AND sf.festival_year = g.festival_year
      LEFT JOIN shorts_programs sp ON gf.film_id = sp.id AND gf.film_type = 'shorts_program' AND sp.festival_year = g.festival_year
      LEFT JOIN programs p ON gf.film_id = p.id AND gf.film_type = 'program' AND p.festival_year = g.festival_year
      WHERE gf.guest_id = g.id
    ),
    ''
  ) AS films_display_combined
FROM guests g;

COMMIT;
