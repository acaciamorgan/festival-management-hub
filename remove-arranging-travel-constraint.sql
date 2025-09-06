-- Remove the CHECK constraint on arranging_travel column to allow any text value
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_arranging_travel_check;

-- Also remove any default constraint if it exists
ALTER TABLE guests ALTER COLUMN arranging_travel DROP DEFAULT;