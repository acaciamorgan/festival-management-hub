-- Add short_code column to theater_houses table
-- This will allow each theater house to have a custom short code like "AMC 1", "AMC 4", etc.

ALTER TABLE theater_houses 
ADD COLUMN short_code TEXT;

-- Create index for short_code lookups (useful for other modules)
CREATE INDEX IF NOT EXISTS idx_theater_houses_short_code ON theater_houses(short_code);

-- Add comment to document the purpose
COMMENT ON COLUMN theater_houses.short_code IS 'Custom short code for theater house (e.g., "AMC 1", "AMC 4") used in ticketing and scheduling modules';