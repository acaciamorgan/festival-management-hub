# Manual Table Creation Required

The `screening_board_settings` table needs to be created manually in your Supabase database.

## Option 1: Use Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Run the following SQL:

```sql
-- Create screening_board_settings table for storing global view settings
CREATE TABLE IF NOT EXISTS screening_board_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create a unique constraint to ensure only one settings row exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_screening_board_single_row
ON screening_board_settings ((true));

-- Grant necessary permissions (no RLS)
GRANT ALL ON screening_board_settings TO authenticated;
GRANT ALL ON screening_board_settings TO anon;
```

## Option 2: Use the SQL file created

The SQL has been saved to: `/Users/morganharris/Film Festival/create-screening-board-settings.sql`

You can execute it using your preferred database tool.

## After Creating the Table

Once the table is created, the Ticketing module will:
1. Save view settings globally when an admin clicks "Apply View Settings"
2. Load saved settings automatically when the page loads
3. Use Program 1 as the primary program for color coding

The implementation is complete and ready to use once the table exists.