-- Add non_attending_screenings column to guests table
ALTER TABLE guests ADD COLUMN non_attending_screenings JSONB DEFAULT '[]'::jsonb;

-- Add a comment to explain the column
COMMENT ON COLUMN guests.non_attending_screenings IS 'Array of screening IDs where the guest is NOT attending. Empty array or absence means attending all associated screenings.';