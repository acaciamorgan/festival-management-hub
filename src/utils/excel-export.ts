import { utils, writeFile, WorkBook, WorkSheet } from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/client'

interface ExportOptions {
  includeArchived?: boolean
  festivalYear?: number
}

// Type definitions for each module's data
interface FeatureFilm {
  title: string
  director: string
  producer: string
  year: number
  runtime: number
  countries: string
  language: string
  color_or_bw: string
  synopsis: string
  program_designation: string
}

interface ShortFilm {
  title: string
  director: string
  producer: string
  year: number
  runtime: number
  countries: string
  language: string
  shorts_program_name: string
  synopsis: string
}

interface Program {
  title: string
  description: string
  program_type: string
}

interface Press {
  name: string
  media_outlet: string
  email: string
  phone: string
  website: string
  bio: string
}

interface PressScreening {
  film_title: string
  screening_date: string
  start_time: string
  end_time: string
  venue: string
  capacity: number
  notes: string
}

interface ScreenerAccess {
  film_title: string
  access_type: string
}

interface PressRequest {
  requester_name: string
  requester_outlet: string
  requester_email: string
  request_type: string
  film_titles: string
  status: string
  created_at: string
}

interface PhotoShoot {
  film_title: string
  talent_names: string
  photographer: string
  shoot_date: string
  shoot_time: string
  location: string
  duration_minutes: number
  status: string
}

interface InAttendance {
  name: string
  film_association: string
  role: string
  arrival_date: string
  departure_date: string
  accommodation: string
  contact_email: string
}

interface RedCarpet {
  event_name: string
  film_title: string
  event_date: string
  event_time: string
  venue: string
  talent_names: string
  photographers: string
}

interface SpecialEvent {
  event_name: string
  event_type: string
  event_date: string
  start_time: string
  end_time: string
  venue: string
  capacity: number
  description: string
  organizer: string
}

interface Screening {
  film_title: string
  screening_date: string
  start_time: string
  venue_short_code: string
  run_time: number
  capacity: number
  screening_type?: string
  tickets_sold?: number
  ticket_price?: number
}

export async function exportFestivalToExcel(options: ExportOptions = {}) {
  const supabase = createClient()
  const workbook: WorkBook = utils.book_new()

  try {
    console.log('Starting export...')

    // Get festival year - prefer parameter, fallback to localStorage
    let festivalYear = options.festivalYear
    if (!festivalYear && typeof window !== 'undefined') {
      const stored = localStorage.getItem('festival_selected_year')
      if (stored) {
        festivalYear = parseInt(stored)
      }
    }
    if (!festivalYear) {
      festivalYear = 2025 // Last resort fallback
    }

    // Get festival info for the specified year
    const { data: festivalSettings, error: settingsError } = await supabase
      .from('festival_settings')
      .select('*')
      .eq('year', festivalYear)
      .single()

    console.log('Festival settings:', settingsError ? 'ERROR: ' + settingsError.message : 'SUCCESS')

    if (settingsError) {
      throw new Error('Could not fetch festival settings: ' + settingsError.message)
    }

    const festivalName = festivalSettings?.festival_name || 'Film Festival'
    const edition = festivalSettings?.edition_number || ''
    const startDate = festivalSettings?.start_date || ''
    const endDate = festivalSettings?.end_date || ''
    
    // Helper function to create styled worksheet
    const createStyledWorksheet = (data: any[], sheetName: string): WorkSheet => {
      if (!data || data.length === 0) {
        const emptySheet = utils.aoa_to_sheet([['No data available']])
        return emptySheet
      }
      
      const worksheet = utils.json_to_sheet(data)
      
      // Get range to apply styling
      const range = utils.decode_range(worksheet['!ref'] || 'A1')
      
      // Style headers
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = utils.encode_cell({ r: 0, c: col })
        if (!worksheet[cellAddress]) continue
        
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4F46E5' } }, // Indigo background
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        }
      }
      
      // Auto-size columns
      const colWidths = []
      for (let col = range.s.c; col <= range.e.c; col++) {
        let maxWidth = 10
        for (let row = range.s.r; row <= range.e.r; row++) {
          const cellAddress = utils.encode_cell({ r: row, c: col })
          if (worksheet[cellAddress] && worksheet[cellAddress].v) {
            const cellLength = worksheet[cellAddress].v.toString().length
            if (cellLength > maxWidth) maxWidth = cellLength
          }
        }
        colWidths.push({ width: Math.min(maxWidth + 2, 50) })
      }
      worksheet['!cols'] = colWidths
      
      return worksheet
    }
    
    // 1. Feature Films
    console.log('Exporting Feature Films...')
    const { data: featureFilms, error: featuresError } = await supabase
      .from('feature_films')
      .select('*')
      .order('title')
    
    console.log('Feature films:', featuresError ? 'ERROR: ' + featuresError.message : `SUCCESS: ${featureFilms?.length || 0} records`)
    
    const featureFilmsSheet = createStyledWorksheet(featureFilms || [], 'Feature Films')
    utils.book_append_sheet(workbook, featureFilmsSheet, 'Feature Films')
    console.log('Feature films sheet added to workbook')
    
    // 2. Short Films with Program Name Enrichment
    console.log('Exporting Short Films...')
    
    // First load shorts programs for enrichment
    let shortsPrograms: Record<string, string> = {}
    const { data: shortsProgramList } = await supabase
      .from('shorts_programs')
      .select('id, program_name')
    
    if (shortsProgramList) {
      shortsProgramList.forEach(program => {
        shortsPrograms[program.id] = program.program_name || 'Unknown Program'
      })
    }
    
    const { data: shortFilmsRaw, error: shortError } = await supabase
      .from('short_films')
      .select('*')
      .order('title')
    
    console.log('Short films:', shortError ? 'ERROR: ' + shortError.message : `SUCCESS: ${shortFilmsRaw?.length || 0} records`)
    
    // Enrich shorts data with program names - insert after shorts_program_id
    const shortFilms = shortFilmsRaw?.map(short => {
      const enriched: any = {}
      Object.keys(short).forEach(key => {
        enriched[key] = short[key]
        // Insert the program name right after shorts_program_id
        if (key === 'shorts_program_id') {
          enriched['shorts_program_name'] = shortsPrograms[short.shorts_program_id] || 'No Program'
        }
      })
      return enriched
    }) || []
    
    const shortFilmsSheet = createStyledWorksheet(shortFilms, 'Short Films')
    utils.book_append_sheet(workbook, shortFilmsSheet, 'Short Films')
    console.log('Short films sheet added to workbook with program names')
    
    // 3. Programs
    console.log('Exporting Programs...')
    const { data: programsList } = await supabase
      .from('programs')
      .select('*')
      .order('title')
    
    const programsSheet = createStyledWorksheet(programsList || [], 'Programs')
    utils.book_append_sheet(workbook, programsSheet, 'Programs')
    
    // 4. Press List
    console.log('Exporting Press List...')
    const { data: pressList } = await supabase
      .from('press')
      .select('*')
      .order('name')
    
    const pressSheet = createStyledWorksheet(pressList || [], 'Press List')
    utils.book_append_sheet(workbook, pressSheet, 'Press List')
    
    // 5. Press Screenings
    console.log('Exporting Press Screenings...')
    const { data: pressScreeningsRaw, error: pressScreeningsError } = await supabase
      .from('press_screenings')
      .select('*')
      .order('screening_date')
    
    // Map to expected format
    const pressScreenings = pressScreeningsRaw?.map(item => ({
      film_title: item.title || 'Unknown',
      screening_date: item.screening_date,
      start_time: item.screening_time,
      venue: item.short_code || 'Unknown',
      runtime: item.runtime,
      notes: item.notes,
      // Include all original columns too
      ...item
    })) || []
    
    console.log('Press Screenings:', pressScreeningsError ? 'ERROR: ' + pressScreeningsError.message : `SUCCESS: ${pressScreenings?.length || 0} records`)
    
    const pressScreeningsSheet = createStyledWorksheet(pressScreenings || [], 'Press Screenings')
    utils.book_append_sheet(workbook, pressScreeningsSheet, 'Press Screenings')
    console.log('Press Screenings sheet added to workbook')
    
    // 6. Screener Access
    console.log('Exporting Screener Access...')
    const { data: screenerAccessRaw, error: screenerError } = await supabase
      .from('screener_access')
      .select('*')
    
    console.log('Screener Access:', screenerError ? 'ERROR: ' + screenerError.message : `SUCCESS: ${screenerAccessRaw?.length || 0} records`)
    
    const screenerAccess = screenerAccessRaw || []
    
    const screenerAccessSheet = createStyledWorksheet(screenerAccess, 'Screener Access')
    utils.book_append_sheet(workbook, screenerAccessSheet, 'Screener Access')
    console.log('Screener Access sheet added to workbook')
    
    // 7. Press Requests 
    console.log('Exporting Press Requests...')
    const { data: pressRequests, error: requestsError } = await supabase
      .from('press_requests')
      .select('*')
      .order('created_at', { ascending: false })
    
    console.log('Press requests:', requestsError ? 'ERROR: ' + requestsError.message : `SUCCESS: ${pressRequests?.length || 0} records`)
    
    const pressRequestsSheet = createStyledWorksheet(pressRequests || [], 'Press Requests')
    utils.book_append_sheet(workbook, pressRequestsSheet, 'Press Requests')
    console.log('Press requests sheet added to workbook')
    
    // 8. Photo Shoots
    console.log('Exporting Photo Shoots...')
    const { data: photoShootsRaw, error: photoShootsError } = await supabase
      .from('photo_shoots')
      .select('*')
      .order('shoot_date')
    
    // Map to expected format
    const photoShoots = photoShootsRaw?.map(item => ({
      film_title: item.film_program_display || 'Unknown',
      talent_names: item.subjects_display || 'Unknown',
      shoot_date: item.shoot_date,
      shoot_time: item.shoot_time,
      call_time: item.call_time,
      photographer: item.photographer,
      videographer: item.videographer,
      // Include all original columns too
      ...item
    })) || []
    
    console.log('Photo Shoots:', photoShootsError ? 'ERROR: ' + photoShootsError.message : `SUCCESS: ${photoShoots?.length || 0} records`)
    
    const photoShootsSheet = createStyledWorksheet(photoShoots || [], 'Photo Shoots')
    utils.book_append_sheet(workbook, photoShootsSheet, 'Photo Shoots')
    console.log('Photo Shoots sheet added to workbook')
    
    // 9. In Attendance (Guest Cards)
    console.log('Exporting In Attendance...')
    const { data: inAttendanceRaw, error: inAttendanceError } = await supabase
      .from('guests')
      .select('*')
      .order('name')
    
    // Map to expected format
    const inAttendance = inAttendanceRaw?.map(item => ({
      name: item.name,
      film_association: item.films_display || 'Unknown',
      role: item.role || item.guest_type,
      arrival_date: item.arrival_date,
      departure_date: item.departure_date,
      accommodation: item.hotel_name ? `${item.hotel_name}, ${item.hotel_address}` : null,
      contact_email: item.contact_email,
      country: item.country,
      confirmed: item.confirmed,
      checked_in: item.checked_in,
      // Include all original columns too
      ...item
    })) || []
    
    console.log('In Attendance:', inAttendanceError ? 'ERROR: ' + inAttendanceError.message : `SUCCESS: ${inAttendance?.length || 0} records`)
    
    const inAttendanceSheet = createStyledWorksheet(inAttendance || [], 'In Attendance')
    utils.book_append_sheet(workbook, inAttendanceSheet, 'In Attendance')
    console.log('In Attendance sheet added to workbook')
    
    // 10. Red Carpets
    console.log('Exporting Red Carpets...')
    const { data: redCarpetsRaw, error: redCarpetsError } = await supabase
      .from('red_carpets')
      .select('*')
      .order('carpet_date')
    
    // Map to expected format
    const redCarpets = redCarpetsRaw?.map(item => ({
      event_name: 'Red Carpet',
      film_title: item.film_program_display || 'Unknown',
      event_date: item.carpet_date,
      event_time: item.carpet_start_time,
      call_time: item.call_time,
      talent_names: item.subjects_display,
      film_program_start_time: item.film_program_start_time,
      // Include all original columns too
      ...item
    })) || []
    
    console.log('Red Carpets:', redCarpetsError ? 'ERROR: ' + redCarpetsError.message : `SUCCESS: ${redCarpets?.length || 0} records`)
    
    const redCarpetsSheet = createStyledWorksheet(redCarpets || [], 'Red Carpets')
    utils.book_append_sheet(workbook, redCarpetsSheet, 'Red Carpets')
    console.log('Red Carpets sheet added to workbook')
    
    // 11. Special Events
    console.log('Exporting Special Events...')
    const { data: specialEventsRaw, error: specialEventsError } = await supabase
      .from('special_events')
      .select('*')
      .order('event_date')
    
    // Map to expected format
    const specialEvents = specialEventsRaw?.map(item => ({
      event_name: item.title,
      event_type: item.event_type,
      event_date: item.event_date,
      start_time: item.start_time,
      end_time: item.end_time,
      access_time: item.access_time,
      venue: item.venue_name,
      venue_address: item.venue_address,
      capacity: item.number_expected,
      description: item.location_details,
      organizer: item.lead_staff,
      // Include all original columns too
      ...item
    })) || []
    
    console.log('Special Events:', specialEventsError ? 'ERROR: ' + specialEventsError.message : `SUCCESS: ${specialEvents?.length || 0} records`)
    
    const specialEventsSheet = createStyledWorksheet(specialEvents || [], 'Special Events')
    utils.book_append_sheet(workbook, specialEventsSheet, 'Special Events')
    console.log('Special Events sheet added to workbook')
    
    // 12. Ticketing (Published Screenings only)
    console.log('Exporting Ticketing...')
    const { data: publishedScreenings, error: ticketingError } = await supabase
      .from('published_screenings')
      .select('*')
      .order('screening_date')
    
    console.log('Ticketing:', ticketingError ? 'ERROR: ' + ticketingError.message : `SUCCESS: ${publishedScreenings?.length || 0} records`)
    
    const ticketingSheet = createStyledWorksheet(publishedScreenings || [], 'Ticketing')
    utils.book_append_sheet(workbook, ticketingSheet, 'Ticketing')
    console.log('Ticketing sheet added to workbook')
    
    // Generate filename without timezone conversion
    const today = new Date()
    const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const filename = `${festivalName.replace(/\s+/g, '_')}_${edition ? edition + '_' : ''}Export_${currentDate}.xlsx`
    
    // Write file
    console.log('Workbook has', workbook.SheetNames.length, 'sheets:', workbook.SheetNames)
    console.log('Attempting to write file:', filename)
    
    if (workbook.SheetNames.length === 0) {
      throw new Error('Workbook is empty - no sheets were added')
    }
    
    writeFile(workbook, filename)
    console.log('File written successfully')
    
    return {
      success: true,
      filename,
      sheetsCreated: workbook.SheetNames.length,
      festivalInfo: {
        name: festivalName,
        edition,
        startDate,
        endDate
      }
    }
    
  } catch (error) {
    console.error('Export failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Export specific year from archives
export async function exportArchivedYear(year: number) {
  const supabase = createClient()
  const workbook: WorkBook = utils.book_new()
  
  try {
    // Get festival year info
    const { data: festivalYear } = await supabase
      .from('festival_years')
      .select('*')
      .eq('year', year)
      .single()
    
    if (!festivalYear) {
      throw new Error(`No archived data found for year ${year}`)
    }
    
    const festivalName = festivalYear.festival_name
    const edition = festivalYear.edition
    
    // Helper function remains the same as above
    const createStyledWorksheet = (data: any[], sheetName: string): WorkSheet => {
      if (!data || data.length === 0) {
        const emptySheet = utils.aoa_to_sheet([['No data available for this year']])
        return emptySheet
      }
      
      const worksheet = utils.json_to_sheet(data)
      // Apply styling (same as above)...
      return worksheet
    }
    
    // Export archived data for the specific year - SIMPLE ARCHIVE VERSION
    console.log('Exporting archived data for year:', year)
    
    // Load shorts programs for display enrichment
    let shortsPrograms: Record<string, string> = {}
    const { data: programs } = await supabase
      .from(`archive_${year}_shorts_programs`)
      .select('id, program_name')
    
    if (programs) {
      programs.forEach(program => {
        shortsPrograms[program.id] = program.program_name || 'Unknown Program'
      })
    } else {
      // Try current shorts programs as fallback
      const { data: currentPrograms } = await supabase
        .from('shorts_programs')
        .select('id, program_name')
      if (currentPrograms) {
        currentPrograms.forEach(program => {
          shortsPrograms[program.id] = program.program_name || 'Unknown Program'
        })
      }
    }
    
    // 1. Archived Feature Films
    const { data: archivedFeatures } = await supabase
      .from(`archive_${year}_feature_films`)
      .select('*')
      .order('title')
    
    const featuresSheet = createStyledWorksheet(archivedFeatures || [], 'Feature Films')
    utils.book_append_sheet(workbook, featuresSheet, 'Feature Films')
    
    // 2. Archived Short Films - WITH SHORTS PROGRAM ENRICHMENT
    const { data: archivedShortsRaw } = await supabase
      .from(`archive_${year}_short_films`)
      .select('*')
      .order('title')
    
    // Enrich shorts data with program names
    const archivedShorts = archivedShortsRaw?.map(short => ({
      ...short,
      shorts_program_name: shortsPrograms[short.shorts_program_id] || short.shorts_program_id || 'No Program'
    })) || []
    
    const shortsSheet = createStyledWorksheet(archivedShorts || [], 'Short Films')
    utils.book_append_sheet(workbook, shortsSheet, 'Short Films')
    
    // 3. Archived Programs
    const { data: archivedPrograms } = await supabase
      .from(`archive_${year}_programs`)
      .select('*')
      .order('title')
    
    const programsSheet = createStyledWorksheet(archivedPrograms || [], 'Programs')
    utils.book_append_sheet(workbook, programsSheet, 'Programs')
    
    // 4. Archived Press
    const { data: archivedPress } = await supabase
      .from(`archive_${year}_press`)
      .select('*')
      .order('name')
    
    const pressSheet = createStyledWorksheet(archivedPress || [], 'Press List')
    utils.book_append_sheet(workbook, pressSheet, 'Press List')
    
    // 5. Archived Press Screenings
    const { data: archivedPressScreenings } = await supabase
      .from(`archive_${year}_press_screenings`)
      .select('*')
      .order('screening_date')
    
    const pressScreeningsSheet = createStyledWorksheet(archivedPressScreenings || [], 'Press Screenings')
    utils.book_append_sheet(workbook, pressScreeningsSheet, 'Press Screenings')
    
    // 6. Archived Screener Access
    const { data: archivedScreenerAccess } = await supabase
      .from(`archive_${year}_screener_access`)
      .select('*')
    
    const archivedScreenerSheet = createStyledWorksheet(archivedScreenerAccess || [], 'Screener Access')
    utils.book_append_sheet(workbook, archivedScreenerSheet, 'Screener Access')
    
    // 7. Archived Press Requests
    const { data: archivedRequests } = await supabase
      .from(`archive_${year}_press_requests`)
      .select('*')
      .order('created_at', { ascending: false })
    
    const requestsSheet = createStyledWorksheet(archivedRequests || [], 'Press Requests')
    utils.book_append_sheet(workbook, requestsSheet, 'Press Requests')
    
    // 8. Archived Photo Shoots
    const { data: archivedPhotoShoots } = await supabase
      .from(`archive_${year}_photo_shoots`)
      .select('*')
      .order('shoot_date')
    
    const photoShootsSheet = createStyledWorksheet(archivedPhotoShoots || [], 'Photo Shoots')
    utils.book_append_sheet(workbook, photoShootsSheet, 'Photo Shoots')
    
    // 9. Archived Guests (In Attendance)
    const { data: archivedGuests } = await supabase
      .from(`archive_${year}_guests`)
      .select('*')
      .order('name')
    
    const guestsSheet = createStyledWorksheet(archivedGuests || [], 'In Attendance')
    utils.book_append_sheet(workbook, guestsSheet, 'In Attendance')
    
    // 10. Archived Red Carpets
    const { data: archivedRedCarpets } = await supabase
      .from(`archive_${year}_red_carpets`)
      .select('*')
      .order('carpet_date')
    
    const redCarpetsSheet = createStyledWorksheet(archivedRedCarpets || [], 'Red Carpets')
    utils.book_append_sheet(workbook, redCarpetsSheet, 'Red Carpets')
    
    // 11. Archived Special Events
    const { data: archivedSpecialEvents } = await supabase
      .from(`archive_${year}_special_events`)
      .select('*')
      .order('event_date')
    
    const specialEventsSheet = createStyledWorksheet(archivedSpecialEvents || [], 'Special Events')
    utils.book_append_sheet(workbook, specialEventsSheet, 'Special Events')
    
    // 12. Archived Published Screenings (Ticketing)
    const { data: archivedScreenings } = await supabase
      .from(`archive_${year}_published_screenings`)
      .select('*')
      .order('screening_date')
    
    const ticketingSheet = createStyledWorksheet(archivedScreenings || [], 'Ticketing')
    utils.book_append_sheet(workbook, ticketingSheet, 'Ticketing')
    
    console.log('Archive workbook has', workbook.SheetNames.length, 'sheets')
    
    if (workbook.SheetNames.length === 0) {
      throw new Error('No archived data found for year ' + year)
    }
    
    const filename = `${festivalName.replace(/\s+/g, '_')}_${edition}_Archive_Export.xlsx`
    writeFile(workbook, filename)
    
    return {
      success: true,
      filename,
      year,
      festivalInfo: festivalYear
    }
    
  } catch (error) {
    console.error('Archive export failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}