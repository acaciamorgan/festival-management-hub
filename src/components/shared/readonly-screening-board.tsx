'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getStringDayOfWeek, formatStringTime } from '@/lib/string-date-utils'
import { loadScreeningBoardSettings } from '@/lib/screening-board-settings'

interface PublishedScreening {
  id: string
  film_title: string
  film_id?: string | null
  film_type?: string | null
  screening_date: string
  start_time: string
  run_time: number | null
  venue_short_code: string
  is_cancelled: boolean
  notes: string | null
}

interface PIJuryScreening {
  id: string
  film_title: string
  film_id?: string | null
  film_type?: string | null
  screening_type: 'P&I' | 'Jury'
  screening_date: string
  start_time: string
  run_time: number | null
  venue_short_code: string
  is_cancelled: boolean
  is_tentative?: boolean
  film_approved?: boolean
  locked?: boolean
  notes: string | null
}

interface TechCheckScreening {
  id: string
  film_title: string
  film_id?: string | null
  film_type?: string | null
  screening_date: string
  start_time: string
  run_time: number | null
  venue_short_code: string
  is_cancelled: boolean
  notes: string | null
}

interface ReadOnlyScreeningBoardProps {
  currentYear: number
  onFilmClick?: (screening: any) => void
}

export function ReadOnlyScreeningBoard({ currentYear, onFilmClick }: ReadOnlyScreeningBoardProps) {
  const supabase = createClient()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const daySectionRefs = useRef<Map<string, HTMLElement>>(new Map())
  const [hasScrolledToToday, setHasScrolledToToday] = useState(false)

  const [publishedScreenings, setPublishedScreenings] = useState<PublishedScreening[]>([])
  const [piJuryScreenings, setPiJuryScreenings] = useState<PIJuryScreening[]>([])
  const [techCheckScreenings, setTechCheckScreenings] = useState<TechCheckScreening[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedVenues, setSelectedVenues] = useState<string[]>([])
  const [venueOrder, setVenueOrder] = useState<string[]>([])
  const [programSettings, setProgramSettings] = useState<Record<string, { enabled: boolean; color: string }>>({})

  const [featureFilms, setFeatureFilms] = useState<any[]>([])
  const [shortFilms, setShortFilms] = useState<any[]>([])
  const [shortsPrograms, setShortsPrograms] = useState<any[]>([])

  const [screeningSearchTerm, setScreeningSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)

  // Screening type visibility toggles
  const [showTicketing, setShowTicketing] = useState(true)
  const [showPIJury, setShowPIJury] = useState(true)
  const [showTechCheck, setShowTechCheck] = useState(true)

  // Combine all screenings with type tags, filtered by visibility toggles
  const allScreenings = useMemo(() => [
    ...(showTicketing ? publishedScreenings.map(s => ({ ...s, type: 'published' })) : []),
    ...(showPIJury ? piJuryScreenings.map(s => ({ ...s, type: 'pi-jury' })) : []),
    ...(showTechCheck ? techCheckScreenings.map(s => ({ ...s, type: 'tech-check' })) : [])
  ], [publishedScreenings, piJuryScreenings, techCheckScreenings, showTicketing, showPIJury, showTechCheck])

  // Group screenings by date
  const screeningsByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    allScreenings.forEach(screening => {
      const date = screening.screening_date
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(screening)
    })
    const sortedDates = Object.keys(grouped).sort()
    return sortedDates.map(date => ({ date, screenings: grouped[date] }))
  }, [allScreenings])

  // Search effect
  useEffect(() => {
    if (!screeningSearchTerm) {
      setSearchResults([])
      setCurrentSearchIndex(0)
      return
    }
    const results = allScreenings.filter(screening =>
      screening.film_title?.toLowerCase().includes(screeningSearchTerm.toLowerCase()) ||
      screening.venue_short_code?.toLowerCase().includes(screeningSearchTerm.toLowerCase()) ||
      screening.notes?.toLowerCase().includes(screeningSearchTerm.toLowerCase())
    )
    setSearchResults(results)
    setCurrentSearchIndex(0)
  }, [screeningSearchTerm, allScreenings])

  // Scroll to search result
  useEffect(() => {
    if (searchResults.length > 0 && currentSearchIndex < searchResults.length) {
      const currentResult = searchResults[currentSearchIndex]
      if (currentResult) {
        const dayElement = daySectionRefs.current.get(currentResult.screening_date)
        if (dayElement) {
          dayElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }
  }, [currentSearchIndex, searchResults])

  // Snap to today on initial load
  useEffect(() => {
    if (hasScrolledToToday || screeningsByDate.length === 0) return
    const today = new Date().toISOString().slice(0, 10)
    const firstDay = screeningsByDate[0]?.date
    const lastDay = screeningsByDate[screeningsByDate.length - 1]?.date
    if (firstDay && lastDay && today >= firstDay && today <= lastDay) {
      const todayElement = daySectionRefs.current.get(today)
      if (todayElement) {
        setTimeout(() => {
          todayElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    }
    setHasScrolledToToday(true)
  }, [screeningsByDate, hasScrolledToToday])

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [pubResult, piResult, tcResult, featResult, shortResult, spResult, settings] = await Promise.all([
          supabase
            .from('ticketing_screenings_with_films')
            .select('*')
            .eq('festival_year', currentYear)
            .order('screening_date', { ascending: true })
            .order('start_time', { ascending: true }),
          supabase
            .from('pi_jury_screenings_with_films')
            .select('*')
            .eq('festival_year', currentYear)
            .order('screening_date', { ascending: true })
            .order('start_time', { ascending: true }),
          supabase
            .from('tech_check_screenings_with_films')
            .select('*')
            .eq('festival_year', currentYear)
            .order('screening_date', { ascending: true })
            .order('start_time', { ascending: true }),
          supabase
            .from('feature_films')
            .select('id, title, program_1, program_2, program_3, program_4')
            .eq('festival_year', currentYear),
          supabase
            .from('short_films')
            .select('id, title, program_1, program_2, program_3, shorts_program_id')
            .eq('festival_year', currentYear),
          supabase
            .from('shorts_programs')
            .select('id, program_name, program_number')
            .eq('festival_year', currentYear),
          loadScreeningBoardSettings()
        ])

        setPublishedScreenings(pubResult.data || [])
        setPiJuryScreenings(piResult.data || [])
        setTechCheckScreenings(tcResult.data || [])
        setFeatureFilms(featResult.data || [])
        setShortFilms(shortResult.data || [])
        setShortsPrograms(spResult.data || [])

        if (settings) {
          setSelectedVenues(settings.selectedVenues || [])
          setVenueOrder(settings.venueOrder || [])
          setProgramSettings(settings.programSettings || {})
        }
      } catch (error) {
        console.error('Error loading screening board data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [currentYear])

  // Format date for day headers
  const formatDayHeader = (dateStr: string) => {
    const [, month, day] = dateStr.split('-').map(Number)
    const dayOfWeek = getStringDayOfWeek(dateStr)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${dayOfWeek}, ${monthNames[month - 1]} ${day}`
  }

  // Get primary program for color coding
  const getPrimaryProgram = useCallback((screening: any) => {
    if (screening.type === 'tech-check') return 'Tech Check'
    if (screening.type === 'pi-jury') return 'P&I/Jury'

    const isShortsProgramScreening = shortsPrograms.some(sp =>
      sp.program_name === screening.film_title
    )
    if (isShortsProgramScreening) return 'Shorts'

    const featureFilm = featureFilms.find(f => f.title === screening.film_title)
    if (featureFilm?.program_1) return featureFilm.program_1

    const shortFilm = shortFilms.find(f => f.title === screening.film_title)
    if (shortFilm) {
      if (shortFilm.program_1) return shortFilm.program_1
      if (shortFilm.shorts_program_id) return 'Shorts'
    }

    return null
  }, [featureFilms, shortFilms, shortsPrograms])

  // Get film programs for fallback color
  const getFilmPrograms = useCallback((screening: any): string[] => {
    const programs: string[] = []
    if (screening.type === 'tech-check') { programs.push('Tech Check'); return programs }
    if (screening.type === 'pi-jury') { programs.push('P&I/Jury'); return programs }

    const featureFilm = featureFilms.find(f => f.title === screening.film_title)
    if (featureFilm) {
      if (featureFilm.program_1) programs.push(featureFilm.program_1)
      if (featureFilm.program_2) programs.push(featureFilm.program_2)
      if (featureFilm.program_3) programs.push(featureFilm.program_3)
      if (featureFilm.program_4) programs.push(featureFilm.program_4)
    }

    const shortFilm = shortFilms.find(f => f.title === screening.film_title)
    if (shortFilm) {
      if (shortFilm.program_1) programs.push(shortFilm.program_1)
      if (shortFilm.program_2) programs.push(shortFilm.program_2)
      if (shortFilm.program_3) programs.push(shortFilm.program_3)
      if (shortFilm.shorts_program_id) programs.push('Shorts')
    }

    return programs
  }, [featureFilms, shortFilms])

  // Get screening box color
  const getScreeningColor = useCallback((screening: any) => {
    if (screening.type === 'tech-check') {
      return { className: 'border-gray-800', backgroundColor: '#000000' }
    }

    if (screening.type === 'pi-jury') {
      const isApproved = screening.film_approved && !screening.locked
      const isLocked = screening.film_approved && screening.locked

      if (isLocked) return { className: 'border-gray-300', backgroundColor: '#ffffff' }
      if (isApproved) return { className: 'border-green-400 border-dashed', backgroundColor: '#dcfce7' }
      return { className: 'border-gray-400 border-dashed', backgroundColor: '#f3f4f6' }
    }

    const primaryProgram = getPrimaryProgram(screening)
    if (primaryProgram && programSettings[primaryProgram]?.enabled) {
      return { className: 'border-gray-700', backgroundColor: programSettings[primaryProgram].color }
    }

    const programs = getFilmPrograms(screening)
    for (const program of programs) {
      if (programSettings[program]?.enabled) {
        return { className: 'border-gray-700', backgroundColor: programSettings[program].color }
      }
    }

    return { className: 'border-gray-300', backgroundColor: '#e5e7eb' }
  }, [programSettings, getPrimaryProgram, getFilmPrograms])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-lg text-gray-500">Loading screening board...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header with search */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Find screening..."
              value={screeningSearchTerm}
              onChange={(e) => setScreeningSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48"
            />
            {searchResults.length > 0 && (
              <div className="absolute right-2 top-2 flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  {searchResults.length} screening{searchResults.length !== 1 ? 's' : ''}
                </span>
                {searchResults.length > 1 && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setCurrentSearchIndex(prev =>
                        prev > 0 ? prev - 1 : searchResults.length - 1
                      )}
                      className="px-1 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      &uarr;
                    </button>
                    <button
                      onClick={() => setCurrentSearchIndex(prev =>
                        prev < searchResults.length - 1 ? prev + 1 : 0
                      )}
                      className="px-1 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      &darr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {screeningsByDate.length} day{screeningsByDate.length !== 1 ? 's' : ''} &middot; {allScreenings.length} screening{allScreenings.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center space-x-4 ml-auto">
            <label className="flex items-center space-x-1.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showTicketing}
                onChange={(e) => setShowTicketing(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Ticketing</span>
            </label>
            <label className="flex items-center space-x-1.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showPIJury}
                onChange={(e) => setShowPIJury(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>P&I/Jury</span>
            </label>
            <label className="flex items-center space-x-1.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showTechCheck}
                onChange={(e) => setShowTechCheck(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Tech Check</span>
            </label>
          </div>
        </div>
      </div>

      {/* P&I Legend */}
      {showPIJury && allScreenings.some(s => s.type === 'pi-jury') && (
        <div className="bg-gray-50 px-6 py-2 border-b border-gray-200">
          <div className="flex items-center space-x-6 text-xs">
            <span className="text-gray-600 font-medium">P&I Status:</span>
            <span className="flex items-center">
              <span className="w-4 h-3 bg-gray-100 border border-gray-400 border-dashed rounded inline-block mr-1"></span>
              <span className="text-gray-500">Not Approved</span>
            </span>
            <span className="flex items-center">
              <span className="w-4 h-3 bg-green-100 border border-green-400 border-dashed rounded inline-block mr-1"></span>
              <span className="text-green-700">Approved (Not Locked)</span>
            </span>
            <span className="flex items-center">
              <span className="w-4 h-3 bg-white border border-gray-300 rounded inline-block mr-1"></span>
              <span className="text-gray-700">Locked</span>
            </span>
          </div>
        </div>
      )}

      {/* Vertical multi-day timeline */}
      <div
        ref={scrollContainerRef}
        className="bg-white overflow-x-auto overflow-y-auto flex-1"
      >
        {screeningsByDate.length === 0 ? (
          <div className="text-center text-gray-500 mt-12 p-6">
            <p className="text-lg">No screenings scheduled</p>
          </div>
        ) : (
          <div className="min-w-[1200px]">
            {screeningsByDate.map(({ date, screenings }) => {
              const today = new Date().toISOString().slice(0, 10)
              const isToday = date === today

              return (
                <div
                  key={date}
                  ref={(el) => {
                    if (el) daySectionRefs.current.set(date, el)
                  }}
                >
                  {/* Sticky day header */}
                  <div className={`sticky top-0 z-10 px-6 py-3 border-b border-gray-300 ${
                    isToday ? 'bg-blue-50 border-blue-300' : 'bg-gray-100'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <span className={`text-lg font-semibold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                        {formatDayHeader(date)}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full">Today</span>
                      )}
                      <span className="text-sm text-gray-500">
                        {screenings.length} screening{screenings.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Grid for this day */}
                  <div className="p-6">
                    <ScreeningGrid
                      screenings={screenings}
                      selectedVenues={selectedVenues}
                      venueOrder={venueOrder}
                      getScreeningColor={getScreeningColor}
                      searchResults={searchResults}
                      currentSearchIndex={currentSearchIndex}
                      onFilmClick={onFilmClick}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Inline ScreeningGrid
interface ScreeningGridProps {
  screenings: any[]
  selectedVenues: string[]
  venueOrder: string[]
  getScreeningColor: (screening: any) => { className: string; backgroundColor: string }
  searchResults: any[]
  currentSearchIndex: number
  onFilmClick?: (screening: any) => void
}

function ScreeningGrid({ screenings, selectedVenues, venueOrder, getScreeningColor, searchResults, currentSearchIndex, onFilmClick }: ScreeningGridProps) {
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      slots.push(`${hour.toString().padStart(2, '0')}:15`)
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
      slots.push(`${hour.toString().padStart(2, '0')}:45`)
    }
    return slots
  }

  const getVenues = () => {
    const uniqueVenues = [...new Set(screenings.map(s => s.venue_short_code))]
    if (selectedVenues.length === 0) return uniqueVenues.sort()

    const filteredVenues = uniqueVenues.filter(venue => selectedVenues.includes(venue))
    return filteredVenues.sort((a, b) => {
      const indexA = venueOrder.indexOf(a)
      const indexB = venueOrder.indexOf(b)
      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      return a.localeCompare(b)
    })
  }

  const timeToMinutes = (timeString: string) => {
    if (!timeString) return 0
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
  }

  const minutesToPosition = (minutes: number, startHour = 9) => {
    const startMinutes = startHour * 60
    const endMinutes = 23 * 60 + 45
    const totalMinutes = endMinutes - startMinutes
    return Math.max(0, Math.min(100, ((minutes - startMinutes) / totalMinutes) * 100))
  }

  const getScreeningWidthPercent = (runtime: number | null) => {
    if (!runtime) return 2
    const totalHours = 23.75 - 9
    const runtimeHours = runtime / 60
    return Math.max(1, Math.min(25, (runtimeHours / totalHours) * 100))
  }

  const getTextColor = (bgColor: string | null) => {
    if (!bgColor) return ''
    const hex = bgColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 128 ? 'text-gray-900' : 'text-white'
  }

  const timeSlots = generateTimeSlots()
  const venues = getVenues()

  if (venues.length === 0) {
    return <div className="p-6 text-center text-gray-500">No venues found for screenings</div>
  }

  return (
    <div className="min-w-[1200px] p-6">
      <div className="relative">
        {/* Time Header */}
        <div className="flex mb-4">
          <div className="w-32 flex-shrink-0"></div>
          <div className="flex-1 relative min-w-[1000px]">
            <div className="flex justify-between text-xs text-gray-500">
              {timeSlots.filter((_, index) => index % 4 === 0).map((time) => (
                <div key={time} className="text-center">
                  {formatStringTime(time)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Venue Rows */}
        <div className="space-y-2">
          {venues.map((venue) => {
            const venueScreenings = screenings.filter(s => s.venue_short_code === venue)

            return (
              <div key={venue} className="flex">
                <div className="w-32 flex-shrink-0 px-3 py-2 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-l-md flex items-center">
                  {venue}
                </div>
                <div className="flex-1 relative h-12 bg-white border border-l-0 border-gray-200 rounded-r-md min-w-[1000px]">
                  {/* Time grid lines */}
                  {timeSlots.filter((_, index) => index % 4 === 0).map((time) => {
                    const timeMinutes = timeToMinutes(time)
                    const position = minutesToPosition(timeMinutes)
                    return (
                      <div
                        key={time}
                        className="absolute top-0 bottom-0 w-px bg-gray-200"
                        style={{ left: `${position}%` }}
                      />
                    )
                  })}

                  {/* Screening boxes */}
                  {venueScreenings.map((screening) => {
                    const startMinutes = timeToMinutes(screening.start_time)
                    const leftPosition = minutesToPosition(startMinutes)
                    const widthPercent = getScreeningWidthPercent(screening.run_time)
                    const colorInfo = getScreeningColor(screening)

                    const searchMatchIndex = searchResults.findIndex(
                      r => r.id === screening.id && r.type === screening.type
                    )
                    const isCurrentSearchResult = searchMatchIndex === currentSearchIndex
                    const isSearchMatch = searchMatchIndex !== -1

                    const textColorClass = colorInfo.backgroundColor ? getTextColor(colorInfo.backgroundColor) : ''

                    const baseStyle = {
                      left: `${leftPosition}%`,
                      width: `${widthPercent}%`,
                      minWidth: '60px',
                      ...(colorInfo.backgroundColor && { backgroundColor: colorInfo.backgroundColor })
                    }

                    return (
                      <div
                        key={`${screening.type}-${screening.id}`}
                        className={`absolute top-1 bottom-1 rounded px-2 py-1 text-xs font-medium border hover:shadow-md transition-all cursor-pointer ${
                          isCurrentSearchResult
                            ? 'border-2 border-yellow-400 shadow-lg bg-yellow-100 text-yellow-900 z-10'
                            : isSearchMatch
                              ? 'border-yellow-300 bg-yellow-50 text-yellow-800'
                              : `${colorInfo.className} ${textColorClass}`
                        }`}
                        style={baseStyle}
                        title={`${screening.film_title} - ${formatStringTime(screening.start_time)} - ${screening.run_time || '?'} min`}
                        onClick={() => onFilmClick?.(screening)}
                      >
                        <div className="truncate font-medium text-xs leading-tight hover:underline">
                          {screening.is_tentative && <span className="opacity-75">(TENT) </span>}
                          {screening.film_title}
                        </div>
                        <div className="truncate text-xs opacity-75">
                          {screening.run_time ? `${screening.run_time}min` : 'TBD'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
            <span className="text-gray-600">Public Screening</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
            <span className="text-gray-600">P&I/Jury</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-900 rounded"></div>
            <span className="text-gray-600">Tech Check</span>
          </div>
        </div>
      </div>
    </div>
  )
}
