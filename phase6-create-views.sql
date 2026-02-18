BEGIN;

DROP VIEW IF EXISTS photo_shoots_with_details CASCADE;
DROP VIEW IF EXISTS red_carpets_with_details CASCADE;
DROP VIEW IF EXISTS special_events_with_details CASCADE;

CREATE VIEW photo_shoots_with_details AS
SELECT
  ps.*,
  v.name AS venue_name_from_fk,
  v.address AS venue_address_from_fk,
  COALESCE(
    (
      SELECT string_agg(
        COALESCE(ff.title, sf.title, sp.program_name, p.title),
        ' || '
        ORDER BY COALESCE(ff.title, sf.title, sp.program_name, p.title)
      )
      FROM photo_shoot_films psf
      LEFT JOIN feature_films ff ON psf.film_id = ff.id AND psf.film_type = 'feature' AND ff.festival_year = ps.festival_year
      LEFT JOIN short_films sf ON psf.film_id = sf.id AND psf.film_type = 'short' AND sf.festival_year = ps.festival_year
      LEFT JOIN shorts_programs sp ON psf.film_id = sp.id AND psf.film_type = 'shorts_program' AND sp.festival_year = ps.festival_year
      LEFT JOIN programs p ON psf.film_id = p.id AND psf.film_type = 'program' AND p.festival_year = ps.festival_year
      WHERE psf.photo_shoot_id = ps.id
    ),
    ''
  ) AS linked_films_display,
  COALESCE(
    (
      SELECT string_agg(g.name, ', ' ORDER BY g.name)
      FROM photo_shoot_subjects pss
      LEFT JOIN guests g ON pss.guest_id = g.id AND g.festival_year = ps.festival_year
      WHERE pss.photo_shoot_id = ps.id
    ),
    ''
  ) AS linked_subjects_display,
  CASE
    WHEN COALESCE(
      (
        SELECT string_agg(
          COALESCE(ff.title, sf.title, sp.program_name, p.title),
          ' || '
        )
        FROM photo_shoot_films psf
        LEFT JOIN feature_films ff ON psf.film_id = ff.id AND psf.film_type = 'feature' AND ff.festival_year = ps.festival_year
        LEFT JOIN short_films sf ON psf.film_id = sf.id AND psf.film_type = 'short' AND sf.festival_year = ps.festival_year
        LEFT JOIN shorts_programs sp ON psf.film_id = sp.id AND psf.film_type = 'shorts_program' AND sp.festival_year = ps.festival_year
        LEFT JOIN programs p ON psf.film_id = p.id AND psf.film_type = 'program' AND p.festival_year = ps.festival_year
        WHERE psf.photo_shoot_id = ps.id
      ),
      ''
    ) != '' AND COALESCE(ps.film_program_description, '') != ''
    THEN
      (
        SELECT string_agg(
          COALESCE(ff.title, sf.title, sp.program_name, p.title),
          ' || '
        )
        FROM photo_shoot_films psf
        LEFT JOIN feature_films ff ON psf.film_id = ff.id AND psf.film_type = 'feature' AND ff.festival_year = ps.festival_year
        LEFT JOIN short_films sf ON psf.film_id = sf.id AND psf.film_type = 'short' AND sf.festival_year = ps.festival_year
        LEFT JOIN shorts_programs sp ON psf.film_id = sp.id AND psf.film_type = 'shorts_program' AND sp.festival_year = ps.festival_year
        LEFT JOIN programs p ON psf.film_id = p.id AND psf.film_type = 'program' AND p.festival_year = ps.festival_year
        WHERE psf.photo_shoot_id = ps.id
      ) || ' || ' || ps.film_program_description
    ELSE
      COALESCE(
        (
          SELECT string_agg(
            COALESCE(ff.title, sf.title, sp.program_name, p.title),
            ' || '
          )
          FROM photo_shoot_films psf
          LEFT JOIN feature_films ff ON psf.film_id = ff.id AND psf.film_type = 'feature' AND ff.festival_year = ps.festival_year
          LEFT JOIN short_films sf ON psf.film_id = sf.id AND psf.film_type = 'short' AND sf.festival_year = ps.festival_year
          LEFT JOIN shorts_programs sp ON psf.film_id = sp.id AND psf.film_type = 'shorts_program' AND sp.festival_year = ps.festival_year
          LEFT JOIN programs p ON psf.film_id = p.id AND psf.film_type = 'program' AND p.festival_year = ps.festival_year
          WHERE psf.photo_shoot_id = ps.id
        ),
        ps.film_program_description,
        ''
      )
  END AS film_program_display_combined,
  CASE
    WHEN COALESCE(
      (
        SELECT string_agg(g.name, ', ')
        FROM photo_shoot_subjects pss
        LEFT JOIN guests g ON pss.guest_id = g.id AND g.festival_year = ps.festival_year
        WHERE pss.photo_shoot_id = ps.id
      ),
      ''
    ) != '' AND COALESCE(ps.subjects_description, '') != ''
    THEN
      (
        SELECT string_agg(g.name, ', ')
        FROM photo_shoot_subjects pss
        LEFT JOIN guests g ON pss.guest_id = g.id AND g.festival_year = ps.festival_year
        WHERE pss.photo_shoot_id = ps.id
      ) || ', ' || ps.subjects_description
    ELSE
      COALESCE(
        (
          SELECT string_agg(g.name, ', ')
          FROM photo_shoot_subjects pss
          LEFT JOIN guests g ON pss.guest_id = g.id AND g.festival_year = ps.festival_year
          WHERE pss.photo_shoot_id = ps.id
        ),
        ps.subjects_description,
        ''
      )
  END AS subjects_display_combined
FROM photo_shoots ps
LEFT JOIN venues v ON ps.venue_id = v.id;

CREATE VIEW red_carpets_with_details AS
SELECT
  rc.*,
  v.name AS venue_name_from_fk,
  v.address AS venue_address_from_fk,
  COALESCE(
    (
      SELECT string_agg(
        COALESCE(ff.title, sf.title, sp.program_name, p.title),
        ' || '
        ORDER BY COALESCE(ff.title, sf.title, sp.program_name, p.title)
      )
      FROM red_carpet_films rcf
      LEFT JOIN feature_films ff ON rcf.film_id = ff.id AND rcf.film_type = 'feature' AND ff.festival_year = rc.festival_year
      LEFT JOIN short_films sf ON rcf.film_id = sf.id AND rcf.film_type = 'short' AND sf.festival_year = rc.festival_year
      LEFT JOIN shorts_programs sp ON rcf.film_id = sp.id AND rcf.film_type = 'shorts_program' AND sp.festival_year = rc.festival_year
      LEFT JOIN programs p ON rcf.film_id = p.id AND rcf.film_type = 'program' AND p.festival_year = rc.festival_year
      WHERE rcf.red_carpet_id = rc.id
    ),
    ''
  ) AS linked_films_display,
  COALESCE(
    (
      SELECT string_agg(g.name, ', ' ORDER BY g.name)
      FROM red_carpet_subjects rcs
      LEFT JOIN guests g ON rcs.guest_id = g.id AND g.festival_year = rc.festival_year
      WHERE rcs.red_carpet_id = rc.id
    ),
    ''
  ) AS linked_subjects_display,
  CASE
    WHEN COALESCE(
      (
        SELECT string_agg(
          COALESCE(ff.title, sf.title, sp.program_name, p.title),
          ' || '
        )
        FROM red_carpet_films rcf
        LEFT JOIN feature_films ff ON rcf.film_id = ff.id AND rcf.film_type = 'feature' AND ff.festival_year = rc.festival_year
        LEFT JOIN short_films sf ON rcf.film_id = sf.id AND rcf.film_type = 'short' AND sf.festival_year = rc.festival_year
        LEFT JOIN shorts_programs sp ON rcf.film_id = sp.id AND rcf.film_type = 'shorts_program' AND sp.festival_year = rc.festival_year
        LEFT JOIN programs p ON rcf.film_id = p.id AND rcf.film_type = 'program' AND p.festival_year = rc.festival_year
        WHERE rcf.red_carpet_id = rc.id
      ),
      ''
    ) != '' AND COALESCE(rc.film_program_description, '') != ''
    THEN
      (
        SELECT string_agg(
          COALESCE(ff.title, sf.title, sp.program_name, p.title),
          ' || '
        )
        FROM red_carpet_films rcf
        LEFT JOIN feature_films ff ON rcf.film_id = ff.id AND rcf.film_type = 'feature' AND ff.festival_year = rc.festival_year
        LEFT JOIN short_films sf ON rcf.film_id = sf.id AND rcf.film_type = 'short' AND sf.festival_year = rc.festival_year
        LEFT JOIN shorts_programs sp ON rcf.film_id = sp.id AND rcf.film_type = 'shorts_program' AND sp.festival_year = rc.festival_year
        LEFT JOIN programs p ON rcf.film_id = p.id AND rcf.film_type = 'program' AND p.festival_year = rc.festival_year
        WHERE rcf.red_carpet_id = rc.id
      ) || ' || ' || rc.film_program_description
    ELSE
      COALESCE(
        (
          SELECT string_agg(
            COALESCE(ff.title, sf.title, sp.program_name, p.title),
            ' || '
          )
          FROM red_carpet_films rcf
          LEFT JOIN feature_films ff ON rcf.film_id = ff.id AND rcf.film_type = 'feature' AND ff.festival_year = rc.festival_year
          LEFT JOIN short_films sf ON rcf.film_id = sf.id AND rcf.film_type = 'short' AND sf.festival_year = rc.festival_year
          LEFT JOIN shorts_programs sp ON rcf.film_id = sp.id AND rcf.film_type = 'shorts_program' AND sp.festival_year = rc.festival_year
          LEFT JOIN programs p ON rcf.film_id = p.id AND rcf.film_type = 'program' AND p.festival_year = rc.festival_year
          WHERE rcf.red_carpet_id = rc.id
        ),
        rc.film_program_description,
        ''
      )
  END AS film_program_display_combined,
  CASE
    WHEN COALESCE(
      (
        SELECT string_agg(g.name, ', ')
        FROM red_carpet_subjects rcs
        LEFT JOIN guests g ON rcs.guest_id = g.id AND g.festival_year = rc.festival_year
        WHERE rcs.red_carpet_id = rc.id
      ),
      ''
    ) != '' AND COALESCE(rc.subjects_description, '') != ''
    THEN
      (
        SELECT string_agg(g.name, ', ')
        FROM red_carpet_subjects rcs
        LEFT JOIN guests g ON rcs.guest_id = g.id AND g.festival_year = rc.festival_year
        WHERE rcs.red_carpet_id = rc.id
      ) || ', ' || rc.subjects_description
    ELSE
      COALESCE(
        (
          SELECT string_agg(g.name, ', ')
          FROM red_carpet_subjects rcs
          LEFT JOIN guests g ON rcs.guest_id = g.id AND g.festival_year = rc.festival_year
          WHERE rcs.red_carpet_id = rc.id
        ),
        rc.subjects_description,
        ''
      )
  END AS subjects_display_combined
FROM red_carpets rc
LEFT JOIN venues v ON rc.venue_id = v.id;

CREATE VIEW special_events_with_details AS
SELECT
  se.*,
  v.name AS venue_name_from_fk,
  v.address AS venue_address_from_fk,
  v.contact_names[1] AS venue_contact_name_from_fk,
  v.contact_phones[1] AS venue_contact_phone_from_fk,
  COALESCE(
    (
      SELECT string_agg(
        COALESCE(ff.title, sf.title, sp.program_name, p.title),
        ' || '
        ORDER BY COALESCE(ff.title, sf.title, sp.program_name, p.title)
      )
      FROM special_event_films sef
      LEFT JOIN feature_films ff ON sef.film_id = ff.id AND sef.film_type = 'feature' AND ff.festival_year = se.festival_year
      LEFT JOIN short_films sf ON sef.film_id = sf.id AND sef.film_type = 'short' AND sf.festival_year = se.festival_year
      LEFT JOIN shorts_programs sp ON sef.film_id = sp.id AND sef.film_type = 'shorts_program' AND sp.festival_year = se.festival_year
      LEFT JOIN programs p ON sef.film_id = p.id AND sef.film_type = 'program' AND p.festival_year = se.festival_year
      WHERE sef.special_event_id = se.id
    ),
    ''
  ) AS linked_films_display,
  COALESCE(
    (
      SELECT string_agg(g.name, ', ' ORDER BY g.name)
      FROM special_event_guests seg
      LEFT JOIN guests g ON seg.guest_id = g.id AND g.festival_year = se.festival_year
      WHERE seg.special_event_id = se.id
    ),
    ''
  ) AS linked_guests_display,
  CASE
    WHEN COALESCE(
      (
        SELECT string_agg(
          COALESCE(ff.title, sf.title, sp.program_name, p.title),
          ' || '
        )
        FROM special_event_films sef
        LEFT JOIN feature_films ff ON sef.film_id = ff.id AND sef.film_type = 'feature' AND ff.festival_year = se.festival_year
        LEFT JOIN short_films sf ON sef.film_id = sf.id AND sef.film_type = 'short' AND sf.festival_year = se.festival_year
        LEFT JOIN shorts_programs sp ON sef.film_id = sp.id AND sef.film_type = 'shorts_program' AND sp.festival_year = se.festival_year
        LEFT JOIN programs p ON sef.film_id = p.id AND sef.film_type = 'program' AND p.festival_year = se.festival_year
        WHERE sef.special_event_id = se.id
      ),
      ''
    ) != '' AND COALESCE(se.film_program_description, '') != ''
    THEN
      (
        SELECT string_agg(
          COALESCE(ff.title, sf.title, sp.program_name, p.title),
          ' || '
        )
        FROM special_event_films sef
        LEFT JOIN feature_films ff ON sef.film_id = ff.id AND sef.film_type = 'feature' AND ff.festival_year = se.festival_year
        LEFT JOIN short_films sf ON sef.film_id = sf.id AND sef.film_type = 'short' AND sf.festival_year = se.festival_year
        LEFT JOIN shorts_programs sp ON sef.film_id = sp.id AND sef.film_type = 'shorts_program' AND sp.festival_year = se.festival_year
        LEFT JOIN programs p ON sef.film_id = p.id AND sef.film_type = 'program' AND p.festival_year = se.festival_year
        WHERE sef.special_event_id = se.id
      ) || ' || ' || se.film_program_description
    ELSE
      COALESCE(
        (
          SELECT string_agg(
            COALESCE(ff.title, sf.title, sp.program_name, p.title),
            ' || '
          )
          FROM special_event_films sef
          LEFT JOIN feature_films ff ON sef.film_id = ff.id AND sef.film_type = 'feature' AND ff.festival_year = se.festival_year
          LEFT JOIN short_films sf ON sef.film_id = sf.id AND sef.film_type = 'short' AND sf.festival_year = se.festival_year
          LEFT JOIN shorts_programs sp ON sef.film_id = sp.id AND sef.film_type = 'shorts_program' AND sp.festival_year = se.festival_year
          LEFT JOIN programs p ON sef.film_id = p.id AND sef.film_type = 'program' AND p.festival_year = se.festival_year
          WHERE sef.special_event_id = se.id
        ),
        se.film_program_description,
        ''
      )
  END AS films_programs_display_combined,
  CASE
    WHEN COALESCE(
      (
        SELECT string_agg(g.name, ', ')
        FROM special_event_guests seg
        LEFT JOIN guests g ON seg.guest_id = g.id AND g.festival_year = se.festival_year
        WHERE seg.special_event_id = se.id
      ),
      ''
    ) != '' AND COALESCE(se.guests_description, '') != ''
    THEN
      (
        SELECT string_agg(g.name, ', ')
        FROM special_event_guests seg
        LEFT JOIN guests g ON seg.guest_id = g.id AND g.festival_year = se.festival_year
        WHERE seg.special_event_id = se.id
      ) || ', ' || se.guests_description
    ELSE
      COALESCE(
        (
          SELECT string_agg(g.name, ', ')
          FROM special_event_guests seg
          LEFT JOIN guests g ON seg.guest_id = g.id AND g.festival_year = se.festival_year
          WHERE seg.special_event_id = se.id
        ),
        se.guests_description,
        ''
      )
  END AS guests_display_combined
FROM special_events se
LEFT JOIN venues v ON se.venue_id = v.id;

COMMIT;
