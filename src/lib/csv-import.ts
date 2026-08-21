import { createClient } from '@/lib/supabase/client'
import { GuestCard, GuestType } from '@/types'
import { getFestivalYear, parseSmartDate } from '@/lib/smart-date-parser'
import { findBestTitleMatch, normalizeTitle } from '@/lib/title-utils'
import { isCSVRowStrikethrough } from '@/lib/excel-utils'
import { detectChangedFields, logFieldChanges } from '@/lib/field-changes'

// Normalize names by removing accents and special characters for matching
function normalizeName(name: string): string {
  if (!name) return ''

  // Normalize unicode characters (é -> e, ć -> c, etc.)
  return name
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .toLowerCase()
    .trim()
}

interface TitleMapping {
  csvTitle: string
  suggestedMatch?: string
  confidence?: number
}

interface CSVTitleMappingRow {
  id: number
  csv_title: string
  database_title: string
  created_at: string
}

export interface CSVGuestRow {
  'Type': string
  'Film/Program Titles': string
  'Database Match': string
  'Name': string
  'Country': string
  'Confirmed': string
  'Contact': string
  'Email': string
  'Welcome Email Sent': string
  'Arranging Travel': string
  'Accommodations': string
  'Hotel Confirmation': string
  'Arrival Date': string
  'Arrival Airline': string
  'Arrival Flight Number': string
  'Inbound Departure Time': string
  'Arrival Origin Airport': string
  'Arrival Airport': string
  'Inbound Arrival Time': string
  'Departure Date': string
  'Outbound Departure Time': string
  'Departure Airline': string
  'Departure Flight Number': string
  'Departure Airport': string
  'Destination Airport': string
  'Outbound Arrival Time': string
  'Screening 1': string
  'Screening 2': string
  'Notes': string
}

export interface GuestImportResult {
  success: boolean
  importedGuests: number
  errors: string[]
  warnings: string[]
  data?: GuestCard[]
  filmRemovals?: Array<{
    guestName: string
    removedFilms: string[]
  }>
  titleMappingsRequired?: TitleMapping[]
}

export async function parseCSVContent(csvContent: string): Promise<CSVGuestRow[]> {
  // First, let's try a more robust CSV parsing approach
  const records = parseCSVToRecords(csvContent)
  
  if (records.length < 1) {
    throw new Error('CSV must have at least one data row')
  }

  // Find the header row by looking for expected columns
  let headerRowIndex = -1
  let headers: string[] = []
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    if (record.some((cell: string) => 
      cell.toLowerCase().includes('name') || 
      cell.toLowerCase().includes('film') ||
      cell.toLowerCase().includes('type')
    )) {
      headerRowIndex = i
      headers = record
      break
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Could not find header row with expected columns (Name, Film Title, Type, etc.)')
  }

  const rows: CSVGuestRow[] = []

  // Process data rows starting after the header
  for (let i = headerRowIndex + 1; i < records.length; i++) {
    const record = records[i]

    // Skip empty rows or rows with all empty cells
    if (!record || record.length === 0 || record.every(cell => !cell || !cell.trim())) {
      continue
    }

    // Skip strikethrough rows
    if (isCSVRowStrikethrough(record)) {
      continue
    }

    // Check for Delete column - skip rows marked for deletion
    const deleteColumnIndex = headers.findIndex(h => h.toLowerCase().includes('delete'))
    if (deleteColumnIndex >= 0 && record[deleteColumnIndex]) {
      const deleteValue = String(record[deleteColumnIndex]).toLowerCase().trim()
      if (deleteValue === 'x' || deleteValue === 'delete' || deleteValue === 'y' || deleteValue === 'yes') {
        continue
      }
    }

    const row: any = {}

    // Map each header to its corresponding value
    headers.forEach((header, index) => {
      row[header] = (record && record[index]) ? record[index] : ''
    })

    // Only add rows that have a name
    if (row['Name']?.trim()) {
      rows.push(row as CSVGuestRow)
    }
  }

  return rows
}

/**
 * Intelligently parse film titles from a films display string
 * Handles trailing articles correctly (e.g., "Title, The" is one film, not two)
 */
function parseFilmTitles(filmsDisplay: string, knownTitles: string[]): string[] {
  if (!filmsDisplay || filmsDisplay.trim() === '' || filmsDisplay === '—') {
    return []
  }

  const trimmedDisplay = filmsDisplay.trim()

  // Check if this is a single title with trailing article
  if (/,\s*(a|an|the)$/i.test(trimmedDisplay)) {
    return [trimmedDisplay]
  }

  // First, try to match against known titles to see if the entire string is one title
  if (knownTitles.length > 0 && knownTitles.some(title => findBestTitleMatch(trimmedDisplay, [title]))) {
    return [trimmedDisplay]
  }

  // NEW: Check if the whole string (even with commas) matches a known film title exactly or normalized
  // This handles cases like "Black Rabbit, White Rabbit" and "Wind, Talk To Me"
  if (knownTitles.length > 0) {
    const exactMatch = knownTitles.find(title =>
      title.toLowerCase().trim() === trimmedDisplay.toLowerCase().trim()
    )
    if (exactMatch) {
      return [trimmedDisplay]
    }

    // Also check normalized matching
    const normalizedMatch = knownTitles.find(title => {
      const normalizedCsv = normalizeTitle(trimmedDisplay)
      const normalizedDb = normalizeTitle(title)
      return normalizedCsv && normalizedDb && normalizedCsv === normalizedDb
    })
    if (normalizedMatch) {
      return [trimmedDisplay]
    }
  }

  // Split on commas but be smart about trailing articles
  const parts = trimmedDisplay.split(',').map(part => part.trim()).filter(part => part)
  const result: string[] = []
  let i = 0

  while (i < parts.length) {
    const currentPart = parts[i]
    const nextPart = parts[i + 1]

    // Check if next part is an article - if so, combine them
    if (nextPart && /^(a|an|the)$/i.test(nextPart)) {
      result.push(`${currentPart}, ${nextPart}`)
      i += 2 // Skip both parts
    } else {
      result.push(currentPart)
      i++
    }
  }

  return result
}

// More robust CSV parser that handles quoted multi-line fields
function parseCSVToRecords(csvContent: string): string[][] {
  const records: string[][] = []
  let currentRecord: string[] = []
  let currentField = ''
  let inQuotes = false
  let i = 0
  
  while (i < csvContent.length) {
    const char = csvContent[i]
    const nextChar = csvContent[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"'
        i += 2
        continue
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentRecord.push(currentField.trim())
      currentField = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of record
      currentRecord.push(currentField.trim())
      if (currentRecord.some(field => field.length > 0)) {
        records.push(currentRecord)
      }
      currentRecord = []
      currentField = ''
      
      // Skip \r\n combinations
      if (char === '\r' && nextChar === '\n') {
        i++
      }
    } else {
      currentField += char
    }
    
    i++
  }
  
  // Don't forget the last field/record
  if (currentField || currentRecord.length > 0) {
    currentRecord.push(currentField.trim())
    if (currentRecord.some(field => field.length > 0)) {
      records.push(currentRecord)
    }
  }
  
  return records
}


// Function to remove confirmed film associations
export async function removeFilmAssociations(removals: Array<{guestName: string, removedFilms: string[]}>, currentYear?: number) {
  const supabase = createClient()
  const errors: string[] = []
  const festivalYear = await getFestivalYear(currentYear)
  const fyInt = parseInt(festivalYear, 10)

  for (const removal of removals) {
    // Get guest ID
    const { data: guest } = await supabase
      .from('guests')
      .select('id')
      .eq('name', removal.guestName)
      .eq('festival_year', fyInt)
      .maybeSingle()

    if (!guest) {
      errors.push(`Could not find guest ${removal.guestName}`)
      continue
    }

    // Remove film associations — look up film_id from title across all film tables
    for (const filmTitle of removal.removedFilms) {
      const [featureMatch, shortMatch, programMatch] = await Promise.all([
        supabase.from('feature_films').select('id').eq('title', filmTitle).eq('festival_year', fyInt).maybeSingle(),
        supabase.from('short_films').select('id').eq('title', filmTitle).eq('festival_year', fyInt).maybeSingle(),
        supabase.from('programs').select('id').eq('title', filmTitle).eq('festival_year', fyInt).maybeSingle()
      ])

      const filmId = featureMatch.data?.id || shortMatch.data?.id || programMatch.data?.id
      if (filmId) {
        await supabase.from('guest_films').delete().eq('guest_id', guest.id).eq('film_id', filmId)
      } else {
        errors.push(`Could not find "${filmTitle}" to remove from ${removal.guestName}`)
      }
    }
  }

  return { success: errors.length === 0, errors }
}

export async function importGuestsFromCSV(csvRows: CSVGuestRow[], confirmedMappings?: Record<string, string>, currentYear?: number): Promise<GuestImportResult> {
  const supabase = createClient()
  const errors: string[] = []
  const warnings: string[] = []
  const importedGuests: GuestCard[] = []
  const filmRemovals: Array<{guestName: string, removedFilms: string[]}> = []

  // Get festival year once for all date parsing
  const festivalYear = await getFestivalYear(currentYear)

  try {
    // Group rows by guest name to handle duplicate guests with multiple films
    const guestGroups = new Map<string, CSVGuestRow[]>()
    
    csvRows.forEach((row, index) => {
      const guestName = row['Name']?.trim()
      if (!guestName) {
        errors.push(`Row ${index + 2} missing guest name, skipping`)
        return
      }
      
      if (!guestGroups.has(guestName)) {
        guestGroups.set(guestName, [])
      }
      guestGroups.get(guestName)!.push(row)
    })

    // If no confirmed mappings provided, check if we need title confirmations
    if (!confirmedMappings) {
      const { getTitleMappings } = await import('@/lib/title-mappings')
      const existingMappings = await getTitleMappings()
      const titleMappingsRequired: TitleMapping[] = []

      // Get all database titles for matching
      const festivalYearInt = parseInt(festivalYear, 10)
      const [allFeatureFilms, allShortFilms, allPrograms] = await Promise.all([
        supabase.from('feature_films').select('id, title').eq('festival_year', festivalYearInt),
        supabase.from('short_films').select('id, title').eq('festival_year', festivalYearInt),
        supabase.from('programs').select('id, title').eq('festival_year', festivalYearInt)
      ])
      const allDbTitles = [
        ...(allFeatureFilms.data || []).map(f => f.title),
        ...(allShortFilms.data || []).map(f => f.title),
        ...(allPrograms.data || []).map(p => p.title)
      ]

      // Check all film titles in CSV for matches
      const uniqueCsvTitles = new Set<string>()
      for (const [guestName, guestRows] of guestGroups) {
        const allFilmsForGuest = guestRows
          .map(row => {
            const databaseMatch = row['Database Match']?.trim()
            const displayTitle = row['Film/Program Titles']?.trim()
            // Prefer Database Match, fallback to display title
            return (databaseMatch && databaseMatch !== '—') ? databaseMatch : displayTitle
          })
          .filter(film => film && film !== '' && film !== '—')

        for (const row of guestRows) {
          const databaseMatch = row['Database Match']?.trim()
          const displayTitle = row['Film/Program Titles']?.trim()

          if (databaseMatch && databaseMatch !== '—') {
            // Database Match values are exact titles - don't parse/split them
            // Only add if it actually matches something in the database
            const exactMatch = allDbTitles.find(dbTitle =>
              dbTitle.toLowerCase().trim() === databaseMatch.toLowerCase().trim()
            )
            if (!exactMatch) {
              // No match found - that's fine, skip this title entirely
              continue
            }
            uniqueCsvTitles.add(databaseMatch)
          } else if (displayTitle && displayTitle !== '—') {
            // Only parse display titles that might contain multiple films
            const parsedTitles = parseFilmTitles(displayTitle, allDbTitles)
            for (const title of parsedTitles) {
              uniqueCsvTitles.add(title.trim())
            }
          }
        }
      }

      // Check each unique title
      for (const csvTitle of uniqueCsvTitles) {
        // Skip if we already have a mapping
        const existingMapping = existingMappings.find(m => m.csv_title === csvTitle)
        if (existingMapping) continue

        // For Database Match entries, do exact match first
        const exactMatch = allDbTitles.find(dbTitle =>
          dbTitle.toLowerCase().trim() === csvTitle.toLowerCase().trim()
        )

        if (!exactMatch) {
          // Try fuzzy matching as fallback
          const bestMatch = findBestTitleMatch(csvTitle, allDbTitles)
          if (!bestMatch) { // Need confirmation if no match found
            titleMappingsRequired.push({
              csvTitle,
              suggestedMatch: undefined,
              confidence: 0
            })
          }
        }
      }

      // Return early if mappings are needed
      if (titleMappingsRequired.length > 0) {
        return {
          success: false,
          importedGuests: 0,
          errors: [],
          warnings: [],
          titleMappingsRequired
        }
      }
    }

    // Process each unique guest
    for (const [guestName, guestRows] of guestGroups) {
      try {
        // Use the first row for guest data (should be identical across rows except for film title)
        const primaryRow = guestRows[0]
        if (!primaryRow) {
          errors.push(`No data for guest ${guestName}`)
          continue
        }
        
        // Map CSV Type to our guest types - only set if CSV has a value
        let guestType: GuestType | null = null
        const csvType = primaryRow['Type']?.trim()
        if (csvType) {
          if (csvType === 'Features') guestType = 'Features'
          else if (csvType === 'Shorts') guestType = 'Shorts'
          else if (csvType === 'Industry') guestType = 'Industry'
          else if (csvType === 'CineYouth') guestType = 'CineYouth'
          else if (csvType === 'Jury') guestType = 'Jury'
          else {
            guestType = 'Other'
            warnings.push(`Unknown type "${csvType}" for ${guestName}, using "Other"`)
          }
        }

        // Use the Arranging Travel column as open text - no validation
        const arrangingTravel = primaryRow['Arranging Travel']?.trim() || null

        // Use exact template header: 'Confirmed'
        const confirmed = primaryRow['Confirmed']?.toLowerCase().trim() === 'yes'

        // Parse dates using smart date parser with festival year
        const arrivalDate = primaryRow['Arrival Date']?.trim()
        const parsedArrivalDate = parseSmartDate(arrivalDate, festivalYear)

        const departureDate = primaryRow['Departure Date']?.trim()
        const parsedDepartureDate = parseSmartDate(departureDate, festivalYear)

        // Use updated header names with unique inbound/outbound prefixes
        const arrivalAirline = primaryRow['Arrival Airline']?.trim() || null
        const arrivalFlightNumber = primaryRow['Inbound Flight #']?.trim() || null
        const arrivalTakeoffTime = primaryRow['Inbound Depart Time']?.trim() || null
        const arrivalOrigin = primaryRow['Origin']?.trim() || null
        const arrivalDestination = primaryRow['Arrival Airport']?.trim() || null
        const arrivalLandingTime = primaryRow['Inbound Arrive Time']?.trim() || null
        
        // For departure fields - use outbound prefixes
        const departureTakeoffTime = primaryRow['Outbound Depart Time']?.trim() || null
        const departureAirline = primaryRow['Departure Airline']?.trim() || null
        const departureFlightNumber = primaryRow['Outbound Flight #']?.trim() || null
        const departureOrigin = primaryRow['Departure Airport']?.trim() || null
        const departureDestination = primaryRow['Destination']?.trim() || null
        const departureLandingTime = primaryRow['Outbound Arrive Time']?.trim() || null

        // Create guest record
        const guestData = {
          name: guestName,
          country: primaryRow['Country']?.trim() || null,
          guest_type: guestType,
          confirmed,
          role: primaryRow['Role']?.trim() || null,
          contact_name: primaryRow['Contact']?.trim() || null,
          contact_email: primaryRow['Email']?.trim() || null,
          arranging_travel: arrangingTravel,
          arrival_date: parsedArrivalDate,
          arrival_airline: arrivalAirline,
          arrival_flight_number: arrivalFlightNumber,
          inbound_departure_time: arrivalTakeoffTime,
          arrival_origin_airport: arrivalOrigin,
          arrival_airport: arrivalDestination,
          inbound_arrival_time: arrivalLandingTime,
          departure_date: parsedDepartureDate,
          outbound_departure_time: departureTakeoffTime,
          departure_airline: departureAirline,
          departure_flight_number: departureFlightNumber,
          departure_airport: departureOrigin,
          destination_airport: departureDestination,
          outbound_arrival_time: departureLandingTime,
          hotel_name: primaryRow['Hotel']?.trim() || null,  // Template uses 'Hotel'
          hotel_confirmation_number: primaryRow['Hotel Confirmation']?.trim() || null,
          checked_in: false,
          notes: primaryRow['Notes']?.trim() || null,
          created_at: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0') + ':' + String(new Date().getSeconds()).padStart(2, '0'),
          updated_at: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0') + ':' + String(new Date().getSeconds()).padStart(2, '0'),
          festival_year: festivalYearInt
        }

        // Check if guest already exists - first try exact match, then normalized match
        let existingGuest = null

        // Try exact name match first
        const { data: exactMatchGuests, error: exactCheckError } = await supabase
          .from('guests')
          .select('*')
          .eq('name', guestName)
          .eq('festival_year', festivalYearInt)

        if (exactCheckError) {
          errors.push(`Error checking for existing guest ${guestName}: ${exactCheckError.message}`)
          continue
        }

        if (exactMatchGuests && exactMatchGuests.length > 0) {
          existingGuest = exactMatchGuests[0]
        } else {
          // If no exact match, try normalized match to catch accent variations
          const normalizedInputName = normalizeName(guestName)

          // Get all guests and check normalized names
          const { data: allGuests, error: allGuestsError } = await supabase
            .from('guests')
            .select('*')
            .eq('festival_year', festivalYearInt)

          if (!allGuestsError && allGuests) {
            existingGuest = allGuests.find(guest =>
              normalizeName(guest.name) === normalizedInputName
            )
          }
        }

        let savedGuest: any

        if (existingGuest) {
          // Smart update: only update fields that have values in CSV
          const updateData: any = {}

          // Only update fields if they have values in the CSV
          Object.keys(guestData).forEach(key => {
            const csvValue = guestData[key as keyof typeof guestData]
            const existingValue = existingGuest[key as keyof typeof existingGuest]

            // Update if CSV has a value (not null/empty) OR if explicitly clearing
            if (csvValue !== null && csvValue !== '') {
              updateData[key] = csvValue
            } else if (key === 'checked_in') {
              // Never overwrite checked_in status from CSV
              // Keep existing value
            } else if (existingValue !== null && existingValue !== undefined) {
              // CSV field is empty but we have existing data - keep existing
              updateData[key] = existingValue
            }
          })

          // Always update the timestamp
          updateData.updated_at = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0') + ':' + String(new Date().getSeconds()).padStart(2, '0')

          const { data: updatedGuest, error: updateError } = await supabase
            .from('guests')
            .update(updateData)
            .eq('id', existingGuest.id)
            .select()
            .single()

          if (updateError) {
            errors.push(`Error updating guest ${guestName}: ${updateError.message}`)
            continue
          }
          savedGuest = updatedGuest

          // Log field-level changes for highlighting
          const trackedFields = Object.keys(updateData).filter(f => f !== 'updated_at' && f !== 'festival_year')
          const changed = detectChangedFields(existingGuest, updateData, trackedFields)
          await logFieldChanges('guests', existingGuest.id, changed, festivalYearInt)

        } else {
          // Create new guest
          const { data: newGuest, error: guestError } = await supabase
            .from('guests')
            .insert([guestData])
            .select()
            .single()

          if (guestError) {
            errors.push(`Error creating guest ${guestName}: ${guestError.message}`)
            continue
          }
          savedGuest = newGuest
        }

        // Get existing film associations if guest already existed
        let existingFilmAssociations: any[] = []

        if (existingGuest) {
          const { data: existingFilms } = await supabase
            .from('guest_films')
            .select('*')
            .eq('guest_id', savedGuest.id)
          existingFilmAssociations = existingFilms || []
        }

        // Process film associations — all go into guest_films with film_type
        const filmAssociations: { guest_id: string, film_id: string, film_type: string, festival_year?: number }[] = []
        const matchedTitlesForDisplay: string[] = [] // Collect actual database titles for display

        // Get ALL database titles once for matching
        const festivalYearInt2 = parseInt(festivalYear, 10)
        const [allFeatureFilms, allShortFilms, allProgramsFromDb] = await Promise.all([
          supabase.from('feature_films').select('id, title').eq('festival_year', festivalYearInt2),
          supabase.from('short_films').select('id, title, shorts_program_id').eq('festival_year', festivalYearInt2),
          supabase.from('programs').select('id, title').eq('festival_year', festivalYearInt2)
        ])

        const allFilms = [
          ...(allFeatureFilms.data || []),
          ...(allShortFilms.data || [])
        ]
        const allPrograms = allProgramsFromDb.data || []

        // Process EACH ROW individually for this guest
        for (const row of guestRows) {
          const displayTitle = row['Film/Program Titles']?.trim()
          const databaseMatch = row['Database Match']?.trim()

          // Skip empty rows
          if ((!displayTitle || displayTitle === '—') && (!databaseMatch || databaseMatch === '—')) {
            continue
          }

          // Decide what title to search for
          let titleToMatch = ''
          if (databaseMatch && databaseMatch !== '' && databaseMatch !== '—') {
            // Use Database Match for exact matching
            titleToMatch = databaseMatch
          } else if (displayTitle && displayTitle !== '' && displayTitle !== '—') {
            // Fallback to Film/Program Titles
            titleToMatch = displayTitle
          } else {
            continue // Skip if both are empty
          }

          // Try to find exact match in films
          let matchedFilm = allFilms.find(f => f.title === titleToMatch)
          let matchedProgram = allPrograms.find(p => p.title === titleToMatch)

          // If no exact match and using display title, try normalized matching
          if (!matchedFilm && !matchedProgram && !databaseMatch) {
            // Try normalized matching
            matchedFilm = allFilms.find(f => {
              const match = findBestTitleMatch(titleToMatch, [f.title])
              return match === f.title
            })

            if (!matchedFilm) {
              matchedProgram = allPrograms.find(p => {
                const match = findBestTitleMatch(titleToMatch, [p.title])
                return match === p.title
              })
            }
          }

          // Handle matched film
          if (matchedFilm) {
            // Add to display titles (always add, even if association exists)
            matchedTitlesForDisplay.push(matchedFilm.title)

            // Determine film_type: 'short' if found in short_films, else 'feature'
            const isShortFilm = allShortFilms.data?.some(sf => sf.id === matchedFilm.id)
            const filmType = isShortFilm ? 'short' : 'feature'

            // Check if association doesn't already exist
            const exists = existingFilmAssociations.some(
              a => a.film_id === matchedFilm.id
            )
            if (!exists) {
              filmAssociations.push({
                guest_id: savedGuest.id,
                film_id: matchedFilm.id,
                film_type: filmType,
                festival_year: festivalYearInt2
              })
            }

            const shortFilm = isShortFilm ? allShortFilms.data?.find(sf => sf.id === matchedFilm.id) : null
            if (shortFilm) {
              // Short film association already included above with film_type = 'short'

              // Also associate with its program if it has one
              if (shortFilm.shorts_program_id) {
                // Find the program in our list
                const shortsProgram = allProgramsFromDb.data?.find(p => p.id === shortFilm.shorts_program_id)
                if (shortsProgram) {
                  const spExists = existingFilmAssociations.some(
                    a => a.film_id === shortsProgram.id && a.film_type === 'shorts_program'
                  )
                  if (!spExists) {
                    filmAssociations.push({
                      guest_id: savedGuest.id,
                      film_id: shortsProgram.id,
                      film_type: 'shorts_program',
                      festival_year: festivalYearInt2
                    })
                  }
                }
              }
            }
          } else if (matchedProgram) {
            // Add to display titles (always add, even if association exists)
            matchedTitlesForDisplay.push(matchedProgram.title)

            // Check if program association doesn't already exist
            const programExists = existingFilmAssociations.some(
              a => a.film_id === matchedProgram.id && a.film_type === 'program'
            )
            if (!programExists) {
              filmAssociations.push({
                guest_id: savedGuest.id,
                film_id: matchedProgram.id,
                film_type: 'program',
                festival_year: festivalYearInt2
              })
            }
          } else {
            warnings.push(`Could not find match for title "${titleToMatch}" for guest ${guestName}`)
          }
        } // End of for loop through rows

        // Update films_display with the actual matched database titles
        const filmsDisplay = matchedTitlesForDisplay.length > 0 ? matchedTitlesForDisplay.join(', ') : ''
        if (filmsDisplay && filmsDisplay.trim() !== '') {
          const { data: displayUpdatedGuest, error: displayError } = await supabase
            .from('guests')
            .update({ films_display: filmsDisplay })
            .eq('id', savedGuest.id)
            .select()
            .single()

          if (displayError) {
            warnings.push(`Error updating films display for ${guestName}: ${displayError.message}`)
          } else {
            savedGuest = displayUpdatedGuest
          }
        }

        // Insert new film associations only
        if (filmAssociations.length > 0) {
          const { error: filmAssocError } = await supabase
            .from('guest_films')
            .insert(filmAssociations)

          if (filmAssocError) {
            warnings.push(`Warning: Could not create film associations for ${guestName}: ${filmAssocError.message}`)
          }
        }


        savedGuest.films_display = filmsDisplay
        savedGuest.films = []

        importedGuests.push(savedGuest)

      } catch (error) {
        errors.push(`Error processing guest ${guestName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    const result: GuestImportResult = {
      success: errors.length === 0,
      importedGuests: importedGuests.length,
      errors,
      warnings,
      data: importedGuests
    }

    if (filmRemovals.length > 0) {
      result.filmRemovals = filmRemovals
    }

    return result

  } catch (error) {
    return {
      success: false,
      importedGuests: 0,
      errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: []
    }
  }
}