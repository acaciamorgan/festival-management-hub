import { createClient } from '@/lib/supabase/client'

export interface ScreeningBoardSettings {
  selectedVenues: string[]
  venueOrder: string[]
  programSettings: Record<string, { enabled: boolean; color: string }>
}

export async function loadScreeningBoardSettings(): Promise<ScreeningBoardSettings | null> {
  const supabase = createClient()

  try {
    // First try to get existing settings
    const { data, error } = await supabase
      .from('screening_board_settings')
      .select('setting_value')
      .maybeSingle()

    if (error) {
      // Table might not exist yet, or no settings saved
      return null
    }

    return data?.setting_value as ScreeningBoardSettings
  } catch (error) {
    console.error('Error loading screening board settings:', error)
    return null
  }
}

export async function saveScreeningBoardSettings(settings: ScreeningBoardSettings, userId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    // First check if table exists by trying to select from it
    const { error: checkError } = await supabase
      .from('screening_board_settings')
      .select('id')
      .limit(1)

    if (checkError && checkError.message.includes('relation')) {
      // Table doesn't exist, create it
      await createSettingsTable()
    }

    // Try to get existing record
    const { data: existing } = await supabase
      .from('screening_board_settings')
      .select('id')
      .maybeSingle()

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('screening_board_settings')
        .update({
          setting_value: settings,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating screening board settings:', error)
        return false
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from('screening_board_settings')
        .insert({
          setting_value: settings,
          updated_by: userId
        })

      if (error) {
        console.error('Error inserting screening board settings:', error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error saving screening board settings:', error)
    return false
  }
}

// Helper function to create the table if it doesn't exist
async function createSettingsTable() {
  const supabase = createClient()

  try {
    // Use raw SQL to create table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS screening_board_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          setting_value JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW(),
          updated_by UUID REFERENCES auth.users(id)
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_screening_board_single_row
        ON screening_board_settings ((true));
      `
    })

    if (error) {
      // Table might already exist or needs manual creation
    }
  } catch (error) {
    // Table creation failed, may need manual creation
  }
}