-- Update Film Credits Schema
-- Adds animator and archivist columns, renames content_warnings to content_considerations

-- Feature Films
ALTER TABLE feature_films ADD COLUMN IF NOT EXISTS animator TEXT;
ALTER TABLE feature_films ADD COLUMN IF NOT EXISTS archivist TEXT;
ALTER TABLE feature_films RENAME COLUMN content_warnings TO content_considerations;

-- Short Films  
ALTER TABLE short_films ADD COLUMN IF NOT EXISTS animator TEXT;
ALTER TABLE short_films ADD COLUMN IF NOT EXISTS archivist TEXT;
ALTER TABLE short_films RENAME COLUMN content_warnings TO content_considerations;

-- Archive 2024 Feature Films (if exists)
ALTER TABLE archive_2024_feature_films ADD COLUMN IF NOT EXISTS animator TEXT;
ALTER TABLE archive_2024_feature_films ADD COLUMN IF NOT EXISTS archivist TEXT;
ALTER TABLE archive_2024_feature_films RENAME COLUMN content_warnings TO content_considerations;

-- Archive 2024 Short Films (if exists)
ALTER TABLE archive_2024_short_films ADD COLUMN IF NOT EXISTS animator TEXT;
ALTER TABLE archive_2024_short_films ADD COLUMN IF NOT EXISTS archivist TEXT;
ALTER TABLE archive_2024_short_films RENAME COLUMN content_warnings TO content_considerations;