-- Add user profile fields to user_permissions table
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS user_role TEXT,
ADD COLUMN IF NOT EXISTS user_phone TEXT;