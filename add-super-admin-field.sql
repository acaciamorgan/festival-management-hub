-- Add super admin field and set up protection for the primary administrator
-- Run this migration in Supabase SQL Editor

-- 1. Add the is_super_admin field to user_permissions table
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- 2. Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_permissions_super_admin 
ON user_permissions(is_super_admin);

-- 3. Set the super admin for your account
-- IMPORTANT: Replace with your actual email address
UPDATE user_permissions 
SET is_super_admin = true,
    is_admin = true  -- Ensure admin is also true
WHERE user_email = 'morgan@acaciaconsultinggroup.com';

-- 4. Add a comment to document this special field
COMMENT ON COLUMN user_permissions.is_super_admin IS 
'Super admin flag - users with this flag cannot be modified or deleted. This protects the primary system administrator.';

-- 5. Verify the update worked
SELECT user_email, is_admin, is_super_admin 
FROM user_permissions 
WHERE is_super_admin = true;