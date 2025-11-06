# Data Duplication Fix - Migration Summary

## Problem Statement

The Film Festival system was designed to have a **single source of truth** for all film data, where:
- Films are stored once in `feature_films` or `short_films` tables
- All other modules reference films via foreign keys
- Updates to a film automatically propagate everywhere

**However**, the system was incorrectly implemented with **data duplication**:
- Screening tables stored copies of `title` and `runtime`
- When you updated a film's title in Film Cards, it didn't update in screenings/events
- This violated the relational database principle and caused data inconsistency

---

## Tables Fixed

### 1. **press_screenings**
**Before:**
- `film_id` UUID
- `film_type` VARCHAR(10)
- `title` VARCHAR(500) ❌ *Duplicated*
- `runtime` INTEGER ❌ *Duplicated*

**After:**
- `film_id` UUID ✅ *Reference only*
- `film_type` VARCHAR(10) ✅ *Reference only*

---

### 2. **pi_jury_screenings**
**Before:**
- ❌ *NO film_id at all!*
- `film_title` TEXT ❌ *Duplicated*
- `run_time` INTEGER ❌ *Duplicated*

**After:**
- `film_id` UUID ✅ *New! Proper reference*
- `film_type` VARCHAR(10) ✅ *New! Indicates feature vs short*

---

### 3. **tech_check_screenings**
**Before:**
- ❌ *NO film_id at all!*
- `film_title` TEXT ❌ *Duplicated*
- `run_time` INTEGER ❌ *Duplicated*

**After:**
- `film_id` UUID ✅ *New! Proper reference*
- `film_type` VARCHAR(10) ✅ *New! Indicates feature vs short*

---

### 4. **ticketing_screenings** *(published screenings)*
**Before:**
- `film_title` TEXT ❌ *Duplicated*
- `run_time` INTEGER ❌ *Duplicated*
- `programming_film_id` UUID *(wrong reference!)*

**After:**
- `film_id` UUID ✅ *New! Proper reference*
- `film_type` VARCHAR(10) ✅ *New! Indicates feature vs short*
- `programming_film_id` UUID *(kept for backward compatibility, marked deprecated)*

---

### 5. **interviews**
**Before:**
- `film_id` UUID
- `film_title` TEXT ❌ *Duplicated*

**After:**
- `film_id` UUID ✅ *Reference only*

---

### 6. **guest_films**
**Before:**
- `guest_id` UUID
- `film_id` UUID
- `film_title` TEXT ❌ *Duplicated*

**After:**
- `guest_id` UUID ✅ *Reference only*
- `film_id` UUID ✅ *Reference only*

---

### 7. **press_requests**
**Before:**
- `film_titles` TEXT ❌ *Comma-separated duplicated titles*

**After:**
- New `press_request_films` junction table ✅
  - `press_request_id` UUID
  - `film_id` UUID
  - `film_type` VARCHAR(10)

This allows proper many-to-many relationships with actual film references.

---

## Migration Process

The migration script (`fix-data-duplication-migration.sql`) does the following:

### Phase 1: Data Matching
- For tables with text titles but no `film_id`, it attempts to match the text to actual films
- Matches `film_title` → `feature_films.title` or `short_films.title`
- Reports any "orphaned" records that couldn't be matched

### Phase 2: Column Changes
- Drops duplicated columns (`title`, `runtime`, `film_title`, `run_time`)
- Adds proper `film_id` and `film_type` columns where missing
- Adds NOT NULL constraints for future records

### Phase 3: Helper Views
Creates convenient views that automatically JOIN with film tables:
- `press_screenings_with_films`
- `pi_jury_screenings_with_films`
- `tech_check_screenings_with_films`
- `ticketing_screenings_with_films`
- `interviews_with_films`
- `guest_films_with_details`
- `press_requests_with_films`

These views make it easy for the frontend to get film data without writing complex JOINs.

---

## Frontend Changes Required

### Option 1: Use the Helper Views (RECOMMENDED)

The easiest approach is to simply change table names to view names:

**Before:**
```typescript
const { data } = await supabase
  .from('press_screenings')
  .select('*')
```

**After:**
```typescript
const { data } = await supabase
  .from('press_screenings_with_films')  // ← Use the view instead
  .select('*')
```

The view automatically includes `film_title`, `runtime`, `director` from the source film tables.

### Option 2: Write JOINs Manually

If you prefer explicit control:

**Before:**
```typescript
const { data } = await supabase
  .from('press_screenings')
  .select('*')
```

**After:**
```typescript
const { data } = await supabase
  .from('press_screenings')
  .select(`
    *,
    feature_films!film_id(title, run_time, director),
    short_films!film_id(title, run_time, director)
  `)
```

---

## TypeScript Type Updates Needed

Update your type definitions to remove duplicated fields:

### Press Screenings
```typescript
interface PressScreeningCard {
  id: string
  film_id: string              // ✅ Keep
  film_type: 'feature' | 'short' // ✅ Keep
  // title: string              // ❌ Remove - comes from JOIN
  // runtime: number            // ❌ Remove - comes from JOIN
  screening_date: string
  screening_time: string
  // ... other fields
}
```

### P&I/Jury Screenings
```typescript
interface PIJuryScreening {
  id: string
  film_id: string              // ✅ New!
  film_type: 'feature' | 'short' // ✅ New!
  // film_title: string         // ❌ Remove - comes from JOIN
  // run_time: number           // ❌ Remove - comes from JOIN
  screening_type: 'P&I' | 'Jury'
  // ... other fields
}
```

### Interviews
```typescript
interface InterviewCard {
  id: string
  film_id?: string
  shorts_program_id?: string
  program_id?: string
  short_film_id?: string
  // film_title?: string        // ❌ Remove - comes from JOIN
  // ... other fields
}
```

---

## Testing After Migration

1. **Test Film Update Propagation:**
   - Update a film title in Film Cards
   - Check that the change appears in:
     - Press Screenings grid
     - Ticketing grid
     - P&I/Jury screenings
     - Tech Check screenings
     - Interviews module
     - Guest Cards (related films)
     - Press Requests

2. **Test Film Selection in Forms:**
   - Create a new press screening - select a film from dropdown
   - Verify it saves with only `film_id` and `film_type`
   - Verify the screening displays the film title correctly

3. **Test Existing Data:**
   - Check that all existing screenings still display correctly
   - Verify orphaned records (if any were reported) and fix manually

---

## Rollback Plan

If issues occur, run: `rollback-data-duplication-migration.sql`

This will:
- Restore all duplicated columns
- Repopulate them from the film tables
- Remove the new foreign key columns
- Drop the helper views

**Warning:** Any data entered AFTER the migration will be preserved, but you may need to manually fix references.

---

## Files Created

1. **fix-data-duplication-migration.sql**
   - Main migration script
   - Run this to fix the duplication

2. **rollback-data-duplication-migration.sql**
   - Emergency rollback script
   - Only use if migration causes issues

3. **DATA-DUPLICATION-FIX-SUMMARY.md** *(this file)*
   - Comprehensive documentation
   - Frontend change guide

---

## Execution Plan

### Step 1: Backup Database
```bash
# Create a full database backup before running migration
pg_dump -h db.xqzjthbearpqcrzfdfer.supabase.co -U postgres -d postgres > backup-before-migration.sql
```

### Step 2: Run Migration
Run the migration in Supabase SQL Editor or via psql:
```bash
psql -h db.xqzjthbearpqcrzfdfer.supabase.co -U postgres -d postgres -f fix-data-duplication-migration.sql
```

### Step 3: Check for Warnings
The migration will print warnings about any orphaned records. Review and fix manually.

### Step 4: Update Frontend Code
Update all queries to use helper views or JOINs (see Frontend Changes section above).

### Step 5: Test Thoroughly
Follow the Testing After Migration checklist above.

### Step 6: Deploy
Once tested, deploy frontend changes.

---

## Success Criteria

✅ Film title updates in Film Cards module propagate to all other modules
✅ Film runtime updates propagate everywhere
✅ Film director updates propagate everywhere
✅ No duplicated data in screening tables
✅ All modules display correct film information
✅ Forms save with only foreign key references
✅ No application errors after migration

---

## Questions or Issues?

Check the migration warnings for orphaned records that need manual review.
