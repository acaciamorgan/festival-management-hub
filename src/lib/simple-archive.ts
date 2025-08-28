import { createClient } from '@/lib/supabase/client'

export async function archiveFestival(year: number = 2024) {
  const supabase = createClient()
  
  const tables = [
    'festival_settings',
    'feature_films',
    'short_films',
    'programs',
    'press',
    'press_journalists',
    'press_screenings',
    'press_requests',
    'screener_access',
    'photo_shoots',
    'red_carpets',
    'special_events',
    'published_screenings',
    'pi_jury_screenings',
    'tech_check_screenings',
    'film_contacts',
    'venues',
    'screening_invitations',
    'reports_analytics'
  ]

  const results = {
    success: true,
    archived: [] as string[],
    failed: [] as string[],
    year: year
  }

  // Archive each table
  for (const table of tables) {
    try {
      // Get all data from current table
      const { data, error } = await supabase
        .from(table)
        .select('*')
      
      if (error) throw error
      
      if (data && data.length > 0) {
        // Insert into archive table
        const archiveTable = `archive_${year}_${table}`
        const { error: insertError } = await supabase
          .from(archiveTable)
          .upsert(data, { onConflict: 'id' })
        
        if (insertError) {
          // If table doesn't exist, we'll note it but continue
          console.error(`Failed to archive ${table}:`, insertError)
          results.failed.push(table)
        } else {
          results.archived.push(table)
        }
      }
    } catch (err) {
      console.error(`Error archiving ${table}:`, err)
      results.failed.push(table)
    }
  }

  // Update archive registry
  try {
    const { data: settings } = await supabase
      .from('festival_settings')
      .select('*')
      .single()

    if (settings) {
      await supabase
        .from('archive_registry')
        .upsert({
          year: year,
          festival_name: settings.festival_name,
          edition: settings.edition_number + 'th',
          start_date: settings.start_date,
          end_date: settings.end_date,
          archived_at: new Date().toISOString()
        })
    }
  } catch (err) {
    console.error('Error updating registry:', err)
  }

  results.success = results.failed.length === 0
  return results
}

export async function clearFestivalData() {
  const supabase = createClient()
  
  const tables = [
    'press_requests',
    'screening_invitations',
    'screener_access',
    'photo_shoots',
    'red_carpets',
    'special_events',
    'press_screenings',
    'published_screenings',
    'pi_jury_screenings',
    'tech_check_screenings',
    'film_contacts',
    'feature_films',
    'short_films',
    'programs',
    'press',
    'press_journalists',
    'venues',
    'reports_analytics',
    'festival_settings'
  ]

  const results = {
    success: true,
    cleared: [] as string[],
    failed: [] as string[]
  }

  // Clear each table (in order to handle foreign keys)
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows
      
      if (error) throw error
      results.cleared.push(table)
    } catch (err) {
      console.error(`Error clearing ${table}:`, err)
      results.failed.push(table)
    }
  }

  results.success = results.failed.length === 0
  return results
}

export async function getArchivedYears() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('archive_registry')
    .select('*')
    .order('year', { ascending: false })
  
  if (error) {
    console.error('Error fetching archive registry:', error)
    return []
  }
  
  return data || []
}