# Festival Settings Fix - Summary of Changes

## Problem
The migration `add-multi-year-FINAL.sql` **DROPPED** the `festival_settings` table, destroying:
- Edition number (61)
- Festival name ("Chicago International Film Festival")
- Correct dates (October 15-26, 2025 - not October 17-27)
- All important links (at least 12 links)

## Solution
Corrected migration that **ADDS columns** instead of dropping the table.

---

## Database Migration

**File:** `migrations/fix-festival-settings-schema.sql`

**Actions:**
1. ADD missing columns to existing table:
   - `edition_number INTEGER NOT NULL`
   - `festival_name VARCHAR(255) NOT NULL`
   - `important_links JSONB DEFAULT '[]'`

2. UPDATE existing 2025 row with correct data:
   - Edition: 61
   - Festival: "Chicago International Film Festival"
   - Dates: 2025-10-15 to 2025-10-26
   - Links: Empty array (you'll re-enter via UI)

3. Make columns NOT NULL after populating

**Final Schema:**
```sql
CREATE TABLE festival_settings (
  id UUID PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,           -- For filtering data
  is_archived BOOLEAN DEFAULT false,      -- Archive status
  edition_number INTEGER NOT NULL,        -- Display (e.g., 61)
  festival_name VARCHAR(255) NOT NULL,    -- Display name
  start_date DATE NOT NULL,               -- Festival dates
  end_date DATE NOT NULL,                 -- Festival dates
  important_links JSONB DEFAULT '[]',     -- Links array
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Code Changes

### 1. Festival Overview Page
**File:** `src/app/(dashboard)/modules/festival-overview/page.tsx`

**Changes:**
- Added `useFestivalYear` hook
- Load settings: `.eq('year', currentYear)` instead of `.single()`
- Save settings: `.eq('year', currentYear)` instead of `.eq('id', ...)`
- Stats queries: Added `.eq('festival_year', currentYear)` to all counts
- Reload on year change: `useEffect(..., [currentYear])`

### 2. Festival Context Utilities
**File:** `src/lib/festival-context.ts`

**Changes:**
- Updated interface to include `year` and `is_archived`
- `getFestivalSettings(year)` now requires year parameter
- Added `getCurrentFestivalSettings()` for non-archived year
- Changed cache from single value to Map<year, settings>
- Removed `getFestivalYear()` function (now in context provider)

### 3. Ticketing Page
**File:** `src/app/(dashboard)/modules/ticketing/page.tsx`

**Changes:**
- Added `useFestivalYear` hook
- Load settings: `.eq('year', currentYear)` instead of `.single()`

---

## Data Architecture

**How it works:**
- Each year gets its own row in `festival_settings`
- When user selects 2025: sees 61st edition details
- When user selects 2026: sees 62nd edition details
- Creating 2026 **INSERTs a new row** (doesn't update 2025)
- Each year preserves its own edition, name, dates, and links

**Example:**
```
year | edition_number | festival_name                      | start_date  | end_date
-----|----------------|-------------------------------------|-------------|------------
2025 | 61             | Chicago International Film Festival | 2025-10-15  | 2025-10-26
2026 | 62             | Chicago International Film Festival | 2026-10-15  | 2026-10-26
```

---

## What You Need to Do After Migration

1. **Run the migration** in Supabase SQL Editor
2. **Re-enter the 12+ important links** via Festival Overview → Settings tab
3. **Verify** the festival overview page displays correctly
4. **Test** switching between years (once 2026 is created)

---

## Files Modified

1. `migrations/fix-festival-settings-schema.sql` (NEW)
2. `src/app/(dashboard)/modules/festival-overview/page.tsx` (UPDATED)
3. `src/lib/festival-context.ts` (UPDATED)
4. `src/app/(dashboard)/modules/ticketing/page.tsx` (UPDATED)

---

## Ready to Proceed?

Please review this summary and the migration SQL before I run it.
