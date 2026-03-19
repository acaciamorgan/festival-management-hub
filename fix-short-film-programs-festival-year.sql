ALTER TABLE short_film_programs ADD COLUMN IF NOT EXISTS festival_year INTEGER;

UPDATE short_film_programs sfp
SET festival_year = sf.festival_year
FROM short_films sf
WHERE sfp.short_film_id = sf.id
AND sfp.festival_year IS NULL;

ALTER TABLE short_film_programs ALTER COLUMN festival_year SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_short_film_programs_festival_year ON short_film_programs(festival_year);
