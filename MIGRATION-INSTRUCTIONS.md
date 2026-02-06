# Multi-Year Archive System - Migration Instructions

## Step 1: Run the Database Migration

You have two options to run the migration:

### Option A: Supabase Dashboard (Recommended - Easiest)

1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/xqzjthbearpqcrzfdfer
2. Go to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file: `migrations/add-multi-year-support.sql`
5. Copy the entire contents and paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for completion message

### Option B: Using psql (Command Line)

```bash
# You'll need your database password from Supabase Dashboard
# Go to Settings > Database > Connection String > Password

psql "postgresql://postgres.[YOUR_PASSWORD]@db.xqzjthbearpqcrzfdfer.supabase.co:5432/postgres" \
  -f migrations/add-multi-year-support.sql
```

## Step 2: Verify the Migration

After running the migration, verify it worked:

```bash
node scripts/verify-multi-year-migration.mjs
```

You should see:
- ✅ festival_settings table created with 2025
- ✅ festival_year column added to all tables
- ✅ Existing data backfilled with year 2025

## Step 3: Frontend Implementation

Once the database migration is complete, I'll implement:
1. FestivalYearContext provider
2. Year selector in header
3. Update all queries to filter by year
4. Admin UI for creating/archiving years

## What This Migration Does

- ✅ Adds `festival_year` column to ~30 tables
- ✅ Creates `festival_settings` table for year management
- ✅ Backfills all existing data with `festival_year = 2025`
- ✅ Creates performance indices
- ✅ Sets NOT NULL constraints
- ✅ Makes all data year-aware

## Rollback (If Needed)

If something goes wrong, you can rollback by dropping the festival_year columns.
I can create a rollback script if needed.

---

**Ready to proceed?** Run the migration and let me know when it's complete!
