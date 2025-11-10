-- ============================================================================
-- VERIFY PHASE 4 RESULTS - Side-by-Side Comparison
-- ============================================================================
-- This shows old data vs new data to verify migration was successful
-- ============================================================================

-- Photo Shoots - Films Comparison
-- ============================================================================
SELECT '=== PHOTO SHOOTS - FILMS COMPARISON ===' as section;

SELECT
  ps.id,
  ps.title as shoot_title,
  ps.film_program_display as OLD_DATA,
  COALESCE(
    string_agg(
      DISTINCT COALESCE(ff.title, sf.title, sp.program_name, p.title),
      ', '
      ORDER BY COALESCE(ff.title, sf.title, sp.program_name, p.title)
    ),
    ''
  ) ||
  CASE
    WHEN ps.film_program_description IS NOT NULL
    THEN CASE
      WHEN EXISTS (SELECT 1 FROM photo_shoot_films WHERE photo_shoot_id = ps.id)
      THEN ' + FREE TEXT: ' || ps.film_program_description
      ELSE 'FREE TEXT: ' || ps.film_program_description
    END
    ELSE ''
  END AS NEW_DATA,
  CASE
    WHEN ps.film_program_display = COALESCE(
      string_agg(
        DISTINCT COALESCE(ff.title, sf.title, sp.program_name, p.title),
        ', '
      ),
      ps.film_program_description,
      ''
    ) THEN '✓ MATCH'
    ELSE '⚠️ REVIEW'
  END as status
FROM photo_shoots ps
LEFT JOIN photo_shoot_films psf ON ps.id = psf.photo_shoot_id
LEFT JOIN feature_films ff ON psf.film_id = ff.id AND psf.film_type = 'feature'
LEFT JOIN short_films sf ON psf.film_id = sf.id AND psf.film_type = 'short'
LEFT JOIN shorts_programs sp ON psf.film_id = sp.id AND psf.film_type = 'shorts_program'
LEFT JOIN programs p ON psf.film_id = p.id AND psf.film_type = 'program'
WHERE ps.film_program_display IS NOT NULL
GROUP BY ps.id, ps.title, ps.film_program_display, ps.film_program_description
ORDER BY ps.title
LIMIT 20;


-- Photo Shoots - Subjects Comparison
-- ============================================================================
SELECT '=== PHOTO SHOOTS - SUBJECTS COMPARISON ===' as section;

SELECT
  ps.id,
  ps.title as shoot_title,
  ps.subjects_display as OLD_DATA,
  COALESCE(
    string_agg(g.name, ', ' ORDER BY g.name),
    ''
  ) ||
  CASE
    WHEN ps.subjects_description IS NOT NULL
    THEN CASE
      WHEN EXISTS (SELECT 1 FROM photo_shoot_subjects WHERE photo_shoot_id = ps.id)
      THEN ' + FREE TEXT: ' || ps.subjects_description
      ELSE 'FREE TEXT: ' || ps.subjects_description
    END
    ELSE ''
  END AS NEW_DATA
FROM photo_shoots ps
LEFT JOIN photo_shoot_subjects pss ON ps.id = pss.photo_shoot_id
LEFT JOIN guests g ON pss.guest_id = g.id
WHERE ps.subjects_display IS NOT NULL
GROUP BY ps.id, ps.title, ps.subjects_display, ps.subjects_description
ORDER BY ps.title
LIMIT 20;


-- Red Carpets - Films Comparison
-- ============================================================================
SELECT '=== RED CARPETS - FILMS COMPARISON ===' as section;

SELECT
  rc.id,
  rc.title as carpet_title,
  rc.film_program_display as OLD_DATA,
  COALESCE(
    string_agg(
      DISTINCT COALESCE(ff.title, sf.title, sp.program_name, p.title),
      ', '
    ),
    ''
  ) ||
  CASE
    WHEN rc.film_program_description IS NOT NULL
    THEN ' + FREE TEXT: ' || rc.film_program_description
    ELSE ''
  END AS NEW_DATA
FROM red_carpets rc
LEFT JOIN red_carpet_films rcf ON rc.id = rcf.red_carpet_id
LEFT JOIN feature_films ff ON rcf.film_id = ff.id AND rcf.film_type = 'feature'
LEFT JOIN short_films sf ON rcf.film_id = sf.id AND rcf.film_type = 'short'
LEFT JOIN shorts_programs sp ON rcf.film_id = sp.id AND rcf.film_type = 'shorts_program'
LEFT JOIN programs p ON rcf.film_id = p.id AND rcf.film_type = 'program'
WHERE rc.film_program_display IS NOT NULL
GROUP BY rc.id, rc.title, rc.film_program_display, rc.film_program_description
ORDER BY rc.title
LIMIT 20;


-- Red Carpets - Subjects Comparison
-- ============================================================================
SELECT '=== RED CARPETS - SUBJECTS COMPARISON ===' as section;

SELECT
  rc.id,
  rc.title as carpet_title,
  rc.subjects_display as OLD_DATA,
  COALESCE(
    string_agg(g.name, ', ' ORDER BY g.name),
    ''
  ) ||
  CASE
    WHEN rc.subjects_description IS NOT NULL
    THEN ' + FREE TEXT: ' || rc.subjects_description
    ELSE ''
  END AS NEW_DATA
FROM red_carpets rc
LEFT JOIN red_carpet_subjects rcs ON rc.id = rcs.red_carpet_id
LEFT JOIN guests g ON rcs.guest_id = g.id
WHERE rc.subjects_display IS NOT NULL
GROUP BY rc.id, rc.title, rc.subjects_display, rc.subjects_description
ORDER BY rc.title
LIMIT 20;


-- Special Events - Films Comparison
-- ============================================================================
SELECT '=== SPECIAL EVENTS - FILMS COMPARISON ===' as section;

SELECT
  se.id,
  se.title as event_title,
  se.films_programs_display as OLD_DATA,
  COALESCE(
    string_agg(
      DISTINCT COALESCE(ff.title, sf.title, sp.program_name, p.title),
      ', '
    ),
    ''
  ) ||
  CASE
    WHEN se.film_program_description IS NOT NULL
    THEN ' + FREE TEXT: ' || se.film_program_description
    ELSE ''
  END AS NEW_DATA
FROM special_events se
LEFT JOIN special_event_films sef ON se.id = sef.special_event_id
LEFT JOIN feature_films ff ON sef.film_id = ff.id AND sef.film_type = 'feature'
LEFT JOIN short_films sf ON sef.film_id = sf.id AND sef.film_type = 'short'
LEFT JOIN shorts_programs sp ON sef.film_id = sp.id AND sef.film_type = 'shorts_program'
LEFT JOIN programs p ON sef.film_id = p.id AND sef.film_type = 'program'
WHERE se.films_programs_display IS NOT NULL
GROUP BY se.id, se.title, se.films_programs_display, se.film_program_description
ORDER BY se.title
LIMIT 20;


-- Special Events - Guests Comparison
-- ============================================================================
SELECT '=== SPECIAL EVENTS - GUESTS COMPARISON ===' as section;

SELECT
  se.id,
  se.title as event_title,
  se.guests_display as OLD_DATA,
  COALESCE(
    string_agg(g.name, ', ' ORDER BY g.name),
    ''
  ) ||
  CASE
    WHEN se.guests_description IS NOT NULL
    THEN ' + FREE TEXT: ' || se.guests_description
    ELSE ''
  END AS NEW_DATA
FROM special_events se
LEFT JOIN special_event_guests seg ON se.id = seg.special_event_id
LEFT JOIN guests g ON seg.guest_id = g.id
WHERE se.guests_display IS NOT NULL
GROUP BY se.id, se.title, se.guests_display, se.guests_description
ORDER BY se.title
LIMIT 20;


-- Summary Statistics
-- ============================================================================
SELECT '=== MIGRATION SUMMARY ===' as section;

SELECT
  'Photo Shoots (Films)' as module,
  COUNT(*) as total_with_data,
  COUNT(DISTINCT psf.photo_shoot_id) as migrated_to_fk,
  COUNT(*) FILTER (WHERE ps.film_program_description IS NOT NULL) as has_free_text
FROM photo_shoots ps
LEFT JOIN photo_shoot_films psf ON ps.id = psf.photo_shoot_id
WHERE ps.film_program_display IS NOT NULL

UNION ALL

SELECT
  'Photo Shoots (Subjects)' as module,
  COUNT(*) as total_with_data,
  COUNT(DISTINCT pss.photo_shoot_id) as migrated_to_fk,
  COUNT(*) FILTER (WHERE ps.subjects_description IS NOT NULL) as has_free_text
FROM photo_shoots ps
LEFT JOIN photo_shoot_subjects pss ON ps.id = pss.photo_shoot_id
WHERE ps.subjects_display IS NOT NULL

UNION ALL

SELECT
  'Red Carpets (Films)' as module,
  COUNT(*) as total_with_data,
  COUNT(DISTINCT rcf.red_carpet_id) as migrated_to_fk,
  COUNT(*) FILTER (WHERE rc.film_program_description IS NOT NULL) as has_free_text
FROM red_carpets rc
LEFT JOIN red_carpet_films rcf ON rc.id = rcf.red_carpet_id
WHERE rc.film_program_display IS NOT NULL

UNION ALL

SELECT
  'Red Carpets (Subjects)' as module,
  COUNT(*) as total_with_data,
  COUNT(DISTINCT rcs.red_carpet_id) as migrated_to_fk,
  COUNT(*) FILTER (WHERE rc.subjects_description IS NOT NULL) as has_free_text
FROM red_carpets rc
LEFT JOIN red_carpet_subjects rcs ON rc.id = rcs.red_carpet_id
WHERE rc.subjects_display IS NOT NULL

UNION ALL

SELECT
  'Special Events (Films)' as module,
  COUNT(*) as total_with_data,
  COUNT(DISTINCT sef.special_event_id) as migrated_to_fk,
  COUNT(*) FILTER (WHERE se.film_program_description IS NOT NULL) as has_free_text
FROM special_events se
LEFT JOIN special_event_films sef ON se.id = sef.special_event_id
WHERE se.films_programs_display IS NOT NULL

UNION ALL

SELECT
  'Special Events (Guests)' as module,
  COUNT(*) as total_with_data,
  COUNT(DISTINCT seg.special_event_id) as migrated_to_fk,
  COUNT(*) FILTER (WHERE se.guests_description IS NOT NULL) as has_free_text
FROM special_events se
LEFT JOIN special_event_guests seg ON se.id = seg.special_event_id
WHERE se.guests_display IS NOT NULL;
