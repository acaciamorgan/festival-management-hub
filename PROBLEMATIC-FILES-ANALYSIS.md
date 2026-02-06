# Analysis of 3 Files That Will Break

## Summary
These 3 files query `festival_settings` with `.single()` which requires exactly ONE row. After the migration adds missing columns, the table will still only have 1 row (2025), so **the migration itself is safe**.

However, these files will break **when you create a 2026 year** because `.single()` will error with 2+ rows.

---

## File 1: `/src/lib/date-utils-smart.ts`

### What it does:
Date formatting utility library used throughout the app.

### Problem function:
`isWithinFestivalDates(dateString)` - checks if a date falls within festival start/end dates

**Line 99-102:**
```typescript
const { data, error } = await supabase
  .from('festival_settings')
  .select('start_date, end_date')
  .single()  // ❌ Will break with multiple years
```

### Where it's used:
**NOWHERE** - I searched the entire codebase and this function is not called anywhere!

### Impact:
**LOW** - Function exists but is unused. Safe to fix or remove.

---

## File 2: `/src/lib/smart-date-parser.ts`

### What it does:
Parses dates in various formats (e.g., "10/16", "Oct 16") into YYYY-MM-DD format.

Uses the festival year from settings to infer the year for partial dates.

### Problem function:
`getFestivalYear()` - fetches festival year from start_date

**Line 12-15:**
```typescript
const { data, error } = await supabase
  .from('festival_settings')
  .select('start_date, end_date')
  .single()  // ❌ Will break with multiple years
```

### Where it's used:
1. **CSV Import** (`src/lib/csv-import.ts:324`) - Used when importing guest data from CSV
   - Called ONCE at start of import to get festival year
   - Then reuses that year for all date parsing

2. **Date Utils** (`src/lib/date-utils-smart.ts:56`) - `parseDate()` function
   - Used for general date parsing throughout app

### Where users encounter this:
- **In Attendance module** - "Import from CSV" button
- Any form field that accepts dates and needs to parse "10/16" → "2025-10-16"

### Impact:
**MEDIUM** - Used in CSV import which is a key feature. Will break when 2+ years exist.

---

## File 3: `/src/utils/excel-export.ts`

### What it does:
Exports module data to Excel files with styled headers showing festival info.

### Problem function:
`exportToExcel()` - Creates Excel file with festival name and edition in header

**Line 138-141:**
```typescript
const { data: festivalSettings, error: settingsError } = await supabase
  .from('festival_settings')
  .select('*')
  .single()  // ❌ Will break with multiple years
```

Then uses:
```typescript
const festivalName = festivalSettings?.festival_name  // ❌ Column doesn't exist yet
const edition = festivalSettings?.edition_number      // ❌ Column doesn't exist yet
```

### Where it's used:
1. **Programming Pipeline** (`modules/programming-pipeline/page.tsx`) - "Export to Excel" button
2. **Archives** (`modules/archives/page.tsx`) - Export functionality

### Where users encounter this:
- **Programming Pipeline module** - Top right "Export to Excel" button
- **Archives module** - Export archived data

### Impact:
**HIGH** - Will fail IMMEDIATELY after migration (missing columns) AND when 2+ years exist (`.single()` error)

---

## Severity Assessment

| File | Impact | Breaks After Migration? | Breaks After Creating 2026? |
|------|--------|-------------------------|----------------------------|
| date-utils-smart.ts | LOW | ❌ No (unused function) | ❌ No (unused function) |
| smart-date-parser.ts | MEDIUM | ❌ No | ✅ YES - CSV import breaks |
| excel-export.ts | **HIGH** | ✅ **YES - Missing columns** | ✅ YES - Multiple rows error |

---

## Recommendation

**Must fix BEFORE migration:**
- ❗ **excel-export.ts** - Will break immediately (missing columns)

**Can fix AFTER migration (before creating 2026):**
- smart-date-parser.ts - Works fine with 1 year, breaks with 2+
- date-utils-smart.ts - Unused function, low priority

---

## The Fix Strategy

### For excel-export.ts:
Pass `currentYear` as parameter to `exportToExcel()`, then:
```typescript
.eq('year', currentYear)
.single()
```

### For smart-date-parser.ts:
Change `getFestivalYear()` to accept year parameter:
```typescript
export async function getFestivalYear(year: number): Promise<string> {
  const { data } = await supabase
    .from('festival_settings')
    .select('start_date')
    .eq('year', year)
    .single()
  // ...
}
```

### For date-utils-smart.ts:
Either fix or remove `isWithinFestivalDates()` since it's unused.

---

## Your Decision

Do you want me to:

**Option A:** Fix only excel-export.ts (critical), run migration, then fix the others later before creating 2026

**Option B:** Fix all 3 files now, then run migration (most thorough)

**Option C:** Review the specific fixes I would make to each file first
