BEGIN;

UPDATE short_films
SET shorts_program_id = '66585f34-8791-4149-a222-755ac79f860e'
WHERE shorts_program_id = '4a8a56c9-a4c4-46d0-8fca-d258a012beec';

UPDATE short_films
SET shorts_program_id = '04afc756-7109-4906-95ee-6d14eff9b3fb'
WHERE shorts_program_id = '3e6f9eb1-458f-41ab-9b1d-689d67168dd6';

UPDATE short_films
SET shorts_program_id = '18da8f27-7a92-447f-bfe8-9bc138ae4d3e'
WHERE shorts_program_id IN (
  '4edc6208-ad4f-43f3-85de-6e21bbf04605',
  'b2c6d447-0f3a-4542-9fa3-d16f3042211a'
);

UPDATE short_films
SET shorts_program_id = '9903cf1b-2b1c-4a52-9762-1ae78ae09156'
WHERE shorts_program_id = 'cd5b759f-47e5-4914-9eb3-55443c346d3f';

UPDATE short_films
SET shorts_program_id = '9b8a06c9-bfd5-4ef4-9b26-f817d9bc0754'
WHERE shorts_program_id = 'ed98eaa8-8c4e-4729-8c42-7a4f78970701';

UPDATE short_films
SET shorts_program_id = '8ebd31a1-fda0-4efe-9f05-3a3309bf2e9b'
WHERE shorts_program_id = 'da2a8719-9c7b-49b2-be09-175f38bcc67b';

UPDATE short_films
SET shorts_program_id = 'e01beb5d-30d2-4cbd-b5fc-183965838f15'
WHERE shorts_program_id = '3c1733c0-f3bb-4cad-ba4b-b5df0e6a7a75';

DELETE FROM shorts_programs
WHERE festival_year = 2026
  AND id NOT IN (
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
  );

ALTER TABLE shorts_programs
  ADD CONSTRAINT uq_shorts_programs_name_year UNIQUE (program_name, festival_year);

COMMIT;
