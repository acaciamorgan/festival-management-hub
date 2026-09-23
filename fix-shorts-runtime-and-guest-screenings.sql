DROP VIEW IF EXISTS ticketing_screenings_with_films CASCADE;
CREATE VIEW ticketing_screenings_with_films AS
SELECT
  ts.*,
  COALESCE(ff.title, sf.title, sp.program_name, p.title) as film_title,
  COALESCE(
    ff.run_time,
    sf.run_time,
    (SELECT SUM(sf2.run_time) FROM short_films sf2 WHERE sf2.shorts_program_id = sp.id),
    EXTRACT(EPOCH FROM (p.end_time - p.start_time)) / 60
  ) as run_time,
  COALESCE(ff.director, sf.director) as director
FROM ticketing_screenings ts
LEFT JOIN feature_films ff ON ts.film_id = ff.id AND ts.film_type = 'feature'
LEFT JOIN short_films sf ON ts.film_id = sf.id AND ts.film_type = 'short'
LEFT JOIN shorts_programs sp ON ts.film_id = sp.id AND ts.film_type = 'shorts_program'
LEFT JOIN programs p ON ts.film_id = p.id AND ts.film_type = 'program';

CREATE TABLE IF NOT EXISTS guest_screenings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  screening_id UUID NOT NULL,
  festival_year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_screenings_unique ON guest_screenings(guest_id, screening_id);
CREATE INDEX IF NOT EXISTS idx_guest_screenings_guest ON guest_screenings(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_screenings_year ON guest_screenings(festival_year);

ALTER TABLE guest_screenings DISABLE ROW LEVEL SECURITY;
