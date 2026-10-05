ALTER TABLE film_contacts
ADD CONSTRAINT film_contacts_unique_assignment
UNIQUE (film_id, contact_id, contact_type, festival_year)
