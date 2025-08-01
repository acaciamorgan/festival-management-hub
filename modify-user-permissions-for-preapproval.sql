-- Modify user_permissions table to support pre-approval workflow
-- This allows creating user permission records before the user actually signs up

-- First, add the missing columns we need
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS user_role TEXT,
ADD COLUMN IF NOT EXISTS user_phone TEXT;

-- Remove the foreign key constraint temporarily to allow pending users
ALTER TABLE user_permissions DROP CONSTRAINT IF EXISTS user_permissions_user_id_fkey;

-- Make user_id nullable so we can have pending records
ALTER TABLE user_permissions ALTER COLUMN user_id DROP NOT NULL;

-- Add a unique constraint on user_email to prevent duplicates
ALTER TABLE user_permissions ADD CONSTRAINT unique_user_email UNIQUE (user_email);

-- Create an index on user_email for performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_email ON user_permissions(user_email);

-- Add a constraint to ensure either user_id exists (for real users) or user_email exists (for pending)
ALTER TABLE user_permissions ADD CONSTRAINT check_user_id_or_email 
CHECK (user_id IS NOT NULL OR user_email IS NOT NULL);