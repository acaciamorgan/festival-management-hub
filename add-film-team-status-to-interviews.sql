-- Add 'Film Team' status to interviews table
-- This migration updates the CHECK constraint to allow the new 'Film Team' status

-- Drop the old constraint
ALTER TABLE interviews
DROP CONSTRAINT IF EXISTS interviews_status_check;

-- Add the new constraint with 'Film Team' included
ALTER TABLE interviews
ADD CONSTRAINT interviews_status_check
CHECK (status IN ('TBD', 'Pitching', 'Subject Pending', 'Scheduled', 'Film Team', 'Complete', 'Declined'));
