'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { normalizeDateValue } from '@/lib/date-utils'

interface ProgrammingFilm {
  id: string
  film: string
  director: string | null
  runtime: number | null
  category: string | null
  programs: string[]
  status: string
  color_highlight: string | null
}

interface Venue {
  id: string
  name: string
}

interface VenueHouse {
  id: string
  venue_id: string
  name: string
  venue: Venue
}

interface FilmScreening {
  id: string
  programming_film_id: string
  venue_house_id: string
  screening_date: string
  start_time: string
  end_time: string
  buffer_minutes: number
  press_industry: boolean
  programming_film: ProgrammingFilm
  venue_house: VenueHouse
}

interface ConflictGap {
  venue_house_id: string
  gap_minutes: number
  start_time: string
  end_time: string
  severity: 'warning' | 'danger' // yellow or red
}

const PROGRAM_COLORS = {
  'International Feature Film Competition': '#3B82F6', // blue
  'Documentary Competition': '#10B981', // green
  'New Directors Competition': '#F59E0B', // amber
  'Outlook Competition': '#8B5CF6', // purple
  'Snapshots': '#EF4444', // red
  'Spotlight': '#EC4899', // pink
  'After Dark': '#1F2937', // gray-800
  'Comedy': '#F97316', // orange
  'Special Presentation': '#6366F1', // indigo
  'Black Perspectives': '#7C2D12', // brown
  'Retro': '#059669', // emerald
  'Opening Night': '#DC2626', // red-600
  'Closing Night': '#DC2626', // red-600
  'Centerpiece': '#7C3AED', // violet
}

export default function SchedulingPlannerPage() {
  const { user } = useAuth()
  const [films, setFilms] = useState<ProgrammingFilm[]>([])
  const [venueHouses, setVenueHouses] = useState<VenueHouse[]>([])
  const [screenings, setScreenings] = useState<FilmScreening[]>([])
  const [viewMode, setViewMode] = useState<'day' | 'festival'>('day')
  const [selectedDate, setSelectedDate] = useState('')
  const [conflictWarningsEnabled, setConflictWarningsEnabled] = useState(false)
  const [conflicts, setConflicts] = useState<ConflictGap[]>([])
  const [draggedFilm, setDraggedFilm] = useState<ProgrammingFilm | null>(null)
  const [isDraggingScheduled, setIsDraggingScheduled] = useState(false)
  const [filmSearchTerm, setFilmSearchTerm] = useState('')
  const [festivalStartDate, setFestivalStartDate] = useState('')
  const [festivalEndDate, setFestivalEndDate] = useState('')
  const [editingScreening, setEditingScreening] = useState<string | null>(null)
  const [editingTime, setEditingTime] = useState('')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [venueTemplate, setVenueTemplate] = useState<Array<{venue: string, house: string}>>([])
  const [programColors, setProgramColors] = useState<Record<string, string>>({})
  const [blackouts, setBlackouts] = useState<Record<string, Array<{start: string, end: string}>>>({})
  const [contextMenu, setContextMenu] = useState<{show: boolean, x: number, y: number, venueId: string, date: string} | null>(null)
  const [modalPosition, setModalPosition] = useState({x: 0, y: 0})
  const [isDraggingModal, setIsDraggingModal] = useState(false)
  const [dragOffset, setDragOffset] = useState({x: 0, y: 0})

  const supabase = createClient()

  // Load festival settings from database
  const loadFestivalSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('festival_settings')
        .select('start_date, end_date')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        console.log('No festival settings found, using defaults')
        return
      }

      if (data) {
        console.log('🎯 Loading festival settings:', data)
        setFestivalStartDate(data.start_date)
        setFestivalEndDate(data.end_date)
        
        // Set selected date to festival start as default
        console.log('🎯 Setting selectedDate to festival start:', data.start_date)
        setSelectedDate(data.start_date)
      }
    } catch (error) {
      console.error('Error loading festival settings:', error)
    }
  }, [supabase])

  // Save festival settings to database
  const saveFestivalSettings = useCallback(async (startDate: string, endDate: string) => {
    try {
      // Delete existing settings first (simple approach for single-row table)
      await supabase.from('festival_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      
      // Insert new settings
      const { error } = await supabase
        .from('festival_settings')
        .insert({
          start_date: startDate,
          end_date: endDate
        })

      if (error) throw error
      console.log('Festival settings saved successfully')
    } catch (error) {
      console.error('Error saving festival settings:', error)
    }
  }, [supabase])

  // Load programming films (all films for scheduling)
  const loadFilms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('programming_films')
        .select('*')
        .order('film')

      if (error) throw error
      setFilms(data || [])
    } catch (error) {
      console.error('Error loading films:', error)
    }
  }, [supabase])

  // Load venue houses
  const loadVenueHouses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('venue_houses')
        .select(`
          *,
          venue:venues(*)
        `)
        .order('venue_id, name')

      if (error) throw error
      setVenueHouses(data || [])
    } catch (error) {
      console.error('Error loading venue houses:', error)
    }
  }, [supabase])

  // Load screenings
  const loadScreenings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('film_screenings')
        .select(`
          *,
          programming_film:programming_films(*),
          venue_house:venue_houses(*, venue:venues(*))
        `)
        .order('screening_date, start_time')

      if (error) throw error
      setScreenings(data || [])
    } catch (error) {
      console.error('Error loading screenings:', error)
    }
  }, [supabase])

  // Load venue template and program colors
  const loadVenueTemplate = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('venue_template')
        .select('venue_order, program_colors')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading venue template:', error)
        return
      }
      
      if (data) {
        console.log('🏠 Loaded venue template data:', data)
        
        // Handle both old and new data formats
        let venueOrder = []
        if (Array.isArray(data.venue_order)) {
          // New format: array of {venue, house} objects
          venueOrder = data.venue_order
        } else if (typeof data.venue_order === 'string') {
          // Old format: might be stringified JSON
          try {
            venueOrder = JSON.parse(data.venue_order)
          } catch {
            venueOrder = []
          }
        }
        
        setVenueTemplate(venueOrder || [])
        setProgramColors(data.program_colors || {})
        console.log('🏠 Set venue template:', venueOrder)
        console.log('🎨 Set program colors:', data.program_colors)
      }
    } catch (error) {
      console.error('Error loading venue template:', error)
    }
  }, [supabase])

  // Save venue template and program colors
  const saveVenueTemplate = async (template: Array<{venue: string, house: string}>, colors: Record<string, string>) => {
    try {
      console.log('🏠 Saving venue template:', template)
      console.log('🎨 Saving program colors:', colors)
      console.log('🎨 Program colors object keys:', Object.keys(colors))
      console.log('🎨 Program colors values:', Object.values(colors))
      
      // Delete existing template
      const deleteResult = await supabase.from('venue_template').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      console.log('🗑️ Delete result:', deleteResult)
      
      // Insert new template
      const insertData = {
        venue_order: template,
        program_colors: colors,
        created_by: user?.id
      }
      console.log('📝 Inserting data:', insertData)
      
      const { data, error } = await supabase
        .from('venue_template')
        .insert(insertData)
        .select()

      if (error) {
        console.error('❌ Insert error:', error)
        throw error
      }
      
      console.log('✅ Insert successful:', data)
      setVenueTemplate(template)
      setProgramColors(colors)
      console.log('Venue template and program colors saved successfully')
    } catch (error) {
      console.error('Error saving venue template:', error)
      alert(`Error saving template: ${error.message}`)
    }
  }

  // Load blackouts
  const loadBlackouts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('venue_blackouts')
        .select('*')

      if (error) throw error
      
      // Group blackouts by venue and date
      const blackoutMap: Record<string, Array<{start: string, end: string}>> = {}
      data?.forEach(blackout => {
        const key = `${blackout.venue_house_id}-${blackout.blackout_date}`
        if (!blackoutMap[key]) blackoutMap[key] = []
        blackoutMap[key].push({
          start: blackout.start_time,
          end: blackout.end_time
        })
      })
      
      setBlackouts(blackoutMap)
    } catch (error) {
      console.error('Error loading blackouts:', error)
    }
  }, [supabase])

  // Save blackout
  const saveBlackout = async (venueHouseId: string, date: string, startTime: string, endTime: string) => {
    try {
      const { error } = await supabase
        .from('venue_blackouts')
        .insert({
          venue_house_id: venueHouseId,
          blackout_date: date,
          start_time: startTime,
          end_time: endTime,
          created_by: user?.id
        })

      if (error) throw error
      loadBlackouts() // Reload blackouts
    } catch (error) {
      console.error('Error saving blackout:', error)
    }
  }

  useEffect(() => {
    loadFilms()
    loadVenueHouses()
    loadScreenings()
    loadFestivalSettings()
    loadVenueTemplate()
    loadBlackouts()
  }, [loadFilms, loadVenueHouses, loadScreenings, loadFestivalSettings, loadVenueTemplate, loadBlackouts])

  // Generate festival dates based on festival start/end dates, fallback to 14 days from selected date
  const festivalDates = useMemo(() => {
    const dates = []
    
    if (festivalStartDate && festivalEndDate) {
      const startDate = new Date(festivalStartDate)
      const endDate = new Date(festivalEndDate)
      const currentDate = new Date(startDate)
      
      while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split('T')[0])
        currentDate.setDate(currentDate.getDate() + 1)
      }
    } else if (selectedDate) {
      // Fallback to 14 days starting from selected date (only if selectedDate is valid)
      const startDate = new Date(selectedDate)
      if (!isNaN(startDate.getTime())) {
        for (let i = 0; i < 14; i++) {
          const date = new Date(startDate)
          date.setDate(startDate.getDate() + i)
          dates.push(date.toISOString().split('T')[0])
        }
      }
    }
    
    return dates
  }, [selectedDate, festivalStartDate, festivalEndDate])

  // Generate hourly time markers for visual reference only
  const timeMarkers = useMemo(() => {
    const markers = []
    for (let hour = 10; hour <= 23; hour++) {
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      const ampm = hour >= 12 ? 'PM' : 'AM'
      markers.push({
        time24: `${hour.toString().padStart(2, '0')}:00`,
        time12: `${hour12}:00 ${ampm}`,
        hour24: hour
      })
    }
    return markers
  }, [])

  // Convert pixel position to time with 5-minute snapping
  const pixelToTime = (pixelX: number, containerStartX: number, containerWidth: number): string => {
    const relativeX = pixelX - containerStartX
    const percentage = Math.max(0, Math.min(1, relativeX / containerWidth))
    
    // Map to 10 AM - 11 PM (13 hours = 780 minutes)
    const totalMinutes = percentage * 780 // 13 hours * 60 minutes
    
    // Snap to nearest 5-minute interval
    const snappedMinutes = Math.round(totalMinutes / 5) * 5
    
    const startHour = 10
    const finalHour = startHour + Math.floor(snappedMinutes / 60)
    const finalMinute = snappedMinutes % 60
    
    // Convert to 12-hour format
    const hour12 = finalHour === 0 ? 12 : finalHour > 12 ? finalHour - 12 : finalHour
    const ampm = finalHour >= 12 ? 'PM' : 'AM'
    
    return `${hour12}:${finalMinute.toString().padStart(2, '0')} ${ampm}`
  }

  // Convert 12-hour AM/PM format to 24-hour format for database storage (with seconds)
  const convertTo24Hour = (time12: string): string => {
    const [time, ampm] = time12.split(' ')
    const [hours, minutes] = time.split(':')
    let hour24 = parseInt(hours, 10)
    
    if (ampm === 'AM' && hour24 === 12) {
      hour24 = 0
    } else if (ampm === 'PM' && hour24 !== 12) {
      hour24 += 12
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes}:00`
  }

  // Convert 24-hour format to 12-hour AM/PM format for display
  const convertTo12Hour = (time24: string): string => {
    const timeParts = time24.split(':')
    const hours = timeParts[0]
    const minutes = timeParts[1]
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    
    return `${hour12}:${minutes} ${ampm}`
  }

  // Get program color for a film
  const getFilmColor = (film: ProgrammingFilm): string => {
    console.log('🎨 Getting color for film:', film.film, 'Programs:', film.programs, 'Available colors:', programColors)
    
    // Use the first program that has a custom color (but not 'none'), otherwise fallback to first program
    if (film.programs && film.programs.length > 0) {
      for (const program of film.programs) {
        const customColor = programColors[program]
        console.log(`🎨 Checking program "${program}": customColor="${customColor}"`)
        if (customColor && customColor !== 'none') {
          console.log(`🎨 Using custom color for ${program}: ${customColor}`)
          return customColor
        }
      }
      // If no custom color found, check default colors (skip programs marked as 'none')
      for (const program of film.programs) {
        const customColor = programColors[program]
        if (customColor === 'none') {
          console.log(`🎨 Skipping program "${program}" - marked as 'none'`)
          continue // Skip programs explicitly set to 'none'
        }
        
        const defaultColor = PROGRAM_COLORS[program as keyof typeof PROGRAM_COLORS]
        if (defaultColor) {
          console.log(`🎨 Using default color for ${program}: ${defaultColor}`)
          return defaultColor
        }
      }
    }
    // Check category as fallback
    const categoryColor = programColors[film.category || 'default']
    if (categoryColor && categoryColor !== 'none') {
      console.log(`🎨 Using category color: ${categoryColor}`)
      return categoryColor
    }
    
    const fallbackColor = PROGRAM_COLORS[film.category as keyof typeof PROGRAM_COLORS] || '#6B7280'
    console.log(`🎨 Using fallback color: ${fallbackColor}`)
    return fallbackColor
  }

  // Calculate end time based on runtime and buffer (returns 24-hour format for database)
  const calculateEndTime = (startTime12: string, runtime: number, buffer: number = 30): string => {
    // Convert 12-hour to 24-hour first
    const startTime24 = convertTo24Hour(startTime12)
    const [hours, minutes] = startTime24.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + runtime + buffer
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`
  }

  // Detect scheduling conflicts
  const detectConflicts = useCallback(() => {
    const conflicts: ConflictGap[] = []
    
    // Group screenings by venue, regardless of template
    const venueGroups = screenings.reduce((groups, screening) => {
      if (!groups[screening.venue_house_id]) {
        groups[screening.venue_house_id] = []
      }
      groups[screening.venue_house_id].push(screening)
      return groups
    }, {} as Record<string, typeof screenings>)
    
    Object.entries(venueGroups).forEach(([venueId, venueScreenings]) => {
      const sortedScreenings = venueScreenings.sort((a, b) => {
        const dateCompare = a.screening_date.localeCompare(b.screening_date)
        if (dateCompare !== 0) return dateCompare
        return a.start_time.localeCompare(b.start_time)
      })

      for (let i = 0; i < sortedScreenings.length - 1; i++) {
        const currentScreening = sortedScreenings[i]
        const nextScreening = sortedScreenings[i + 1]
        
        // Only check conflicts on the same date
        if (currentScreening.screening_date === nextScreening.screening_date) {
          const currentEndMinutes = timeStringToMinutes(currentScreening.end_time.substring(0, 5))
          const nextStartMinutes = timeStringToMinutes(nextScreening.start_time.substring(0, 5))
          const gapMinutes = nextStartMinutes - currentEndMinutes
          
          console.log(`🔍 Conflict check: ${currentScreening.programming_film.film} (ends ${currentScreening.end_time}) -> ${nextScreening.programming_film.film} (starts ${nextScreening.start_time})`)
          console.log(`🔍 Gap calculation: ${nextStartMinutes} - ${currentEndMinutes} = ${gapMinutes} minutes`)
          
          // Only flag gaps less than 30 minutes as conflicts
          if (gapMinutes >= 0 && gapMinutes < 30) {
            console.log(`❌ CONFLICT: Gap of ${gapMinutes} minutes is less than 30`)
            conflicts.push({
              venue_house_id: venueId,
              gap_minutes: gapMinutes,
              start_time: currentScreening.end_time.substring(0, 5),
              end_time: nextScreening.start_time.substring(0, 5),
              severity: gapMinutes < 20 ? 'danger' : 'warning'
            })
          } else {
            console.log(`✅ NO CONFLICT: Gap of ${gapMinutes} minutes is adequate (>=30)`)
          }
        }
      }
    })
    
    setConflicts(conflicts)
  }, [screenings, venueHouses])

  // Helper function to convert time string to minutes
  const timeStringToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
  }

  // Helper function to convert minutes to time string
  const minutesToTimeString = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (conflictWarningsEnabled) {
      detectConflicts()
    }
  }, [conflictWarningsEnabled, detectConflicts])

  // Set initial selected date to festival start date if available
  useEffect(() => {
    // Always use festival start date if available, otherwise use today
    if (festivalStartDate && selectedDate !== festivalStartDate && !selectedDate) {
      setSelectedDate(festivalStartDate)
    } else if (!festivalStartDate && !selectedDate) {
      setSelectedDate(new Date().toISOString().split('T')[0])
    }
  }, [festivalStartDate])

  // Handle drag start from film panel
  const handleDragStart = (e: React.DragEvent, film: ProgrammingFilm) => {
    console.log('🎬 Drag start:', film.film, 'Runtime:', film.runtime)
    setDraggedFilm(film)
    setIsDraggingScheduled(false)
    e.dataTransfer.effectAllowed = 'copy' // Copy operation since film stays in panel
  }

  // Handle drag start from scheduled film in calendar
  const handleScheduledFilmDragStart = (e: React.DragEvent, screening: FilmScreening) => {
    console.log('🎬 Dragging scheduled film:', screening.programming_film.film, 'ID:', screening.id)
    setDraggedFilm(screening.programming_film)
    setIsDraggingScheduled(true)
    e.dataTransfer.setData('screeningId', screening.id) // Store screening ID for moving
    e.dataTransfer.effectAllowed = 'move' // Move operation for scheduled films
    e.stopPropagation() // Prevent event bubbling
  }

  // Handle drop with pixel-based positioning
  const handleDrop = async (e: React.DragEvent, venueHouseId: string, date: string) => {
    e.preventDefault()
    
    if (!draggedFilm || !draggedFilm.runtime) {
      alert('Film must have a runtime to be scheduled')
      return
    }

    // Calculate precise time from mouse position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const time12 = pixelToTime(e.clientX, rect.left, rect.width)

    // Convert display time (12-hour) to database time (24-hour)
    const time24 = convertTo24Hour(time12)

    const screeningId = e.dataTransfer.getData('screeningId')
    const isMoving = !!screeningId // Moving existing screening vs adding new one
    
    console.log('🎯 Drop detected:', {
      film: draggedFilm.film,
      isMoving,
      screeningId,
      targetVenue: venueHouseId,
      targetDate: date,
      targetTime: time12,
      mouseX: e.clientX,
      rectLeft: rect.left,
      rectWidth: rect.width
    })

    // Check if this exact slot is already occupied (except for the screening we're moving)
    const existingScreening = screenings.find(
      s => s.venue_house_id === venueHouseId && 
           s.screening_date === date && 
           s.start_time === time24 &&
           s.id !== screeningId // Allow dropping on same screening
    )
    
    if (existingScreening) {
      alert('This time slot is already occupied by another film')
      return
    }

    const endTime24 = calculateEndTime(time12, draggedFilm.runtime)
    
    try {
      if (isMoving) {
        // Update existing screening
        console.log('📝 Updating screening:', screeningId)
        const { error } = await supabase
          .from('film_screenings')
          .update({
            venue_house_id: venueHouseId,
            screening_date: date,
            start_time: time24,
            end_time: endTime24,
          })
          .eq('id', screeningId)

        if (error) throw error
        console.log('✅ Successfully moved screening')
      } else {
        // Create new screening
        const { error } = await supabase
          .from('film_screenings')
          .insert({
            programming_film_id: draggedFilm.id,
            venue_house_id: venueHouseId,
            screening_date: date,
            start_time: time24,
            end_time: endTime24,
            buffer_minutes: 30,
            press_industry: false,
            created_by: user?.id
          })

        if (error) throw error
      }
      
      await loadScreenings()
      setDraggedFilm(null)
    } catch (error) {
      console.error('Error scheduling film:', error)
      alert('Error scheduling film. Check for conflicts.')
    }
  }


  // Get runtime visual width (proportional to length)
  const getRuntimeWidth = (runtime: number | null): number => {
    if (!runtime) return 60 // default width
    // Scale: 60 minutes = 60px, 120 minutes = 120px, etc.
    return Math.max(40, Math.min(200, runtime))
  }

  // Get count of how many times a film is scheduled
  const getFilmSchedulingCount = (filmId: string): number => {
    return screenings.filter(s => s.programming_film_id === filmId).length
  }

  // Toggle P&I status for a screening
  const togglePressIndustry = async (screeningId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('film_screenings')
        .update({ press_industry: !currentStatus })
        .eq('id', screeningId)

      if (error) throw error
      await loadScreenings()
    } catch (error) {
      console.error('Error updating P&I status:', error)
    }
  }

  // Start editing a screening time
  const startEditingTime = (screening: FilmScreening) => {
    setEditingScreening(screening.id)
    setEditingTime(convertTo12Hour(screening.start_time))
  }

  // Save time edit
  const saveTimeEdit = async () => {
    if (!editingScreening || !editingTime) return

    try {
      const time24 = convertTo24Hour(editingTime)
      const screening = screenings.find(s => s.id === editingScreening)
      if (!screening) return

      const endTime24 = calculateEndTime(editingTime, screening.programming_film.runtime || 60)

      const { error } = await supabase
        .from('film_screenings')
        .update({
          start_time: time24,
          end_time: endTime24,
        })
        .eq('id', editingScreening)

      if (error) throw error
      
      await loadScreenings()
      setEditingScreening(null)
      setEditingTime('')
    } catch (error) {
      console.error('Error updating screening time:', error)
      alert('Error updating time. Please check the format (e.g., "2:30 PM")')
    }
  }

  // Cancel time edit
  const cancelTimeEdit = () => {
    setEditingScreening(null)
    setEditingTime('')
  }

  // Delete screening
  const deleteScreening = async (screeningId: string) => {
    if (!confirm('Are you sure you want to cancel this screening?')) return

    try {
      const { error } = await supabase
        .from('film_screenings')
        .delete()
        .eq('id', screeningId)

      if (error) throw error
      await loadScreenings()
      setEditingScreening(null)
    } catch (error) {
      console.error('Error deleting screening:', error)
    }
  }

  // Unlimited date navigation
  const getCurrentFestivalDay = () => {
    const currentIndex = festivalDates.indexOf(selectedDate)
    return currentIndex >= 0 ? currentIndex + 1 : null
  }

  const isWithinFestivalDates = () => {
    return festivalDates.includes(selectedDate)
  }

  const goToPreviousDay = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() - 1)
    setSelectedDate(currentDate.toISOString().split('T')[0])
  }

  const goToNextDay = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + 1)
    setSelectedDate(currentDate.toISOString().split('T')[0])
  }

  const formatSelectedDate = () => {
    // Parse date string manually to avoid timezone issues
    const [year, month, day] = selectedDate.split('-').map(Number)
    const date = new Date(year, month - 1, day) // month is 0-indexed
    console.log('🗓️ Date formatting:', { selectedDate, year, month, day, formattedDate: date })
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // Filter films based on search term
  const filteredFilms = films.filter(film => {
    if (!filmSearchTerm) return true
    
    const searchLower = filmSearchTerm.toLowerCase()
    return (
      film.film.toLowerCase().includes(searchLower) ||
      (film.director && film.director.toLowerCase().includes(searchLower)) ||
      (film.category && film.category.toLowerCase().includes(searchLower)) ||
      (film.programs && film.programs.some(p => p.toLowerCase().includes(searchLower)))
    )
  })

  // Get ordered venues based on template
  const getOrderedVenues = () => {
    // If template exists and has venues, display those in the specified order
    if (venueTemplate.length > 0) {
      console.log('🏠 Using venue template:', venueTemplate)
      
      // Create display venues based on template but use real venue IDs for functionality
      return venueTemplate.map((templateVenue, index) => {
        // For drag/drop functionality, we need a real venue ID
        // Use the first available real venue house or create a mapping
        const fallbackVenue = venueHouses[index % venueHouses.length] || venueHouses[0]
        
        return {
          id: fallbackVenue?.id || `template-${index}`,
          venue_id: fallbackVenue?.venue_id || `template-venue-${index}`,
          name: templateVenue.house,
          venue: {
            id: fallbackVenue?.venue?.id || `template-venue-${index}`,
            name: templateVenue.venue
          }
        }
      })
    }
    
    // If no template, use actual venue houses
    console.log('🏠 No template, using real venues:', venueHouses)
    return venueHouses
  }

  // Right-click context menu handlers
  const handleRightClick = (e: React.MouseEvent, venueHouseId: string) => {
    e.preventDefault()
    // Only show context menu for real venue houses, not template venues
    if (venueHouseId.startsWith('template-')) return
    
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      venueId: venueHouseId,
      date: selectedDate
    })
  }

  const handleCreateBlackout = () => {
    if (!contextMenu) return
    
    const startTime = prompt('Enter start time (e.g., 2:00 PM):')
    const endTime = prompt('Enter end time (e.g., 6:00 PM):')
    
    if (startTime && endTime) {
      const start24 = convertTo24Hour(startTime)
      const end24 = convertTo24Hour(endTime)
      saveBlackout(contextMenu.venueId, contextMenu.date, start24, end24)
    }
    
    setContextMenu(null)
  }

  // Handle modal dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingModal) {
        setModalPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsDraggingModal(false)
    }

    if (isDraggingModal) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingModal, dragOffset])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Films Panel */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Films to Schedule</h2>
          <p className="text-sm text-gray-600 mt-1">{filteredFilms.length} of {films.length} films</p>
          
          {/* Search Bar */}
          <div className="mt-3">
            <input
              type="text"
              placeholder="Search films, directors, programs..."
              value={filmSearchTerm}
              onChange={(e) => setFilmSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="p-4 space-y-2">
          {filteredFilms.map((film) => {
            const schedulingCount = getFilmSchedulingCount(film.id)
            return (
              <div
                key={film.id}
                draggable
                onDragStart={(e) => handleDragStart(e, film)}
                className={`p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-move hover:shadow-md transition-all relative ${
                  draggedFilm?.id === film.id ? 'opacity-50 scale-95' : ''
                }`}
                style={{ 
                  borderLeftColor: getFilmColor(film),
                  borderLeftWidth: '4px'
                }}
              >
                {/* Scheduling count badge */}
                {schedulingCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                    {schedulingCount}
                  </div>
                )}
                
                {/* Film title */}
                <div className="font-medium text-sm text-gray-900 mb-1">{film.film}</div>
                
                {/* Runtime prominently displayed */}
                <div className="text-sm font-semibold text-gray-700 mb-2">
                  {film.runtime ? `${film.runtime} minutes` : 'Runtime not set'}
                </div>
                
                {/* Programs only */}
                <div className="space-y-1">
                  {film.programs && film.programs.length > 0 && (
                    <div className="text-xs text-gray-600">
                      Programs: {film.programs.join(', ')}
                    </div>
                  )}
                  {schedulingCount > 0 && (
                    <div className="text-xs text-blue-600 font-medium">
                      Scheduled {schedulingCount} time{schedulingCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          
          {filteredFilms.length === 0 && filmSearchTerm && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-sm">No films match "{filmSearchTerm}"</div>
              <button
                onClick={() => setFilmSearchTerm('')}
                className="text-blue-600 hover:text-blue-700 text-sm mt-1"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Festival Dates Header */}
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">📅 Set Festival Dates</h3>
              <p className="text-xs text-blue-700 mt-1">Define the festival date range to automatically generate available scheduling dates</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-blue-900">Start:</label>
                <input
                  type="date"
                  value={festivalStartDate}
                  onChange={(e) => {
                    const newStartDate = e.target.value
                    setFestivalStartDate(newStartDate)
                    if (newStartDate && festivalEndDate) {
                      saveFestivalSettings(newStartDate, festivalEndDate)
                    }
                  }}
                  onBlur={(e) => {
                    const normalized = normalizeDateValue(e.target.value)
                    if (normalized !== e.target.value) {
                      setFestivalStartDate(normalized)
                      if (normalized && festivalEndDate) {
                        saveFestivalSettings(normalized, festivalEndDate)
                      }
                    }
                  }}
                  className="px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-blue-900">End:</label>
                <input
                  type="date"
                  value={festivalEndDate}
                  onChange={(e) => {
                    const newEndDate = e.target.value
                    setFestivalEndDate(newEndDate)
                    if (festivalStartDate && newEndDate) {
                      saveFestivalSettings(festivalStartDate, newEndDate)
                    }
                  }}
                  onBlur={(e) => {
                    const normalized = normalizeDateValue(e.target.value)
                    if (normalized !== e.target.value) {
                      setFestivalEndDate(normalized)
                      if (festivalStartDate && normalized) {
                        saveFestivalSettings(festivalStartDate, normalized)
                      }
                    }
                  }}
                  className="px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {festivalStartDate && festivalEndDate && (
                <div className="text-xs text-blue-700">
                  {festivalDates.length} days
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date Navigation Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            {/* Date Display & Navigation */}
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">📅 Scheduling Planner</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Drag films into timeline • Click films to edit time • Drag to move between venues
                </p>
              </div>
              
              {/* Festival Date Navigation */}
              <div className="flex items-center space-x-3 bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
                <button
                  onClick={goToPreviousDay}
                  className="p-1 text-blue-600 hover:text-blue-800"
                >
                  ←
                </button>
                
                <div className="text-center">
                  <div className="font-semibold text-lg text-blue-900">
                    {formatSelectedDate()}
                  </div>
                  {isWithinFestivalDates() && (
                    <div className="text-sm text-blue-700">
                      Day {getCurrentFestivalDay()} of {festivalDates.length}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={goToNextDay}
                  className="p-1 text-blue-600 hover:text-blue-800"
                >
                  →
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Conflict Warning Button */}
              <button
                onClick={() => setConflictWarningsEnabled(!conflictWarningsEnabled)}
                className={`px-4 py-2 rounded-md font-medium ${
                  conflictWarningsEnabled
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {conflictWarningsEnabled ? '🚨 Conflicts Shown' : '⚠️ Show Conflicts'}
              </button>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-200 rounded-md p-1">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    viewMode === 'day'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600'
                  }`}
                >
                  Day View
                </button>
                <button
                  onClick={() => setViewMode('festival')}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    viewMode === 'festival'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600'
                  }`}
                >
                  Festival View
                </button>
              </div>

              {/* Set Template Button */}
              <button
                onClick={() => {
                  // Initialize with empty venues if none exist
                  if (venueTemplate.length === 0) {
                    setVenueTemplate([
                      {venue: '', house: ''},
                      {venue: '', house: ''},
                      {venue: '', house: ''}
                    ])
                  }
                  setShowTemplateModal(true)
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium text-sm"
              >
                Set Template
              </button>
            </div>
          </div>

          {/* Conflict Summary */}
          {conflictWarningsEnabled && conflicts.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <span className="text-yellow-600 font-medium">
                  ⚠️ {conflicts.length} scheduling conflicts detected
                </span>
                <span className="ml-4 text-sm text-gray-600">
                  Red: &lt;20min gap | Yellow: 20-30min gap
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'day' ? (
            // Day View - Continuous Timeline
            <div className="min-w-full">
              <div className="flex border-b border-gray-200">
                {/* Venue column header */}
                <div className="w-48 p-2 text-left text-xs font-medium text-gray-500 uppercase border-r bg-gray-50 sticky left-0 z-10">
                  Venue
                </div>
                {/* Timeline header */}
                <div className="flex-1 relative">
                  <div className="relative h-10 bg-gray-50 border-b border-gray-200">
                    {timeMarkers.map((marker) => (
                      <div
                        key={marker.time24}
                        className="absolute top-0 bottom-0 flex items-center justify-center text-xs font-medium text-gray-500 border-r border-gray-300 font-mono"
                        style={{
                          left: `${((marker.hour24 - 10) / 13) * 100}%`,
                          width: `${(1 / 13) * 100}%`
                        }}
                      >
                        {marker.time12}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Venue rows */}
              <div>
                {getOrderedVenues().map((house) => (
                  <div key={house.id} className="flex border-b border-gray-200 h-20 relative">
                    {/* Venue name */}
                    <div className="w-48 p-2 text-sm text-gray-600 border-r bg-gray-50 font-medium sticky left-0 z-10 flex items-center">
                      {house.venue.name} - {house.name}
                    </div>
                    
                    {/* Timeline area */}
                    <div 
                      className="flex-1 relative bg-white hover:bg-gray-50 cursor-crosshair"
                      onDrop={(e) => {
                        console.log('🎯 Drop event fired!', house.venue.name, house.name)
                        e.preventDefault()
                        e.stopPropagation()
                        handleDrop(e, house.id, selectedDate)
                      }}
                      onDragOver={(e) => {
                        const dropEffect = draggedFilm ? (isDraggingScheduled ? 'move' : 'copy') : 'none'
                        console.log('🎯 Drag over venue:', house.venue.name, 'draggedFilm:', draggedFilm?.film, 'isDraggingScheduled:', isDraggingScheduled, 'dropEffect:', dropEffect)
                        e.preventDefault()
                        e.stopPropagation()
                        e.dataTransfer.dropEffect = dropEffect
                      }}
                      onContextMenu={(e) => handleRightClick(e, house.id)}
                    >
                      {/* Hour markers */}
                      {timeMarkers.map((marker) => (
                        <div
                          key={marker.time24}
                          className="absolute top-0 bottom-0 border-r border-gray-200 opacity-50"
                          style={{
                            left: `${((marker.hour24 - 10) / 13) * 100}%`
                          }}
                        />
                      ))}

                      {/* Blackout periods */}
                      {(() => {
                        const venueBlackouts = blackouts[`${house.id}-${selectedDate}`] || []
                        return venueBlackouts.map((blackout, index) => {
                          const startTimeMinutes = timeStringToMinutes(blackout.start)
                          const endTimeMinutes = timeStringToMinutes(blackout.end)
                          
                          const timelineStart = 10 * 60 // 10 AM in minutes
                          const timelineEnd = 23 * 60 // 11 PM in minutes
                          
                          const blackoutStartPercentage = ((startTimeMinutes - timelineStart) / (timelineEnd - timelineStart)) * 100
                          const blackoutWidthPercentage = ((endTimeMinutes - startTimeMinutes) / (timelineEnd - timelineStart)) * 100
                          
                          return (
                            <div
                              key={`blackout-${index}`}
                              className="absolute top-0 bottom-0 bg-gray-800 opacity-60 pointer-events-none z-10"
                              style={{
                                left: `${Math.max(0, blackoutStartPercentage)}%`,
                                width: `${Math.max(1, blackoutWidthPercentage)}%`,
                              }}
                              title={`Blackout: ${blackout.start} - ${blackout.end}`}
                            />
                          )
                        })
                      })()}
                      
                      {/* Conflict highlighting */}
                      {conflictWarningsEnabled && conflicts
                        .filter(c => c.venue_house_id === house.id)
                        .map((conflict, index) => {
                          const startTimeMinutes = timeStringToMinutes(conflict.start_time)
                          const endTimeMinutes = timeStringToMinutes(conflict.end_time)
                          
                          const timelineStart = 10 * 60 // 10 AM in minutes
                          const timelineEnd = 23 * 60 // 11 PM in minutes
                          
                          // Position the conflict overlay at the gap location
                          const conflictStartPercentage = ((startTimeMinutes - timelineStart) / (timelineEnd - timelineStart)) * 100
                          const gapDuration = Math.abs(endTimeMinutes - startTimeMinutes)
                          const conflictWidthPercentage = Math.max(((gapDuration) / (timelineEnd - timelineStart)) * 100, 2)
                          
                          return (
                            <div
                              key={`conflict-${index}`}
                              className={`absolute top-0 bottom-0 z-30 ${
                                conflict.severity === 'danger' ? 'bg-red-400' : 'bg-yellow-400'
                              } opacity-80 pointer-events-none`}
                              style={{
                                left: `${conflictStartPercentage}%`,
                                width: `${Math.max(conflictWidthPercentage, 2)}%`,
                              }}
                              title={`${conflict.severity === 'danger' ? 'Danger' : 'Warning'}: ${conflict.gap_minutes} minute gap`}
                            />
                          )
                        })}

                      {/* Scheduled films positioned by time */}
                      {screenings
                        .filter(s => s.venue_house_id === house.id && s.screening_date === selectedDate)
                        .map((screening) => {
                          // Calculate position based on start time
                          const startTimeMinutes = timeStringToMinutes(screening.start_time.substring(0, 5))
                          const startHour = Math.floor(startTimeMinutes / 60)
                          const startMinute = startTimeMinutes % 60
                          
                          // Position from 10 AM (600 minutes) to 11 PM (1380 minutes)
                          const timelineStart = 10 * 60 // 10 AM in minutes
                          const timelineEnd = 23 * 60 // 11 PM in minutes
                          const relativeStart = startTimeMinutes - timelineStart
                          const leftPercentage = (relativeStart / (timelineEnd - timelineStart)) * 100
                          
                          // Width based on runtime
                          const widthPercentage = ((screening.programming_film.runtime || 60) / (timelineEnd - timelineStart)) * 100
                          
                          return (
                            <div key={screening.id} className="relative">
                              {editingScreening === screening.id ? (
                                // Time Edit Mode
                                <div
                                  className="absolute top-1 bottom-1 rounded p-2 bg-white border-2 border-blue-500 text-xs z-30 min-w-48"
                                  style={{
                                    left: `${leftPercentage}%`,
                                  }}
                                >
                                  <div className="font-medium text-gray-900 mb-2">
                                    {screening.programming_film.film}
                                  </div>
                                  
                                  <div className="flex items-center space-x-2 mb-2">
                                    <label className="text-xs text-gray-600">Time:</label>
                                    <input
                                      type="text"
                                      value={editingTime}
                                      onChange={(e) => setEditingTime(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveTimeEdit()
                                        if (e.key === 'Escape') cancelTimeEdit()
                                      }}
                                      className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                                      placeholder="2:30 PM"
                                      autoFocus
                                    />
                                  </div>
                                  
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={saveTimeEdit}
                                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={cancelTimeEdit}
                                      className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => deleteScreening(screening.id)}
                                      className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // Normal Display Mode
                                <div
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation()
                                    handleScheduledFilmDragStart(e, screening)
                                  }}
                                  onDragEnd={(e) => {
                                    e.stopPropagation()
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    startEditingTime(screening)
                                  }}
                                  className={`absolute top-2 rounded p-2 text-xs overflow-hidden z-20 cursor-pointer hover:opacity-90 transition-opacity shadow-sm ${
                                    screening.press_industry 
                                      ? 'bg-white text-black border-2 border-black' 
                                      : 'text-white bg-blue-600'
                                  }`}
                                  style={{
                                    left: `${leftPercentage}%`,
                                    width: `${Math.max(widthPercentage, 8)}%`, // Minimum 8% width
                                    height: '60px', // Fixed height for proper visibility
                                    backgroundColor: screening.press_industry ? 'white' : getFilmColor(screening.programming_film),
                                  }}
                                  title={`Click to edit time • Drag to move • ${screening.programming_film.film} - ${convertTo12Hour(screening.start_time)} (${screening.programming_film.runtime}min)`}
                                >
                                  <div className="font-medium truncate text-xs">
                                    {screening.programming_film.film}
                                  </div>
                                  <div className="text-xs opacity-75">
                                    {convertTo12Hour(screening.start_time)} • {screening.programming_film.runtime}m
                                  </div>
                                  
                                  {/* P&I Checkbox */}
                                  <div className="absolute bottom-1 right-1">
                                    <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={screening.press_industry || false}
                                        onChange={(e) => {
                                          e.stopPropagation()
                                          togglePressIndustry(screening.id, screening.press_industry || false)
                                        }}
                                        className="sr-only"
                                      />
                                      <div className={`text-xs font-bold px-1 rounded ${
                                        screening.press_industry 
                                          ? 'bg-black text-white' 
                                          : 'bg-white bg-opacity-20 text-white border border-white'
                                      }`}>
                                        P&I
                                      </div>
                                    </label>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Festival View (14 days)
            <div className="p-4">
              <div className="grid grid-cols-7 gap-4">
                {festivalDates.map((date) => (
                  <div key={date} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-2 text-center">
                      <div className="font-medium text-sm">
                        {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className="p-2 space-y-1 min-h-32">
                      {screenings
                        .filter(s => s.screening_date === date)
                        .map((screening) => (
                          <div
                            key={screening.id}
                            className="text-xs p-1 rounded text-white"
                            style={{ backgroundColor: getFilmColor(screening.programming_film) }}
                          >
                            <div className="font-medium truncate">
                              {screening.programming_film.film}
                            </div>
                            <div className="opacity-75">
                              {convertTo12Hour(screening.start_time)} • {screening.venue_house.venue.name}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Venue Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-transparent z-50">
          <div 
            className="absolute bg-white rounded-lg shadow-2xl border border-gray-300"
            style={{
              left: modalPosition.x || '50%',
              top: modalPosition.y || '50%',
              transform: modalPosition.x ? 'none' : 'translate(-50%, -50%)',
              width: '600px',
              maxHeight: '80vh'
            }}
          >
            {/* Draggable Header */}
            <div 
              className="bg-gray-100 px-6 py-4 rounded-t-lg cursor-move border-b border-gray-200"
              onMouseDown={(e) => {
                setIsDraggingModal(true)
                const rect = e.currentTarget.getBoundingClientRect()
                setDragOffset({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top
                })
              }}
            >
              <h3 className="text-lg font-semibold text-gray-900">Venue Template & Program Colors</h3>
              <p className="text-sm text-gray-600 mt-1">Set venue order and program highlighting colors</p>
            </div>

            <div className="p-6 overflow-y-auto" style={{maxHeight: 'calc(80vh - 140px)'}}>
              {/* Venue Template Section */}
              <div className="mb-8">
                <h4 className="text-md font-semibold mb-4 text-gray-900">Venue Order</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Type venue names and drag to reorder. This order applies to all scheduling days.
                </p>
                
                <div className="space-y-3 mb-4">
                  {venueTemplate.map((venue, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded border cursor-move"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('venueIndex', index.toString())
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const dragIndex = parseInt(e.dataTransfer.getData('venueIndex'))
                        const hoverIndex = index
                        
                        if (dragIndex !== hoverIndex) {
                          const newTemplate = [...venueTemplate]
                          const draggedVenue = newTemplate[dragIndex]
                          newTemplate.splice(dragIndex, 1)
                          newTemplate.splice(hoverIndex, 0, draggedVenue)
                          setVenueTemplate(newTemplate)
                        }
                      }}
                    >
                      <div className="text-gray-400 cursor-grab">⋮⋮</div>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Venue Name"
                          value={venue.venue}
                          onChange={(e) => {
                            const newTemplate = [...venueTemplate]
                            newTemplate[index] = {...newTemplate[index], venue: e.target.value}
                            setVenueTemplate(newTemplate)
                          }}
                          className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="House/Screen Name"
                          value={venue.house}
                          onChange={(e) => {
                            const newTemplate = [...venueTemplate]
                            newTemplate[index] = {...newTemplate[index], house: e.target.value}
                            setVenueTemplate(newTemplate)
                          }}
                          className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newTemplate = venueTemplate.filter((_, i) => i !== index)
                          setVenueTemplate(newTemplate)
                        }}
                        className="text-red-600 hover:text-red-800 px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => {
                    setVenueTemplate([...venueTemplate, {venue: '', house: ''}])
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  + Add Venue
                </button>
              </div>

              {/* Program Colors Section */}
              <div>
                <h4 className="text-md font-semibold mb-4 text-gray-900">Program Colors</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Set background colors for different programs. Leave blank to use default colors.
                </p>
                
                <div className="grid grid-cols-1 gap-3">
                  {[
                    'International Competition',
                    'Documentary Competition', 
                    'New Directors Competition',
                    'OutLook',
                    'Snapshots',
                    'Spotlight',
                    'After Dark',
                    'Comedy',
                    'Special Presentation',
                    'Black Perspectives',
                    'Retro',
                    'Opening',
                    'Closing',
                    'Centerpiece'
                  ].map((program) => {
                    const currentColor = programColors[program]
                    const defaultColor = PROGRAM_COLORS[program as keyof typeof PROGRAM_COLORS] || '#6B7280'
                    const displayColor = currentColor === 'none' ? '#6B7280' : (currentColor || defaultColor)
                    
                    return (
                      <div key={program} className="flex items-center space-x-3">
                        <div className="w-40 text-sm font-medium text-gray-700">{program}:</div>
                        
                        {/* None/Color toggle */}
                        <div className="flex items-center space-x-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`${program}-color-option`}
                              checked={currentColor === 'none'}
                              onChange={() => {
                                setProgramColors({
                                  ...programColors,
                                  [program]: 'none'
                                })
                              }}
                              className="mr-1"
                            />
                            <span className="text-xs">None</span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`${program}-color-option`}
                              checked={currentColor !== 'none'}
                              onChange={() => {
                                if (currentColor === 'none') {
                                  setProgramColors({
                                    ...programColors,
                                    [program]: defaultColor
                                  })
                                }
                              }}
                              className="mr-1"
                            />
                            <span className="text-xs">Color</span>
                          </label>
                        </div>
                        
                        {/* Color picker */}
                        <input
                          type="color"
                          value={displayColor}
                          onChange={(e) => {
                            console.log(`🎨 Color picker changed for ${program}: ${e.target.value}`)
                            console.log('🎨 Current programColors before update:', programColors)
                            const newColors = {
                              ...programColors,
                              [program]: e.target.value
                            }
                            console.log('🎨 New programColors after update:', newColors)
                            setProgramColors(newColors)
                          }}
                          disabled={currentColor === 'none'}
                          className={`w-12 h-8 rounded border border-gray-300 ${
                            currentColor === 'none' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        />
                        
                        <div className="text-xs text-gray-500 flex-1">
                          {currentColor === 'none' ? 'No color' : displayColor}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            
            {/* Fixed Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => {
                  saveVenueTemplate(venueTemplate, programColors)
                  setShowTemplateModal(false)
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Save Template
              </button>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click Context Menu */}
      {contextMenu?.show && (
        <div
          className="fixed bg-white border border-gray-300 rounded shadow-lg z-50 py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button
            onClick={handleCreateBlackout}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            Add Blackout Period
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu?.show && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}