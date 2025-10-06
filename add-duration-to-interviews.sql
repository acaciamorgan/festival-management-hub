-- Add duration_minutes to interviews table
-- This allows specifying interview length to automatically calculate end time

-- Add duration_minutes column
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Add comment explaining the purpose
COMMENT ON COLUMN interviews.duration_minutes IS 'Length of interview in minutes (e.g., 30 for a 30-minute interview)';
