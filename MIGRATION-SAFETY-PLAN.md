# Migration Safety Plan - Zero Data Loss Protocol

## Lessons Learned from Press Requests Disaster

**What went wrong:**
1. Dropped `film_titles` column BEFORE verifying junction table was populated
2. Text matching failed silently (0 matches found)
3. Once column was dropped, data was permanently lost
4. No verification step between migration and column drop

**Never again.**

---

## Zero Data Loss Protocol

### Phase 1: PRE-MIGRATION ANALYSIS (Read-Only)

**Goal:** Understand exactly what data exists and what will be migrated.

#### Step 1.1: Count Current Records
```sql
-- Photo Shoots
SELECT
  COUNT(*) as total_shoots,
  COUNT(film_program_display) as shoots_with_films,
  COUNT(subjects_display) as shoots_with_subjects,
  COUNT(venue_name) as shoots_with_venue_cache
FROM photo_shoots;

-- Red Carpets
SELECT
  COUNT(*) as total_carpets,
  COUNT(film_program_display) as carpets_with_films,
  COUNT(subjects_display) as carpets_with_subjects,
  COUNT(venue_name) as carpets_with_venue_cache
FROM red_carpets;

-- Special Events
SELECT
  COUNT(*) as total_events,
  COUNT(films_programs_display) as events_with_films,
  COUNT(guests_display) as events_with_guests,
  COUNT(venue_contact_name) as events_with_venue_contact
FROM special_events;
```

#### Step 1.2: Export Current Data to CSV (Backup)
```sql
-- Export all data to CSV files for safety
COPY photo_shoots TO '/tmp/photo_shoots_backup.csv' CSV HEADER;
COPY red_carpets TO '/tmp/red_carpets_backup.csv' CSV HEADER;
COPY special_events TO '/tmp/special_events_backup.csv' CSV HEADER;
```

#### Step 1.3: Analyze Text Matching Success Rate (DRY RUN)
```sql
-- For Special Events, test how many films will match
SELECT
  se.id,
  se.title,
  se.films_programs_display,
  -- Try to find matches
  (SELECT COUNT(*) FROM unnest(string_to_array(se.films_programs_display, ',')) AS film_title
   WHERE EXISTS (
     SELECT 1 FROM feature_films WHERE title = TRIM(film_title)
     UNION
     SELECT 1 FROM short_films WHERE title = TRIM(film_title)
     UNION
     SELECT 1 FROM shorts_programs WHERE program_name = TRIM(film_title)
     UNION
     SELECT 1 FROM programs WHERE title = TRIM(film_title)
   )
  ) as matched_count,
  (SELECT COUNT(*) FROM unnest(string_to_array(se.films_programs_display, ','))) as total_count
FROM special_events se
WHERE se.films_programs_display IS NOT NULL;

-- Show which specific titles won't match
SELECT DISTINCT
  TRIM(unnest(string_to_array(films_programs_display, ','))) as film_title,
  'NO MATCH' as status
FROM special_events
WHERE films_programs_display IS NOT NULL
AND TRIM(unnest(string_to_array(films_programs_display, ','))) NOT IN (
  SELECT title FROM feature_films
  UNION
  SELECT title FROM short_films
  UNION
  SELECT program_name FROM shorts_programs
  UNION
  SELECT title FROM programs
);
```

#### Step 1.4: Generate Migration Report
Present to user:
- Total records in each table
- How many will successfully migrate
- Which specific titles/names won't match
- Estimated data loss percentage

**STOP HERE AND GET USER APPROVAL BEFORE PROCEEDING**

---

### Phase 2: CREATE NEW STRUCTURES (No Data Loss Risk)

**Goal:** Create new tables/views without touching existing data.

```sql
BEGIN; -- Transaction for safety

-- Create junction tables for special events
CREATE TABLE IF NOT EXISTS special_event_films (...);
CREATE TABLE IF NOT EXISTS special_event_guests (...);

-- DON'T drop any columns yet!
COMMIT;
```

---

### Phase 3: MIGRATE DATA (Additive Only)

**Goal:** Populate new structures while keeping old data intact.

```sql
BEGIN; -- Transaction

-- Migrate special events films (example)
INSERT INTO special_event_films (special_event_id, film_id, film_type)
SELECT ... -- migration logic
ON CONFLICT DO NOTHING;

-- DON'T drop columns yet!
COMMIT;
```

#### Step 3.1: Verify Migration Success
```sql
-- Compare counts
SELECT
  'special_events' as table_name,
  COUNT(*) as records_with_old_data
FROM special_events
WHERE films_programs_display IS NOT NULL;

SELECT
  'special_event_films' as table_name,
  COUNT(DISTINCT special_event_id) as records_with_new_data
FROM special_event_films;

-- Should be equal or new data should be >= old data
```

#### Step 3.2: Show Detailed Comparison
```sql
-- Show side-by-side comparison
SELECT
  se.id,
  se.title,
  se.films_programs_display as OLD_DATA,
  string_agg(
    COALESCE(ff.title, sf.title, sp.program_name, p.title),
    ', '
  ) as NEW_DATA
FROM special_events se
LEFT JOIN special_event_films sef ON se.id = sef.special_event_id
LEFT JOIN feature_films ff ON sef.film_id = ff.id AND sef.film_type = 'feature'
LEFT JOIN short_films sf ON sef.film_id = sf.id AND sef.film_type = 'short'
LEFT JOIN shorts_programs sp ON sef.film_id = sp.id AND sef.film_type = 'shorts_program'
LEFT JOIN programs p ON sef.film_id = p.id AND sef.film_type = 'program'
WHERE se.films_programs_display IS NOT NULL
GROUP BY se.id, se.title, se.films_programs_display;
```

**STOP HERE - USER MUST REVIEW AND APPROVE BEFORE DROPPING COLUMNS**

---

### Phase 4: CREATE VIEWS (No Data Loss Risk)

**Goal:** Create views that pull from new structures.

```sql
CREATE OR REPLACE VIEW special_events_with_details AS
SELECT ... -- view definition
```

#### Step 4.1: Verify Views Return Expected Data
```sql
-- Test view returns correct number of records
SELECT COUNT(*) FROM special_events_with_details;
-- Should equal COUNT(*) FROM special_events

-- Test view includes all expected columns
SELECT * FROM special_events_with_details LIMIT 1;
```

---

### Phase 5: UPDATE FRONTEND (No Database Changes)

**Goal:** Update code to use new views while old columns still exist.

**Files to update:**
- photo-shoots/page.tsx → use `photo_shoots_with_details` view
- red-carpets/page.tsx → use `red_carpets_with_details` view
- special-events/page.tsx → use `special_events_with_details` view
- All form modals → save to junction tables

**Deploy and test in production with old columns still present as fallback.**

**STOP HERE - USER MUST TEST THOROUGHLY BEFORE DROPPING COLUMNS**

---

### Phase 6: DROP OLD COLUMNS (Only After Confirmation)

**Goal:** Remove duplicated data columns.

**ONLY DO THIS AFTER:**
- ✅ User has tested all CRUD operations
- ✅ User confirms data looks correct
- ✅ User has verified film/guest updates propagate correctly
- ✅ At least 48 hours of production use without issues

```sql
BEGIN; -- Transaction

-- Rename columns instead of dropping (safer)
ALTER TABLE special_events
  RENAME COLUMN films_programs_display TO films_programs_display_old;
ALTER TABLE special_events
  RENAME COLUMN guests_display TO guests_display_old;

-- Keep these for 30 days as backup
COMMENT ON COLUMN special_events.films_programs_display_old
  IS 'DEPRECATED - Backup of old data, will be dropped after 2025-12-10';

COMMIT;

-- Actually drop after 30 days if everything is working
-- ALTER TABLE special_events
--   DROP COLUMN films_programs_display_old,
--   DROP COLUMN guests_display_old;
```

---

## Rollback Plan

At any point before dropping columns, rollback is trivial:

```sql
-- Just keep using old columns
-- Drop new junction tables if needed
DROP TABLE IF EXISTS special_event_films;
DROP TABLE IF EXISTS special_event_guests;
DROP VIEW IF EXISTS special_events_with_details;

-- Revert frontend code to use old columns
```

---

## Success Criteria

Before proceeding to next phase:

**Phase 1 → Phase 2:**
- [ ] User has reviewed migration report
- [ ] User approves estimated data loss (if any)
- [ ] Database backup completed

**Phase 2 → Phase 3:**
- [ ] New tables created successfully
- [ ] No errors in transaction

**Phase 3 → Phase 4:**
- [ ] Row counts match (old data == new data)
- [ ] User has reviewed side-by-side comparison
- [ ] User approves migration results

**Phase 4 → Phase 5:**
- [ ] Views return correct data
- [ ] Views have all expected columns

**Phase 5 → Phase 6:**
- [ ] Frontend works correctly with new views
- [ ] All CRUD operations tested
- [ ] Film/guest updates propagate correctly
- [ ] 48+ hours of production use

**Phase 6 → Complete:**
- [ ] 30 days have passed
- [ ] No issues reported
- [ ] User explicitly approves column drop

---

## Emergency Contacts

If anything goes wrong:
1. STOP immediately
2. Do NOT drop any columns
3. Review transaction logs
4. User can manually review CSV backups
5. Supabase support: support@supabase.com

---

## Key Principle

**NEVER DROP DATA UNTIL NEW DATA IS VERIFIED TO BE CORRECT**
