# Hybrid Migration Plan - Relational + Free Text

## Architecture Principle

**All three modules (Photo Shoots, Red Carpets, Special Events) use the same hybrid approach:**

1. **Attempt relational linking** - Try to match text to database records
2. **Fall back to free text** - If no match, save as description field
3. **Both can coexist** - An event can have both film FKs AND free text description

---

## Database Design - All Three Modules

### Photo Shoots
```sql
photo_shoots:
├─ id
├─ title
├─ venue_id (FK)
├─ film_program_description (TEXT) ← NEW: free-text fallback
├─ subjects_description (TEXT) ← NEW: free-text fallback
├─ date, time, etc.

photo_shoot_films (junction table):
├─ photo_shoot_id (FK)
├─ film_id (FK)
└─ film_type (NO film_title column)

photo_shoot_subjects (junction table):
├─ photo_shoot_id (FK)
└─ guest_id (FK) (NO guest_name column)
```

### Red Carpets
```sql
red_carpets:
├─ id
├─ title
├─ venue_id (FK)
├─ film_program_description (TEXT) ← NEW: free-text fallback
├─ subjects_description (TEXT) ← NEW: free-text fallback
├─ call_time, carpet_start_time, etc.

red_carpet_films (junction table):
├─ red_carpet_id (FK)
├─ film_id (FK)
└─ film_type (NO film_title column)

red_carpet_subjects (junction table):
├─ red_carpet_id (FK)
└─ guest_id (FK) (NO guest_name column)
```

### Special Events
```sql
special_events:
├─ id
├─ title
├─ venue_id (FK)
├─ film_program_description (TEXT) ← NEW: free-text fallback
├─ guests_description (TEXT) ← NEW: free-text fallback
├─ date, time, etc.

special_event_films (junction table):
├─ special_event_id (FK)
├─ film_id (FK)
└─ film_type

special_event_guests (junction table):
├─ special_event_id (FK)
└─ guest_id (FK)
```

---

## Display Logic (All Modules)

**For Films/Programs:**
```typescript
const displayFilms = (event) => {
  const linkedFilms = event.linked_films?.map(f => f.title).join(', ')
  const freeText = event.film_program_description

  // Show both if both exist
  if (linkedFilms && freeText) {
    return `${linkedFilms}, ${freeText}`
  }

  // Show whichever exists
  return linkedFilms || freeText || '—'
}
```

**For Guests/Subjects:**
```typescript
const displayGuests = (event) => {
  const linkedGuests = event.linked_guests?.map(g => g.name).join(', ')
  const freeText = event.subjects_description

  // Show both if both exist
  if (linkedGuests && freeText) {
    return `${linkedGuests}, ${freeText}`
  }

  // Show whichever exists
  return linkedGuests || freeText || '—'
}
```

---

## Migration Strategy - Smart Matching

### Step 1: Add New Free-Text Fields (No Data Loss)

```sql
-- Photo Shoots
ALTER TABLE photo_shoots
  ADD COLUMN film_program_description TEXT,
  ADD COLUMN subjects_description TEXT;

-- Red Carpets
ALTER TABLE red_carpets
  ADD COLUMN film_program_description TEXT,
  ADD COLUMN subjects_description TEXT;

-- Special Events
ALTER TABLE special_events
  ADD COLUMN film_program_description TEXT,
  ADD COLUMN guests_description TEXT;

-- DON'T drop old columns yet!
```

### Step 2: Create Junction Tables (Already Exist for Photo/Red Carpet)

```sql
-- Special Events needs new tables
CREATE TABLE IF NOT EXISTS special_event_films (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  special_event_id UUID NOT NULL REFERENCES special_events(id) ON DELETE CASCADE,
  film_id UUID NOT NULL,
  film_type VARCHAR(20) NOT NULL CHECK (
    film_type IN ('feature', 'short', 'shorts_program', 'program')
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(special_event_id, film_id, film_type)
);

CREATE TABLE IF NOT EXISTS special_event_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  special_event_id UUID NOT NULL REFERENCES special_events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(special_event_id, guest_id)
);
```

### Step 3: Smart Migration with Matching

```sql
-- PHOTO SHOOTS - Migrate Films
DO $$
DECLARE
  shoot RECORD;
  title_text TEXT;
  matched_id UUID;
  matched_type VARCHAR(20);
  unmatched_titles TEXT[];
BEGIN
  FOR shoot IN
    SELECT id, film_program_display
    FROM photo_shoots
    WHERE film_program_display IS NOT NULL
    AND film_program_display != ''
  LOOP
    unmatched_titles := ARRAY[]::TEXT[];

    -- Try to match each comma-separated title
    FOR title_text IN
      SELECT TRIM(unnest(string_to_array(shoot.film_program_display, ',')))
    LOOP
      matched_id := NULL;

      -- Try feature films
      SELECT id INTO matched_id FROM feature_films WHERE title = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO photo_shoot_films (photo_shoot_id, film_id, film_type)
        VALUES (shoot.id, matched_id, 'feature')
        ON CONFLICT DO NOTHING;
        CONTINUE;
      END IF;

      -- Try short films
      SELECT id INTO matched_id FROM short_films WHERE title = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO photo_shoot_films (photo_shoot_id, film_id, film_type)
        VALUES (shoot.id, matched_id, 'short')
        ON CONFLICT DO NOTHING;
        CONTINUE;
      END IF;

      -- Try shorts programs
      SELECT id INTO matched_id FROM shorts_programs WHERE program_name = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO photo_shoot_films (photo_shoot_id, film_id, film_type)
        VALUES (shoot.id, matched_id, 'shorts_program')
        ON CONFLICT DO NOTHING;
        CONTINUE;
      END IF;

      -- Try programs
      SELECT id INTO matched_id FROM programs WHERE title = title_text LIMIT 1;
      IF matched_id IS NOT NULL THEN
        INSERT INTO photo_shoot_films (photo_shoot_id, film_id, film_type)
        VALUES (shoot.id, matched_id, 'program')
        ON CONFLICT DO NOTHING;
        CONTINUE;
      END IF;

      -- No match found - add to unmatched list
      unmatched_titles := array_append(unmatched_titles, title_text);
    END LOOP;

    -- Save unmatched titles as free text
    IF array_length(unmatched_titles, 1) > 0 THEN
      UPDATE photo_shoots
      SET film_program_description = array_to_string(unmatched_titles, ', ')
      WHERE id = shoot.id;

      RAISE NOTICE 'Photo Shoot % - unmatched titles saved as description: %',
        shoot.id, array_to_string(unmatched_titles, ', ');
    END IF;
  END LOOP;
END $$;

-- PHOTO SHOOTS - Migrate Guests/Subjects
DO $$
DECLARE
  shoot RECORD;
  subject_name TEXT;
  matched_guest_id UUID;
  unmatched_subjects TEXT[];
BEGIN
  FOR shoot IN
    SELECT id, subjects_display
    FROM photo_shoots
    WHERE subjects_display IS NOT NULL
    AND subjects_display != ''
  LOOP
    unmatched_subjects := ARRAY[]::TEXT[];

    FOR subject_name IN
      SELECT TRIM(unnest(string_to_array(shoot.subjects_display, ',')))
    LOOP
      -- Try to match to guests table
      SELECT id INTO matched_guest_id FROM guests WHERE name = subject_name LIMIT 1;

      IF matched_guest_id IS NOT NULL THEN
        INSERT INTO photo_shoot_subjects (photo_shoot_id, guest_id)
        VALUES (shoot.id, matched_guest_id)
        ON CONFLICT DO NOTHING;
      ELSE
        -- No match - add to unmatched list
        unmatched_subjects := array_append(unmatched_subjects, subject_name);
      END IF;
    END LOOP;

    -- Save unmatched subjects as free text
    IF array_length(unmatched_subjects, 1) > 0 THEN
      UPDATE photo_shoots
      SET subjects_description = array_to_string(unmatched_subjects, ', ')
      WHERE id = shoot.id;

      RAISE NOTICE 'Photo Shoot % - unmatched subjects: %',
        shoot.id, array_to_string(unmatched_subjects, ', ');
    END IF;
  END LOOP;
END $$;

-- Repeat similar logic for RED CARPETS and SPECIAL EVENTS...
```

### Step 4: Clean Association Tables

```sql
-- Remove duplicated name columns from junction tables
ALTER TABLE photo_shoot_films DROP COLUMN IF EXISTS film_title;
ALTER TABLE photo_shoot_subjects DROP COLUMN IF EXISTS guest_name;

ALTER TABLE red_carpet_films DROP COLUMN IF EXISTS film_title;
ALTER TABLE red_carpet_subjects DROP COLUMN IF EXISTS guest_name;
```

### Step 5: Create Views

```sql
-- Photo Shoots View
CREATE OR REPLACE VIEW photo_shoots_with_details AS
SELECT
  ps.*,
  v.name AS venue_name,
  v.house,
  -- Linked films
  COALESCE(
    (
      SELECT string_agg(
        COALESCE(ff.title, sf.title, sp.program_name, p.title),
        ', '
        ORDER BY COALESCE(ff.title, sf.title, sp.program_name, p.title)
      )
      FROM photo_shoot_films psf
      LEFT JOIN feature_films ff ON psf.film_id = ff.id AND psf.film_type = 'feature'
      LEFT JOIN short_films sf ON psf.film_id = sf.id AND psf.film_type = 'short'
      LEFT JOIN shorts_programs sp ON psf.film_id = sp.id AND psf.film_type = 'shorts_program'
      LEFT JOIN programs p ON psf.film_id = p.id AND psf.film_type = 'program'
      WHERE psf.photo_shoot_id = ps.id
    ),
    ''
  ) ||
  CASE
    WHEN ps.film_program_description IS NOT NULL
    AND ps.film_program_description != ''
    THEN CASE
      WHEN EXISTS (SELECT 1 FROM photo_shoot_films WHERE photo_shoot_id = ps.id)
      THEN ', ' || ps.film_program_description
      ELSE ps.film_program_description
    END
    ELSE ''
  END AS film_program_display,
  -- Linked guests/subjects
  COALESCE(
    (
      SELECT string_agg(g.name, ', ' ORDER BY g.name)
      FROM photo_shoot_subjects pss
      LEFT JOIN guests g ON pss.guest_id = g.id
      WHERE pss.photo_shoot_id = ps.id
    ),
    ''
  ) ||
  CASE
    WHEN ps.subjects_description IS NOT NULL
    AND ps.subjects_description != ''
    THEN CASE
      WHEN EXISTS (SELECT 1 FROM photo_shoot_subjects WHERE photo_shoot_id = ps.id)
      THEN ', ' || ps.subjects_description
      ELSE ps.subjects_description
    END
    ELSE ''
  END AS subjects_display
FROM photo_shoots ps
LEFT JOIN venues v ON ps.venue_id = v.id;

-- Similar views for Red Carpets and Special Events...
```

---

## Migration Results Report

After migration, I'll show you:

```
PHOTO SHOOTS MIGRATION RESULTS
==============================

Total photo shoots: 45

Films/Programs:
  - Matched to database: 38 (84%)
  - Saved as free text: 7 (16%)

  Free text examples:
    - "Promotional shoot for sponsors"
    - "BTS photographer session"
    - "Random street photography"

Subjects/Guests:
  - Matched to database: 52 (72%)
  - Saved as free text: 20 (28%)

  Free text examples:
    - "Festival volunteers"
    - "Local photographers"
    - "Street models"

RED CARPETS MIGRATION RESULTS
==============================
[Similar breakdown]

SPECIAL EVENTS MIGRATION RESULTS
==============================
[Similar breakdown]
```

You review this and approve before we drop old columns.

---

## Forms Update

All three form modals get the same two-field approach:

```typescript
// Photo Shoot Form
<MultiSelect
  label="Associated Films/Programs"
  options={filmOptions}
  value={selectedFilms}
/>

<TextArea
  label="Additional Film/Program Description"
  placeholder="e.g., 'Promotional shoot for sponsors', 'BTS session'"
  value={filmProgramDescription}
/>

<MultiSelect
  label="Associated Guests"
  options={guestOptions}
  value={selectedGuests}
/>

<TextArea
  label="Additional Subjects Description"
  placeholder="e.g., 'Festival volunteers', 'Local models'"
  value={subjectsDescription}
/>
```

**Save logic:**
- Save selectedFilms → `photo_shoot_films` junction table
- Save filmProgramDescription → `photo_shoots.film_program_description`
- Save selectedGuests → `photo_shoot_subjects` junction table
- Save subjectsDescription → `photo_shoots.subjects_description`

---

## Benefits of This Approach

✅ **Relational when possible** - Film/guest updates propagate automatically
✅ **Flexible when needed** - "Board Night", "Festival volunteers" work fine
✅ **No data loss** - Everything from old system preserved
✅ **User-friendly** - Forms support both structured and free-form entry

---

## Key Questions Answered

1. ✅ Match automatically, save as free text if no match
2. ✅ Guests work the same way (relational + free text fallback)
3. ✅ Photo shoots handle non-database guests as free text
4. ✅ All three modules use identical hybrid approach

---

Ready to proceed with Phase 1 (read-only analysis)?
