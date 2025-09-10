-- Clear all contact-related data to start fresh
-- Run these in order:

-- 1. Delete all film contact associations
DELETE FROM film_contacts;

-- 2. Delete all contacts
DELETE FROM contacts;

-- 3. Verify tables are empty
SELECT 'film_contacts count:' as table_name, COUNT(*) as count FROM film_contacts
UNION ALL
SELECT 'contacts count:' as table_name, COUNT(*) as count FROM contacts;