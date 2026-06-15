CREATE TABLE IF NOT EXISTS field_changes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    field_name TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    festival_year INTEGER NOT NULL
);

CREATE INDEX idx_field_changes_lookup ON field_changes (table_name, record_id, changed_at);
CREATE INDEX idx_field_changes_cleanup ON field_changes (changed_at);

ALTER TABLE field_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for all users on field_changes" ON field_changes FOR ALL USING (true);
