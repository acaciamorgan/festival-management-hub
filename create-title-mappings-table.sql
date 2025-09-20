-- Create table to store confirmed CSV title mappings
CREATE TABLE IF NOT EXISTS csv_title_mappings (
  id SERIAL PRIMARY KEY,
  csv_title TEXT NOT NULL,
  database_title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(csv_title)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_csv_title_mappings_csv_title ON csv_title_mappings(csv_title);