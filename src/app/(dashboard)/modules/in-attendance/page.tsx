'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { GuestCard, GuestType, GuestFilm } from '@/types'
import { GuestCardPopup } from '@/components/cards/guest-card-popup'
import { GuestFormModal } from '@/components/forms/guest-form-modal'
import { FilmCardPopup } from '@/components/cards/film-card-popup'
import { ProgramCardPopup } from '@/components/cards/program-card-popup'
import { parseCSVContent, importGuestsFromCSV, removeFilmAssociations } from '@/lib/csv-import'
import { FilmRemovalDialog } from '@/components/import/film-removal-dialog'
import { TitleMappingConfirmation } from '@/components/TitleMappingConfirmation'
import { saveTitleMappings } from '@/lib/title-mappings'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'
import { normalizeDateValue } from '@/lib/date-utils'
import * as XLSX from 'xlsx-js-style'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableCell, TableRow, WidthType } from 'docx'

export default function InAttendancePage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const [guests, setGuests] = useState<GuestCard[]>([])
  const [filteredGuests, setFilteredGuests] = useState<GuestCard[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGuestType, setSelectedGuestType] = useState('')
  const [confirmedFilter, setConfirmedFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [checkedInFilter, setCheckedInFilter] = useState<'all' | 'in' | 'out'>('all')
  const [arrangingTravelFilter, setArrangingTravelFilter] = useState('')
  const [todayDate, setTodayDate] = useState('')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'name', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [selectedGuest, setSelectedGuest] = useState<GuestCard | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showGuestCard, setShowGuestCard] = useState<GuestCard | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [showFilmsMode, setShowFilmsMode] = useState(false)
  const [existingFilms, setExistingFilms] = useState<Set<string>>(new Set())
  const [showDailyReportDropdown, setShowDailyReportDropdown] = useState(false)
  const [customReportDate, setCustomReportDate] = useState('')
  const [searchArrivalDate, setSearchArrivalDate] = useState('')
  const [searchDepartureDate, setSearchDepartureDate] = useState('')
  const [pendingRemovals, setPendingRemovals] = useState<Array<{guestName: string, removedFilms: string[]}> | null>(null)
  const [pendingTitleMappings, setPendingTitleMappings] = useState<Array<{csvTitle: string, suggestedMatch?: string, confidence?: number}> | null>(null)
  const [pendingCSVRows, setPendingCSVRows] = useState<any[] | null>(null)
  const [screeningsData, setScreeningsData] = useState<any[]>([])
  const [guestScreenings, setGuestScreenings] = useState<Map<string, any[]>>(new Map())
  const [editingScreenings, setEditingScreenings] = useState<Set<string>>(new Set())
  const [loadingScreeningsFor, setLoadingScreeningsFor] = useState<string | null>(null)

  const supabase = createClient()

  // Check if user has edit permissions for in attendance
  const canEditInAttendance = permissions?.modulePermissions?.['inAttendance']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false

  // Daily Report generation function
  const generateDailyReport = async (reportDate: string) => {
    const formatFlightInfo = (guest: GuestCard, type: 'arrival' | 'departure'): string => {
      if (type === 'arrival') {
        const parts = []
        if (guest.arrival_airline && guest.arrival_flight_number) {
          parts.push(`${guest.arrival_airline} ${guest.arrival_flight_number}`)
        }
        if (guest.inbound_arrival_time) {
          parts.push(`arrives ${formatTime(guest.inbound_arrival_time)}`)
        }
        if (guest.arrival_origin_airport) {
          parts.push(`from ${guest.arrival_origin_airport}`)
        }
        return parts.length > 0 ? parts.join(' ') : '—'
      } else {
        const parts = []
        if (guest.departure_airline && guest.departure_flight_number) {
          parts.push(`${guest.departure_airline} ${guest.departure_flight_number}`)
        }
        if (guest.outbound_departure_time) {
          parts.push(`departs ${formatTime(guest.outbound_departure_time)}`)
        }
        if (guest.destination_airport) {
          parts.push(`to ${guest.destination_airport}`)
        }
        return parts.length > 0 ? parts.join(' ') : '—'
      }
    }

    // Categorize guests
    const arrivals = guests.filter(guest => guest.arrival_date === reportDate)
    const departures = guests.filter(guest => guest.departure_date === reportDate)
    const inAttendance = guests.filter(guest => {
      const hasArrivedBefore = !guest.arrival_date || guest.arrival_date < reportDate
      const hasntDepartedYet = !guest.departure_date || guest.departure_date > reportDate
      return hasArrivedBefore && hasntDepartedYet && guest.arrival_date !== reportDate && guest.departure_date !== reportDate
    })

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: `Daily Guest Report - ${formatDate(reportDate)}`,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400 }
          }),

          // Arrivals Section
          new Paragraph({
            text: `ARRIVALS (${arrivals.length})`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          
          ...arrivals.length === 0 ? [
            new Paragraph({
              text: "No arrivals scheduled for this date.",
              spacing: { after: 200 }
            })
          ] : arrivals.map(guest => 
            new Paragraph({
              children: [
                new TextRun({ text: guest.name, bold: true }),
                new TextRun({ text: ` | ${guest.films_display || '—'}` }),
                new TextRun({ text: ` | ${guest.role || '—'}` }),
                new TextRun({ text: ` | ${guest.hotel_name || '—'}` }),
                new TextRun({ text: ` | ${formatFlightInfo(guest, 'arrival')}` })
              ],
              spacing: { after: 100 }
            })
          ),

          // In Attendance Section
          new Paragraph({
            text: `IN ATTENDANCE (${inAttendance.length})`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          
          ...inAttendance.length === 0 ? [
            new Paragraph({
              text: "No guests currently in attendance.",
              spacing: { after: 200 }
            })
          ] : inAttendance.map(guest => 
            new Paragraph({
              children: [
                new TextRun({ text: guest.name, bold: true }),
                new TextRun({ text: ` | ${guest.films_display || '—'}` }),
                new TextRun({ text: ` | ${guest.role || '—'}` }),
                new TextRun({ text: ` | ${guest.hotel_name || '—'}` })
              ],
              spacing: { after: 100 }
            })
          ),

          // Departures Section
          new Paragraph({
            text: `DEPARTURES (${departures.length})`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          
          ...departures.length === 0 ? [
            new Paragraph({
              text: "No departures scheduled for this date.",
              spacing: { after: 200 }
            })
          ] : departures.map(guest => 
            new Paragraph({
              children: [
                new TextRun({ text: guest.name, bold: true }),
                new TextRun({ text: ` | ${guest.films_display || '—'}` }),
                new TextRun({ text: ` | ${guest.role || '—'}` }),
                new TextRun({ text: ` | ${guest.hotel_name || '—'}` }),
                new TextRun({ text: ` | ${formatFlightInfo(guest, 'departure')}` })
              ],
              spacing: { after: 100 }
            })
          )
        ]
      }]
    })

    // Generate and download
    const buffer = await Packer.toBuffer(doc)
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `daily_guest_report_${reportDate.replace(/-/g, '_')}.docx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    setShowDailyReportDropdown(false)
  }

  const handleDailyReportClick = (days: number) => {
    // Get today's date as string without timezone conversion
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1  // getMonth is 0-based, but we're only using for calculation
    const day = today.getDate()
    
    // Calculate target date using pure math (no Date object manipulation)
    let targetYear = year
    let targetMonth = month
    let targetDay = day + days
    
    // Handle day overflow
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if (targetYear % 4 === 0 && targetYear % 100 !== 0 || targetYear % 400 === 0) {
      daysInMonth[1] = 29 // Leap year
    }
    
    while (targetDay > daysInMonth[targetMonth - 1]) {
      targetDay -= daysInMonth[targetMonth - 1]
      targetMonth++
      if (targetMonth > 12) {
        targetMonth = 1
        targetYear++
        // Recalculate leap year for new year
        if (targetYear % 4 === 0 && targetYear % 100 !== 0 || targetYear % 400 === 0) {
          daysInMonth[1] = 29
        } else {
          daysInMonth[1] = 28
        }
      }
    }
    
    while (targetDay < 1) {
      targetMonth--
      if (targetMonth < 1) {
        targetMonth = 12
        targetYear--
        // Recalculate leap year for new year
        if (targetYear % 4 === 0 && targetYear % 100 !== 0 || targetYear % 400 === 0) {
          daysInMonth[1] = 29
        } else {
          daysInMonth[1] = 28
        }
      }
      targetDay += daysInMonth[targetMonth - 1]
    }
    
    // Format as YYYY-MM-DD string
    const dateString = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${targetDay.toString().padStart(2, '0')}`
    generateDailyReport(dateString)
  }

  const handleCustomDateReport = () => {
    if (customReportDate) {
      generateDailyReport(customReportDate)
      setCustomReportDate('')
    }
  }

  // Export template function for In Attendance
  const exportInAttendanceTemplate = () => {
    // Define headers with proper display names
    const headerMapping = [
      { field: 'name', display: 'Name' },
      { field: 'role', display: 'Role' },
      { field: 'films_display', display: 'Film/Program Titles' },
      { field: 'database_match', display: 'Database Match' },
      { field: 'checked_in', display: 'Checked In' },
      { field: 'guest_type', display: 'Type' },
      { field: 'arranging_travel', display: 'Arranging Travel' },
      { field: 'country', display: 'Country' },
      { field: 'arrival_date', display: 'Arrival Date' },
      { field: 'arrival_airline', display: 'Arrival Airline' },
      { field: 'arrival_flight_number', display: 'Inbound Flight #' },
      { field: 'inbound_departure_time', display: 'Inbound Depart Time' },
      { field: 'arrival_origin_airport', display: 'Origin' },
      { field: 'arrival_airport', display: 'Arrival Airport' },
      { field: 'inbound_arrival_time', display: 'Inbound Arrive Time' },
      { field: 'departure_date', display: 'Departure Date' },
      { field: 'outbound_departure_time', display: 'Outbound Depart Time' },
      { field: 'departure_airline', display: 'Departure Airline' },
      { field: 'departure_flight_number', display: 'Outbound Flight #' },
      { field: 'departure_airport', display: 'Departure Airport' },
      { field: 'destination_airport', display: 'Destination' },
      { field: 'outbound_arrival_time', display: 'Outbound Arrive Time' },
      { field: 'hotel_name', display: 'Hotel' },
      { field: 'notes', display: 'Notes' },
      { field: 'confirmed', display: 'Confirmed' }
    ]
    
    const headers = headerMapping.map(h => h.display)
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers])
    
    // Style headers - bold with light grey background
    const headerStyle = { 
      font: { bold: true, sz: 12, name: 'Arial' }, 
      fill: { patternType: "solid", fgColor: { rgb: "E8E8E8" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } }
      }
    }
    
    // Apply styles and set column widths based on header length
    const cols: any[] = []
    headers.forEach((header, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: index })
      if (!ws[cellRef]) ws[cellRef] = {}
      ws[cellRef].s = headerStyle
      
      // Calculate column width based on header length (min 15, max 30)
      cols.push({ wch: Math.min(Math.max(header.length + 2, 15), 30) })
    })
    
    ws['!cols'] = cols
    
    // Freeze the header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    
    XLSX.utils.book_append_sheet(wb, ws, 'In Attendance Template')
    XLSX.writeFile(wb, 'in_attendance_import_template.xlsx')
  }

  // Load existing films and programs only when Show Films toggle is activated
  useEffect(() => {
    const loadExistingFilms = async () => {
      if (!showFilmsMode) {
        setExistingFilms(new Set())
        return
      }

      try {
        const [featureFilms, shortFilms, programs] = await Promise.all([
          supabase.from('feature_films').select('title'),
          supabase.from('short_films').select('title'),
          supabase.from('programs').select('title')
        ])

        const allTitles = new Set<string>()
        
        if (featureFilms.data) {
          featureFilms.data.forEach(film => allTitles.add(film.title))
        }
        if (shortFilms.data) {
          shortFilms.data.forEach(film => allTitles.add(film.title))
        }
        if (programs.data) {
          programs.data.forEach(program => allTitles.add(program.title))
        }

        setExistingFilms(allTitles)
      } catch (error) {
        console.error('Error loading film/program titles:', error)
      }
    }

    loadExistingFilms()
  }, [showFilmsMode, supabase])

  const loadGuests = useCallback(async () => {
    setLoading(true)
    try {
      // Load guests with their films - explicitly fetch all records
      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select('*')
        .order('name', { ascending: true })
        .limit(1000) // Explicitly set a high limit to fetch all records

      if (guestsError) throw guestsError

      // Load guest-film and guest-program relationships
      const [guestFilmsResponse, guestProgramsResponse] = await Promise.all([
        supabase.from('guest_films').select('*'),
        supabase.from('guest_programs').select('*')
      ])

      if (guestFilmsResponse.error) throw guestFilmsResponse.error
      if (guestProgramsResponse.error) throw guestProgramsResponse.error

      // Combine guests with their films and programs associations
      const guestsWithFilms = (guestsData || []).map(guest => {
        const guestFilms = (guestFilmsResponse.data || []).filter(gf => gf.guest_id === guest.id)
        const guestPrograms = (guestProgramsResponse.data || []).filter(gp => gp.guest_id === guest.id)
        
        return {
          ...guest,
          films: guestFilms,
          programs: guestPrograms,
          // Use the stored films_display field which includes free text
          films_display: guest.films_display || '—',
          // Database Match is only used during import, not stored
          database_match: '—'
        }
      })

      setGuests(guestsWithFilms)
      setFilteredGuests(guestsWithFilms)
    } catch (error) {
      console.error('Error loading guests:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Load screenings for a single guest (on-demand)
  const loadScreeningsForGuest = useCallback(async (guest: GuestCard) => {
    setLoadingScreeningsFor(guest.id)
    try {
      // Load all published ticketing screenings if not already loaded
      let screenings = screeningsData
      if (screenings.length === 0) {
        const { data: screeningsResponse, error: screeningsError } = await supabase
          .from('ticketing_screenings')
          .select('*')
          .eq('is_published', true)
          .order('screening_date', { ascending: true })
          .order('start_time', { ascending: true })

        if (screeningsError) {
          console.error('Error loading screenings:', screeningsError)
          return
        }
        screenings = screeningsResponse || []
        setScreeningsData(screenings)
      }

      const guestScreeningsList: any[] = []

      // Get films this guest is associated with (both regular and short films)
      const allGuestFilms = guest.films || []

      // Also get short films from guest_short_films table
      const { data: shortFilmsData } = await supabase
        .from('guest_short_films')
        .select('film_title')
        .eq('guest_id', guest.id)

      if (shortFilmsData) {
        allGuestFilms.push(...shortFilmsData.map(sf => ({ film_title: sf.film_title })))
      }

      if (allGuestFilms.length > 0) {
        for (const guestFilm of allGuestFilms) {
          // Find feature film screenings
          const featureScreenings = screenings?.filter(s => s.film_title === guestFilm.film_title) || []
          guestScreeningsList.push(...featureScreenings)

          // For shorts, check if this is a short film and find its program screenings
          const { data: shortFilm, error: shortFilmError } = await supabase
            .from('short_films')
            .select('shorts_program_id, shorts_programs(program_name)')
            .eq('title', guestFilm.film_title)
            .single()

          if (shortFilmError && shortFilmError.code !== 'PGRST116') {
            console.log(`DEBUG: Error checking if ${guestFilm.film_title} is a short:`, shortFilmError)
          }

          if (shortFilm) {
            // Handle different possible data structures
            let programName = null
            if (shortFilm.shorts_programs?.program_name) {
              programName = shortFilm.shorts_programs.program_name
            } else if (shortFilm.shorts_program_id) {
              // Fallback: query the program directly
              const { data: programData } = await supabase
                .from('shorts_programs')
                .select('program_name')
                .eq('id', shortFilm.shorts_program_id)
                .single()

              programName = programData?.program_name
            }

            if (programName) {
              // Try exact match first
              let programScreenings = screenings?.filter(s => s.film_title === programName) || []

              // If no exact match, try partial match (in case of subtitle differences)
              if (programScreenings.length === 0) {
                programScreenings = screenings?.filter(s =>
                  s.film_title.includes(programName) || programName.includes(s.film_title)
                ) || []
              }

              guestScreeningsList.push(...programScreenings)
            }
          }
        }
      }

      // Remove duplicates and sort by date/time
      const uniqueScreenings = guestScreeningsList.filter((screening, index, array) =>
        array.findIndex(s => s.id === screening.id) === index
      )

      uniqueScreenings.sort((a, b) => {
        const dateCompare = a.screening_date.localeCompare(b.screening_date)
        if (dateCompare !== 0) return dateCompare
        return a.start_time.localeCompare(b.start_time)
      })

      // Update the guest screenings map
      setGuestScreenings(prev => new Map(prev.set(guest.id, uniqueScreenings)))
    } catch (error) {
      console.error('Error loading screenings for guest:', error)
    } finally {
      setLoadingScreeningsFor(null)
    }
  }, [supabase, screeningsData])

  // Get unique guest types for filtering
  const uniqueGuestTypes = useMemo(() => {
    const types = new Set<string>()
    guests.forEach(guest => {
      if (guest.guest_type) types.add(guest.guest_type)
    })
    return Array.from(types).sort()
  }, [guests])

  // Get unique arranging travel options for filtering
  const uniqueArrangingTravel = useMemo(() => {
    const options = new Set<string>()
    guests.forEach(guest => {
      if (guest.arranging_travel) options.add(guest.arranging_travel)
    })
    return Array.from(options).sort()
  }, [guests])

  // Smart sorting function with last name support and film title article handling
  const normalizeForSort = (text: string | undefined | null, field?: string): string => {
    if (!text) return ''

    // For names, extract last name for sorting
    if (field === 'name') {
      const nameParts = text.trim().split(/\s+/)
      const lastName = nameParts[nameParts.length - 1] || ''
      return lastName.toLowerCase().replace(/[^a-z0-9]/g, '')
    }

    // For film/program titles, handle multiple titles separated by commas and remove articles
    if (field === 'films_display') {
      // Split by comma to get individual titles, then normalize each one
      const titles = text.split(',').map(title => {
        return title.trim()
          .replace(/^(the|a|an)\s+/i, '') // Remove leading articles
          .replace(/[^\w\s]/g, '')
          .toLowerCase()
          .trim()
      })
      // Sort the titles and join them back for consistent sorting
      return titles.sort().join(' ')
    }

    // For other fields, use standard normalization with article removal
    return text
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/[^\w\s]/g, '')
      .toLowerCase()
      .trim()
  }

  // Filtering and sorting
  const applyFiltersAndSort = useMemo(() => {
    const filtered = guests.filter(guest => {
      // Search filter with accent-insensitive search
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<GuestCard>(
          searchTerm,
          (guest) => [
            guest.name,
            guest.country,
            guest.role,
            guest.guest_type,
            guest.films_display,
            guest.hotel_name,
            guest.notes
          ]
        )
        if (!searchFilter(guest)) return false
      }

      // Guest type filter
      if (selectedGuestType && guest.guest_type !== selectedGuestType) {
        return false
      }

      // Confirmed filter
      if (confirmedFilter !== 'all') {
        if (confirmedFilter === 'yes' && !guest.confirmed) return false
        if (confirmedFilter === 'no' && guest.confirmed) return false
      }

      // Checked in filter
      if (checkedInFilter !== 'all') {
        if (checkedInFilter === 'in' && !guest.checked_in) return false
        if (checkedInFilter === 'out' && guest.checked_in) return false
      }

      // Arranging travel filter
      if (arrangingTravelFilter && guest.arranging_travel !== arrangingTravelFilter) {
        return false
      }

      // Today filter - show guests who arrive or depart on selected date
      if (todayDate) {
        const arrivalMatch = guest.arrival_date === todayDate
        const departureMatch = guest.departure_date === todayDate
        if (!arrivalMatch && !departureMatch) return false
      }

      // Date range search filters
      if (searchArrivalDate || searchDepartureDate) {
        // If only arrival date is set: show guests arriving on that exact date
        if (searchArrivalDate && !searchDepartureDate) {
          if (guest.arrival_date !== searchArrivalDate) return false
        }
        // If only departure date is set: show guests departing on that exact date
        else if (searchDepartureDate && !searchArrivalDate) {
          if (guest.departure_date !== searchDepartureDate) return false
        }
        // If both are set: show guests arriving on/after arrival date AND departing on/before departure date
        else if (searchArrivalDate && searchDepartureDate) {
          const guestArrival = guest.arrival_date
          const guestDeparture = guest.departure_date

          // Guest must have both arrival and departure dates to be included in range search
          if (!guestArrival || !guestDeparture) return false

          // Check if guest arrives on or after search arrival date AND departs on or before search departure date
          if (guestArrival < searchArrivalDate || guestDeparture > searchDepartureDate) return false
        }
      }

      return true
    })

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof GuestCard]
        const bVal = b[sortConfig.key as keyof GuestCard]
        
        const aNorm = normalizeForSort(aVal?.toString(), sortConfig.key)
        const bNorm = normalizeForSort(bVal?.toString(), sortConfig.key)
        
        if (aNorm < bNorm) return sortConfig.direction === 'asc' ? -1 : 1
        if (aNorm > bNorm) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [guests, searchTerm, selectedGuestType, confirmedFilter, checkedInFilter, arrangingTravelFilter, todayDate, searchArrivalDate, searchDepartureDate, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return { key, direction: 'asc' }
    })
  }

  const handleResize = (columnKey: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: width
    }))
  }

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '—'
    
    // Parse YYYY-MM-DD format with string manipulation only
    const parts = dateString.split('-')
    if (parts.length !== 3) return dateString // Return as-is if not expected format
    
    const year = parts[0].slice(-2) // Get last 2 digits
    const month = parts[1]
    const day = parts[2]
    
    return `${month}/${day}/${year}`
  }

  const formatTime = (timeString: string | undefined): string => {
    if (!timeString) return '—'
    // Just return the time string as-is - no formatting
    return timeString
  }

  const formatArrivalInfo = (guest: GuestCard): string => {
    const parts = []
    if (guest.arrival_airline && guest.arrival_flight_number) {
      parts.push(`${guest.arrival_airline} ${guest.arrival_flight_number}`)
    }
    if (guest.inbound_arrival_time) {
      parts.push(`arrives ${formatTime(guest.inbound_arrival_time)}`)
    }
    if (guest.arrival_origin_airport) {
      parts.push(`from ${guest.arrival_origin_airport}`)
    }
    return parts.length > 0 ? parts.join(' ') : '—'
  }

  const formatDepartureInfo = (guest: GuestCard): string => {
    const parts = []
    if (guest.departure_airline && guest.departure_flight_number) {
      parts.push(`${guest.departure_airline} ${guest.departure_flight_number}`)
    }
    if (guest.outbound_departure_time) {
      parts.push(`departs ${formatTime(guest.outbound_departure_time)}`)
    }
    if (guest.destination_airport) {
      parts.push(`to ${guest.destination_airport}`)
    }
    return parts.length > 0 ? parts.join(' ') : '—'
  }

  const handleCheckInToggle = async (guestId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('guests')
        .update({ 
          checked_in: !currentStatus, 
          updated_at: (() => {
            const now = new Date()
            return now.getFullYear() + '-' + 
              String(now.getMonth() + 1).padStart(2, '0') + '-' + 
              String(now.getDate()).padStart(2, '0') + ' ' + 
              String(now.getHours()).padStart(2, '0') + ':' + 
              String(now.getMinutes()).padStart(2, '0') + ':' + 
              String(now.getSeconds()).padStart(2, '0')
          })()
        })
        .eq('id', guestId)

      if (error) throw error

      // Update local state
      setGuests(prev => prev.map(guest => 
        guest.id === guestId ? { ...guest, checked_in: !currentStatus } : guest
      ))
    } catch (error) {
      console.error('Error updating check-in status:', error)
      alert('Error updating check-in status')
    }
  }

  const [showFilmCard, setShowFilmCard] = useState<any>(null)
  const [showProgramCard, setShowProgramCard] = useState<any>(null)

  const openFilmCard = async (filmTitle: string) => {
    try {
      // Try to find the film in feature_films first
      let { data: filmData, error } = await supabase
        .from('feature_films')
        .select('*')
        .eq('title', filmTitle)
        .maybeSingle()

      if (!filmData || error) {
        // If not found in feature films, try short films
        const { data: shortFilmData, error: shortError } = await supabase
          .from('short_films')
          .select('*')
          .eq('title', filmTitle)
          .maybeSingle()

        if (shortFilmData && !shortError) {
          filmData = shortFilmData
        } else {
          // If not found in films, try programs
          const { data: programData, error: programError } = await supabase
            .from('programs')
            .select('*')
            .eq('title', filmTitle)
            .maybeSingle()

          if (programData && !programError) {
            // This is a program, show the Program Card instead
            setShowProgramCard(programData)
            return
          }
        }
      }

      if (filmData) {
        setShowFilmCard(filmData)
      } else {
        alert(`"${filmTitle}" not found in database`)
      }
    } catch (error) {
      console.error('Error fetching title:', error)
      alert('Error loading details')
    }
  }

  const [allTitles, setAllTitles] = useState<string[]>([])

  // Load all film and program titles for smart parsing
  useEffect(() => {
    const loadFilmTitles = async () => {
      try {
        const [featureFilms, shortFilms, programs] = await Promise.all([
          supabase.from('feature_films').select('title'),
          supabase.from('short_films').select('title'),
          supabase.from('programs').select('title')
        ])
        
        const titles = [
          ...(featureFilms.data || []).map(f => f.title),
          ...(shortFilms.data || []).map(f => f.title),
          ...(programs.data || []).map(p => p.title)
        ].filter(Boolean)
        
        setAllTitles(titles)
      } catch (error) {
        console.error('Error loading film titles:', error)
      }
    }
    
    loadFilmTitles()
  }, [supabase])

  const smartParseFilmTitles = (filmsText: string): string[] => {
    if (!filmsText || filmsText === '—' || allTitles.length === 0) {
      return []
    }

    // Sort film titles by length (longest first) to match longer titles first
    const sortedTitles = [...allTitles].sort((a, b) => b.length - a.length)
    const foundTitles: string[] = []
    let remainingText = filmsText

    for (const title of sortedTitles) {
      if (remainingText.includes(title)) {
        foundTitles.push(title)
        // Remove the found title from the text
        remainingText = remainingText.replace(title, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
      }
    }

    return foundTitles
  }

  const renderFilmTitles = (filmsDisplay: string | undefined) => {
    if (!filmsDisplay || filmsDisplay === '—') {
      return <span className="text-gray-500">—</span>
    }
    
    // Use smart parsing to get actual film titles
    const filmTitles = smartParseFilmTitles(filmsDisplay)
    
    if (filmTitles.length === 0) {
      // Fallback to simple comma split if smart parsing finds nothing
      const simpleTitles = filmsDisplay.split(', ')
      return (
        <div className="flex flex-wrap gap-1">
          {simpleTitles.map((title, index) => {
            const trimmedTitle = title.trim()
            const isExistingFilm = showFilmsMode && existingFilms.has(trimmedTitle)
            
            return (
              <span key={index}>
                {isExistingFilm ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openFilmCard(trimmedTitle)
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                  >
                    {title}
                  </button>
                ) : (
                  <span className="text-gray-900">{title}</span>
                )}
                {index < simpleTitles.length - 1 && <span className="text-gray-400">, </span>}
              </span>
            )
          })}
        </div>
      )
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {filmTitles.map((title, index) => {
          const trimmedTitle = title.trim()
          const isExistingFilm = showFilmsMode && existingFilms.has(trimmedTitle)
          
          return (
            <span key={index}>
              {isExistingFilm ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openFilmCard(trimmedTitle)
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                >
                  {title}
                </button>
              ) : (
                <span className="text-gray-900">{title}</span>
              )}
              {index < filmTitles.length - 1 && <span className="text-gray-400">, </span>}
            </span>
          )
        })}
      </div>
    )
  }

  const handleScreeningAttendanceToggle = async (guestId: string, screeningId: string, isCurrentlyAttending: boolean) => {
    if (!canEditInAttendance) return

    try {
      const guest = guests.find(g => g.id === guestId)
      if (!guest) return

      // Get current non_attending_screenings array (default to empty if field doesn't exist)
      const currentNonAttending = guest.non_attending_screenings || []

      let newNonAttending: string[]
      if (isCurrentlyAttending) {
        // Currently attending, so add to non_attending list
        newNonAttending = [...currentNonAttending, screeningId]
      } else {
        // Currently not attending, so remove from non_attending list
        newNonAttending = currentNonAttending.filter(id => id !== screeningId)
      }

      // Update guest in database (for now, we'll handle the case where column doesn't exist)
      const { error } = await supabase
        .from('guests')
        .update({ non_attending_screenings: newNonAttending })
        .eq('id', guestId)

      if (error && !error.message.includes('column "non_attending_screenings" does not exist')) {
        console.error('Error updating screening attendance:', error)
        return
      }

      // Update local state
      setGuests(prevGuests =>
        prevGuests.map(g =>
          g.id === guestId
            ? { ...g, non_attending_screenings: newNonAttending }
            : g
        )
      )
    } catch (error) {
      console.error('Error toggling screening attendance:', error)
    }
  }

  const renderScreeningAttendance = (guest: GuestCard) => {
    const isEditing = editingScreenings.has(guest.id)
    const isLoading = loadingScreeningsFor === guest.id
    const guestScreeningsList = guestScreenings.get(guest.id) || []
    const nonAttendingIds = guest.non_attending_screenings || []

    // Generate static display text from screenings data if available
    const getDisplayText = () => {
      if (guestScreeningsList.length === 0) return '—'

      const attendingScreenings = guestScreeningsList.filter(screening =>
        !nonAttendingIds.includes(screening.id)
      )

      if (attendingScreenings.length === 0) return 'Not attending'

      return attendingScreenings.map(screening => {
        // Format date as MM/DD
        const date = screening.screening_date ? (() => {
          const [year, month, day] = screening.screening_date.split('-')
          return `${month}/${day}`
        })() : 'TBD'

        // Format time as 12-hour format
        const time = screening.start_time ? (() => {
          const [hours, minutes] = screening.start_time.split(':')
          const hour24 = parseInt(hours, 10)
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
          const ampm = hour24 >= 12 ? 'pm' : 'am'
          return `${hour12}:${minutes}${ampm}`
        })() : 'TBD'

        return `${date}, ${time}`
      }).join('; ')
    }

    const handleCellClick = async (e: React.MouseEvent) => {
      e.stopPropagation() // Prevent guest card modal from opening
      if (!canEditInAttendance || isLoading) return

      if (!isEditing) {
        // Enter edit mode
        setEditingScreenings(prev => new Set(prev).add(guest.id))
        // Load screenings if not already loaded
        if (guestScreeningsList.length === 0) {
          await loadScreeningsForGuest(guest)
        }
      }
    }

    const handleSave = () => {
      setEditingScreenings(prev => {
        const newSet = new Set(prev)
        newSet.delete(guest.id)
        return newSet
      })
    }

    if (isLoading) {
      return (
        <div className="flex items-center space-x-2 p-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-xs text-gray-500">Loading...</span>
        </div>
      )
    }

    if (isEditing) {
      return (
        <div className="space-y-1 p-2 bg-blue-50 border border-blue-200 rounded">
          {guestScreeningsList.length === 0 ? (
            <span className="text-gray-500 text-xs">No screenings found</span>
          ) : (
            guestScreeningsList.map((screening) => {
              const isAttending = !nonAttendingIds.includes(screening.id)

              // Format date as MM/DD
              const date = screening.screening_date ? (() => {
                const [year, month, day] = screening.screening_date.split('-')
                return `${month}/${day}`
              })() : 'TBD'

              // Format time as 12-hour format
              const time = screening.start_time ? (() => {
                const [hours, minutes] = screening.start_time.split(':')
                const hour24 = parseInt(hours, 10)
                const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
                const ampm = hour24 >= 12 ? 'pm' : 'am'
                return `${hour12}:${minutes}${ampm}`
              })() : 'TBD'

              return (
                <div key={screening.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isAttending}
                    onChange={() => handleScreeningAttendanceToggle(guest.id, screening.id, isAttending)}
                    className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-xs text-gray-900">
                    {date}, {time}
                  </span>
                </div>
              )
            })
          )}
          <div className="flex space-x-2 mt-2">
            <button
              onClick={handleSave}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      )
    }

    // Static display mode
    return (
      <div
        className={`text-xs text-gray-900 p-2 rounded cursor-pointer hover:bg-gray-50 ${
          canEditInAttendance ? 'hover:border hover:border-blue-300' : ''
        }`}
        onClick={handleCellClick}
        title={canEditInAttendance ? 'Click to edit screening attendance' : ''}
      >
        {getDisplayText()}
      </div>
    )
  }

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadStatus('Reading CSV file...')

    try {
      const csvContent = await file.text()
      setUploadStatus('Parsing CSV data...')
      
      const csvRows = await parseCSVContent(csvContent)
      setUploadStatus(`Processing ${csvRows.length} rows...`)
      
      const result = await importGuestsFromCSV(csvRows)

      if (result.titleMappingsRequired && result.titleMappingsRequired.length > 0) {
        // Need title confirmation
        setPendingTitleMappings(result.titleMappingsRequired)
        setPendingCSVRows(csvRows)
        setUploadStatus('Please confirm title mappings...')
      } else if (result.success) {
        setUploadStatus(`Successfully imported ${result.importedGuests} guests!`)

        // Check if there are film removals to confirm
        if (result.filmRemovals && result.filmRemovals.length > 0) {
          setPendingRemovals(result.filmRemovals)
          setUploadStatus('Import complete. Please review film removals...')
        } else {
          await loadGuests() // Reload the guests list
        }

        if (result.warnings.length > 0) {
          console.warn('Import warnings:', result.warnings)
          // Don't show alert for warnings if we have removals to review
          if (!result.filmRemovals || result.filmRemovals.length === 0) {
            alert(`Import completed with ${result.warnings.length} warnings. Check console for details.`)
          }
        }
      } else {
        setUploadStatus('Import failed')
        alert(`Import failed with errors:\n${result.errors.join('\n')}`)
      }
    } catch (error) {
      console.error('CSV import error:', error)
      setUploadStatus('Import failed')
      alert('Error importing CSV file. Please check the file format.')
    } finally {
      setUploading(false)
      // Clear the file input
      event.target.value = ''
      // Clear status after a delay
      setTimeout(() => setUploadStatus(''), 3000)
    }
  }

  useEffect(() => {
    setFilteredGuests(applyFiltersAndSort)
  }, [applyFiltersAndSort])

  useEffect(() => {
    loadGuests()
  }, [loadGuests])

  // Remove automatic loading - now on-demand only

  // Click away handler for Daily Report dropdown
  useEffect(() => {
    const handleClickAway = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.daily-report-dropdown')) {
        setShowDailyReportDropdown(false)
      }
    }

    if (showDailyReportDropdown) {
      document.addEventListener('mousedown', handleClickAway)
      return () => document.removeEventListener('mousedown', handleClickAway)
    }
  }, [showDailyReportDropdown])

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">👥</span>
            <h1 className="text-2xl font-semibold text-gray-900">In Attendance</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            {canEditInAttendance && (
              <button
                onClick={exportInAttendanceTemplate}
                className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
              >
                📄 Create In Attendance Template
              </button>
            )}
            <button
              onClick={() => setShowFilmsMode(!showFilmsMode)}
              className={`px-4 py-2 rounded-md transition-colors font-medium ${
                showFilmsMode 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              🎬 {showFilmsMode ? 'Hide Films' : 'Show Films'}
            </button>
            {canEditInAttendance && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Add Guest
              </button>
            )}
            {canEditInAttendance && (
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <button
                  disabled={uploading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Importing...' : 'Import CSV'}
                </button>
              </div>
            )}
            {uploadStatus && (
              <span className="text-sm text-gray-600">{uploadStatus}</span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search guests, films, hotels..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Date Range Search */}
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search by Dates:</label>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-600">Arrival:</label>
                <input
                  type="date"
                  value={searchArrivalDate}
                  onChange={(e) => setSearchArrivalDate(e.target.value)}
                  onBlur={(e) => {
                    const normalized = normalizeDateValue(e.target.value)
                    if (normalized !== e.target.value) {
                      setSearchArrivalDate(normalized)
                    }
                  }}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-600">Departure:</label>
                <input
                  type="date"
                  value={searchDepartureDate}
                  onChange={(e) => setSearchDepartureDate(e.target.value)}
                  onBlur={(e) => {
                    const normalized = normalizeDateValue(e.target.value)
                    if (normalized !== e.target.value) {
                      setSearchDepartureDate(normalized)
                    }
                  }}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {(searchArrivalDate || searchDepartureDate) && (
                <button
                  onClick={() => {
                    setSearchArrivalDate('')
                    setSearchDepartureDate('')
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
                >
                  Clear Dates
                </button>
              )}
              <div className="text-xs text-gray-500">
                {searchArrivalDate && !searchDepartureDate && 'Showing: arriving on selected date'}
                {!searchArrivalDate && searchDepartureDate && 'Showing: departing on selected date'}
                {searchArrivalDate && searchDepartureDate && 'Showing: present during date range'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Guest Type Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Type:</label>
              <select
                value={selectedGuestType}
                onChange={(e) => setSelectedGuestType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                {uniqueGuestTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Confirmed Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Confirmed:</label>
              <select
                value={confirmedFilter}
                onChange={(e) => setConfirmedFilter(e.target.value as 'all' | 'yes' | 'no')}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Check-in Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Checked In:</label>
              <select
                value={checkedInFilter}
                onChange={(e) => setCheckedInFilter(e.target.value as 'all' | 'in' | 'out')}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="in">Checked In</option>
                <option value="out">Not Checked In</option>
              </select>
            </div>

            {/* Arranging Travel Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Travel:</label>
              <select
                value={arrangingTravelFilter}
                onChange={(e) => setArrangingTravelFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                {uniqueArrangingTravel.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* Today Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Today:</label>
              <input
                type="date"
                value={todayDate}
                onChange={(e) => setTodayDate(e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeDateValue(e.target.value)
                  if (normalized !== e.target.value) {
                    setTodayDate(normalized)
                  }
                }}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Clear Filters */}
            {(searchTerm || selectedGuestType || confirmedFilter !== 'all' || checkedInFilter !== 'all' || arrangingTravelFilter || todayDate || searchArrivalDate || searchDepartureDate) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedGuestType('')
                  setConfirmedFilter('all')
                  setCheckedInFilter('all')
                  setArrangingTravelFilter('')
                  setTodayDate('')
                  setSearchArrivalDate('')
                  setSearchDepartureDate('')
                }}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Daily Report Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="relative daily-report-dropdown">
          <button
            onClick={() => setShowDailyReportDropdown(!showDailyReportDropdown)}
            className="bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700 flex items-center space-x-1"
          >
            <span>📊</span>
            <span>Daily Report</span>
            <span>{showDailyReportDropdown ? '▲' : '▼'}</span>
          </button>
          
          {showDailyReportDropdown && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px]">
              <div className="py-1">
                <button
                  onClick={() => handleDailyReportClick(-1)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Yesterday
                </button>
                <button
                  onClick={() => handleDailyReportClick(0)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Today
                </button>
                <button
                  onClick={() => handleDailyReportClick(1)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Tomorrow
                </button>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <div className="px-4 py-2">
                    <label className="block text-xs text-gray-500 mb-1">Custom Date:</label>
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        value={customReportDate}
                        onChange={(e) => setCustomReportDate(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-xs flex-1"
                      />
                      <button
                        onClick={handleCustomDateReport}
                        disabled={!customReportDate}
                        className="bg-orange-600 text-white px-2 py-1 rounded text-xs hover:bg-orange-700 disabled:bg-gray-400"
                      >
                        Go
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-gray-50 px-6 py-2 text-sm text-gray-600 border-b border-gray-200">
        Showing {filteredGuests.length} of {guests.length} guests
        {searchTerm && ` for "${searchTerm}"`}
        {selectedGuestType && ` (${selectedGuestType})`}
        {todayDate && ` on ${formatDate(todayDate)}`}
        {searchArrivalDate && !searchDepartureDate && ` arriving ${formatDate(searchArrivalDate)}`}
        {!searchArrivalDate && searchDepartureDate && ` departing ${formatDate(searchDepartureDate)}`}
        {searchArrivalDate && searchDepartureDate && ` present ${formatDate(searchArrivalDate)} - ${formatDate(searchDepartureDate)}`}
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto p-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-500">Loading guests...</div>
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {[
                  { key: 'name', label: 'Name', width: 150, sortable: true },
                  { key: 'role', label: 'Role', width: 120, sortable: false },
                  { key: 'films_display', label: 'Film / Program Titles', width: 200, sortable: true },
                  { key: 'appearing_at_screenings', label: 'Appearing At Screening(s)', width: 250, sortable: false },
                  { key: 'checked_in', label: 'Checked In', width: 80, sortable: true },
                  { key: 'guest_type', label: 'Type', width: 80, sortable: true },
                  { key: 'arranging_travel', label: 'Arranging Travel', width: 120, sortable: true },
                  { key: 'country', label: 'Country', width: 100, sortable: true },
                  { key: 'arrival_date', label: 'Arrival Date', width: 100, sortable: true },
                  { key: 'arrival_airline', label: 'Arrival Airline', width: 100, sortable: false },
                  { key: 'arrival_flight_number', label: 'Flight #', width: 80, sortable: false },
                  { key: 'inbound_departure_time', label: 'Depart Time', width: 100, sortable: false },
                  { key: 'arrival_origin_airport', label: 'Origin', width: 80, sortable: false },
                  { key: 'arrival_airport', label: 'Arrival Airport', width: 100, sortable: false },
                  { key: 'inbound_arrival_time', label: 'Arrive Time', width: 100, sortable: false },
                  { key: 'departure_date', label: 'Departure Date', width: 100, sortable: true },
                  { key: 'outbound_departure_time', label: 'Depart Time', width: 100, sortable: false },
                  { key: 'departure_airline', label: 'Departure Airline', width: 100, sortable: false },
                  { key: 'departure_flight_number', label: 'Flight #', width: 80, sortable: false },
                  { key: 'departure_airport', label: 'Departure Airport', width: 100, sortable: false },
                  { key: 'destination_airport', label: 'Destination', width: 100, sortable: false },
                  { key: 'outbound_arrival_time', label: 'Arrive Time', width: 100, sortable: false },
                  { key: 'hotel_name', label: 'Hotel', width: 120, sortable: false },
                  { key: 'notes', label: 'Notes', width: 200, sortable: false },
                  { key: 'confirmed', label: 'Confirmed', width: 80, sortable: true }
                ].map((column) => (
                  <th
                    key={column.key}
                    className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 relative ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    } ${
                      column.key === 'name' ? 'sticky left-0 bg-gray-50 z-10' : ''
                    }`}
                    style={{ 
                      width: columnWidths[column.key] || column.width,
                      minWidth: '100px'
                    }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <span className="ml-2">
                          {sortConfig?.key === column.key ? (
                            sortConfig.direction === 'asc' ? '↑' : '↓'
                          ) : '↕️'}
                        </span>
                      )}
                    </div>
                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-gray-200 hover:bg-blue-500 opacity-30 hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        
                        const startX = e.pageX
                        const startWidth = columnWidths[column.key] || column.width || 150

                        const handleMouseMove = (e: MouseEvent) => {
                          e.preventDefault()
                          const newWidth = Math.max(100, startWidth + (e.pageX - startX))
                          handleResize(column.key, newWidth)
                        }

                        const handleMouseUp = (e: MouseEvent) => {
                          e.preventDefault()
                          document.removeEventListener('mousemove', handleMouseMove)
                          document.removeEventListener('mouseup', handleMouseUp)
                        }

                        document.addEventListener('mousemove', handleMouseMove)
                        document.addEventListener('mouseup', handleMouseUp)
                      }}
                    />
                  </th>
                ))}
                {canEditInAttendance && (
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGuests.map((guest) => (
                <tr
                  key={guest.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setShowGuestCard(guest)}
                >
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 sticky left-0 bg-white z-10" style={{ minWidth: `${columnWidths['name'] || 150}px` }}>
                    {guest.name}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['role'] || 120}px` }}>
                    {guest.role || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['films_display'] || 200}px` }}>
                    {renderFilmTitles(guest.films_display)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['appearing_at_screenings'] || 250}px` }}>
                    {renderScreeningAttendance(guest)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center" style={{ minWidth: `${columnWidths['checked_in'] || 80}px` }}>
                    <input
                      type="checkbox"
                      checked={guest.checked_in}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleCheckInToggle(guest.id, guest.checked_in)
                      }}
                      disabled={!canEditInAttendance}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['guest_type'] || 100}px` }}>
                    {guest.guest_type}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['arranging_travel'] || 80}px` }}>
                    {guest.arranging_travel || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['country'] || 100}px` }}>
                    {guest.country || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['arrival_date'] || 100}px` }}>
                    {formatDate(guest.arrival_date)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['arrival_airline'] || 100}px` }}>
                    {guest.arrival_airline || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['arrival_flight_number'] || 80}px` }}>
                    {guest.arrival_flight_number || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['inbound_departure_time'] || 100}px` }}>
                    {formatTime(guest.inbound_departure_time)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['arrival_origin_airport'] || 80}px` }}>
                    {guest.arrival_origin_airport || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['arrival_airport'] || 100}px` }}>
                    {guest.arrival_airport || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['inbound_arrival_time'] || 100}px` }}>
                    {formatTime(guest.inbound_arrival_time)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['departure_date'] || 100}px` }}>
                    {formatDate(guest.departure_date)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['outbound_departure_time'] || 100}px` }}>
                    {formatTime(guest.outbound_departure_time)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['departure_airline'] || 100}px` }}>
                    {guest.departure_airline || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['departure_flight_number'] || 80}px` }}>
                    {guest.departure_flight_number || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['departure_airport'] || 100}px` }}>
                    {guest.departure_airport || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['destination_airport'] || 100}px` }}>
                    {guest.destination_airport || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['outbound_arrival_time'] || 100}px` }}>
                    {formatTime(guest.outbound_arrival_time)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['hotel_name'] || 120}px` }}>
                    {guest.hotel_name || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 border-r border-gray-100" style={{ minWidth: `${columnWidths['notes'] || 200}px` }}>
                    <div className="text-xs truncate" title={guest.notes || ''}>{guest.notes || '—'}</div>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['confirmed'] || 80}px` }}>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      guest.confirmed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {guest.confirmed ? 'Yes' : 'No'}
                    </span>
                  </td>
                  {canEditInAttendance && (
                    <td className="px-3 py-2 text-center text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedGuest(guest)
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-xs font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {!loading && filteredGuests.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {guests.length === 0 ? 'No guests found. Add your first guest or import from CSV!' : 'No guests match your search criteria.'}
          </div>
        )}
            </div>
          </div>
        </div>
      </div>

      {/* Guest Form Modal */}
      <GuestFormModal
        guest={showAddModal ? null : selectedGuest}
        isOpen={showAddModal || !!selectedGuest}
        onClose={() => {
          setShowAddModal(false)
          setSelectedGuest(null)
        }}
        onSave={(savedGuest) => {
          if (selectedGuest) {
            // Update existing guest in list
            setGuests(prev => 
              prev.map(g => g.id === savedGuest.id ? savedGuest : g)
            )
          } else {
            // Add new guest to list
            setGuests(prev => [savedGuest, ...prev])
          }
          setShowAddModal(false)
          setSelectedGuest(null)
        }}
      />

      {/* Guest Card Popup */}
      {showGuestCard && (
        <GuestCardPopup
          guest={showGuestCard}
          onClose={() => setShowGuestCard(null)}
          onEdit={(guest) => {
            setSelectedGuest(guest)
            setShowGuestCard(null)
          }}
          onUpdate={(updatedGuest) => {
            setGuests(prev => 
              prev.map(g => g.id === updatedGuest.id ? updatedGuest : g)
            )
            setShowGuestCard(null)
          }}
          onDelete={(guestId) => {
            setGuests(prev => prev.filter(g => g.id !== guestId))
            setShowGuestCard(null)
          }}
        />
      )}

      {/* Film Card Popup */}
      {showFilmCard && (
        <FilmCardPopup
          film={showFilmCard}
          onClose={() => setShowFilmCard(null)}
        />
      )}

      {/* Program Card Popup */}
      {showProgramCard && (
        <ProgramCardPopup
          program={showProgramCard}
          onClose={() => setShowProgramCard(null)}
        />
      )}

      {/* Film Removal Dialog */}
      {pendingTitleMappings && pendingCSVRows && (
        <TitleMappingConfirmation
          mappings={pendingTitleMappings}
          onConfirm={async (confirmedMappings) => {
            setUploadStatus('Saving title mappings...')
            const saved = await saveTitleMappings(confirmedMappings)
            if (saved) {
              setUploadStatus('Re-processing CSV with confirmed mappings...')
              const result = await importGuestsFromCSV(pendingCSVRows, confirmedMappings)
              if (result.success) {
                setUploadStatus(`Successfully imported ${result.importedGuests} guests!`)
                if (result.filmRemovals && result.filmRemovals.length > 0) {
                  setPendingRemovals(result.filmRemovals)
                  setUploadStatus('Import complete. Please review film removals...')
                } else {
                  await loadGuests()
                }
              } else {
                setUploadStatus('Import failed')
                alert(`Import failed with errors:\n${result.errors.join('\n')}`)
              }
            } else {
              setUploadStatus('Failed to save mappings')
            }
            setPendingTitleMappings(null)
            setPendingCSVRows(null)
            setTimeout(() => setUploadStatus(''), 3000)
          }}
          onCancel={() => {
            setPendingTitleMappings(null)
            setPendingCSVRows(null)
            setUploadStatus('')
          }}
        />
      )}

      {pendingRemovals && (
        <FilmRemovalDialog
          removals={pendingRemovals}
          onConfirm={async (confirmedRemovals) => {
            if (confirmedRemovals.length > 0) {
              setUploadStatus('Removing film associations...')
              const result = await removeFilmAssociations(confirmedRemovals)
              if (!result.success) {
                alert(`Some removals failed: ${result.errors.join(', ')}`)
              }
            }
            setPendingRemovals(null)
            await loadGuests() // Reload the guests list
            setTimeout(() => setUploadStatus(''), 3000)
          }}
          onCancel={async () => {
            setPendingRemovals(null)
            await loadGuests() // Reload the guests list
            setTimeout(() => setUploadStatus(''), 3000)
          }}
        />
      )}
    </div>
  )
}