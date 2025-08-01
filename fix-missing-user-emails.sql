-- Fix missing user_email fields by matching with auth.users table
-- This updates user_permissions records that have user_id but missing user_email

UPDATE user_permissions 
SET user_email = auth_users.email
FROM auth.users AS auth_users
WHERE user_permissions.user_id = auth_users.id 
  AND (user_permissions.user_email IS NULL OR user_permissions.user_email = '');

-- Check the results
SELECT user_id, user_email, user_name, is_admin 
FROM user_permissions 
ORDER BY user_name;