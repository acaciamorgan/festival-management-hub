'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { DraggableModal } from '@/components/ui/draggable-modal'
import { getStringDayOfWeek, formatStringTime } from '@/lib/string-date-utils'
import { loadScreeningBoardSettings, saveScreeningBoardSettings } from '@/lib/screening-board-settings'
import FilmDetailModal from '@/components/modals/film-detail-modal'
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

// Screening Board Component
interface ScreeningBoardProps {
  currentDate: string
  setCurrentDate: (date: string) => void
  festivalSettings: any
  canEditTicketing: boolean
  publishedScreenings: PublishedScreening[]
  piJuryScreenings: PIJuryScreening[]
  techCheckScreenings: TechCheckScreening[]
  loading: boolean
  screeningSearchTerm: string
  setScreeningSearchTerm: (term: string) => void
  searchResults: any[]
  setSearchResults: (results: any[]) => void
  currentSearchIndex: number
  setCurrentSearchIndex: (index: number) => void
}

function ScreeningBoard({ 
  currentDate, 
  setCurrentDate, 
  festivalSettings, 
  canEditTicketing,
  publishedScreenings, 
  piJuryScreenings, 
  techCheckScreenings, 
  loading,
  screeningSearchTerm,
  setScreeningSearchTerm,
  searchResults,
  setSearchResults,
  currentSearchIndex,
  setCurrentSearchIndex,
  showSetViewModal,
  setShowSetViewModal,
  selectedVenues,
  setSelectedVenues,
  venueOrder,
  setVenueOrder,
  programSettings,
  setProgramSettings,
  featureFilms,
  shortFilms,
  shortsPrograms,
  getAllPrograms
}: ScreeningBoardProps & {
  showSetViewModal: boolean
  setShowSetViewModal: (show: boolean) => void
  selectedVenues: string[]
  setSelectedVenues: (venues: string[]) => void
  venueOrder: string[]
  setVenueOrder: (order: string[]) => void
  programSettings: Record<string, { enabled: boolean; color: string }>
  setProgramSettings: (settings: Record<string, { enabled: boolean; color: string }>) => void
  featureFilms: any[]
  shortFilms: any[]
  shortsPrograms: any[]
  getAllPrograms: () => string[]
}) {
  const supabase = createClient()
  const { user } = useAuth()
  
  // Debounce screening search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedScreeningSearchTerm(screeningSearchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [screeningSearchTerm])

  // Find Screening search effect
  useEffect(() => {
    if (!screeningSearchTerm) {
      setSearchResults([])
      setCurrentSearchIndex(0)
      return
    }

    // Search through all screenings
    const allScreenings = [
      ...publishedScreenings.map(s => ({ ...s, type: 'published' })),
      ...piJuryScreenings.map(s => ({ ...s, type: 'pi-jury' })),
      ...techCheckScreenings.map(s => ({ ...s, type: 'tech-check' }))
    ]

    const results = allScreenings.filter(screening => 
      screening.film_title.toLowerCase().includes(screeningSearchTerm.toLowerCase()) ||
      screening.venue_short_code.toLowerCase().includes(screeningSearchTerm.toLowerCase()) ||
      screening.notes?.toLowerCase().includes(screeningSearchTerm.toLowerCase())
    )

    setSearchResults(results)
    setCurrentSearchIndex(0)

    // If there are results, navigate to the first one
    if (results.length > 0) {
      setCurrentDate(results[0].screening_date)
    }
  }, [screeningSearchTerm, publishedScreenings, piJuryScreenings, techCheckScreenings, setSearchResults, setCurrentSearchIndex, setCurrentDate])

  // Navigate through search results
  useEffect(() => {
    if (searchResults.length > 0 && currentSearchIndex < searchResults.length) {
      const currentResult = searchResults[currentSearchIndex]
      if (currentResult && currentResult.screening_date !== currentDate) {
        setCurrentDate(currentResult.screening_date)
      }
    }
  }, [currentSearchIndex, searchResults, currentDate, setCurrentDate])
  
  // Date navigation functions using string operations only
  const goToPreviousDay = () => {
    if (!currentDate) return
    const [year, month, day] = currentDate.split('-').map(Number)
    let newDay = day - 1
    let newMonth = month
    let newYear = year
    
    if (newDay < 1) {
      newMonth -= 1
      if (newMonth < 1) {
        newMonth = 12
        newYear -= 1
      }
      // Get days in previous month
      const daysInMonth = getDaysInMonth(newYear, newMonth)
      newDay = daysInMonth
    }
    
    const newDate = `${newYear}-${newMonth.toString().padStart(2, '0')}-${newDay.toString().padStart(2, '0')}`
    setCurrentDate(newDate)
  }
  
  const goToNextDay = () => {
    if (!currentDate) return
    const [year, month, day] = currentDate.split('-').map(Number)
    let newDay = day + 1
    let newMonth = month
    let newYear = year
    
    const daysInMonth = getDaysInMonth(year, month)
    if (newDay > daysInMonth) {
      newDay = 1
      newMonth += 1
      if (newMonth > 12) {
        newMonth = 1
        newYear += 1
      }
    }
    
    const newDate = `${newYear}-${newMonth.toString().padStart(2, '0')}-${newDay.toString().padStart(2, '0')}`
    setCurrentDate(newDate)
  }
  
  // Format current date for display using string operations only
  const formatCurrentDate = () => {
    if (!currentDate) return 'Select Date'
    const [year, month, day] = currentDate.split('-').map(Number)
    
    // Calculate day of week using string date operations
    const dayOfWeek = getStringDayOfWeek(currentDate)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const monthName = monthNames[month - 1]
    
    return `${dayOfWeek}, ${monthName} ${day}`
  }
  
  // Get screenings for current date
  const getScreeningsForDate = () => {
    if (!currentDate) return []
    
    const allScreenings = [
      ...publishedScreenings.map(s => ({ ...s, type: 'published' })),
      ...piJuryScreenings.map(s => ({ ...s, type: 'pi-jury' })),
      ...techCheckScreenings.map(s => ({ ...s, type: 'tech-check' }))
    ]
    
    return allScreenings.filter(screening => screening.screening_date === currentDate)
  }
  
  // Temporarily disable search functionality to get basic board working
  
  if (loading || !currentDate) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-lg text-gray-500">
          {loading ? 'Loading screening board...' : 'Setting up dates...'}
        </div>
      </div>
    )
  }
  
  const screeningsForDate = getScreeningsForDate()
  
  return (
    <>
      {/* Date Navigation Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Find Screening Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Find screening..."
                value={screeningSearchTerm}
                onChange={(e) => setScreeningSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48"
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
                        ↑
                      </button>
                      <button
                        onClick={() => setCurrentSearchIndex(prev => 
                          prev < searchResults.length - 1 ? prev + 1 : 0
                        )}
                        className="px-1 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={goToPreviousDay}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md"
            >
              ← Previous Day
            </button>
            <div className="text-2xl font-semibold text-gray-900">
              {formatCurrentDate()}
            </div>
            <button
              onClick={goToNextDay}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md"
            >
              Next Day →
            </button>
            
            {canEditTicketing && (
              <button
                onClick={() => setShowSetViewModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                Set View
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Screening Grid */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)]">
          {screeningsForDate.length === 0 ? (
            <div className="text-center text-gray-500 mt-12 p-6">
              <p className="text-lg">No screenings scheduled for {formatCurrentDate()}</p>
              <p className="text-sm mt-2">Use the arrow buttons to navigate to different dates</p>
            </div>
          ) : (
            <ScreeningGrid 
              screenings={screeningsForDate} 
              selectedVenues={selectedVenues}
              venueOrder={venueOrder}
              programSettings={programSettings}
              searchResults={searchResults}
              currentSearchIndex={currentSearchIndex}
              featureFilms={featureFilms}
              shortFilms={shortFilms}
              shortsPrograms={shortsPrograms}
            />
          )}
        </div>
      </div>

      {/* Set View Modal */}
      {showSetViewModal && (
        <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-6">Set Screening Board View</h3>
            
            {/* Venue Selection */}
            <div className="mb-6">
              <h4 className="text-md font-medium mb-3">Select Venues to Display</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-3">
                {Array.from(new Set([
                  ...publishedScreenings.map(s => s.venue_short_code),
                  ...piJuryScreenings.map(s => s.venue_short_code),
                  ...techCheckScreenings.map(s => s.venue_short_code)
                ])).filter(Boolean).sort().map(venue => (
                  <label key={venue} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedVenues.includes(venue)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVenues([...selectedVenues, venue])
                          if (!venueOrder.includes(venue)) {
                            setVenueOrder([...venueOrder, venue])
                          }
                        } else {
                          setSelectedVenues(selectedVenues.filter(v => v !== venue))
                          setVenueOrder(venueOrder.filter(v => v !== venue))
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">{venue}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Venue Order */}
            {selectedVenues.length > 1 && (
              <div className="mb-6">
                <h4 className="text-md font-medium mb-3">Venue Display Order</h4>
                <div className="space-y-2">
                  {venueOrder.filter(venue => selectedVenues.includes(venue)).map((venue, index) => (
                    <div key={venue} className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
                      <span className="text-sm font-medium w-8">{index + 1}.</span>
                      <span className="flex-1 text-sm">{venue}</span>
                      <div className="flex space-x-1">
                        {index > 0 && (
                          <button
                            onClick={() => {
                              const newOrder = [...venueOrder]
                              const currentIndex = newOrder.indexOf(venue)
                              const prevIndex = newOrder.indexOf(venueOrder.filter(v => selectedVenues.includes(v))[index - 1])
                              ;[newOrder[currentIndex], newOrder[prevIndex]] = [newOrder[prevIndex], newOrder[currentIndex]]
                              setVenueOrder(newOrder)
                            }}
                            className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded"
                          >
                            ↑
                          </button>
                        )}
                        {index < venueOrder.filter(v => selectedVenues.includes(v)).length - 1 && (
                          <button
                            onClick={() => {
                              const newOrder = [...venueOrder]
                              const currentIndex = newOrder.indexOf(venue)
                              const nextIndex = newOrder.indexOf(venueOrder.filter(v => selectedVenues.includes(v))[index + 1])
                              ;[newOrder[currentIndex], newOrder[nextIndex]] = [newOrder[nextIndex], newOrder[currentIndex]]
                              setVenueOrder(newOrder)
                            }}
                            className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded"
                          >
                            ↓
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Program Colors */}
            <div className="mb-6">
              <h4 className="text-md font-medium mb-3">Program Colors</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 rounded p-3">
                {/* Special categories */}
                <div className="pb-2 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={programSettings['P&I/Jury']?.enabled || false}
                      onChange={(e) => setProgramSettings({
                        ...programSettings,
                        'P&I/Jury': {
                          enabled: e.target.checked,
                          color: programSettings['P&I/Jury']?.color || '#ffffff'
                        }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium w-32">P&I/Jury</span>
                    <input
                      type="color"
                      value={programSettings['P&I/Jury']?.color || '#ffffff'}
                      onChange={(e) => setProgramSettings({
                        ...programSettings,
                        'P&I/Jury': {
                          ...programSettings['P&I/Jury'],
                          enabled: programSettings['P&I/Jury']?.enabled || false,
                          color: e.target.value
                        }
                      })}
                      disabled={!programSettings['P&I/Jury']?.enabled}
                      className="w-8 h-8 rounded border border-gray-300 disabled:opacity-50"
                    />
                    <span className="text-xs text-gray-500 font-mono">{programSettings['P&I/Jury']?.color || '#ffffff'}</span>
                  </div>
                  <div className="flex items-center space-x-3 mt-2">
                    <input
                      type="checkbox"
                      checked={programSettings['Tech Check']?.enabled || false}
                      onChange={(e) => setProgramSettings({
                        ...programSettings,
                        'Tech Check': {
                          enabled: e.target.checked,
                          color: programSettings['Tech Check']?.color || '#000000'
                        }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium w-32">Tech Check</span>
                    <input
                      type="color"
                      value={programSettings['Tech Check']?.color || '#000000'}
                      onChange={(e) => setProgramSettings({
                        ...programSettings,
                        'Tech Check': {
                          ...programSettings['Tech Check'],
                          enabled: programSettings['Tech Check']?.enabled || false,
                          color: e.target.value
                        }
                      })}
                      disabled={!programSettings['Tech Check']?.enabled}
                      className="w-8 h-8 rounded border border-gray-300 disabled:opacity-50"
                    />
                    <span className="text-xs text-gray-500 font-mono">{programSettings['Tech Check']?.color || '#000000'}</span>
                  </div>
                </div>
                
                {/* Film Programs */}
                {getAllPrograms().map(program => (
                  <div key={program} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={programSettings[program]?.enabled || false}
                      onChange={(e) => setProgramSettings({
                        ...programSettings,
                        [program]: {
                          enabled: e.target.checked,
                          color: programSettings[program]?.color || '#3b82f6'
                        }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium w-32 truncate" title={program}>{program}</span>
                    <input
                      type="color"
                      value={programSettings[program]?.color || '#3b82f6'}
                      onChange={(e) => setProgramSettings({
                        ...programSettings,
                        [program]: {
                          ...programSettings[program],
                          enabled: programSettings[program]?.enabled || false,
                          color: e.target.value
                        }
                      })}
                      disabled={!programSettings[program]?.enabled}
                      className="w-8 h-8 rounded border border-gray-300 disabled:opacity-50"
                    />
                    <span className="text-xs text-gray-500 font-mono">{programSettings[program]?.color || '#3b82f6'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSetViewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Save settings to database
                  const settings = {
                    selectedVenues,
                    venueOrder,
                    programSettings
                  }

                  if (user) {
                    const success = await saveScreeningBoardSettings(settings, user.id)
                    if (success) {
                      console.log('Settings saved successfully')
                    } else {
                      console.error('Failed to save settings')
                    }
                  }

                  setShowSetViewModal(false)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Apply View Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Screening Grid Component for time/venue layout
interface ScreeningGridProps {
  screenings: any[]
  selectedVenues: string[]
  venueOrder: string[]
  programSettings: Record<string, { enabled: boolean; color: string }>
  searchResults: any[]
  currentSearchIndex: number
  featureFilms: any[]
  shortFilms: any[]
  shortsPrograms: any[]
}

function ScreeningGrid({ screenings, selectedVenues, venueOrder, programSettings, searchResults, currentSearchIndex, featureFilms, shortFilms, shortsPrograms }: ScreeningGridProps) {
  const supabase = createClient()
  
  // Time slots - 15 minute intervals from 8 AM to 11 PM
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      slots.push(`${hour.toString().padStart(2, '0')}:15`)
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
      slots.push(`${hour.toString().padStart(2, '0')}:45`)
    }
    return slots
  }
  
  // Get unique venues from screenings, filtered and ordered by user settings
  const getVenues = () => {
    const uniqueVenues = [...new Set(screenings.map(s => s.venue_short_code))]
    
    // If no venues are selected (initial state), show all venues
    if (selectedVenues.length === 0) {
      return uniqueVenues.sort()
    }
    
    // Filter to only selected venues that exist in the screenings
    const filteredVenues = uniqueVenues.filter(venue => selectedVenues.includes(venue))
    
    // Sort according to venueOrder
    return filteredVenues.sort((a, b) => {
      const indexA = venueOrder.indexOf(a)
      const indexB = venueOrder.indexOf(b)
      
      // If both are in venueOrder, sort by their order
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }
      // If only one is in venueOrder, it comes first
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      // Neither in venueOrder, sort alphabetically
      return a.localeCompare(b)
    })
  }
  
  // Convert time to minutes since midnight for positioning
  const timeToMinutes = (timeString: string) => {
    if (!timeString) return 0
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
  }
  
  // Convert minutes to percentage of day for positioning
  const minutesToPosition = (minutes: number, startHour = 8) => {
    const startMinutes = startHour * 60 // 8 AM = 480 minutes
    const endMinutes = 23 * 60 + 45 // 11:45 PM = 1425 minutes
    const totalMinutes = endMinutes - startMinutes
    return Math.max(0, Math.min(100, ((minutes - startMinutes) / totalMinutes) * 100))
  }
  
  // Calculate screening box width as percentage based on runtime
  const getScreeningWidthPercent = (runtime: number | null) => {
    if (!runtime) return 2 // Default 2% width for unknown runtime (about 30 minutes)
    const startHour = 8
    const endHour = 23.75 // 11:45 PM
    const totalHours = endHour - startHour
    const runtimeHours = runtime / 60
    return Math.max(1, Math.min(25, (runtimeHours / totalHours) * 100)) // Convert to percentage of timeline
  }
  
  // Get film programs for a screening
  const getFilmPrograms = (screening: any): string[] => {
    const programs: string[] = []
    
    // Check if it's a tech check or P&I/jury screening
    if (screening.type === 'tech-check') {
      programs.push('Tech Check')
      return programs
    }
    if (screening.type === 'pi-jury') {
      programs.push('P&I/Jury')
      return programs
    }
    
    // For published screenings, look up the film in feature films and short films
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
      
      // Check if it's part of a shorts program
      if (shortFilm.shorts_program_id) {
        programs.push('Shorts')
      }
    }
    
    return programs
  }

  // Get the primary program for color coding (program_1 takes priority)
  const getPrimaryProgram = (screening: any) => {
    // For tech-check or pi-jury, return their type
    if (screening.type === 'tech-check') return 'Tech Check'
    if (screening.type === 'pi-jury') return 'P&I/Jury'

    // Check if this is a shorts program by looking at the title
    const isShortsProgramScreening = shortsPrograms.some(sp =>
      sp.program_name === screening.film_title
    )
    if (isShortsProgramScreening) {
      return 'Shorts'
    }

    // For published screenings, look up the film in feature films and short films
    const featureFilm = featureFilms.find(f => f.title === screening.film_title)
    if (featureFilm && featureFilm.program_1) {
      return featureFilm.program_1
    }

    const shortFilm = shortFilms.find(f => f.title === screening.film_title)
    if (shortFilm) {
      // First check if it has program_1
      if (shortFilm.program_1) {
        return shortFilm.program_1
      }

      // Otherwise check if it's part of a shorts program
      if (shortFilm.shorts_program_id) {
        return 'Shorts'
      }
    }

    return null
  }

  // Get screening box color based on type and program colors
  const getScreeningColor = (screening: any) => {
    // Tech checks: Always black with white text
    if (screening.type === 'tech-check') {
      return { 
        className: 'border-gray-800', 
        backgroundColor: '#000000' 
      }
    }
    
    // P&I/Press screenings: Always white with dark text
    if (screening.type === 'pi-jury') {
      return { 
        className: 'border-gray-300', 
        backgroundColor: '#ffffff' 
      }
    }
    
    // Other screenings: Use program-based coloring (prioritize program_1)
    const primaryProgram = getPrimaryProgram(screening)

    // Check if the primary program is enabled and has a color
    if (primaryProgram && programSettings[primaryProgram]?.enabled) {
      return {
        className: 'border-gray-700',
        backgroundColor: programSettings[primaryProgram].color
      }
    }

    // If primary program doesn't have a color, fall back to checking other programs
    const programs = getFilmPrograms(screening)
    for (const program of programs) {
      if (programSettings[program]?.enabled) {
        return {
          className: 'border-gray-700',
          backgroundColor: programSettings[program].color
        }
      }
    }
    
    // Default to grey if no enabled programs
    return { className: 'border-gray-300', backgroundColor: '#e5e7eb' }
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
          <div className="w-32 flex-shrink-0"></div> {/* Space for venue labels */}
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
                {/* Venue Label */}
                <div className="w-32 flex-shrink-0 px-3 py-2 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-l-md flex items-center">
                  {venue}
                </div>
                
                {/* Timeline */}
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
                    
                    // Check if this screening is in search results
                    const searchMatchIndex = searchResults.findIndex(
                      r => r.id === screening.id && r.type === screening.type
                    )
                    const isCurrentSearchResult = searchMatchIndex === currentSearchIndex
                    const isSearchMatch = searchMatchIndex !== -1
                    
                    // Determine text color based on background
                    const getTextColor = (bgColor: string | null) => {
                      if (!bgColor) return ''
                      // Simple brightness calculation
                      const hex = bgColor.replace('#', '')
                      const r = parseInt(hex.substr(0, 2), 16)
                      const g = parseInt(hex.substr(2, 2), 16)
                      const b = parseInt(hex.substr(4, 2), 16)
                      const brightness = (r * 299 + g * 587 + b * 114) / 1000
                      return brightness > 128 ? 'text-gray-900' : 'text-white'
                    }
                    
                    const baseStyle = {
                      left: `${leftPosition}%`,
                      width: `${widthPercent}%`,
                      minWidth: '60px',
                      ...(colorInfo.backgroundColor && { backgroundColor: colorInfo.backgroundColor })
                    }
                    
                    const textColorClass = colorInfo.backgroundColor ? getTextColor(colorInfo.backgroundColor) : ''
                    
                    return (
                      <div
                        key={`${screening.type}-${screening.id}`}
                        className={`absolute top-1 bottom-1 rounded px-2 py-1 text-xs font-medium border cursor-pointer hover:shadow-md transition-all ${
                          isCurrentSearchResult
                            ? 'border-2 border-yellow-400 shadow-lg bg-yellow-100 text-yellow-900 z-10'
                            : isSearchMatch
                              ? 'border-yellow-300 bg-yellow-50 text-yellow-800'
                              : `${colorInfo.className} ${textColorClass}`
                        }`}
                        style={baseStyle}
                        title={`${screening.film_title} - ${formatStringTime(screening.start_time)} - ${screening.run_time || '?'} min`}
                        onClick={() => {
                          setSelectedFilmTitle(screening.film_title)
                          setShowFilmModal(true)
                        }}
                      >
                        <div className="truncate font-medium text-xs leading-tight hover:underline">
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

// Interface for published screenings
interface PublishedScreening {
  id: string
  ticketing_screening_id: string
  film_card_id: string
  film_title: string
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
  screening_type: 'P&I' | 'Jury'
  screening_date: string
  day_of_week: string
  start_time: string
  run_time: number | null
  venue_short_code: string
  capacity: number | null
  notes: string | null
  is_cancelled: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// Interface for Tech Check screenings
interface TechCheckScreening {
  id: string
  film_title: string
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
  const canEditTicketing = permissions?.modulePermissions?.['ticketing']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false
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
  const [showFilmModal, setShowFilmModal] = useState(false)
  const [selectedFilmTitle, setSelectedFilmTitle] = useState('')
  
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
  
  // Unpublish state
  const [selectedForUnpublish, setSelectedForUnpublish] = useState<Set<string>>(new Set())
  const [unpublishing, setUnpublishing] = useState(false)
  
  // Screening Board state
  const [currentBoardDate, setCurrentBoardDate] = useState('')
  const [festivalSettings, setFestivalSettings] = useState<any>(null)
  const [screeningSearchTerm, setScreeningSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
  
  // Set View modal state
  const [showSetViewModal, setShowSetViewModal] = useState(false)
  const [selectedVenues, setSelectedVenues] = useState<string[]>([])
  const [venueOrder, setVenueOrder] = useState<string[]>([])
  
  // Program colors state - now includes enable/disable and color
  const [programSettings, setProgramSettings] = useState<{
    [key: string]: { enabled: boolean; color: string }
  }>({})
  
  // Film card data for program info
  const [featureFilms, setFeatureFilms] = useState<any[]>([])
  const [shortFilms, setShortFilms] = useState<any[]>([])
  const [shortsPrograms, setShortsPrograms] = useState<any[]>([])

  const supabase = createClient()

  // Load saved settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await loadScreeningBoardSettings()
      if (settings) {
        console.log('Loading saved screening board settings')
        setSelectedVenues(settings.selectedVenues || [])
        setVenueOrder(settings.venueOrder || [])
        setProgramSettings(settings.programSettings || {})
      }
    }
    loadSettings()
  }, [])

  // Initialize venue selection when modal opens (only if no saved settings)
  useEffect(() => {
    if (showSetViewModal && selectedVenues.length === 0) {
      const allVenues = Array.from(new Set([
        ...publishedScreenings.map(s => s.venue_short_code),
        ...piJuryScreenings.map(s => s.venue_short_code),
        ...techCheckScreenings.map(s => s.venue_short_code)
      ])).filter(Boolean).sort()

      setSelectedVenues(allVenues)
      setVenueOrder(allVenues)
    }
  }, [showSetViewModal, publishedScreenings, piJuryScreenings, techCheckScreenings, selectedVenues.length])
  
  // Load festival settings for default dates
  const loadFestivalSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('festival_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        setFestivalSettings(data)
        // Set current board date to festival start date by default
        if (!currentBoardDate) {
          setCurrentBoardDate(data.start_date)
        }
      } else {
        // If no festival settings found, default to today
        const today = getCurrentDateString()
        setCurrentBoardDate(today)
      }
    } catch (error) {
      console.error('Error loading festival settings:', error)
      // If there's an error, default to today
      const today = getCurrentDateString()
      setCurrentBoardDate(today)
    }
  }, [supabase, currentBoardDate])

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
      const { data, error } = await supabase
        .from('published_screenings')
        .select('*')
        .order('screening_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error
      setPublishedScreenings(data || [])
    } catch (error) {
      console.error('Error loading published screenings:', error)
    }
  }, [supabase])

  const loadPIJuryScreenings = useCallback(async () => {
    try {
      // TODO: Create pi_jury_screenings table
      const { data, error } = await supabase
        .from('pi_jury_screenings')
        .select('*')
        .order('screening_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error && error.code !== 'PGRST116') throw error // Ignore table not found for now
      setPiJuryScreenings(data || [])
    } catch (error) {
      console.error('Error loading P&I/Jury screenings:', error)
      setPiJuryScreenings([]) // Set empty array if table doesn't exist yet
    }
  }, [supabase])

  const loadTechCheckScreenings = useCallback(async () => {
    try {
      // TODO: Create tech_check_screenings table
      const { data, error } = await supabase
        .from('tech_check_screenings')
        .select('*')
        .order('screening_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error && error.code !== 'PGRST116') throw error // Ignore table not found for now
      setTechCheckScreenings(data || [])
    } catch (error) {
      console.error('Error loading tech check screenings:', error)
      setTechCheckScreenings([]) // Set empty array if table doesn't exist yet
    }
  }, [supabase])

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

      if (pressError) throw pressError

      // Process each press screening
      let successCount = 0
      let skippedCount = 0
      
      for (const screening of pressScreenings || []) {
        if (!screening.screening_date || !screening.screening_time) continue

        // Use the short_code field directly
        if (!screening.short_code) {
          console.warn(`No short code for ${screening.title} - skipping`)
          continue
        }
        
        const shortCode = screening.short_code
        console.log(`DEBUG: Syncing ${screening.title} with short_code: "${shortCode}"`)

        // Check if this screening already exists
        const { data: existing } = await supabase
          .from('pi_jury_screenings')
          .select('id')
          .eq('film_title', screening.title)
          .eq('screening_date', screening.screening_date)
          .eq('start_time', screening.screening_time)
          .single()

        if (existing) {
          skippedCount++
        } else {
          // Create new P&I screening
          const { error: insertError } = await supabase
            .from('pi_jury_screenings')
            .insert({
              film_title: screening.title,
              screening_type: 'P&I',
              screening_date: screening.screening_date,
              day_of_week: getDayOfWeek(screening.screening_date),
              start_time: screening.screening_time,
              run_time: screening.runtime,
              venue_short_code: shortCode,
              notes: screening.notes,
              is_cancelled: false
            })

          if (!insertError) {
            successCount++
          } else {
            console.error(`Error inserting ${screening.title}:`, insertError)
          }
        }
      }

      const message = skippedCount > 0 
        ? `Successfully synced ${successCount} press screenings to P&I (${skippedCount} already existed)`
        : `Successfully synced ${successCount} press screenings to P&I`
      
      alert(message)
      await loadPIJuryScreenings()
    } catch (error) {
      console.error('Error syncing press screenings:', error)
      alert('Error syncing press screenings. Please try again.')
    }
  }, [supabase, user, getDayOfWeek, loadPIJuryScreenings])

  // Load film cards for auto-suggest
  const loadFilmCards = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('feature_films')
        .select('id, title, run_time')
        .order('title')
      
      if (error) throw error
      setFilmCards(data || [])
    } catch (error) {
      console.error('Error loading film cards:', error)
    }
  }, [supabase])

  // Load feature films to get program data
  const loadFeatureFilms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('feature_films')
        .select('id, title, program_1, program_2, program_3, program_4')
        
      if (error) throw error
      setFeatureFilms(data || [])
    } catch (error) {
      console.error('Error loading feature films:', error)
    }
  }, [supabase])

  // Load short films to get program data
  const loadShortFilms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('short_films')
        .select('id, title, program_1, program_2, program_3, shorts_program_id')
        
      if (error) throw error
      setShortFilms(data || [])
    } catch (error) {
      console.error('Error loading short films:', error)
    }
  }, [supabase])

  // Load shorts programs with runtime
  const loadShortsPrograms = useCallback(async () => {
    try {
      const { data: programs, error } = await supabase
        .from('shorts_programs')
        .select('id, program_name, program_number')
        .order('program_number')
        
      if (error) throw error
      
      // Calculate total runtime for each program by summing shorts
      const programsWithRuntime = await Promise.all(
        (programs || []).map(async (program) => {
          const { data: shorts } = await supabase
            .from('short_films')
            .select('runtime_minutes')
            .eq('shorts_program_id', program.id)
          
          const totalRuntime = shorts?.reduce((sum, short) => {
            return sum + (short.runtime_minutes || 0)
          }, 0) || 0
          
          return {
            ...program,
            total_runtime: totalRuntime
          }
        })
      )
      
      setShortsPrograms(programsWithRuntime)
    } catch (error) {
      console.error('Error loading shorts programs:', error)
    }
  }, [supabase])

  // Get all unique programs from film data
  const getAllPrograms = useCallback(() => {
    const programs = new Set<string>()
    
    // Add programs from feature films
    featureFilms.forEach(film => {
      if (film.program_1) programs.add(film.program_1)
      if (film.program_2) programs.add(film.program_2)
      if (film.program_3) programs.add(film.program_3)
      if (film.program_4) programs.add(film.program_4)
    })
    
    // Add programs from short films
    shortFilms.forEach(film => {
      if (film.program_1) programs.add(film.program_1)
      if (film.program_2) programs.add(film.program_2)
      if (film.program_3) programs.add(film.program_3)
    })
    
    // Add one unified shorts category
    if (shortsPrograms.length > 0) {
      programs.add('Shorts')
    }
    
    return Array.from(programs).sort()
  }, [featureFilms, shortFilms, shortsPrograms])

  // Load venue cards for auto-suggest from existing screenings
  const loadVenueCards = useCallback(() => {
    // Get unique venue short codes from all existing screenings
    const uniqueVenues = Array.from(new Set([
      ...publishedScreenings.map(s => s.venue_short_code),
      ...piJuryScreenings.map(s => s.venue_short_code),
      ...techCheckScreenings.map(s => s.venue_short_code)
    ])).filter(Boolean).sort()
    
    // Convert to the format expected by the auto-suggest
    const venueCards = uniqueVenues.map(shortCode => ({
      id: shortCode,
      short_code: shortCode,
      display_name: shortCode
    }))
    
    setVenueCards(venueCards)
    console.log('🏢 Loaded venue cards:', venueCards.length, venueCards)
  }, [publishedScreenings, piJuryScreenings, techCheckScreenings])

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadPublishedScreenings(),
        loadPIJuryScreenings(),
        loadTechCheckScreenings(),
        loadFilmCards(),
        loadFestivalSettings(),
        loadFeatureFilms(),
        loadShortFilms(),
        loadShortsPrograms()
      ])
      
      // Load venue cards after screenings are loaded
      loadVenueCards()
    } finally {
      setLoading(false)
    }
  }, [loadPublishedScreenings, loadPIJuryScreenings, loadTechCheckScreenings, loadFilmCards, loadFestivalSettings, loadFeatureFilms, loadShortFilms, loadShortsPrograms])

  useEffect(() => {
    loadData()
  }, [loadData])
  
  // Set default date if not set
  useEffect(() => {
    if (!currentBoardDate) {
      const today = getCurrentDateString()
      setCurrentBoardDate(today)
    }
  }, [currentBoardDate])

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

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      // Parse CSV properly handling quoted fields with commas
      const parseCSVRow = (row: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i]
          
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"(.+)"$/, '$1'))
            current = ''
          } else {
            current += char
          }
        }
        
        result.push(current.trim().replace(/^"(.+)"$/, '$1'))
        return result
      }
      
      const rows = text.split('\n').map(row => parseCSVRow(row))
      const headers = rows[0]
      
      if (!headers.includes('Title') || !headers.includes('Date') || !headers.includes('Start Time')) {
        alert('CSV must contain Title, Date, and Start Time columns')
        return
      }

      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
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
            errors.push(`Row ${i + 1}: Missing required fields`)
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

          // Convert date from "10/15" to "2025-10-15" format (using 2025 for the festival year)
          const [month, day_num] = dateStr.split('/')
          const year = 2025 // Festival year
          
          // Debug the problematic rows
          if (i + 1 === 46 || i + 1 === 88 || i + 1 === 129 || i + 1 === 158) {
            console.log(`DEBUG Row ${i + 1}:`, {
              rawRow: rows[i],
              title,
              dateStr,
              month,
              day_num,
              splitResult: dateStr.split('/')
            })
          }

          // Validate month and day_num exist before calling padStart
          if (!month || !day_num) {
            console.error(`Invalid date format in row ${i + 1}:`, dateStr, 'Raw row:', rows[i])
            errors.push(`Row ${i + 1}: Invalid date format - ${dateStr}`)
            errorCount++
            continue
          }
          
          const formattedDate = `${year}-${month.padStart(2, '0')}-${day_num.padStart(2, '0')}`

          // Convert time from "6:30 PM" to "18:30" format
          const timeMatch = startTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
          if (!timeMatch) {
            errors.push(`Row ${i + 1}: Invalid time format: ${startTimeStr}`)
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
            .from('ticketing_screenings')
            .select('id, film_title')
            .eq('screening_date', formattedDate)
            .eq('start_time', formattedTime)
            .eq('venue_short_code', location || '')
            .single()

          if (duplicateCheckError && duplicateCheckError.code !== 'PGRST116') {
            console.error('Duplicate check error:', duplicateCheckError)
            errors.push(`Row ${i + 1} (${title}): Duplicate check failed - ${duplicateCheckError.message}`)
            errorCount++
            continue
          }

          if (existingScreening) {
            console.log(`Skipping duplicate screening: ${title} at ${location} on ${formattedDate} ${formattedTime}`)
            errors.push(`Row ${i + 1} (${title}): Duplicate screening skipped - ${existingScreening.film_title} already scheduled at ${location} on ${formattedDate} ${formattedTime}`)
            errorCount++
            continue
          }

          // Step 2: Create record in ticketing_screenings
          const ticketingData = {
            film_title: title,
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
            errors.push(`Row ${i + 1} (${title}): Failed to create ticketing record - ${ticketingError.message}`)
            errorCount++
            continue
          }

          console.log('Ticketing record created successfully:', ticketingResult)

          // Step 3: Create record in published_screenings with reference
          const publishedData = {
            film_title: title,
            screening_date: formattedDate,
            day_of_week: day || getStringDayOfWeek(formattedDate),
            start_time: formattedTime,
            run_time: runningTime ? parseInt(runningTime) : null,
            venue_short_code: location || '',
            capacity: capacity ? parseInt(capacity) : null,
            notes: notes,
            ticketing_screening_id: ticketingResult.id,
            film_card_id: null,
            // No published_by tracking needed
          }

          // Insert into published_screenings
          const { error } = await supabase
            .from('published_screenings')
            .insert(publishedData)

          if (error) {
            errors.push(`Row ${i + 1} (${title}): ${error.message}`)
            errorCount++
          } else {
            successCount++
          }

        } catch (rowError: any) {
          errors.push(`Row ${i + 1}: ${rowError.message || rowError}`)
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

  const handleEditScreening = (screening: any) => {
    setFormData({
      film_title: screening.film_title,
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
      if (viewMode === 'ticketing') tableName = 'published_screenings'
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
      if (viewMode === 'ticketing') tableName = 'published_screenings'
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
    } catch (error) {
      console.error('Error saving screening:', error)
      alert('Error saving screening. Please try again.')
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

      console.log(`✅ Unpublished screening: ${screening.film_title}`)
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
      screening.film_title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      screening.venue_short_code.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      screening.day_of_week.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      screening.notes?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
  }, [debouncedSearchTerm, publishedScreenings, piJuryScreenings, techCheckScreenings, viewMode])

  // Filter film suggestions - make it dynamic to catch newly synced shorts
  const filteredFilms = useMemo(() => {
    if (!filmSearchTerm) return []
    
    // If searching for "short", reload film cards to catch newly synced shorts programs
    if (filmSearchTerm.toLowerCase().includes('short')) {
      loadFilmCards() // Refresh the film cards when searching for shorts
    }
    
    return filmCards.filter(film => 
      film.title.toLowerCase().includes(filmSearchTerm.toLowerCase())
    ).slice(0, 5)
  }, [filmSearchTerm, filmCards, loadFilmCards])

  // Filter venue suggestions  
  const filteredVenues = useMemo(() => {
    console.log('🔍 Filtering venues:', { venueSearchTerm, venueCardsCount: venueCards.length, showVenueSuggestions })
    if (!venueSearchTerm) return venueCards.slice(0, 5) // Show all venues when field is focused but empty
    const filtered = venueCards.filter(venue => 
      venue.short_code.toLowerCase().includes(venueSearchTerm.toLowerCase())
    ).slice(0, 5)
    console.log('🔍 Filtered venues result:', filtered)
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
            <h1 className="text-2xl font-semibold text-gray-900">🎟️ Ticketing</h1>
            <p className="text-sm text-gray-600 mt-1">
              {filteredData.length} of {getCurrentData().length} screenings
            </p>
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
            {viewMode === 'ticketing' && selectedForUnpublish.size > 0 && (
              <button
                onClick={handleBulkUnpublish}
                disabled={unpublishing}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 font-medium disabled:opacity-50"
              >
                {unpublishing ? 'Unpublishing...' : `Unpublish Selected (${selectedForUnpublish.size})`}
              </button>
            )}
            {canEditTicketing && (
              <button
                onClick={handleAddScreening}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                {viewMode === 'tech-checks' ? 'Add Tech Check' : 'Add Screening'}
              </button>
            )}
            
            {/* CSV Upload */}
            {canEditTicketing && viewMode === 'ticketing' && (
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 font-medium cursor-pointer flex items-center space-x-2"
                >
                  <span>Upload CSV</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </label>
              </div>
            )}

            {/* Export Dropdown */}
            {canEditTicketing && (
              <div className="relative export-dropdown">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium flex items-center space-x-2"
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
            className="max-w-md px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Data Grid or Screening Board */}
      {viewMode === 'screening-board' ? (
        <ScreeningBoard 
          currentDate={currentBoardDate}
          setCurrentDate={setCurrentBoardDate}
          festivalSettings={festivalSettings}
          canEditTicketing={canEditTicketing}
          publishedScreenings={publishedScreenings}
          piJuryScreenings={piJuryScreenings}
          techCheckScreenings={techCheckScreenings}
          loading={loading}
          screeningSearchTerm={screeningSearchTerm}
          setScreeningSearchTerm={setScreeningSearchTerm}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
          currentSearchIndex={currentSearchIndex}
          setCurrentSearchIndex={setCurrentSearchIndex}
          showSetViewModal={showSetViewModal}
          setShowSetViewModal={setShowSetViewModal}
          selectedVenues={selectedVenues}
          setSelectedVenues={setSelectedVenues}
          venueOrder={venueOrder}
          setVenueOrder={setVenueOrder}
          programSettings={programSettings}
          setProgramSettings={setProgramSettings}
          featureFilms={featureFilms}
          shortFilms={shortFilms}
          shortsPrograms={shortsPrograms}
          getAllPrograms={getAllPrograms}
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
                {viewMode === 'ticketing' && (
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={selectedForUnpublish.size > 0 && selectedForUnpublish.size === filteredData.length}
                      onChange={(e) => handleSelectAllForUnpublish(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
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
              {filteredData.map((screening) => (
                <tr 
                  key={screening.id} 
                  className={`hover:bg-gray-50 ${
                    screening.is_cancelled 
                      ? 'bg-red-50 text-gray-500' 
                      : ''
                  }`}
                >
                  {viewMode === 'ticketing' && (
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedForUnpublish.has(screening.id)}
                        onChange={(e) => handleSelectForUnpublish(screening.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  {getTableColumns().map((column) => {
                    const cellValue = screening[column.key as keyof typeof screening];
                    let displayValue: React.ReactNode = cellValue || '--';
                    
                    if (column.key === 'film_title') {
                      displayValue = <div className="font-medium">{screening.film_title}</div>;
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
                        className={`px-3 py-2 text-sm text-gray-900 border-r border-gray-100 ${
                          screening.is_cancelled ? 'line-through' : ''
                        }`}
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
                        {viewMode === 'ticketing' && (
                          <button
                            onClick={() => unpublishScreening(screening).then(() => loadData())}
                            className="bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-orange-700"
                          >
                            Unpublish
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredData.length === 0 && (
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
                    setFormData(prev => ({...prev, film_title: e.target.value}))
                    setShowFilmSuggestions(true)
                  }}
                  onFocus={() => setShowFilmSuggestions(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    setVenueSearchTerm(e.target.value)
                    setFormData(prev => ({...prev, venue_short_code: e.target.value}))
                    setShowVenueSuggestions(true)
                  }}
                  onFocus={() => setShowVenueSuggestions(true)}
                  placeholder="Search venue or enter short code..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            venue_short_code: venue.short_code
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    setFormData(prev => ({...prev, film_title: e.target.value}))
                    setShowFilmSuggestions(true)
                  }}
                  onFocus={() => setShowFilmSuggestions(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    setVenueSearchTerm(e.target.value)
                    setFormData(prev => ({...prev, venue_short_code: e.target.value}))
                    setShowVenueSuggestions(true)
                  }}
                  onFocus={() => setShowVenueSuggestions(true)}
                  placeholder="Search venue or enter short code..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            venue_short_code: venue.short_code
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

      {/* Film Detail Modal */}
      <FilmDetailModal
        filmTitle={selectedFilmTitle}
        isOpen={showFilmModal}
        onClose={() => {
          setShowFilmModal(false)
          setSelectedFilmTitle('')
        }}
      />

    </div>
  )
}