-- ============================================================================
-- PHASE 6: CREATE VIEWS FOR ALL THREE MODULES
-- ============================================================================
-- This script creates views that combine relational data with free text
-- These views will be used by the frontend for easy querying
-- SAFE: Views don't modify data, they just provide a query interface
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHOTO SHOOTS VIEW
-- ============================================================================
CREATE OR REPLACE VIEW photo_shoots_with_details AS
SELECT
  ps.*,
  v.name AS venue_name_from_fk,
  v.address AS venue_address_from_fk,
  -- House information is already on ps.house
  -- Linked films (from junction table)
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
  ) AS linked_films_display,
  -- Linked guests/subjects (from junction table)
  COALESCE(
    (
      SELECT string_agg(g.name, ', ' ORDER BY g.name)
      FROM photo_shoot_subjects pss
      LEFT JOIN guests g ON pss.guest_id = g.id
      WHERE pss.photo_shoot_id = ps.id
    ),
    ''
  ) AS linked_subjects_display,
  -- Combined display: linked films + free text description
  CASE
    WHEN COALESCE(
      (
        SELECT string_agg(
          COALESCE(ff.title, sf.title, sp.program_name, p.title),
          ', '
        )
        FROM photo_shoot_films psf
        LEFT JOIN feature_films ff ON psf.film_id = ff.id AND psf.film_type = 'feature'
        LEFT JOIN short_films sf ON psf.film_id = sf.id AND psf.film_type = 'short'
        LEFT JOIN shorts_programs sp ON psf.film_id = sp.id AND psf.film_type = 'shorts_program'
        LEFT JOIN programs p ON psf.film_id = p.id AND psf.film_type = 'program'
        WHERE psf.photo_shoot_id = ps.id
      ),
      ''
    ) != '' AND COALESCE(ps.film_program_description, '') != ''
    THEN
      (
        SELECT string_agg(
          COALESCE(ff.title, sf.title, sp.program_name, p.title),
          ', '
        )
        FROM photo_shoot_films psf
        LEFT JOIN feature_films ff ON psf.film_id = ff.id AND psf.film_type = 'feature'
        LEFT JOIN short_films sf ON psf.film_id = sf.id AND psf.film_type = 'short'
        LEFT JOIN shorts_programs sp ON psf.film_id = sp.id AND psf.film_type = 'shorts_program'
        LEFT JOIN programs p ON psf.film_id = p.id AND psf.film_type = 'program'
        WHERE psf.photo_shoot_id = ps.id
      ) || ', ' || ps.film_program_description
    ELSE
      COALESCE(
        (
          SELECT string_agg(
            COALESCE(ff.title, sf.title, sp.program_name, p.title),
            ', '
          )
          FROM photo_shoot_films psf
          LEFT JOIN feature_films ff ON psf.film_id = ff.id AND psf.film_type = 'feature'
          LEFT JOIN short_films sf ON psf.film_id = sf.id AND psf.film_type = 'short'
          LEFT JOIN shorts_programs sp ON psf.film_id = sp.id AND psf.film_type = 'shorts_program'
          LEFT JOIN programs p ON psf.film_id = p.id AND psf.film_type = 'program'
          WHERE psf.photo_shoot_id = ps.id
        ),
        ps.film_program_description,
        ''
      )
  END AS film_program_display_combined,
  -- Combined display: linked subjects + free text description
  CASE
    WHEN COALESCE(
      (
        SELECT string_agg(g.name, ', ')
        FROM photo_shoot_subjects pss
        LEFT JOIN guests g ON pss.guest_id = g.id
        WHERE pss.photo_shoot_id = ps.id
      ),
      ''
    ) != '' AND COALESCE(ps.subjects_description, '') != ''
    THEN
      (
        SELECT string_agg(g.name, ', ')
        FROM photo_shoot_subjects pss
        LEFT JOIN guests g ON pss.guest_id = g.id
        WHERE pss.photo_shoot_id = ps.id
      ) || ', ' || ps.subjects_description
    ELSE
      COALESCE(
        (
          SELECT string_agg(g.name, ', ')
          FROM photo_shoot_subjects pss
          LEFT JOIN guests g ON pss.guest_id = g.id
          WHERE pss.photo_shoot_id = ps.id
        ),
        ps.subjects_description,
        ''
      )
  END AS subjects_display_combined
FROM photo_shoots ps
LEFT JOIN venues v ON ps.venue_id = v.id;

COMMENT ON VIEW photo_shoots_with_details
  IS 'Photo shoots with combined relational and free-text data. Use film_program_display_combined and subjects_display_combined for display.';


-- ============================================================================
-- RED CARPETS VIEW
-- ============================================================================
CREATE OR REPLACE VIEW red_carpets_with_details AS
SELECT
  rc.*,
  v.name AS venue_name_from_fk,
  v.address AS venue_address_from_fk,
  -- House information is already on rc.house (though rarely used for red carpets)
  -- Linked films (from junction table)
  COALESCE(
    (
      SELECT string_agg(
        COALESCE(ff.title, sf.title, sp.program_name, p.title),
        ', '
        ORDER BY COALESCE(ff.title, sf.title, sp.program_name, p.title)
      )
      FROM red_carpet_films rcf
      LEFT JOIN feature_films ff ON rcf.film_id = ff.id AND rcf.film_type = 'feature'
      LEFT JOIN short_films sf ON rcf.film_id = sf.id AND rcf.film_type = 'short'
      LEFT JOIN shorts_programs sp ON rcf.film_id = sp.id AND rcf.film_type = 'shorts_program'
      LEFT JOIN programs p ON rcf.film_id = p.id AND rcf.film_type = 'program'
      WHERE rcf.red_carpet_id = rc.id
    ),
    ''
  ) AS linked_films_display,
  -- Linked guests/subjects (from junction table)
  COALESCE(
    (
      SELECT string_agg(g.name, ', ' ORDER BY g.name)
      FROM red_carpet_subjects rcs
      LEFT JOIN guests g ON rcs.guest_id = g.id
      WHERE rcs.red_carpet_id = rc.id
    ),
    ''
  ) AS linked_subjects_display,
  -- Combined display: linked films + free text description
  CASE
    WHEN COALESCE(
      (
        SELECT string_agg(
          COALESCE(ff.title, sf.title, sp.program_name, p.title),
          ', '
        )
        FROM red_carpet_films rcf
        LEFT JOIN feature_films ff ON rcf.film_id = ff.id AND rcf.film_type = 'feature'
        LEFT JOIN short_films sf ON rcf.film_id = sf.id AND rcf.film_type = 'short'
        LEFT JOIN shorts_programs sp ON rcf.film_id = sp.id AND rcf.film_type = 'shorts_program'
        LEFT JOIN programs p ON rcf.film_id = p.id AND rcf.film_type = 'program'
        WHERE rcf.red_carpet_id = rc.id
      ),
      ''
    ) != '' AND COALESCE(rc.film_program_description, '') != ''
    THEN
      (
        SELECT string_agg(
          COALESCE(ff.title, sf.title, sp.program_name, p.title),
          ', '
        )
        FROM red_carpet_films rcf
        LEFT JOIN feature_films ff ON rcf.film_id = ff.id AND rcf.film_type = 'feature'
        LEFT JOIN short_films sf ON rcf.film_id = sf.id AND rcf.film_type = 'short'
        LEFT JOIN shorts_programs sp ON rcf.film_id = sp.id AND rcf.film_type = 'shorts_program'
        LEFT JOIN programs p ON rcf.film_id = p.id AND rcf.film_type = 'program'
        WHERE rcf.red_carpet_id = rc.id
      ) || ', ' || rc.film_program_description
    ELSE
      COALESCE(
        (
          SELECT string_agg(
            COALESCE(ff.title, sf.title, sp.program_name, p.title),
            ', '
          )
          FROM red_carpet_films rcf
          LEFT JOIN feature_films ff ON rcf.film_id = ff.id AND rcf.film_type = 'feature'
          LEFT JOIN short_films sf ON rcf.film_id = sf.id AND rcf.film_type = 'short'
          LEFT JOIN shorts_programs sp ON rcf.film_id = sp.id AND rcf.film_type = 'shorts_program'
          LEFT JOIN programs p ON rcf.film_id = p.id AND rcf.film_type = 'program'
          WHERE rcf.red_carpet_id = rc.id
        ),
        rc.film_program_description,
        ''
      )
  END AS film_program_display_combined,
  -- Combined display: linked subjects + free text description
  CASE
    WHEN COALESCE(
      (
        SELECT string_agg(g.name, ', ')
        FROM red_carpet_subjects rcs
        LEFT JOIN guests g ON rcs.guest_id = g.id
        WHERE rcs.red_carpet_id = rc.id
      ),
      ''
    ) != '' AND COALESCE(rc.subjects_description, '') != ''
    THEN
      (
        SELECT string_agg(g.name, ', ')
        FROM red_carpet_subjects rcs
        LEFT JOIN guests g ON rcs.guest_id = g.id
        WHERE rcs.red_carpet_id = rc.id
      ) || ', ' || rc.subjects_description
    ELSE
      COALESCE(
        (
          SELECT string_agg(g.name, ', ')
          FROM red_carpet_subjects rcs
          LEFT JOIN guests g ON rcs.guest_id = g.id
          WHERE rcs.red_carpet_id = rc.id
        ),
        rc.subjects_description,
        ''
      )
  END AS subjects_display_combined
FROM red_carpets rc
LEFT JOIN venues v ON rc.venue_id = v.id;

COMMENT ON VIEW red_carpets_with_details
  IS 'Red carpets with combined relational and free-text data. Use film_program_display_combined and subjects_display_combined for display.';


-- ============================================================================
-- SPECIAL EVENTS VIEW
-- ============================================================================
CREATE OR REPLACE VIEW special_events_with_details AS
SELECT
  se.*,
  v.name AS venue_name_from_fk,
  v.address AS venue_address_from_fk,
  v.contact_names[1] AS venue_contact_name_from_fk,
  v.contact_phones[1] AS venue_contact_phone_from_fk,
  -- Linked films (from junction table)
  COALESCE(
    (
      SELECT string_agg(
        COALESCE(ff.title, sf.title, sp.program_name, p.title),
        ', '
        ORDER BY COALESCE(ff.title, sf.title, sp.program_name, p.title)
      )
      FROM special_event_films sef
      LEFT JOIN feature_films ff ON sef.film_id = ff.id AND sef.film_type = 'feature'
      LEFT JOIN short_films sf ON sef.film_id = sf.id AND sef.film_type = 'short'
      LEFT JOIN shorts_programs sp ON sef.film_id = sp.id AND sef.film_type = 'shorts_program'
      LEFT JOIN programs p ON sef.film_id = p.id AND sef.film_type = 'program'
      WHERE sef.special_event_id = se.id
    ),
    ''
  ) AS linked_films_display,
  -- Linked guests (from junction table)
  COALESCE(
    (
      SELECT string_agg(g.name, ', ' ORDER BY g.name)
      FROM special_event_guests seg
      LEFT JOIN guests g ON seg.guest_id = g.id
      WHERE seg.special_event_id = se.id
    ),
    ''
  ) AS linked_guests_display,
  -- Combined display: linked films + free text description
  CASE
    WHEN COALESCE(
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
      ''
    ) != '' AND COALESCE(se.film_program_description, '') != ''
    THEN
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
      ) || ', ' || se.film_program_description
    ELSE
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
        se.film_program_description,
        ''
      )
  END AS films_programs_display_combined,
  -- Combined display: linked guests + free text description
  CASE
    WHEN COALESCE(
      (
        SELECT string_agg(g.name, ', ')
        FROM special_event_guests seg
        LEFT JOIN guests g ON seg.guest_id = g.id
        WHERE seg.special_event_id = se.id
      ),
      ''
    ) != '' AND COALESCE(se.guests_description, '') != ''
    THEN
      (
        SELECT string_agg(g.name, ', ')
        FROM special_event_guests seg
        LEFT JOIN guests g ON seg.guest_id = g.id
        WHERE seg.special_event_id = se.id
      ) || ', ' || se.guests_description
    ELSE
      COALESCE(
        (
          SELECT string_agg(g.name, ', ')
          FROM special_event_guests seg
          LEFT JOIN guests g ON seg.guest_id = g.id
          WHERE seg.special_event_id = se.id
        ),
        se.guests_description,
        ''
      )
  END AS guests_display_combined
FROM special_events se
LEFT JOIN venues v ON se.venue_id = v.id;

COMMENT ON VIEW special_events_with_details
  IS 'Special events with combined relational and free-text data. Use films_programs_display_combined and guests_display_combined for display.';


-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  ps_view_exists BOOLEAN;
  rc_view_exists BOOLEAN;
  se_view_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views WHERE table_name = 'photo_shoots_with_details'
  ) INTO ps_view_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.views WHERE table_name = 'red_carpets_with_details'
  ) INTO rc_view_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.views WHERE table_name = 'special_events_with_details'
  ) INTO se_view_exists;

  IF ps_view_exists AND rc_view_exists AND se_view_exists THEN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'PHASE 6 COMPLETE: Views created successfully';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✓ photo_shoots_with_details';
    RAISE NOTICE '✓ red_carpets_with_details';
    RAISE NOTICE '✓ special_events_with_details';
    RAISE NOTICE '';
    RAISE NOTICE 'Each view provides:';
    RAISE NOTICE '  - All original columns from the main table';
    RAISE NOTICE '  - linked_films_display / linked_subjects_display (relational only)';
    RAISE NOTICE '  - film_program_display_combined / subjects_display_combined (hybrid)';
    RAISE NOTICE '  - venue data from foreign key';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready to proceed to Phase 7 (update frontend code).';
    RAISE NOTICE '============================================================================';
  ELSE
    RAISE EXCEPTION 'Failed to create all views';
  END IF;
END $$;

COMMIT;
