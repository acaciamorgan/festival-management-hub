'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { DraggableModal } from '@/components/ui/draggable-modal'
import { getStringDayOfWeek, formatStringTime } from '@/lib/string-date-utils'
import { ReadOnlyScreeningBoard } from '@/components/shared/readonly-screening-board'
import { FilmCardPopup } from '@/components/cards/film-card-popup'
import { isCSVRowStrikethrough } from '@/lib/excel-utils'
import { detectChangedFields, logFieldChanges, fetchFieldChanges, getCellHighlightClass } from '@/lib/field-changes'
import * as XLSX from 'xlsx-js-style'

// Helper functions for calendar calculations without Date objects
function getDaysInMonth(year: number, month: number): number {
  // Month is 1-based (January = 1)
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30
  }
  return 31
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
}

function getCurrentDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Interface for published screenings
interface PublishedScreening {
  id: string
  ticketing_screening_id: string
  film_card_id: string
  film_title: string
  film_id?: string | null
  film_type?: string | null
  screening_date: string
  day_of_week: string
  start_time: string
  run_time: number | null
  venue_short_code: string
  capacity: number | null
  notes: string | null
  is_cancelled: boolean
  // published_by: string
  created_at: string
  updated_at: string
}

// Interface for P&I/Jury screenings
interface PIJuryScreening {
  id: string
  film_title: string
  film_id?: string | null
  film_type?: string | null
  screening_type: 'P&I' | 'Jury'
  screening_date: string
  day_of_week: string
  start_time: string
  run_time: number | null
  venue_short_code: string
  capacity: number | null
  notes: string | null
  is_cancelled: boolean
  is_tentative?: boolean
  film_approved?: boolean
  locked?: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// Interface for Tech Check screenings
interface TechCheckScreening {
  id: string
  film_title: string
  film_id?: string | null
  film_type?: string | null
  screening_date: string
  day_of_week: string
  start_time: string
  run_time: number | null
  venue_short_code: string
  tech_contact: string | null
  notes: string | null
  is_cancelled: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// Interface for screening form data
interface ScreeningFormData {
  film_title: string
  film_id?: string | null
  film_type?: string | null
  screening_date: string
  start_time: string
  run_time: number | null
  venue_short_code: string
  capacity: number | null
  notes: string
  screening_type?: 'P&I' | 'Jury'
  tech_contact?: string
}

type ViewMode = 'ticketing' | 'pi-jury' | 'tech-checks' | 'screening-board'

export default function TicketingPage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const { currentYear } = useFestivalYear()
  const canEditTicketing = permissions?.modulePermissions?.['ticketing']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false
  const canReadTicketing = permissions?.modulePermissions?.['ticketing']?.canRead || permissions?.isAdmin || permissions?.isSuperAdmin || false
  const [viewMode, setViewMode] = useState<ViewMode>('ticketing')
  
  
  // Update view mode globally
  const updateViewMode = async (newViewMode: ViewMode) => {
    setViewMode(newViewMode)
  }
  
  // Data states
  const [publishedScreenings, setPublishedScreenings] = useState<PublishedScreening[]>([])
  const [piJuryScreenings, setPiJuryScreenings] = useState<PIJuryScreening[]>([])
  const [techCheckScreenings, setTechCheckScreenings] = useState<TechCheckScreening[]>([])
  
  // Auto-suggest data
  const [filmCards, setFilmCards] = useState<any[]>([])
  const [venueCards, setVenueCards] = useState<any[]>([])
  const [showFilmSuggestions, setShowFilmSuggestions] = useState(false)
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false)
  const [filmSearchTerm, setFilmSearchTerm] = useState('')
  const [venueSearchTerm, setVenueSearchTerm] = useState('')
  
  // UI states
  const [loading, setLoading] = useState(false)
  const [fieldChangesMap, setFieldChangesMap] = useState<Map<string, Set<string>>>(new Map())
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingScreening, setEditingScreening] = useState<any>(null)
  const [showExportDropdown, setShowExportDropdown] = useState(false)

  // Film detail modal state
  
  // Form state
  const [formData, setFormData] = useState<ScreeningFormData>({
    film_title: '',
    screening_date: '',
    start_time: '',
    run_time: null,
    venue_short_code: '',
    capacity: null,
    notes: ''
  })
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

  // Film card popup state
  const [selectedFilm, setSelectedFilm] = useState<any>(null)
  const [showFilmCard, setShowFilmCard] = useState(false)

  // Unpublish state
  const [selectedForUnpublish, setSelectedForUnpublish] = useState<Set<string>>(new Set())
  const [unpublishing, setUnpublishing] = useState(false)

  const supabase = createClient()
  

  // Helper functions
  const formatDate = (dateString: string): string => {
    try {
      const parts = dateString.split('-')  // [YYYY, MM, DD]
      if (parts.length !== 3) return dateString
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const month = parseInt(parts[1]) - 1
      const day = parseInt(parts[2])
      
      return `${monthNames[month]}. ${day}`
    } catch {
      return dateString
    }
  }

  const getDayOfWeek = (dateString: string): string => {
    return getStringDayOfWeek(dateString)
  }

  const formatTime = (timeString: string): string => {
    return formatStringTime(timeString)
  }

  // Load data functions
  const loadPublishedScreenings = useCallback(async () => {
    try {
      // Load screenings with film details from view
      const { data, error } = await supabase
        .from('ticketing_screenings_with_films')
        .select('*')
        .eq('festival_year', currentYear)
        .order('screening_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error
      setPublishedScreenings(data || [])
    } catch (error) {
      console.error('Error loading published screenings:', error)
    }
  }, [supabase, currentYear])

  const loadPIJuryScreenings = useCallback(async () => {
    try {
      // Load P&I/Jury screenings with film details
      const { data: screenings, error } = await supabase
        .from('pi_jury_screenings_with_films')
        .select('*')
        .eq('festival_year', currentYear)
        .order('screening_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error && error.code !== 'PGRST116') throw error // Ignore table not found for now

      if (!screenings || screenings.length === 0) {
        setPiJuryScreenings([])
        return
      }

      // Get theater capacities
      const { data: theaters, error: theaterError } = await supabase
        .from('theater_houses')
        .select('short_code, seat_count')
        .eq('festival_year', currentYear)

      if (theaterError) throw theaterError

      // Map screenings with current theater capacity
      const mappedData = screenings.map(screening => {
        const theater = theaters?.find(t => t.short_code === screening.venue_short_code)
        return {
          ...screening,
          capacity: theater?.seat_count || screening.capacity
        }
      })

      setPiJuryScreenings(mappedData)
    } catch (error) {
      console.error('Error loading P&I/Jury screenings:', error)
      setPiJuryScreenings([]) // Set empty array if table doesn't exist yet
    }
  }, [supabase, currentYear])

  const loadTechCheckScreenings = useCallback(async () => {
    try {
      // Load tech check screenings with film details
      const { data, error } = await supabase
        .from('tech_check_screenings_with_films')
        .select('*')
        .eq('festival_year', currentYear)
        .order('screening_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error && error.code !== 'PGRST116') throw error // Ignore table not found for now
      setTechCheckScreenings(data || [])
    } catch (error) {
      console.error('Error loading tech check screenings:', error)
      setTechCheckScreenings([]) // Set empty array if table doesn't exist yet
    }
  }, [supabase, currentYear])

  // Sync press screenings to P&I screenings
  const syncPressScreenings = useCallback(async () => {
    try {
      // Get all press screenings with venue info
      const { data: pressScreenings, error: pressError } = await supabase
        .from('press_screenings')
        .select(`
          *,
          venues(name)
        `)
        .eq('canceled', false)
        .eq('festival_year', currentYear)

      if (pressError) throw pressError

      // Batch-load all feature film runtimes in one query
      const { data: allFeatureFilms } = await supabase
        .from('feature_films')
        .select('id, run_time')
        .eq('festival_year', currentYear)

      const featureRuntimeMap = new Map<string, number | null>()
      for (const film of allFeatureFilms || []) {
        featureRuntimeMap.set(film.id, film.run_time)
      }

      // Batch-load all existing PI jury screenings in one query
      const { data: allPiJuryScreenings } = await supabase
        .from('pi_jury_screenings')
        .select('id, film_id, screening_date, start_time, festival_year')
        .eq('festival_year', currentYear)

      // Build lookup map keyed by "film_id|screening_date" for P&I type screenings
      const piJuryMap = new Map<string, string>()
      for (const pij of allPiJuryScreenings || []) {
        const key = `${pij.film_id}|${pij.screening_date}`
        piJuryMap.set(key, pij.id)
      }

      // Process each press screening
      let successCount = 0
      let updatedCount = 0

      for (const screening of pressScreenings || []) {
        if (!screening.screening_date || !screening.screening_time) continue
        if (!screening.short_code) continue
        if (!screening.film_id) continue

        const shortCode = screening.short_code

        // Look up runtime from pre-loaded map
        let runtime = null
        if (screening.film_type === 'feature') {
          const mappedRuntime = featureRuntimeMap.get(screening.film_id)
          if (mappedRuntime) runtime = mappedRuntime
        }

        // Look up venue capacity
        let capacity = null
        const venueMatch = venueCards.find(venue =>
          venue.short_code === shortCode
        )
        if (venueMatch) {
          capacity = venueMatch.capacity
        }

        // Check if this screening already exists using pre-loaded map
        const existingKey = `${screening.film_id}|${screening.screening_date}`
        const existingId = piJuryMap.get(existingKey)

        if (existingId) {
          // Update existing screening
          const { error: updateError } = await supabase
            .from('pi_jury_screenings')
            .update({
              start_time: screening.screening_time,
              venue_short_code: shortCode,
              capacity: capacity,
              notes: screening.notes,
              is_tentative: !(screening.film_approved && screening.locked),
              film_approved: screening.film_approved || false,
              locked: screening.locked || false,
              day_of_week: getDayOfWeek(screening.screening_date),
              film_id: screening.film_id,
              film_type: screening.film_type || null,
              festival_year: currentYear
            })
            .eq('id', existingId)

          if (!updateError) updatedCount++
        } else {
          // Create new P&I screening
          const { error: insertError } = await supabase
            .from('pi_jury_screenings')
            .insert({
              film_id: screening.film_id,
              film_type: screening.film_type || null,
              festival_year: currentYear,
              screening_type: 'P&I',
              screening_date: screening.screening_date,
              day_of_week: getDayOfWeek(screening.screening_date),
              start_time: screening.screening_time,
              venue_short_code: shortCode,
              capacity: capacity,
              notes: screening.notes,
              is_cancelled: false,
              is_tentative: !(screening.film_approved && screening.locked),
              film_approved: screening.film_approved || false,
              locked: screening.locked || false
            })

          if (!insertError) successCount++
        }
      }


      await loadPIJuryScreenings()
    } catch (error) {
      console.error('Error syncing press screenings:', error)
      alert('Error syncing press screenings. Please try again.')
    }
  }, [supabase, user, getDayOfWeek, loadPIJuryScreenings, currentYear, venueCards])

  // Load film cards for auto-suggest (features + shorts programs)
  const loadFilmCards = useCallback(async () => {
    try {
      const { data: features, error: featError } = await supabase
        .from('feature_films')
        .select('id, title, run_time')
        .eq('festival_year', currentYear)
        .order('title')

      if (featError) throw featError

      // Also load shorts programs as film cards
      const { data: programs, error: progError } = await supabase
        .from('shorts_programs')
        .select('id, program_name, program_number')
        .eq('festival_year', currentYear)
        .order('program_number')

      if (progError) throw progError

      // Batch-load all short films with their program IDs and runtimes in one query
      const { data: allShorts } = await supabase
        .from('short_films')
        .select('shorts_program_id, run_time')
        .eq('festival_year', currentYear)

      // Group runtimes by shorts_program_id
      const runtimeByProgram = new Map<string, number>()
      for (const short of allShorts || []) {
        if (short.shorts_program_id) {
          const current = runtimeByProgram.get(short.shorts_program_id) || 0
          runtimeByProgram.set(short.shorts_program_id, current + (short.run_time || 0))
        }
      }

      // Build program cards using pre-computed runtimes
      const programCards = (programs || []).map((program) => {
        const totalRuntime = runtimeByProgram.get(program.id) || 0
        return {
          id: program.id,
          title: program.program_name,
          run_time: totalRuntime,
          film_type: 'shorts_program'
        }
      })

      // Combine features (with film_type) and shorts programs
      const featureCards = (features || []).map(f => ({ ...f, film_type: 'feature' }))
      setFilmCards([...featureCards, ...programCards])
    } catch (error) {
      console.error('Error loading film cards:', error)
    }
  }, [supabase, currentYear])

  // Load venue cards with capacity from theater_houses table
  const loadVenueCards = useCallback(async () => {
    try {
      // Get all theater houses with capacity data
      const { data: theaterHouses, error } = await supabase
        .from('theater_houses')
        .select('short_code, seat_count, house_name')
        .eq('festival_year', currentYear)
        .not('short_code', 'is', null)
        .order('short_code')

      if (error) {
        console.error('Error loading theater houses:', error)
        return
      }

      // Remove duplicates by keeping the first occurrence of each short_code
      const uniqueVenues = new Map()
      theaterHouses.forEach(theater => {
        if (!uniqueVenues.has(theater.short_code)) {
          uniqueVenues.set(theater.short_code, {
            id: theater.short_code,
            short_code: theater.short_code,
            display_name: theater.short_code,
            capacity: theater.seat_count,
            house_name: theater.house_name
          })
        }
      })

      const venueCards = Array.from(uniqueVenues.values())
      setVenueCards(venueCards)


    } catch (error) {
      console.error('Error loading venue cards:', error)
    }
  }, [supabase, currentYear])

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadPublishedScreenings(),
        loadPIJuryScreenings(),
        loadTechCheckScreenings(),
        loadFilmCards(),
        loadVenueCards()
      ])
    } finally {
      setLoading(false)
    }
  }, [loadPublishedScreenings, loadPIJuryScreenings, loadTechCheckScreenings, loadFilmCards, loadVenueCards])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Fetch field changes for highlighting after data loads
  useEffect(() => {
    const loadFieldChanges = async () => {
      const allIds: string[] = []
      const tableMap: Record<string, string[]> = {}

      const addIds = (items: any[], table: string) => {
        const ids = items.map(i => i.id)
        allIds.push(...ids)
        tableMap[table] = ids
      }

      addIds(publishedScreenings, 'ticketing_screenings')
      addIds(piJuryScreenings, 'pi_jury_screenings')
      addIds(techCheckScreenings, 'tech_check_screenings')

      const merged = new Map<string, Set<string>>()
      const results = await Promise.all(
        Object.entries(tableMap).map(([table, ids]) =>
          fetchFieldChanges(table, ids, currentYear)
        )
      )
      results.forEach(m => m.forEach((fields, id) => merged.set(id, fields)))
      setFieldChangesMap(merged)
    }

    if (!loading) loadFieldChanges()
  }, [publishedScreenings, piJuryScreenings, techCheckScreenings, loading, currentYear])

  // Auto-sync press screenings when P&I/Jury tab is loaded
  const [hasAutoSynced, setHasAutoSynced] = useState(false)
  useEffect(() => {
    if (viewMode === 'pi-jury' && !loading && !hasAutoSynced) {
      setHasAutoSynced(true)
      syncPressScreenings()
    }
    if (viewMode !== 'pi-jury') {
      setHasAutoSynced(false)
    }
  }, [viewMode, loading, hasAutoSynced, syncPressScreenings])
  
  // Click away handler for suggestions and export dropdown
  useEffect(() => {
    const handleClickAway = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.film-suggest') && !target.closest('.venue-suggest')) {
        setShowFilmSuggestions(false)
        setShowVenueSuggestions(false)
      }
      if (!target.closest('.export-dropdown')) {
        setShowExportDropdown(false)
      }
    }

    document.addEventListener('click', handleClickAway)
    return () => document.removeEventListener('click', handleClickAway)
  }, [])

  // Form handlers
  const resetForm = () => {
    setFormData({
      film_title: '',
      film_id: null,
      film_type: null,
      screening_date: '',
      start_time: '',
      run_time: null,
      venue_short_code: '',
      capacity: null,
      notes: ''
    })
    setEditingScreening(null)
    setFilmSearchTerm('')
    setVenueSearchTerm('')
    setShowFilmSuggestions(false)
    setShowVenueSuggestions(false)
  }

  const exportScreeningTemplate = () => {
    const headers = ['Title', 'Day', 'Date', 'Location', 'Start Time', 'Running Time', 'Capacity', 'Notes']

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers])

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

    const cols: any[] = []
    headers.forEach((header, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: index })
      if (!ws[cellRef]) ws[cellRef] = {}
      ws[cellRef].s = headerStyle
      cols.push({ wch: Math.min(Math.max(header.length + 2, 15), 30) })
    })

    ws['!cols'] = cols
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }

    XLSX.utils.book_append_sheet(wb, ws, 'Screening Template')
    XLSX.writeFile(wb, 'screening_import_template.xlsx')
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()

      // Simple CSV parser that handles quoted fields
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g
        let matches

        while ((matches = regex.exec(line)) !== null) {
          let value = matches[1]
          if (value && value.length > 0) {
            // Remove surrounding quotes and unescape internal quotes
            if (value[0] === '"' && value[value.length - 1] === '"') {
              value = value.slice(1, -1).replace(/""/g, '"')
            }
            result.push(value.trim())
          } else {
            result.push('')
          }
        }

        return result
      }

      const lines = text.split('\n').filter(line => line.trim())
      const allRows = lines.map(line => parseCSVLine(line))
      const headers = allRows[0]

      if (!headers.includes('Title') || !headers.includes('Date') || !headers.includes('Start Time')) {
        alert('CSV must contain Title, Date, and Start Time columns')
        return
      }

      // Filter out strikethrough rows
      const dataRows = allRows.slice(1) // Skip header
      const filteredRows = dataRows.filter((row, index) => {
        const hasStrikethrough = isCSVRowStrikethrough(row)
        if (hasStrikethrough) {

        }
        return !hasStrikethrough
      })



      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      for (let rowIndex = 0; rowIndex < filteredRows.length; rowIndex++) {
        const row = filteredRows[rowIndex]
        if (!row[0] || row[0].trim() === '') continue // Skip empty rows

        try {
          // Map CSV columns to screening data
          let title = row[headers.indexOf('Title')]?.trim()
          const day = row[headers.indexOf('Day')]?.trim()
          const dateStr = row[headers.indexOf('Date')]?.trim()
          let location = row[headers.indexOf('Location')]?.trim()
          const startTimeStr = row[headers.indexOf('Start Time')]?.trim()
          const runningTime = row[headers.indexOf('Running Time')]?.trim()
          const capacity = row[headers.indexOf('Capacity')]?.trim()
          const notes = row[headers.indexOf('Notes')]?.trim() || ''

          if (!title || !dateStr || !startTimeStr) {
            errors.push(`Row ${rowIndex + 2}: Missing required fields`) // +2 because header is row 1
            errorCount++
            continue
          }

          // Fix shorts program titles: "Shorts 5: Comedy" -> "Shorts Program 5: Comedy"
          if (title.toLowerCase().startsWith('shorts ') && !title.toLowerCase().includes('program')) {
            title = title.replace(/^shorts\s+(\d+)/i, 'Shorts Program $1')
          }

          // Remove # from location/venue codes: "AMC #13" -> "AMC 13"
          if (location) {
            location = location.replace('#', '')
          }

          // Convert date from "10/15" to "YYYY-10-15" format using current festival year
          const [month, day_num] = dateStr.split('/')
          const year = currentYear
          
          // Debug the problematic rows
          if (rowIndex + 2 === 46 || rowIndex + 2 === 88 || rowIndex + 2 === 129 || rowIndex + 2 === 158) {


          }

          // Validate month and day_num exist before calling padStart
          if (!month || !day_num) {
            console.error(`Invalid date format in row ${rowIndex + 2}:`, dateStr, 'Raw row:', filteredRows[rowIndex])
            errors.push(`Row ${rowIndex + 2}: Invalid date format - ${dateStr}`)
            errorCount++
            continue
          }
          
          const formattedDate = `${year}-${month.padStart(2, '0')}-${day_num.padStart(2, '0')}`

          // Convert time from "6:30 PM" to "18:30" format
          const timeMatch = startTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
          if (!timeMatch) {
            errors.push(`Row ${rowIndex + 2}: Invalid time format: ${startTimeStr}`)
            errorCount++
            continue
          }
          
          let hours = parseInt(timeMatch[1])
          const minutes = timeMatch[2]
          const ampm = timeMatch[3].toUpperCase()
          
          if (ampm === 'PM' && hours !== 12) hours += 12
          if (ampm === 'AM' && hours === 12) hours = 0
          
          const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}`

          // Step 1: Check for duplicate screening (same date/time/venue)
          const { data: existingScreening, error: duplicateCheckError } = await supabase
            .from('ticketing_screenings_with_films')
            .select('id, film_title')
            .eq('screening_date', formattedDate)
            .eq('start_time', formattedTime)
            .eq('venue_short_code', location || '')
            .eq('festival_year', currentYear)
            .maybeSingle()

          if (duplicateCheckError && duplicateCheckError.code !== 'PGRST116') {
            console.error('Duplicate check error:', duplicateCheckError)
            errors.push(`Row ${rowIndex + 2} (${title}): Duplicate check failed - ${duplicateCheckError.message}`)
            errorCount++
            continue
          }

          if (existingScreening) {

            errors.push(`Row ${rowIndex + 2} (${title}): Duplicate screening skipped - ${existingScreening.film_title} already scheduled at ${location} on ${formattedDate} ${formattedTime}`)
            errorCount++
            continue
          }

          // Resolve film_id from filmCards by matching title
          const matchingFilm = filmCards.find(f => f.title === title)

          // Step 2: Create record in ticketing_screenings
          const ticketingData = {
            film_title: title,
            film_id: matchingFilm?.id || null,
            film_type: matchingFilm?.film_type || null,
            festival_year: currentYear,
            screening_date: formattedDate,
            day_of_week: day || getStringDayOfWeek(formattedDate),
            start_time: formattedTime,
            run_time: runningTime ? parseInt(runningTime) : null,
            venue_short_code: location || '',
            capacity: capacity ? parseInt(capacity) : null,
            notes: notes,
            is_published: true
          }

          // Insert into ticketing_screenings
          const { data: ticketingResult, error: ticketingError } = await supabase
            .from('ticketing_screenings')
            .insert(ticketingData)
            .select('id')
            .single()

          if (ticketingError) {
            console.error('Ticketing insert error:', ticketingError)
            errors.push(`Row ${rowIndex + 2} (${title}): Failed to create ticketing record - ${ticketingError.message}`)
            errorCount++
            continue
          }



          // Step 3: Create record in published_screenings with reference
          const publishedData = {
            film_title: title,
            film_id: matchingFilm?.id || null,
            film_type: matchingFilm?.film_type || null,
            festival_year: currentYear,
            screening_date: formattedDate,
            day_of_week: day || getStringDayOfWeek(formattedDate),
            start_time: formattedTime,
            run_time: runningTime ? parseInt(runningTime) : null,
            venue_short_code: location || '',
            capacity: capacity ? parseInt(capacity) : null,
            notes: notes,
            ticketing_screening_id: ticketingResult.id,
            film_card_id: null,
          }

          // Insert into published_screenings
          const { error } = await supabase
            .from('published_screenings')
            .insert(publishedData)

          if (error) {
            errors.push(`Row ${rowIndex + 2} (${title}): ${error.message}`)
            errorCount++
          } else {
            successCount++
          }

        } catch (rowError: any) {
          errors.push(`Row ${rowIndex + 2}: ${rowError.message || rowError}`)
          errorCount++
        }
      }

      // Show results
      let message = `Upload completed: ${successCount} screenings added successfully`
      if (errorCount > 0) {
        message += `, ${errorCount} errors occurred`
        if (errors.length > 0) {
          message += `:\n${errors.slice(0, 5).join('\n')}`
          if (errors.length > 5) {
            message += `\n... and ${errors.length - 5} more errors`
          }
        }
      }
      
      alert(message)
      
      // Refresh data
      loadData()
      
      // Reset file input
      event.target.value = ''

    } catch (error: any) {
      console.error('CSV upload error:', error)
      alert('Error reading CSV file: ' + (error.message || error))
    }
  }

  const handleAddScreening = () => {
    resetForm()
    setShowAddModal(true)
  }

  const handleDeleteScreening = async (screening: any) => {
    const screeningType = viewMode === 'ticketing' ? 'published screening' :
                         viewMode === 'pi-jury' ? 'P&I/Jury screening' : 'tech check'

    if (!confirm(`Are you sure you want to delete this ${screeningType}?\n\nFilm: ${screening.film_title}\nDate: ${screening.screening_date}\nTime: ${screening.start_time}`)) {
      return
    }

    try {
      const tableName = viewMode === 'ticketing' ? 'ticketing_screenings' :
                       viewMode === 'pi-jury' ? 'pi_jury_screenings' : 'tech_check_screenings'

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', screening.id)

      if (error) throw error

      alert(`${screeningType} deleted successfully`)
      await loadData()
    } catch (error) {
      console.error('Error deleting screening:', error)
      alert('Failed to delete screening. Please try again.')
    }
  }

  const handleEditScreening = (screening: any) => {
    setFormData({
      film_title: screening.film_title,
      film_id: screening.film_id || null,
      film_type: screening.film_type || null,
      screening_date: screening.screening_date,
      start_time: screening.start_time,
      run_time: screening.run_time,
      venue_short_code: screening.venue_short_code,
      capacity: screening.capacity,
      notes: screening.notes || '',
      screening_type: screening.screening_type,
      tech_contact: screening.tech_contact
    })
    setFilmSearchTerm(screening.film_title)
    
    // Find matching venue for display
    const matchingVenue = venueCards.find(v => v.short_code === screening.venue_short_code)
    setVenueSearchTerm(matchingVenue ? matchingVenue.display_name : screening.venue_short_code)
    
    setEditingScreening(screening)
    setShowEditModal(true)
  }

  const handleFilmClick = async (screening: any) => {
    try {
      let filmData = null

      if (screening.film_id && screening.film_type) {
        // Direct lookup by film_id
        if (screening.film_type === 'feature') {
          const { data: featureData } = await supabase
            .from('feature_films')
            .select('*')
            .eq('id', screening.film_id)
            .maybeSingle()

          if (featureData) {
            filmData = {
              id: featureData.id,
              title: featureData.title,
              original_language_title: featureData.original_language_title,
              director: featureData.director,
              countries: featureData.countries,
              programs: [featureData.program_1, featureData.program_2, featureData.program_3, featureData.program_4]
                .filter(Boolean).join(', '),
              premiere_status: featureData.premiere_status
            }
          }
        } else if (screening.film_type === 'short') {
          const { data: shortData } = await supabase
            .from('short_films')
            .select('*')
            .eq('id', screening.film_id)
            .maybeSingle()

          if (shortData) {
            filmData = {
              id: shortData.id,
              title: shortData.title,
              original_language_title: shortData.original_language_title,
              director: shortData.director,
              countries: shortData.countries,
              programs: [shortData.program_1, shortData.program_2, shortData.program_3]
                .filter(Boolean).join(', '),
              premiere_status: shortData.premiere_status
            }
          }
        } else if (screening.film_type === 'shorts_program') {
          const { data: programData } = await supabase
            .from('shorts_programs')
            .select('*')
            .eq('id', screening.film_id)
            .maybeSingle()

          if (programData) {
            filmData = {
              id: programData.id,
              title: programData.program_name,
              type: 'shorts_program'
            }
          }
        }
      }

      // Fallback: lookup by film_title for legacy screenings without film_id
      if (!filmData && screening.film_title) {
        const { data: featureMatch } = await supabase
          .from('feature_films')
          .select('*')
          .eq('title', screening.film_title)
          .eq('festival_year', currentYear)
          .maybeSingle()

        if (featureMatch) {
          filmData = {
            id: featureMatch.id,
            title: featureMatch.title,
            original_language_title: featureMatch.original_language_title,
            director: featureMatch.director,
            countries: featureMatch.countries,
            programs: [featureMatch.program_1, featureMatch.program_2, featureMatch.program_3, featureMatch.program_4]
              .filter(Boolean).join(', '),
            premiere_status: featureMatch.premiere_status
          }
        } else {
          // Try shorts programs
          const { data: programMatch } = await supabase
            .from('shorts_programs')
            .select('*')
            .eq('program_name', screening.film_title)
            .eq('festival_year', currentYear)
            .maybeSingle()

          if (programMatch) {
            filmData = {
              id: programMatch.id,
              title: programMatch.program_name,
              type: 'shorts_program'
            }
          }
        }
      }

      if (filmData) {
        setSelectedFilm(filmData)
        setShowFilmCard(true)
      }
    } catch (error) {
      console.error('Error loading film data:', error)
    }
  }

  // Export function for all three views
  const exportData = (format: 'csv' | 'excel') => {
    let data: any[]
    let viewName: string
    
    switch (viewMode) {
      case 'pi-jury':
        data = piJuryScreenings
        viewName = 'PI Jury'
        break
      case 'tech-checks':
        data = techCheckScreenings
        viewName = 'Tech Checks'
        break
      default:
        data = publishedScreenings
        viewName = 'Ticketing'
    }

    const exportData = data.map(screening => {
      const baseData = {
        'Title': screening.film_title,
        'Day': screening.day_of_week,
        'Date': screening.screening_date,
        'Venue': screening.venue_short_code,
        'Start Time': screening.start_time,
        'Run Time': screening.run_time ? `${screening.run_time}min` : '',
        'Notes': screening.notes || '',
        'Status': screening.is_cancelled ? 'CANCELLED' : 'ACTIVE'
      }

      // Add view-specific columns
      if (viewMode === 'ticketing') {
        return {
          ...baseData,
          'Capacity': screening.capacity || ''
        }
      } else if (viewMode === 'pi-jury') {
        return {
          ...baseData,
          'Screening Type': (screening as any).screening_type || '',
          'Capacity': screening.capacity || ''
        }
      } else if (viewMode === 'tech-checks') {
        return {
          ...baseData,
          'Tech Contact': (screening as any).tech_contact || ''
        }
      }

      return baseData
    })

    // Generate filename with view name and timestamp
    const today = getCurrentDateString()
    const filename = `${viewName} Export ${today}`

    if (format === 'csv') {
      // CSV Export
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row] || ''
            const valueStr = String(value)
            return valueStr.includes(',') || valueStr.includes('"') || valueStr.includes('\n')
              ? `"${valueStr.replace(/"/g, '""')}"`
              : valueStr
          }).join(',')
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${filename}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      // Excel Export with header formatting
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      
      // Get the range of the worksheet
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
      
      // Style the header row (row 1)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        const cell = worksheet[cellAddress]
        
        if (cell) {
          cell.s = {
            fill: {
              fgColor: { rgb: "D3D3D3" } // Light grey background
            },
            font: {
              bold: true
            },
            alignment: {
              horizontal: "center"
            }
          }
        }
      }
      
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, viewName)
      XLSX.writeFile(workbook, `${filename}.xlsx`)
    }

    setShowExportDropdown(false)
  }

  const handleCancelScreening = async (screening: any) => {
    try {
      let tableName = ''
      if (viewMode === 'ticketing') tableName = 'ticketing_screenings'
      else if (viewMode === 'pi-jury') tableName = 'pi_jury_screenings'
      else if (viewMode === 'tech-checks') tableName = 'tech_check_screenings'

      const { error } = await supabase
        .from(tableName)
        .update({ is_cancelled: !screening.is_cancelled })
        .eq('id', screening.id)

      if (error) throw error

      await loadData()
      setShowEditModal(false)
    } catch (error) {
      console.error('Error cancelling screening:', error)
      alert('Error updating screening. Please try again.')
    }
  }

  const handleSaveScreening = async () => {
    if (!user || !formData.film_title || !formData.screening_date || !formData.start_time || !formData.venue_short_code) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const screeningData = {
        film_title: formData.film_title,
        film_id: formData.film_id || null,
        film_type: formData.film_type || null,
        festival_year: currentYear,
        screening_date: formData.screening_date,
        day_of_week: getDayOfWeek(formData.screening_date),
        start_time: formData.start_time,
        run_time: formData.run_time,
        venue_short_code: formData.venue_short_code,
        capacity: formData.capacity,
        notes: formData.notes || null,
        ...(viewMode === 'pi-jury' && { screening_type: formData.screening_type }),
        ...(viewMode === 'tech-checks' && { tech_contact: formData.tech_contact })
      }

      let tableName = ''
      if (viewMode === 'ticketing') tableName = 'ticketing_screenings'
      else if (viewMode === 'pi-jury') tableName = 'pi_jury_screenings'
      else if (viewMode === 'tech-checks') tableName = 'tech_check_screenings'

      let error
      if (editingScreening) {
        // Update existing screening
        const { error: updateError } = await supabase
          .from(tableName)
          .update(screeningData)
          .eq('id', editingScreening.id)
        error = updateError

        // Log field-level changes for highlighting
        if (!updateError) {
          const trackedFields = Object.keys(screeningData).filter(f => f !== 'festival_year' && f !== 'day_of_week')
          const changed = detectChangedFields(editingScreening, screeningData, trackedFields)
          await logFieldChanges(tableName, editingScreening.id, changed, currentYear)
        }
      } else {
        // Create new screening
        const { error: insertError } = await supabase
          .from(tableName)
          .insert([screeningData])
        error = insertError
      }

      if (error) throw error

      await loadData()
      setShowAddModal(false)
      setShowEditModal(false)
      resetForm()
    } catch (error: any) {
      console.error('Error saving screening:', error)
      const errorMessage = error?.message || 'Unknown error'
      alert(`Error saving screening: ${errorMessage}\n\nPlease check the console for details.`)
    }
  }

  // Unpublish functions
  const handleSelectForUnpublish = (screeningId: string, selected: boolean) => {
    setSelectedForUnpublish(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(screeningId)
      } else {
        newSet.delete(screeningId)
      }
      return newSet
    })
  }

  const handleSelectAllForUnpublish = (selected: boolean) => {
    if (selected) {
      const selectableIds = filteredData.map(s => s.id)
      setSelectedForUnpublish(new Set(selectableIds))
    } else {
      setSelectedForUnpublish(new Set())
    }
  }

  const unpublishScreening = async (screening: any) => {
    try {
      if (viewMode === 'ticketing') {
        // For published screenings, we need to:
        // 1. Move it back to ticketing_screenings with is_published = false
        // 2. Delete from published_screenings

        // First restore to ticketing_screenings
        const { error: restoreError } = await supabase
          .from('ticketing_screenings')
          .update({ is_published: false })
          .eq('id', screening.ticketing_screening_id)

        if (restoreError) throw restoreError

        // Then remove from published_screenings
        const { error: deleteError } = await supabase
          .from('published_screenings')
          .delete()
          .eq('id', screening.id)

        if (deleteError) throw deleteError
      } else {
        // For P&I/Jury and Tech Check screenings, just delete them
        let tableName = ''
        if (viewMode === 'pi-jury') tableName = 'pi_jury_screenings'
        else if (viewMode === 'tech-checks') tableName = 'tech_check_screenings'

        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', screening.id)

        if (error) throw error
      }


    } catch (error) {
      console.error('Error unpublishing screening:', error)
      throw error
    }
  }

  const handleBulkUnpublish = async () => {
    if (selectedForUnpublish.size === 0) return

    setUnpublishing(true)
    const screeningsToUnpublish = filteredData.filter(s => selectedForUnpublish.has(s.id))
    let successCount = 0
    let errorCount = 0

    for (const screening of screeningsToUnpublish) {
      try {
        await unpublishScreening(screening)
        successCount++
      } catch (error) {
        console.error(`Error unpublishing ${screening.film_title}:`, error)
        errorCount++
      }
    }

    await loadData()
    setSelectedForUnpublish(new Set())
    
    if (errorCount > 0) {
      alert(`Unpublished ${successCount} screenings with ${errorCount} errors.`)
    } else {
      alert(`Successfully unpublished ${successCount} screenings!`)
    }
    
    setUnpublishing(false)
  }

  // Get current data based on view mode
  const getCurrentData = () => {
    switch (viewMode) {
      case 'ticketing': return publishedScreenings
      case 'pi-jury': return piJuryScreenings
      case 'tech-checks': return techCheckScreenings
      default: return []
    }
  }

  // Filter data based on debounced search term
  const filteredData = useMemo(() => {
    const currentData = getCurrentData()
    if (!debouncedSearchTerm) return currentData

    return currentData.filter(screening =>
      screening.film_title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      screening.venue_short_code?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      screening.day_of_week?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      screening.notes?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
  }, [debouncedSearchTerm, publishedScreenings, piJuryScreenings, techCheckScreenings, viewMode])

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return 1
      if (bValue == null) return -1

      // Compare values
      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      // Add sub-sort by time when sorting by date
      if (comparison === 0 && sortConfig.key === 'screening_date') {
        const aTime = a.start_time || ''
        const bTime = b.start_time || ''
        comparison = aTime.localeCompare(bTime)
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [filteredData, sortConfig])

  // Refresh film cards when searching for shorts to catch newly synced shorts programs
  useEffect(() => {
    if (filmSearchTerm && filmSearchTerm.toLowerCase().includes('short')) {
      loadFilmCards()
    }
  }, [filmSearchTerm, loadFilmCards])

  // Filter film suggestions
  const filteredFilms = useMemo(() => {
    if (!filmSearchTerm) return []

    return filmCards.filter(film =>
      film.title.toLowerCase().includes(filmSearchTerm.toLowerCase())
    ).slice(0, 5)
  }, [filmSearchTerm, filmCards])

  // Filter venue suggestions  
  const filteredVenues = useMemo(() => {
    if (!venueSearchTerm) return venueCards.slice(0, 5) // Show all venues when field is focused but empty
    const filtered = venueCards.filter(venue =>
      venue.short_code.toLowerCase().includes(venueSearchTerm.toLowerCase())
    ).slice(0, 5)
    return filtered
  }, [venueSearchTerm, venueCards])

  // Table column configurations
  const getTableColumns = () => {
    const baseColumns = [
      { key: 'film_title', label: 'Title', width: 200, sortable: true },
      { key: 'day_of_week', label: 'Day', width: 120, sortable: true },
      { key: 'screening_date', label: 'Date', width: 120, sortable: true },
      { key: 'venue_short_code', label: 'Venue', width: 120, sortable: true },
      { key: 'start_time', label: 'Start Time', width: 120, sortable: true },
      { key: 'run_time', label: 'Run Time', width: 120, sortable: true },
      { key: 'capacity', label: 'Capacity', width: 120, sortable: true },
      { key: 'notes', label: 'Notes', width: 180, sortable: false }
    ]

    if (viewMode === 'pi-jury') {
      baseColumns.splice(1, 0, { key: 'screening_type', label: 'Type', width: 80, sortable: true })
    }

    if (viewMode === 'tech-checks') {
      baseColumns.splice(-1, 0, { key: 'tech_contact', label: 'Tech Contact', width: 150, sortable: false })
    }

    return baseColumns
  }

  const handleSort = (columnKey: string) => {
    setSortConfig(prev => {
      if (prev?.key === columnKey) {
        return {
          key: columnKey,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return { key: columnKey, direction: 'asc' }
    })
  }

  const handleResize = (columnKey: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: width
    }))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">🎟️ Ticketing Grid</h1>
            <p className="text-sm text-gray-600 mt-1">
              {sortedData.length} of {getCurrentData().length} screenings
            </p>
            {viewMode === 'pi-jury' && (
              <div className="flex items-center space-x-4 mt-2 text-xs">
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-gray-100 border border-gray-400 border-dashed rounded inline-block mr-1"></span>
                  <span className="text-gray-500">Not Approved</span>
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-green-100 border border-green-400 border-dashed rounded inline-block mr-1"></span>
                  <span className="text-green-700">Approved (Not Locked)</span>
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-white border border-gray-300 rounded inline-block mr-1"></span>
                  <span className="text-gray-700">Locked/Confirmed</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            {viewMode === 'pi-jury' && (
              <button
                onClick={syncPressScreenings}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 font-medium"
              >
                🔄 Sync Press Screenings
              </button>
            )}
            {canEditTicketing && (
              <button
                onClick={handleAddScreening}
                className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 font-medium"
              >
                {viewMode === 'tech-checks' ? 'Add Tech Check' : 'Add Screening'}
              </button>
            )}
            
            {/* CSV Template & Upload */}
            {canEditTicketing && viewMode === 'ticketing' && (
              <button
                onClick={exportScreeningTemplate}
                className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
              >
                Create Screening CSV Template
              </button>
            )}
            {canEditTicketing && viewMode === 'ticketing' && (
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer transition-colors font-medium">
                Upload Screening CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
              </label>
            )}

            {/* Export Dropdown */}
            {canReadTicketing && (
              <div className="relative export-dropdown">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 font-medium flex items-center space-x-2"
                >
                  <span>Export</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => exportData('csv')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => exportData('excel')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Excel
                    </button>
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
        </div>

        {/* Screening Board Toggle */}
        <div className="mt-4">
          <button
            onClick={() => updateViewMode('screening-board')}
            className={`px-6 py-3 rounded-lg text-sm font-semibold transition-colors ${
              viewMode === 'screening-board'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
            }`}
          >
            📅 Screening Board
          </button>
        </div>

        {/* Data View Mode Toggle */}
        <div className="mt-3">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => updateViewMode('ticketing')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'ticketing'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ticketing
            </button>
            <button
              onClick={() => updateViewMode('pi-jury')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'pi-jury'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              P&I / Jury
            </button>
            <button
              onClick={() => updateViewMode('tech-checks')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'tech-checks'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tech Checks
            </button>
          </div>
        </div>
      </div>

      {/* Search - only show for table views */}
      {viewMode !== 'screening-board' && (
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search screenings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Data Grid or Screening Board */}
      {viewMode === 'screening-board' ? (
        <ReadOnlyScreeningBoard
          currentYear={currentYear}
          onFilmClick={handleFilmClick}
        />
      ) : (
        <div className="flex-1 overflow-hidden bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-500">Loading screenings...</div>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)]">
              <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {getTableColumns().map((column) => (
                  <th
                    key={column.key}
                    className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 relative ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
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
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 hover:opacity-100 transition-opacity"
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
                {canEditTicketing && (
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((screening) => {
                // Determine the approval state
                const piScreening = screening as PIJuryScreening;
                const isApproved = piScreening.film_approved && !piScreening.locked;
                const isLocked = piScreening.film_approved && piScreening.locked;
                const isTentative = piScreening.is_tentative;

                return (
                  <tr
                    key={screening.id}
                    className={`hover:bg-gray-50 ${
                      screening.is_cancelled
                        ? 'bg-red-50 text-gray-500'
                        : isLocked
                        ? '' // White background for locked (confirmed)
                        : isApproved
                        ? 'bg-green-50' // Light green for approved but not locked
                        : isTentative
                        ? 'bg-gray-50' // Gray for tentative (not approved)
                        : ''
                    }`}
                  >
                    {getTableColumns().map((column) => {
                      const cellValue = screening[column.key as keyof typeof screening];
                      let displayValue: React.ReactNode = cellValue || '--';

                      if (column.key === 'film_title') {
                        displayValue = (
                          <div className={`font-medium ${isTentative ? 'text-gray-500 italic' : ''}`}>
                            {isTentative && <span className="text-gray-400 mr-1">(TENT)</span>}
                            <button
                              onClick={() => handleFilmClick(screening)}
                              className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                            >
                              {screening.film_title}
                            </button>
                          </div>
                        );
                    } else if (column.key === 'screening_date') {
                      displayValue = formatDate(screening.screening_date);
                    } else if (column.key === 'start_time') {
                      displayValue = formatTime(screening.start_time);
                    } else if (column.key === 'run_time') {
                      displayValue = screening.run_time ? `${screening.run_time}min` : '--';
                    }
                    
                    return (
                      <td
                        key={column.key}
                        className={`px-3 py-2 text-sm border-r border-gray-100 ${
                          screening.is_cancelled ? 'line-through' : ''
                        } ${
                          (screening as any).is_tentative ? 'text-gray-500' : 'text-gray-900'
                        } ${getCellHighlightClass(fieldChangesMap, screening.id, column.key)}`}
                        style={{ minWidth: `${columnWidths[column.key] || column.width}px` }}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                  {canEditTicketing && (
                    <td className="px-3 py-2 text-center text-sm font-medium">
                      <div className="flex space-x-1 justify-center">
                        <button
                          onClick={() => handleEditScreening(screening)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteScreening(screening)}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
                );
              })}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={getTableColumns().length + (canEditTicketing ? 1 : 0)} className="px-6 py-12 text-center text-gray-500">
                    {debouncedSearchTerm
                      ? 'No screenings match your search.'
                      : `No ${viewMode === 'ticketing' ? 'published' : viewMode === 'pi-jury' ? 'P&I/Jury' : 'tech check'} screenings found. Click "Add Screening" to create your first screening.`
                    }
                  </td>
                </tr>
              )}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Screening Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-transparent z-50">
          <DraggableModal>
            <div className="p-6 w-[600px] max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4 modal-header cursor-grab">
                {viewMode === 'tech-checks' ? 'Add New Tech Check' : 'Add New Screening'}
              </h3>
            
            <div className="space-y-4">
              {/* Film Title */}
              <div className="relative film-suggest">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Film Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={filmSearchTerm || formData.film_title}
                  onChange={(e) => {
                    setFilmSearchTerm(e.target.value)
                    setFormData(prev => ({...prev, film_title: e.target.value, film_id: null, film_type: null}))
                    setShowFilmSuggestions(true)
                  }}
                  onFocus={() => setShowFilmSuggestions(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {showFilmSuggestions && filteredFilms.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    {filteredFilms.map((film) => (
                      <div
                        key={film.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            film_title: film.title,
                            film_id: film.id,
                            film_type: film.film_type || 'feature',
                            run_time: viewMode === 'tech-checks' ? prev.run_time : film.run_time
                          }))
                          setFilmSearchTerm(film.title)
                          setShowFilmSuggestions(false)
                        }}
                      >
                        <div className="font-medium">{film.title}</div>
                        <div className="text-sm text-gray-600">{film.run_time} min</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Screening Type for P&I/Jury */}
              {viewMode === 'pi-jury' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Screening Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.screening_type || ''}
                    onChange={(e) => setFormData(prev => ({...prev, screening_type: e.target.value as 'P&I' | 'Jury'}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="P&I">P&I</option>
                    <option value="Jury">Jury</option>
                  </select>
                </div>
              )}

              {/* Tech Contact for Tech Checks */}
              {viewMode === 'tech-checks' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tech Contact
                  </label>
                  <input
                    type="text"
                    value={formData.tech_contact || ''}
                    onChange={(e) => setFormData(prev => ({...prev, tech_contact: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Screening Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.screening_date}
                  onChange={(e) => setFormData(prev => ({...prev, screening_date: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({...prev, start_time: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Venue */}
              <div className="relative venue-suggest">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={venueSearchTerm || formData.venue_short_code}
                  onChange={(e) => {
                    const venueCode = e.target.value
                    setVenueSearchTerm(venueCode)

                    // Auto-fill capacity if exact match found
                    const matchingVenue = venueCards.find(v => v.short_code === venueCode)
                    setFormData(prev => ({
                      ...prev,
                      venue_short_code: venueCode,
                      capacity: matchingVenue?.capacity || prev.capacity
                    }))

                    if (matchingVenue) {

                    }

                    setShowVenueSuggestions(true)
                  }}
                  onFocus={() => setShowVenueSuggestions(true)}
                  placeholder="Search venue or enter short code..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {showVenueSuggestions && filteredVenues.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    {filteredVenues.map((venue) => (
                      <div
                        key={venue.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {

                          setFormData(prev => ({
                            ...prev,
                            venue_short_code: venue.short_code,
                            capacity: venue.capacity || prev.capacity
                          }))
                          setVenueSearchTerm(venue.short_code)
                          setShowVenueSuggestions(false)
                        }}
                      >
                        <div className="font-medium">{venue.short_code}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Run Time and Capacity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Run Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.run_time || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev, 
                      run_time: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {viewMode !== 'tech-checks' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity
                    </label>
                    <input
                      type="number"
                      value={formData.capacity || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev, 
                        capacity: e.target.value ? parseInt(e.target.value) : null
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional notes about this screening..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScreening}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {viewMode === 'tech-checks' ? 'Add Tech Check' : 'Add Screening'}
              </button>
            </div>
            </div>
          </DraggableModal>
        </div>
      )}

      {/* Edit Screening Modal */}
      {showEditModal && editingScreening && (
        <div className="fixed inset-0 bg-transparent z-50">
          <DraggableModal>
            <div className="p-6 w-[600px] max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4 modal-header cursor-grab">Edit Screening</h3>
            
            <div className="space-y-4">
              {/* Film Title */}
              <div className="relative film-suggest">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Film Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={filmSearchTerm || formData.film_title}
                  onChange={(e) => {
                    setFilmSearchTerm(e.target.value)
                    setFormData(prev => ({...prev, film_title: e.target.value, film_id: null, film_type: null}))
                    setShowFilmSuggestions(true)
                  }}
                  onFocus={() => setShowFilmSuggestions(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {showFilmSuggestions && filteredFilms.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    {filteredFilms.map((film) => (
                      <div
                        key={film.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            film_title: film.title,
                            film_id: film.id,
                            film_type: film.film_type || 'feature',
                            run_time: viewMode === 'tech-checks' ? prev.run_time : film.run_time
                          }))
                          setFilmSearchTerm(film.title)
                          setShowFilmSuggestions(false)
                        }}
                      >
                        <div className="font-medium">{film.title}</div>
                        <div className="text-sm text-gray-600">{film.run_time} min</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Screening Type for P&I/Jury */}
              {viewMode === 'pi-jury' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Screening Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.screening_type || ''}
                    onChange={(e) => setFormData(prev => ({...prev, screening_type: e.target.value as 'P&I' | 'Jury'}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="P&I">P&I</option>
                    <option value="Jury">Jury</option>
                  </select>
                </div>
              )}

              {/* Tech Contact for Tech Checks */}
              {viewMode === 'tech-checks' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tech Contact
                  </label>
                  <input
                    type="text"
                    value={formData.tech_contact || ''}
                    onChange={(e) => setFormData(prev => ({...prev, tech_contact: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Screening Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.screening_date}
                  onChange={(e) => setFormData(prev => ({...prev, screening_date: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({...prev, start_time: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Venue */}
              <div className="relative venue-suggest">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={venueSearchTerm || formData.venue_short_code}
                  onChange={(e) => {
                    const venueCode = e.target.value
                    setVenueSearchTerm(venueCode)

                    // Auto-fill capacity if exact match found
                    const matchingVenue = venueCards.find(v => v.short_code === venueCode)
                    setFormData(prev => ({
                      ...prev,
                      venue_short_code: venueCode,
                      capacity: matchingVenue?.capacity || prev.capacity
                    }))

                    if (matchingVenue) {

                    }

                    setShowVenueSuggestions(true)
                  }}
                  onFocus={() => setShowVenueSuggestions(true)}
                  placeholder="Search venue or enter short code..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {showVenueSuggestions && filteredVenues.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    {filteredVenues.map((venue) => (
                      <div
                        key={venue.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {

                          setFormData(prev => ({
                            ...prev,
                            venue_short_code: venue.short_code,
                            capacity: venue.capacity || prev.capacity
                          }))
                          setVenueSearchTerm(venue.short_code)
                          setShowVenueSuggestions(false)
                        }}
                      >
                        <div className="font-medium">{venue.short_code}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Run Time and Capacity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Run Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.run_time || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev, 
                      run_time: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {viewMode !== 'tech-checks' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity
                    </label>
                    <input
                      type="number"
                      value={formData.capacity || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev, 
                        capacity: e.target.value ? parseInt(e.target.value) : null
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional notes about this screening..."
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => handleCancelScreening(editingScreening)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  editingScreening.is_cancelled
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {editingScreening.is_cancelled ? 'Uncancel Screening' : 'Cancel Screening'}
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveScreening}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Update Screening
                </button>
              </div>
            </div>
            </div>
          </DraggableModal>
        </div>
      )}

      {/* Film Card Popup */}
      {showFilmCard && selectedFilm && (
        <FilmCardPopup
          film={selectedFilm}
          onClose={() => {
            setShowFilmCard(false)
            setSelectedFilm(null)
          }}
        />
      )}

    </div>
  )
}