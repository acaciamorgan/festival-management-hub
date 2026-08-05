CREATE TABLE film_programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    festival_year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, festival_year)
)

CREATE TABLE film_program_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    programming_film_id UUID NOT NULL REFERENCES programming_films(id) ON DELETE CASCADE,
    film_program_id UUID NOT NULL REFERENCES film_programs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 1,
    festival_year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(programming_film_id, film_program_id)
)

CREATE INDEX idx_film_program_assignments_film ON film_program_assignments(programming_film_id)
CREATE INDEX idx_film_program_assignments_program ON film_program_assignments(film_program_id)
CREATE INDEX idx_film_programs_year ON film_programs(festival_year)

INSERT INTO film_programs (name, festival_year) VALUES
('Opening', 2025),
('Closing', 2025),
('Centerpiece', 2025),
('Special Presentation', 2025),
('After Dark', 2025),
('Black Perspectives', 2025),
('City & State', 2025),
('Comedy', 2025),
('Documentary', 2025),
('Documentary Competition', 2025),
('International Competition', 2025),
('New Directors Competition', 2025),
('OutLook', 2025),
('Retrospective', 2025),
('Snapshots', 2025),
('Spotlight', 2025)

INSERT INTO film_program_assignments (programming_film_id, film_program_id, position, festival_year)
SELECT
    pf.id,
    fp.id,
    prog.position,
    pf.festival_year
FROM programming_films pf,
LATERAL unnest(pf.programs) WITH ORDINALITY AS prog(name, position)
JOIN film_programs fp ON fp.name = prog.name AND fp.festival_year = pf.festival_year
WHERE pf.programs IS NOT NULL AND array_length(pf.programs, 1) > 0

ALTER TABLE programming_films DROP COLUMN programs
