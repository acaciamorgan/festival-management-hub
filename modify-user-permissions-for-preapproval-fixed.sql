-- Modify user_permissions table to support pre-approval workflow
-- This handles the case where some constraints may already exist

-- First, add the missing columns we need (IF NOT EXISTS handles duplicates)
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS user_role TEXT,
ADD COLUMN IF NOT EXISTS user_phone TEXT;

-- Remove the foreign key constraint temporarily to allow pending users
ALTER TABLE user_permissions DROP CONSTRAINT IF EXISTS user_permissions_user_id_fkey;

-- Make user_id nullable so we can have pending records
ALTER TABLE user_permissions ALTER COLUMN user_id DROP NOT NULL;

-- Only add unique constraint if it doesn't exist (skip since it already exists)
-- ALTER TABLE user_permissions ADD CONSTRAINT unique_user_email UNIQUE (user_email);

-- Create an index on user_email for performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_email ON user_permissions(user_email);

-- Add a constraint to ensure either user_id exists (for real users) or user_email exists (for pending)
ALTER TABLE user_permissions DROP CONSTRAINT IF EXISTS check_user_id_or_email;
ALTER TABLE user_permissions ADD CONSTRAINT check_user_id_or_email 
CHECK (user_id IS NOT NULL OR user_email IS NOT NULL);