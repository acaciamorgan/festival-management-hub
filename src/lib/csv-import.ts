import { createClient } from '@/lib/supabase/client'
import { GuestCard, GuestType } from '@/types'
import { getFestivalYear, parseSmartDate } from '@/lib/smart-date-parser'
import { findBestTitleMatch } from '@/lib/title-utils'

export interface CSVGuestRow {
  'Type': string
  'Film Title': string
  'Name': string
  'Country': string
  'Confirmed?': string
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

  console.log('Found headers:', headers)
  
  const rows: CSVGuestRow[] = []

  // Process data rows starting after the header
  for (let i = headerRowIndex + 1; i < records.length; i++) {
    const record = records[i]
    
    // Skip empty rows or rows with all empty cells
    if (!record || record.length === 0 || record.every(cell => !cell || !cell.trim())) {
      continue
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
 * Tries to avoid splitting actual film titles that contain commas
 */
function parseFilmTitles(filmsDisplay: string, knownTitles: string[]): string[] {
  if (!filmsDisplay || filmsDisplay.trim() === '' || filmsDisplay === '—') {
    return []
  }

  // First, try to match against known titles to see if the entire string is one title
  if (knownTitles.some(title => findBestTitleMatch(filmsDisplay.trim(), [title]))) {
    return [filmsDisplay.trim()]
  }

  // If not a single known title, try intelligent splitting
  // Split on commas but try to preserve titles that we know exist
  const potentialTitles = filmsDisplay.split(',').map(title => title.trim()).filter(title => title)
  const result: string[] = []
  let i = 0

  while (i < potentialTitles.length) {
    const currentTitle = potentialTitles[i]

    // Check if current title matches a known title
    if (knownTitles.some(title => findBestTitleMatch(currentTitle, [title]))) {
      result.push(currentTitle)
      i++
      continue
    }

    // Try combining with next title(s) to see if we get a match
    let combinedTitle = currentTitle
    let foundMatch = false

    for (let j = i + 1; j < Math.min(i + 3, potentialTitles.length); j++) {
      combinedTitle += ', ' + potentialTitles[j]

      if (knownTitles.some(title => findBestTitleMatch(combinedTitle, [title]))) {
        result.push(combinedTitle)
        i = j + 1
        foundMatch = true
        break
      }
    }

    if (!foundMatch) {
      // No match found, keep as individual title
      result.push(currentTitle)
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
export async function removeFilmAssociations(removals: Array<{guestName: string, removedFilms: string[]}>) {
  const supabase = createClient()
  const errors: string[] = []

  for (const removal of removals) {
    // Get guest ID
    const { data: guest } = await supabase
      .from('guests')
      .select('id')
      .eq('name', removal.guestName)
      .single()

    if (!guest) {
      errors.push(`Could not find guest ${removal.guestName}`)
      continue
    }

    // Remove film associations
    for (const filmTitle of removal.removedFilms) {
      // Try to remove from guest_films
      const { error: filmError } = await supabase
        .from('guest_films')
        .delete()
        .eq('guest_id', guest.id)
        .eq('film_title', filmTitle)

      // Try to remove from guest_programs if not in films
      const { error: programError } = await supabase
        .from('guest_programs')
        .delete()
        .eq('guest_id', guest.id)
        .eq('program_title', filmTitle)

      if (filmError && programError) {
        errors.push(`Could not remove ${filmTitle} from ${removal.guestName}`)
      }
    }
  }

  return { success: errors.length === 0, errors }
}

export async function importGuestsFromCSV(csvRows: CSVGuestRow[]): Promise<GuestImportResult> {
  const supabase = createClient()
  const errors: string[] = []
  const warnings: string[] = []
  const importedGuests: GuestCard[] = []
  const filmRemovals: Array<{guestName: string, removedFilms: string[]}> = []
  
  // Get festival year once for all date parsing
  const festivalYear = await getFestivalYear()

  try {
    // Group rows by guest name to handle duplicate guests with multiple films
    const guestGroups = new Map<string, CSVGuestRow[]>()
    
    csvRows.forEach((row, index) => {
      console.log(`Processing row ${index + 2}:`, row)
      const guestName = row['Name']?.trim()
      if (!guestName) {
        console.log(`Row ${index + 2} missing guest name, skipping`)
        errors.push(`Row ${index + 2} missing guest name, skipping`)
        return
      }
      
      if (!guestGroups.has(guestName)) {
        guestGroups.set(guestName, [])
      }
      guestGroups.get(guestName)!.push(row)
    })

    // Process each unique guest
    for (const [guestName, guestRows] of guestGroups) {
      try {
        console.log(`Processing guest: ${guestName}, rows:`, guestRows)
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
        console.log(`Guest ${guestName} - CSV Arranging Travel value: "${arrangingTravel}"`)

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
          updated_at: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0') + ':' + String(new Date().getSeconds()).padStart(2, '0')
        }

        // Check if guest already exists and get their full data including films
        const { data: existingGuests, error: checkError } = await supabase
          .from('guests')
          .select('*')
          .eq('name', guestName)

        if (checkError) {
          errors.push(`Error checking for existing guest ${guestName}: ${checkError.message}`)
          continue
        }

        const existingGuest = existingGuests && existingGuests.length > 0 ? existingGuests[0] : null

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

        // Use exact template header: 'Film/Program Titles'
        const filmsDisplay = primaryRow['Film/Program Titles']?.trim() || ''

        // Get existing film associations if guest already existed
        let existingFilmAssociations: any[] = []
        let existingProgramAssociations: any[] = []

        if (existingGuest) {
          const [existingFilms, existingPrograms] = await Promise.all([
            supabase.from('guest_films').select('*').eq('guest_id', savedGuest.id),
            supabase.from('guest_programs').select('*').eq('guest_id', savedGuest.id)
          ])
          existingFilmAssociations = existingFilms.data || []
          existingProgramAssociations = existingPrograms.data || []
        }

        // Combine existing films_display with new one if updating
        let finalFilmsDisplay = filmsDisplay
        if (existingGuest && existingGuest.films_display) {
          // If CSV has no films but database has films, keep the database films
          if (!filmsDisplay || filmsDisplay === '—' || filmsDisplay === '') {
            finalFilmsDisplay = existingGuest.films_display
          } else {
            // Otherwise use the CSV films (will be handled by associations below)
            finalFilmsDisplay = filmsDisplay
          }
        }

        // Update the saved guest with films_display field
        const { data: displayUpdatedGuest, error: displayError } = await supabase
          .from('guests')
          .update({ films_display: finalFilmsDisplay })
          .eq('id', savedGuest.id)
          .select()
          .single()

        if (displayError) {
          warnings.push(`Error updating films display for ${guestName}: ${displayError.message}`)
        } else {
          savedGuest = displayUpdatedGuest
        }
        
        // Smart film association handling
        // Only process if we have films to work with (skip if empty or just "—")
        if (filmsDisplay && filmsDisplay !== '—' && filmsDisplay.trim() !== '') {
          // Get all available films and programs from database for smart matching
          const [featureFilms, shortFilms, programs] = await Promise.all([
            supabase.from('feature_films').select('id, title'),
            supabase.from('short_films').select('id, title'),
            supabase.from('programs').select('id, title')
          ])

          const allFilms = [
            ...(featureFilms.data || []),
            ...(shortFilms.data || [])
          ]
          const allPrograms = programs.data || []

          // Parse film titles more intelligently
          const csvFilmTitles = parseFilmTitles(filmsDisplay, [
            ...allFilms.map(f => f.title),
            ...allPrograms.map(p => p.title)
          ])

          // Determine what needs to be added and removed
          const existingTitles = new Set([
            ...existingFilmAssociations.map(f => f.film_title),
            ...existingProgramAssociations.map(p => p.program_title)
          ])

          const csvTitlesSet = new Set(csvFilmTitles)

          // Films to add (in CSV but not in existing)
          const titlesToAdd = csvFilmTitles.filter(title => !existingTitles.has(title))

          // Films to remove (in existing but not in CSV) - only for existing guests
          const titlesToRemove = existingGuest
            ? Array.from(existingTitles).filter(title => !csvTitlesSet.has(title))
            : []

          // Handle removals if any
          if (titlesToRemove.length > 0) {
            // Store removals for later confirmation
            filmRemovals.push({
              guestName,
              removedFilms: titlesToRemove
            })
            warnings.push(`Detected film removals for ${guestName}: ${titlesToRemove.join(', ')}`)
          }

          // Add new associations
          const filmAssociations = []
          const programAssociations = []

          for (const csvTitle of titlesToAdd) {
            // Try to find best match using smart title matching
            const matchedFilm = allFilms.find(f => {
              const bestMatch = findBestTitleMatch(csvTitle, [f.title])
              return bestMatch === f.title
            })

            const matchedProgram = allPrograms.find(p => {
              const bestMatch = findBestTitleMatch(csvTitle, [p.title])
              return bestMatch === p.title
            })

            if (matchedFilm) {
              // Check if association doesn't already exist
              const exists = existingFilmAssociations.some(
                a => a.film_id === matchedFilm.id
              )
              if (!exists) {
                filmAssociations.push({
                  guest_id: savedGuest.id,
                  film_id: matchedFilm.id,
                  film_title: matchedFilm.title
                })
              }
            } else if (matchedProgram) {
              // Check if association doesn't already exist
              const exists = existingProgramAssociations.some(
                a => a.program_id === matchedProgram.id
              )
              if (!exists) {
                programAssociations.push({
                  guest_id: savedGuest.id,
                  program_id: matchedProgram.id,
                  program_title: matchedProgram.title
                })
              }
            } else {
              warnings.push(`Could not find match for title "${csvTitle}" for guest ${guestName}`)
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

          // Insert new program associations only
          if (programAssociations.length > 0) {
            const { error: programAssocError } = await supabase
              .from('guest_programs')
              .insert(programAssociations)

            if (programAssocError) {
              warnings.push(`Warning: Could not create program associations for ${guestName}: ${programAssocError.message}`)
            }
          }
        }
        
        savedGuest.films_display = filmsDisplay
        savedGuest.films = []

        importedGuests.push(savedGuest)
        
      } catch (error) {
        errors.push(`Error processing guest ${guestName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      success: errors.length === 0,
      importedGuests: importedGuests.length,
      errors,
      warnings,
      data: importedGuests,
      filmRemovals: filmRemovals.length > 0 ? filmRemovals : undefined
    }

  } catch (error) {
    return {
      success: false,
      importedGuests: 0,
      errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      filmRemovals: undefined
    }
  }
}