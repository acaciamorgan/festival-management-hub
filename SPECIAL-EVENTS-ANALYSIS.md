# Special Events - Correct Architecture Analysis

## The Critical Distinction

**Special Events come in TWO types:**

### Type 1: Film-Related Events
- Opening Night Screening + Reception
- Q&A with Director
- Awards Ceremony (with specific films)
- Film Premiere Party

**These SHOULD:**
- ✅ Use junction table to link to specific films
- ✅ Reference film_id (relational)
- ✅ Auto-update when film titles change

---

### Type 2: Non-Film Events
- Board Night
- Donor Parties
- VIP Receptions (no specific film)
- Industry Networking Events
- General Festival Parties

**These SHOULD:**
- ✅ Use free-text description field
- ✅ NOT require film associations
- ✅ Allow arbitrary event descriptions

---

## Correct Database Design

```sql
special_events table:
├─ id
├─ title (e.g., "Board Night", "Opening Reception")
├─ event_description (TEXT - free form description) ← NEW FIELD
├─ date
├─ time
├─ venue_id (FK to venues)
├─ lead_staff
├─ etc...

special_event_films (junction table):
├─ special_event_id (FK)
├─ film_id (FK)
├─ film_type

special_event_guests (junction table):
├─ special_event_id (FK)
├─ guest_id (FK)
```

---

## How to Display

**Frontend logic:**
```typescript
// In the Special Events table display
const displayFilmsPrograms = (event) => {
  // If event has film associations, show those
  if (event.associated_films && event.associated_films.length > 0) {
    return event.associated_films.map(f => f.title).join(', ')
  }

  // Otherwise show free-text description
  return event.event_description || '—'
}
```

---

## Migration Strategy - REVISED

### Current State Analysis

First, I need to understand what's currently in `films_programs_display`:

**Scenario A:** It contains actual film titles
```
films_programs_display: "The Great Film, Another Movie"
→ Should migrate to junction table
```

**Scenario B:** It contains free-text descriptions
```
films_programs_display: "Board meeting and dinner"
→ Should migrate to event_description field
```

**Scenario C:** It's empty/null
```
films_programs_display: NULL
→ Nothing to migrate, just a general event
```

### The Challenge

How do I tell the difference between:
- "The Great Film" (actual film title → should link via FK)
- "Board Night" (event description → should stay as text)

**Options:**

1. **Manual Review Required**
   - Export all special_events to CSV
   - You manually mark which ones are film references vs free text
   - I migrate accordingly

2. **Attempt Matching, Keep Unmatched**
   - Try to match text to film titles
   - If match found → create junction table entry
   - If NO match found → save as event_description
   - Show you the results for approval

3. **User Decision During Form Entry**
   - Keep old data as-is during migration
   - Going forward, form has TWO separate inputs:
     - "Associated Films" (dropdown/multiselect)
     - "Event Description" (free text)
   - User enters data into the appropriate field

---

## Recommended Approach

**Phase 1: Add New Field Without Breaking Existing Data**

```sql
-- Add new field for free-text descriptions
ALTER TABLE special_events
  ADD COLUMN event_description TEXT;

-- Keep films_programs_display temporarily
-- DON'T drop it yet!
```

**Phase 2: Smart Migration**

```sql
DO $$
DECLARE
  event RECORD;
  title_text TEXT;
  matched_id UUID;
  matched_type VARCHAR(20);
  any_match_found BOOLEAN;
BEGIN
  FOR event IN SELECT id, title, films_programs_display
    FROM special_events
    WHERE films_programs_display IS NOT NULL
    AND films_programs_display != ''
  LOOP
    any_match_found := FALSE;

    -- Try to match each comma-separated title
    FOR title_text IN
      SELECT TRIM(unnest(string_to_array(event.films_programs_display, ',')))
    LOOP
      matched_id := NULL;

      -- Try all film tables...
      SELECT id INTO matched_id FROM feature_films WHERE title = title_text;
      IF matched_id IS NOT NULL THEN
        INSERT INTO special_event_films (special_event_id, film_id, film_type)
        VALUES (event.id, matched_id, 'feature')
        ON CONFLICT DO NOTHING;
        any_match_found := TRUE;
        CONTINUE;
      END IF;

      -- [similar for short_films, shorts_programs, programs]
    END LOOP;

    -- If NO films matched, treat entire string as event description
    IF NOT any_match_found THEN
      UPDATE special_events
      SET event_description = films_programs_display
      WHERE id = event.id;

      RAISE NOTICE 'Event "%" - no film matches, saved as description: "%"',
        event.title, event.films_programs_display;
    END IF;
  END LOOP;
END $$;
```

**Phase 3: Show Results for Review**

```sql
-- Events that matched films
SELECT
  se.id,
  se.title,
  se.films_programs_display as ORIGINAL,
  string_agg(COALESCE(ff.title, sf.title, sp.program_name, p.title), ', ') as MATCHED_FILMS,
  'Film association' as TYPE
FROM special_events se
JOIN special_event_films sef ON se.id = sef.special_event_id
LEFT JOIN feature_films ff ON sef.film_id = ff.id AND sef.film_type = 'feature'
LEFT JOIN short_films sf ON sef.film_id = sf.id AND sef.film_type = 'short'
LEFT JOIN shorts_programs sp ON sef.film_id = sp.id AND sef.film_type = 'shorts_program'
LEFT JOIN programs p ON sef.film_id = p.id AND sef.film_type = 'program'
GROUP BY se.id, se.title, se.films_programs_display;

-- Events that became descriptions
SELECT
  id,
  title,
  films_programs_display as ORIGINAL,
  event_description as NEW_DESCRIPTION,
  'Free text' as TYPE
FROM special_events
WHERE event_description IS NOT NULL;

-- Events with nothing
SELECT
  id,
  title,
  'No films or description' as TYPE
FROM special_events
WHERE event_description IS NULL
AND id NOT IN (SELECT special_event_id FROM special_event_films);
```

**YOU REVIEW THIS OUTPUT AND TELL ME IF IT LOOKS CORRECT**

---

## Updated View

```sql
CREATE OR REPLACE VIEW special_events_with_details AS
SELECT
  se.*,
  v.name AS venue_name,
  v.contact_names[1] AS venue_contact_name,
  v.contact_phones[1] AS venue_contact_phone,
  -- Show either film titles OR event description
  COALESCE(
    (
      SELECT string_agg(
        COALESCE(ff.title, sf.title, sp.program_name, p.title),
        ', '
      )
      FROM special_event_films sef
      LEFT JOIN feature_films ff ON sef.film_id = ff.id AND sef.film_type = 'feature'
      LEFT JOIN short_films sf ON sef.film_id = sf.id AND sef.film_type = 'short'
      LEFT JOIN shorts_programs sp ON sef.film_id = sp.id AND sef.film_type = 'shorts_program'
      LEFT JOIN programs p ON sef.film_id = p.id AND sef.film_type = 'program'
      WHERE sef.special_event_id = se.id
    ),
    se.event_description
  ) AS films_programs_display,
  -- Guests (same as before)
  (
    SELECT string_agg(g.name, ', ' ORDER BY g.name)
    FROM special_event_guests seg
    LEFT JOIN guests g ON seg.guest_id = g.id
    WHERE seg.special_event_id = se.id
  ) AS guests_display
FROM special_events se
LEFT JOIN venues v ON se.venue_id = v.id;
```

**The view will:**
- Show film titles if films are linked (via junction table)
- Show event_description if no films linked
- Return the same `films_programs_display` column name for backwards compatibility

---

## Updated Form Modal

The Special Events form needs TWO separate sections:

```typescript
// Option 1: Associate with Films
<MultiSelect
  label="Associated Films/Programs"
  options={filmOptions}
  value={selectedFilms}
  onChange={setSelectedFilms}
/>

// Option 2: Free-text Description
<TextArea
  label="Event Description (if not film-related)"
  value={eventDescription}
  onChange={setEventDescription}
  placeholder="e.g., Board meeting and networking dinner"
/>

// Save logic:
if (selectedFilms.length > 0) {
  // Save to special_event_films junction table
} else if (eventDescription) {
  // Save to special_events.event_description field
}
```

---

## Questions for You

1. **Is my understanding correct?**
   - Some events reference specific films (should be relational)
   - Some events are free-form (Board Night, parties, etc.)
   - Some events might have BOTH (e.g., "VIP Reception for The Great Film")?

2. **Do you want to review existing data before migration?**
   - I can export all current `films_programs_display` values
   - You tell me which are film references vs descriptions
   - Ensures 100% accuracy

3. **Should guests_display work the same way?**
   - Some events have specific guest associations (junction table)
   - Some events have free-text like "Board members and donors" (text field)
   - Or should all guest references be relational?

---

## Key Principle

**Special Events are hybrid:**
- Some are film-centric → use relational database
- Some are operational/social → use free text
- The system must support BOTH
