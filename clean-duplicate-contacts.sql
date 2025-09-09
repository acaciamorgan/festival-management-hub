-- Clean up duplicate contacts by keeping only the first one per email
-- First, identify duplicates
WITH duplicate_contacts AS (
  SELECT 
    id,
    contact_email,
    contact_name,
    ROW_NUMBER() OVER (PARTITION BY LOWER(contact_email) ORDER BY created_at ASC, id ASC) as rn
  FROM contacts
  WHERE contact_email IS NOT NULL AND contact_email != ''
)
-- Delete all but the first contact for each email
DELETE FROM contacts
WHERE id IN (
  SELECT id 
  FROM duplicate_contacts 
  WHERE rn > 1
);

-- Show remaining contacts
SELECT contact_email, COUNT(*) as count
FROM contacts
WHERE contact_email IS NOT NULL
GROUP BY contact_email
HAVING COUNT(*) > 1;