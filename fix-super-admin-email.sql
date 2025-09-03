-- Fix super admin email to use correct address
-- Run this in Supabase SQL Editor

-- 1. Delete any wrong records first
DELETE FROM user_permissions WHERE user_email = 'morgan@acaciaconsultinggroup.com';

-- 2. Check if correct record exists and update or create it
INSERT INTO user_permissions (
  user_email,
  user_name,
  is_admin,
  is_super_admin,
  module_permissions,
  created_at,
  updated_at
) VALUES (
  'morgan@teamacacia.com',
  'Morgan Harris',
  true,
  true,
  '{}',
  NOW(),
  NOW()
) 
ON CONFLICT (user_email) 
DO UPDATE SET 
  is_admin = true,
  is_super_admin = true,
  updated_at = NOW();

-- 3. Verify it worked
SELECT user_email, user_name, is_admin, is_super_admin 
FROM user_permissions 
WHERE user_email = 'morgan@teamacacia.com';