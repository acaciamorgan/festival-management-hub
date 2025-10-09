-- Remove timezone from red_carpets timestamps
-- Change from TIMESTAMP WITH TIME ZONE to plain TIMESTAMP

ALTER TABLE red_carpets
  ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at SET DEFAULT NOW();
