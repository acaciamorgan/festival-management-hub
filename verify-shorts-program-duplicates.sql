SELECT '=== STEP 1: short_films FK refs pointing at DUPLICATE program IDs ===' AS info

SELECT
  sf.id AS short_film_id,
  sf.title AS short_film_title,
  sf.shorts_program_id AS current_program_id,
  sp_current.program_name AS current_program_name,
  sp_current.program_number AS current_program_number,
  CASE sf.shorts_program_id
    WHEN '4a8a56c9-a4c4-46d0-8fca-d258a012beec' THEN '66585f34-8791-4149-a222-755ac79f860e'
    WHEN '3e6f9eb1-458f-41ab-9b1d-689d67168dd6' THEN '04afc756-7109-4906-95ee-6d14eff9b3fb'
    WHEN '4edc6208-ad4f-43f3-85de-6e21bbf04605' THEN '18da8f27-7a92-447f-bfe8-9bc138ae4d3e'
    WHEN 'b2c6d447-0f3a-4542-9fa3-d16f3042211a' THEN '18da8f27-7a92-447f-bfe8-9bc138ae4d3e'
    WHEN 'cd5b759f-47e5-4914-9eb3-55443c346d3f' THEN '9903cf1b-2b1c-4a52-9762-1ae78ae09156'
    WHEN 'ed98eaa8-8c4e-4729-8c42-7a4f78970701' THEN '9b8a06c9-bfd5-4ef4-9b26-f817d9bc0754'
    WHEN 'da2a8719-9c7b-49b2-be09-175f38bcc67b' THEN '8ebd31a1-fda0-4efe-9f05-3a3309bf2e9b'
    WHEN '3c1733c0-f3bb-4cad-ba4b-b5df0e6a7a75' THEN 'e01beb5d-30d2-4cbd-b5fc-183965838f15'
  END AS would_change_to,
  sp_target.program_name AS target_program_name
FROM short_films sf
JOIN shorts_programs sp_current ON sp_current.id = sf.shorts_program_id
LEFT JOIN shorts_programs sp_target ON sp_target.id = CASE sf.shorts_program_id
    WHEN '4a8a56c9-a4c4-46d0-8fca-d258a012beec' THEN '66585f34-8791-4149-a222-755ac79f860e'::uuid
    WHEN '3e6f9eb1-458f-41ab-9b1d-689d67168dd6' THEN '04afc756-7109-4906-95ee-6d14eff9b3fb'::uuid
    WHEN '4edc6208-ad4f-43f3-85de-6e21bbf04605' THEN '18da8f27-7a92-447f-bfe8-9bc138ae4d3e'::uuid
    WHEN 'b2c6d447-0f3a-4542-9fa3-d16f3042211a' THEN '18da8f27-7a92-447f-bfe8-9bc138ae4d3e'::uuid
    WHEN 'cd5b759f-47e5-4914-9eb3-55443c346d3f' THEN '9903cf1b-2b1c-4a52-9762-1ae78ae09156'::uuid
    WHEN 'ed98eaa8-8c4e-4729-8c42-7a4f78970701' THEN '9b8a06c9-bfd5-4ef4-9b26-f817d9bc0754'::uuid
    WHEN 'da2a8719-9c7b-49b2-be09-175f38bcc67b' THEN '8ebd31a1-fda0-4efe-9f05-3a3309bf2e9b'::uuid
    WHEN '3c1733c0-f3bb-4cad-ba4b-b5df0e6a7a75' THEN 'e01beb5d-30d2-4cbd-b5fc-183965838f15'::uuid
  END
WHERE sf.shorts_program_id IN (
  '4a8a56c9-a4c4-46d0-8fca-d258a012beec',
  '3e6f9eb1-458f-41ab-9b1d-689d67168dd6',
  '4edc6208-ad4f-43f3-85de-6e21bbf04605',
  'b2c6d447-0f3a-4542-9fa3-d16f3042211a',
  'cd5b759f-47e5-4914-9eb3-55443c346d3f',
  'ed98eaa8-8c4e-4729-8c42-7a4f78970701',
  'da2a8719-9c7b-49b2-be09-175f38bcc67b',
  '3c1733c0-f3bb-4cad-ba4b-b5df0e6a7a75'
)
ORDER BY sp_current.program_name, sf.title;


SELECT '=== STEP 2: 17 duplicate shorts_programs rows that would be DELETED ===' AS info

SELECT sp.id, sp.program_name, sp.program_number, sp.festival_year,
  (SELECT COUNT(*) FROM short_film_programs sfp WHERE sfp.shorts_program_id = sp.id) AS junction_refs,
  (SELECT COUNT(*) FROM short_films sf WHERE sf.shorts_program_id = sp.id) AS fk_refs,
  (SELECT COUNT(*) FROM screener_access sa WHERE sa.film_id = sp.id) AS screener_refs
FROM shorts_programs sp
WHERE sp.festival_year = 2026
  AND sp.id NOT IN (
    '83923a9d-574a-4f3b-b312-3c7be0259023',
    '864438b5-c40b-44ad-97b6-24eadb33133d',
    '78b9f972-b445-438f-bef8-bff3d802197d',
    '04afc756-7109-4906-95ee-6d14eff9b3fb',
    '18da8f27-7a92-447f-bfe8-9bc138ae4d3e',
    '9903cf1b-2b1c-4a52-9762-1ae78ae09156',
    '9b8a06c9-bfd5-4ef4-9b26-f817d9bc0754',
    '8ebd31a1-fda0-4efe-9f05-3a3309bf2e9b',
    '0400c968-16b1-4588-8d86-28e90fe56343',
    '66585f34-8791-4149-a222-755ac79f860e',
    'e01beb5d-30d2-4cbd-b5fc-183965838f15'
  )
ORDER BY sp.program_name;
