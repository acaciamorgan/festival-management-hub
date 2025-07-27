-- Add additional program fields and cell highlighting support
ALTER TABLE programming_films 
ADD COLUMN program_4 TEXT,
ADD COLUMN program_5 TEXT,
ADD COLUMN cell_highlights JSONB DEFAULT '{}';

-- Create index for cell highlights for better performance
CREATE INDEX idx_programming_films_cell_highlights ON programming_films USING GIN (cell_highlights);

-- Update any existing records to have empty cell_highlights
UPDATE programming_films SET cell_highlights = '{}' WHERE cell_highlights IS NULL;