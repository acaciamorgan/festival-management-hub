# Manual Migration Instructions

## Database Connection Issue

I'm unable to connect to your Supabase database from the command line. This could be:
- Database in paused/idle state (needs to wake up)
- Network connectivity issue
- IPv6 vs IPv4 routing issue

## Solution: Run Migrations via Supabase Dashboard

### Method 1: Supabase SQL Editor (Recommended)

1. Go to: https://supabase.com/dashboard/project/xqzjthbearpqcrzfdfer/sql/new
2. Copy and paste the SQL from each phase file
3. Click "Run" to execute
4. Check for success messages

### Method 2: Local psql (If Connection Works for You)

Run each script in order:
```bash
cd "/Users/morganharris/Film Festival"

# Phase 2: Add new columns
./run-phase2.sh

# Phase 3: Create junction tables (after Phase 2 succeeds)
./run-phase3.sh

# Phase 4: Smart migration (after Phase 3 succeeds)
./run-phase4.sh

# And so on...
```

---

## Phase-by-Phase Instructions

### ✅ PHASE 2: Add New Free-Text Description Fields
**File:** `phase2-add-fields.sql`
**What it does:** Adds new empty columns for free-text descriptions
**Risk:** ZERO - Only adding columns, not modifying data

**Via Supabase Dashboard:**
1. Go to SQL Editor
2. Copy contents of `phase2-add-fields.sql`
3. Paste and run
4. Look for: "✓ Photo Shoots: New columns added successfully"

**Expected output:**
```
NOTICE:  ✓ Photo Shoots: New columns added successfully
NOTICE:  ✓ Red Carpets: New columns added successfully
NOTICE:  ✓ Special Events: New columns added successfully
NOTICE:  PHASE 2 COMPLETE: New free-text description fields added
```

---

### ✅ PHASE 3: Create Junction Tables for Special Events
**File:** `phase3-create-junction-tables.sql` (I'll create this next)
**What it does:** Creates `special_event_films` and `special_event_guests` tables
**Risk:** ZERO - Only creating new tables, not touching existing data

---

### ⚠️ PHASE 4: Smart Migration with Matching
**File:** `phase4-smart-migration.sql` (I'll create this next)
**What it does:** Populates new structures by matching text to database
**Risk:** LOW - Old data remains intact, but review results before proceeding

**IMPORTANT:** After running this, you MUST review the migration report to verify data looks correct!

---

### ✅ PHASE 5: Clean Association Tables
**File:** `phase5-clean-associations.sql` (I'll create this next)
**What it does:** Removes `film_title` and `guest_name` columns from junction tables
**Risk:** LOW - These are duplicated data, not source of truth

---

### ✅ PHASE 6: Create Views
**File:** `phase6-create-views.sql` (I'll create this next)
**What it does:** Creates views that JOIN data for display
**Risk:** ZERO - Views don't modify data

---

### 🔄 PHASE 7: Update Frontend
**Files:** Multiple TypeScript files
**What it does:** Updates queries to use new views
**Risk:** MEDIUM - This is code changes, needs testing

---

### ✅ PHASE 8: Test in Production
**Duration:** 48+ hours
**What it does:** User testing, verify everything works
**Risk:** User testing phase

---

### ⚠️ PHASE 9: Rename Old Columns
**File:** `phase9-rename-old-columns.sql` (I'll create this next)
**What it does:** Renames old display columns (doesn't drop them)
**Risk:** LOW - Just renaming, data still there

---

## Current Status

✅ Phase 1: Skipped (connection issue)
🔄 Phase 2: Ready to run manually
⏸️ Phase 3-9: Waiting for Phase 2 completion

---

## What I'll Do Next

I'll create ALL the SQL files for Phases 3-9 so you have everything ready. Then you can:
1. Run them via Supabase Dashboard SQL Editor, OR
2. Wait for the connection issue to resolve and I'll run them

---

## If You Want to Proceed Now

1. Go to Supabase Dashboard SQL Editor
2. Open `phase2-add-fields.sql` in your text editor
3. Copy the entire contents
4. Paste into SQL Editor
5. Click "Run"
6. Tell me if it succeeds, and I'll prepare Phase 3

Sound good?
