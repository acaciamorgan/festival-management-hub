CREATE TABLE event_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'gray',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_event_types_sort ON event_types(sort_order);

INSERT INTO event_types (name, color, sort_order) VALUES
('Reception', 'blue', 1),
('Mixer', 'green', 2),
('Party', 'pink', 3),
('Awards', 'yellow', 4),
('Media Filing', 'orange', 5),
('Other', 'gray', 6);
