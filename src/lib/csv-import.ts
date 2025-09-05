import { createClient } from '@/lib/supabase/client'
import { GuestCard, GuestType, ArrangingTravel } from '@/types'

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
    if (!record || record.length === 0) continue // Skip empty rows
    
    const row: any = {}
    
    // Map each header to its corresponding value
    headers.forEach((header, index) => {
      row[header] = record[index] || ''
    })
    
    // Only add rows that have a name
    if (row['Name']?.trim()) {
      rows.push(row as CSVGuestRow)
    }
  }

  return rows
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


export async function importGuestsFromCSV(csvRows: CSVGuestRow[]): Promise<GuestImportResult> {
  const supabase = createClient()
  const errors: string[] = []
  const warnings: string[] = []
  const importedGuests: GuestCard[] = []

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

    // Process each unique guest
    for (const [guestName, guestRows] of guestGroups) {
      try {
        // Use the first row for guest data (should be identical across rows except for film title)
        const primaryRow = guestRows[0]
        
        // Map CSV Type to our guest types
        let guestType: GuestType = 'Other'
        const csvType = primaryRow['Type']?.trim()
        if (csvType === 'Features') guestType = 'Features'
        else if (csvType === 'Shorts') guestType = 'Shorts'
        else if (csvType === 'Industry') guestType = 'Industry'
        else if (csvType === 'CineYouth') guestType = 'CineYouth'
        else if (csvType === 'Jury') guestType = 'Jury'
        else if (csvType) {
          warnings.push(`Unknown type "${csvType}" for ${guestName}, using "Other"`)
        }

        // Validate and normalize arranging travel
        let arrangingTravel: ArrangingTravel = 'TBD'
        const csvArrangingTravel = primaryRow['Arranging Travel']?.trim()
        if (csvArrangingTravel === 'Festival') arrangingTravel = 'Festival'
        else if (csvArrangingTravel === 'Distributor') arrangingTravel = 'Distributor'
        else if (csvArrangingTravel === 'Local') arrangingTravel = 'Local'
        else if (csvArrangingTravel && csvArrangingTravel !== 'TBD') {
          warnings.push(`Unknown arranging travel "${csvArrangingTravel}" for ${guestName}, using "TBD"`)
        }

        // Parse confirmed status
        const confirmed = primaryRow['Confirmed?']?.toLowerCase().trim() === 'yes'

        // Parse arrival date without timezone conversion
        const arrivalDate = primaryRow['Arrival Date']?.trim()
        const parsedArrivalDate = arrivalDate ? (() => {
          if (arrivalDate.includes('/')) {
            const parts = arrivalDate.split('/')
            const month = parts[0].padStart(2, '0')
            const day = parts[1].padStart(2, '0')
            const year = parts[2].length === 2 ? '20' + parts[2] : parts[2]
            return `${year}-${month}-${day}`
          }
          return arrivalDate.includes('-') ? arrivalDate : null
        })() : null

        // Parse departure date without timezone conversion
        const departureDate = primaryRow['Departure Date']?.trim()
        const parsedDepartureDate = departureDate ? (() => {
          if (departureDate.includes('/')) {
            const parts = departureDate.split('/')
            const month = parts[0].padStart(2, '0')
            const day = parts[1].padStart(2, '0')
            const year = parts[2].length === 2 ? '20' + parts[2] : parts[2]
            return `${year}-${month}-${day}`
          }
          return departureDate.includes('-') ? departureDate : null
        })() : null

        // Get flight information directly from CSV columns
        const arrivalAirline = primaryRow['Arrival Airline']?.trim() || null
        const arrivalFlightNumber = primaryRow['Arrival Flight Number']?.trim() || null
        const inboundDepartureTime = primaryRow['Inbound Departure Time']?.trim() || null
        const arrivalOriginAirport = primaryRow['Arrival Origin Airport']?.trim() || null
        const arrivalAirport = primaryRow['Arrival Airport']?.trim() || null
        const inboundArrivalTime = primaryRow['Inbound Arrival Time']?.trim() || null
        
        const outboundDepartureTime = primaryRow['Outbound Departure Time']?.trim() || null
        const departureAirline = primaryRow['Departure Airline']?.trim() || null
        const departureFlightNumber = primaryRow['Departure Flight Number']?.trim() || null
        const departureAirport = primaryRow['Departure Airport']?.trim() || null
        const destinationAirport = primaryRow['Destination Airport']?.trim() || null
        const outboundArrivalTime = primaryRow['Outbound Arrival Time']?.trim() || null

        // Create guest record
        const guestData = {
          name: guestName,
          country: primaryRow['Country']?.trim() || null,
          guest_type: guestType,
          confirmed,
          role: null, // Will be populated later from film associations
          contact_name: primaryRow['Contact']?.trim() || null,
          contact_email: primaryRow['Email']?.trim() || null,
          arranging_travel: arrangingTravel,
          arrival_date: parsedArrivalDate,
          arrival_airline: arrivalAirline,
          arrival_flight_number: arrivalFlightNumber,
          inbound_departure_time: inboundDepartureTime,
          arrival_origin_airport: arrivalOriginAirport,
          arrival_airport: arrivalAirport,
          inbound_arrival_time: inboundArrivalTime,
          departure_date: parsedDepartureDate,
          outbound_departure_time: outboundDepartureTime,
          departure_airline: departureAirline,
          departure_flight_number: departureFlightNumber,
          departure_airport: departureAirport,
          destination_airport: destinationAirport,
          outbound_arrival_time: outboundArrivalTime,
          hotel_name: primaryRow['Accommodations']?.trim() || null,
          hotel_confirmation_number: primaryRow['Hotel Confirmation']?.trim() || null,
          checked_in: false,
          notes: primaryRow['Notes']?.trim() || null,
          created_at: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0') + ':' + String(new Date().getSeconds()).padStart(2, '0'),
          updated_at: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0') + ':' + String(new Date().getSeconds()).padStart(2, '0')
        }

        // Check if guest already exists
        const { data: existingGuests, error: checkError } = await supabase
          .from('guests')
          .select('id')
          .eq('name', guestName)

        if (checkError) {
          errors.push(`Error checking for existing guest ${guestName}: ${checkError.message}`)
          continue
        }

        const existingGuest = existingGuests && existingGuests.length > 0 ? existingGuests[0] : null

        let savedGuest: any

        if (existingGuest) {
          // Update existing guest with new data (newest data takes priority)
          const { data: updatedGuest, error: updateError } = await supabase
            .from('guests')
            .update({
              ...guestData,
              updated_at: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0') + ':' + String(new Date().getSeconds()).padStart(2, '0')
            })
            .eq('id', existingGuest.id)
            .select()
            .single()

          if (updateError) {
            errors.push(`Error updating guest ${guestName}: ${updateError.message}`)
            continue
          }
          savedGuest = updatedGuest

          // Clear existing film associations for this guest
          const { error: deleteError } = await supabase
            .from('guest_films')
            .delete()
            .eq('guest_id', existingGuest.id)

          if (deleteError) {
            warnings.push(`Warning: Could not clear existing film associations for ${guestName}: ${deleteError.message}`)
          }

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

        // Process film associations
        const filmTitles = guestRows
          .map(row => row['Film Title']?.trim())
          .filter(title => title && title !== '')

        if (filmTitles.length > 0) {
          // Try to find matching films in database
          const { data: filmsData } = await supabase
            .from('feature_films')
            .select('id, title')
            .in('title', filmTitles)

          const filmAssociations = filmTitles.map(title => {
            const matchedFilm = filmsData?.find(f => f.title === title)
            if (!matchedFilm) {
              warnings.push(`Film "${title}" not found in database for guest ${guestName}`)
            }
            return {
              guest_id: savedGuest.id,
              film_id: matchedFilm?.id || null,
              film_title: title
            }
          })

          // Insert film associations
          const { data: guestFilmsData, error: filmsError } = await supabase
            .from('guest_films')
            .insert(filmAssociations)
            .select()

          if (filmsError) {
            warnings.push(`Error associating films for ${guestName}: ${filmsError.message}`)
          }

          // Add films to saved guest for return
          savedGuest.films = guestFilmsData || []
          savedGuest.films_display = filmTitles.join(', ')
        } else {
          savedGuest.films = []
          savedGuest.films_display = '—'
        }

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
      data: importedGuests
    }

  } catch (error) {
    return {
      success: false,
      importedGuests: 0,
      errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: []
    }
  }
}