ALTER TABLE film_contacts ADD COLUMN IF NOT EXISTS festival_year INTEGER;

UPDATE film_contacts SET festival_year = 2025 WHERE festival_year IS NULL;

ALTER TABLE film_contacts ALTER COLUMN festival_year SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_film_contacts_festival_year ON film_contacts(festival_year);
