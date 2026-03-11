import { createClient } from '@/lib/supabase/client'

// Tables that use 'festival_year' column for year scoping
const FESTIVAL_YEAR_TABLES = [
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
  'ticketing_screenings',
  'film_contacts',
  'venues',
  'screening_invitations',
  'reports_analytics',
  'guests',
  'guest_films',
  'contacts',
  'theater_houses',
  'interviews'
]

// festival_settings uses 'year' column instead of 'festival_year'
const YEAR_COLUMN_TABLES = ['festival_settings']

export async function archiveFestival(year: number = 2024) {
  const supabase = createClient()

  const tables = [
    'festival_settings',
    ...FESTIVAL_YEAR_TABLES
  ]

  const results = {
    success: true,
    archived: [] as string[],
    failed: [] as string[],
    year: year
  }

  // Archive each table — filtered by year
  for (const table of tables) {
    try {
      let query = supabase.from(table).select('*')

      // Apply year filter based on table type
      if (YEAR_COLUMN_TABLES.includes(table)) {
        query = query.eq('year', year)
      } else if (FESTIVAL_YEAR_TABLES.includes(table)) {
        query = query.eq('festival_year', year)
      }

      const { data, error } = await query

      if (error) throw error

      if (data && data.length > 0) {
        // Insert into archive table
        const archiveTable = `archive_${year}_${table}`
        const { error: insertError } = await supabase
          .from(archiveTable)
          .upsert(data, { onConflict: 'id' })

        if (insertError) {
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
      .eq('year', year)
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

export async function clearFestivalData(year: number) {
  const supabase = createClient()

  // Order matters for foreign key constraints — dependents first
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
    'ticketing_screenings',
    'interviews',
    'guest_films',
    'film_contacts',
    'contacts',
    'theater_houses',
    'feature_films',
    'short_films',
    'programs',
    'guests',
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

  // Clear each table filtered by year
  for (const table of tables) {
    try {
      let query = supabase.from(table).delete()

      if (YEAR_COLUMN_TABLES.includes(table)) {
        query = query.eq('year', year)
      } else {
        query = query.eq('festival_year', year)
      }

      const { error } = await query

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
