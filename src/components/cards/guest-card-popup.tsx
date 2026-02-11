'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GuestCard, FilmCard, InterviewCard } from '@/types'
import { FilmCardPopup } from './film-card-popup'
import { getInterviewsForGuestCard } from '@/lib/interviews-client'
import { getFestivalYear } from '@/lib/smart-date-parser'

interface GuestCardPopupProps {
  guest: GuestCard
  onClose: () => void
  onEdit?: (guest: GuestCard) => void
  onUpdate?: (updatedGuest: GuestCard) => void
  onDelete?: (guestId: string) => void
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  isEmpty?: boolean
  defaultExpanded?: boolean
}

function CollapsibleSection({ title, children, isEmpty = false, defaultExpanded = false }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg flex justify-between items-center"
      >
        <h3 className="font-medium text-gray-900">{title}</h3>
        <span className="text-gray-400">
          {isExpanded ? '−' : '+'}
        </span>
      </button>
      {isExpanded && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  )
}

export function GuestCardPopup({ guest, onClose, onEdit, onUpdate, onDelete }: GuestCardPopupProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showFilmCard, setShowFilmCard] = useState<FilmCard | null>(null)
  const [photoShoots, setPhotoShoots] = useState<any[]>([])
  const [redCarpets, setRedCarpets] = useState<any[]>([])
  const [guestInterviews, setGuestInterviews] = useState<InterviewCard[]>([])
  const [filmScreenings, setFilmScreenings] = useState<any[]>([])
  const [specialEvents, setSpecialEvents] = useState<any[]>([])

  const supabase = createClient()

  // Load all guest data with parallel queries
  useEffect(() => {
    const loadEvents = async () => {
      try {
        // Execute all main queries in parallel
        const [
          photoShootsResult,
          redCarpetsResult,
          interviewsResult,
          guestFilmsResult,
          guestProgramsResult
        ] = await Promise.all([
          // Photo shoots query - get junction IDs first
          (async () => {
            const festivalYear = await getFestivalYear()
            const { data: junctionData } = await supabase
              .from('photo_shoot_subjects')
              .select('photo_shoot_id')
              .eq('guest_id', guest.id)
              .eq('festival_year', parseInt(festivalYear, 10))

            if (junctionData && junctionData.length > 0) {
              const photoShootIds = junctionData.map(j => j.photo_shoot_id)
              return await supabase
                .from('photo_shoots_with_details')
                .select('*')
                .in('id', photoShootIds)
                .eq('festival_year', parseInt(festivalYear, 10))
                .order('shoot_date', { ascending: false })
            }
            return { data: [], error: null }
          })(),

          // Red carpets query
          supabase
            .from('red_carpets')
            .select(`
              id,
              carpet_date,
              carpet_start_time,
              subjects_display,
              venues(name)
            `)
            .or(`subjects_display.ilike.%${guest.name}%`)
            .order('carpet_date', { ascending: false }),

          // Interviews query
          getInterviewsForGuestCard(guest.id).catch(error => {
            console.error('Error loading guest interviews:', error)
            return []
          }),

          // Guest films query
          supabase
            .from('guest_films')
            .select('film_title')
            .eq('guest_id', guest.id),

          // Guest programs query
          supabase
            .from('guest_programs')
            .select('program_title')
            .eq('guest_id', guest.id)
        ])

        // Process photo shoots
        if (photoShootsResult.error) {
          console.error('Error loading photo shoots:', photoShootsResult.error)
          setPhotoShoots([])
        } else {
          setPhotoShoots(photoShootsResult.data || [])
        }

        // Process red carpets
        if (redCarpetsResult.error) {
          console.error('Error loading red carpets:', redCarpetsResult.error)
          setRedCarpets([])
        } else {
          const relevantCarpets = (redCarpetsResult.data || []).filter(carpet => {
            if (!carpet.subjects_display) return false
            const subjects = carpet.subjects_display.split(',').map((s: string) => s.trim())
            return subjects.includes(guest.name)
          })
          setRedCarpets(relevantCarpets)
        }

        // Set interviews (already processed)
        setGuestInterviews(interviewsResult)

        // Load film screenings and program schedules for all films/programs this guest is associated with
        const loadFilmScreenings = async () => {
          try {
            // Get all film titles for this guest
            const filmTitles: string[] = []
            const programTitles: string[] = []

            // Use the already loaded guest films and programs
            if (guestFilmsResult.data) {
              filmTitles.push(...guestFilmsResult.data.map(gf => gf.film_title))

              // Check all films in parallel to see if they're short films
              const shortFilmChecks = await Promise.all(
                guestFilmsResult.data.map(async (guestFilm) => {
                  const { data: shortFilm } = await supabase
                    .from('short_films')
                    .select('shorts_program_id')
                    .eq('title', guestFilm.film_title)
                    .single()

                  if (shortFilm && shortFilm.shorts_program_id) {
                    const { data: shortsProgram } = await supabase
                      .from('shorts_programs')
                      .select('program_name')
                      .eq('id', shortFilm.shorts_program_id)
                      .single()

                    if (shortsProgram) {
                      console.log(`DEBUG: Added shorts program screening for ${guestFilm.film_title}: ${shortsProgram.program_name}`)
                      return shortsProgram.program_name
                    }
                  }
                  return null
                })
              )

              // Add shorts program names to filmTitles
              shortFilmChecks.forEach(programName => {
                if (programName) filmTitles.push(programName)
              })
            }

            if (guestProgramsResult.data) {
              programTitles.push(...guestProgramsResult.data.map(gp => gp.program_title))
            }

            // Also check films_display field for program associations in parallel
            if (guest.films_display) {
              const displayFilms = guest.films_display.split(', ').map(f => f.trim())

              // Check all display films in parallel
              const programChecks = await Promise.all(
                displayFilms.map(async (displayFilm) => {
                  const { data: programCheck } = await supabase
                    .from('programs')
                    .select('title')
                    .eq('title', displayFilm)
                    .single()

                  return programCheck ? displayFilm : null
                })
              )

              programChecks.forEach(program => {
                if (program) programTitles.push(program)
              })
            }

            // Remove duplicates
            const uniqueFilmTitles = [...new Set(filmTitles)]
            const uniqueProgramTitles = [...new Set(programTitles)]

            // Get all screenings for films in parallel
            const allScreenings: any[] = []

            // Load all film screenings in parallel
            const filmScreeningPromises = uniqueFilmTitles.map(async (filmTitle) => {
              // First try to find programming_film_id
              const { data: programmingFilm } = await supabase
                .from('programming_films')
                .select('id')
                .eq('film_title', filmTitle)
                .single()

              // Query ticketing screenings
              let screeningsQuery = supabase
                .from('ticketing_screenings')
                .select(`
                  id,
                  film_title,
                  screening_date,
                  day_of_week,
                  start_time,
                  venue_short_code,
                  is_cancelled,
                  notes
                `)
                .order('screening_date', { ascending: true })
                .order('start_time', { ascending: true })

              // Use programming_film_id if available, otherwise match by title
              if (programmingFilm?.id) {
                screeningsQuery = screeningsQuery.eq('programming_film_id', programmingFilm.id)
              } else {
                screeningsQuery = screeningsQuery.eq('film_title', filmTitle)
              }

              const { data: screeningsData } = await screeningsQuery

              if (screeningsData) {
                // Resolve venue names in parallel
                const screeningsWithVenues = await Promise.all(
                  screeningsData.map(async (screening) => {
                    if (screening.venue_short_code) {
                      const { data: houseData } = await supabase
                        .from('theater_houses')
                        .select(`
                          venue_id,
                          venues!inner(name)
                        `)
                        .eq('short_code', screening.venue_short_code)
                        .single()

                      if (houseData?.venues?.name) {
                        return { ...screening, venue_name: houseData.venues.name, type: 'screening' }
                      }
                    }
                    return { ...screening, venue_name: screening.venue_short_code, type: 'screening' }
                  })
                )

                return screeningsWithVenues
              }
              return []
            })

            const filmScreeningResults = await Promise.all(filmScreeningPromises)
            filmScreeningResults.forEach(screenings => {
              if (screenings) allScreenings.push(...screenings)
            })

            // Load all program schedules in parallel
            const programScreeningPromises = uniqueProgramTitles.map(async (programTitle) => {
              // Load both ticketing screenings and special events in parallel for each program
              const [ticketingResult, specialEventsResult] = await Promise.all([
                // Ticketing screenings query
                supabase
                  .from('ticketing_screenings')
                  .select(`
                    id,
                    film_title,
                    screening_date,
                    day_of_week,
                    start_time,
                    venue_short_code,
                    is_cancelled,
                    notes
                  `)
                  .eq('film_title', programTitle)
                  .order('screening_date', { ascending: true })
                  .order('start_time', { ascending: true }),

                // Special events query
                supabase
                  .from('special_events')
                  .select(`
                    id,
                    title,
                    event_date,
                    event_time,
                    event_type,
                    venues(name)
                  `)
                  .eq('title', programTitle)
                  .order('event_date', { ascending: true })
                  .order('event_time', { ascending: true })
              ])

              const programScreenings: any[] = []

              // Process ticketing screenings
              if (ticketingResult.data) {
                const screeningsWithVenues = await Promise.all(
                  ticketingResult.data.map(async (screening) => {
                    if (screening.venue_short_code) {
                      const { data: houseData } = await supabase
                        .from('theater_houses')
                        .select(`
                          venue_id,
                          venues!inner(name)
                        `)
                        .eq('short_code', screening.venue_short_code)
                        .single()

                      if (houseData?.venues?.name) {
                        return { ...screening, venue_name: houseData.venues.name, type: 'screening' }
                      }
                    }
                    return { ...screening, venue_name: screening.venue_short_code, type: 'screening' }
                  })
                )
                programScreenings.push(...screeningsWithVenues)
              }

              // Process special events
              if (specialEventsResult.data) {
                const eventsFormatted = specialEventsResult.data.map(event => ({
                  id: event.id,
                  film_title: event.title,
                  screening_date: event.event_date,
                  start_time: event.event_time,
                  venue_name: event.venues?.name || 'TBD',
                  type: 'special_event',
                  event_type: event.event_type,
                  is_cancelled: false,
                  notes: null
                }))
                programScreenings.push(...eventsFormatted)
              }

              return programScreenings
            })

            const programScreeningResults = await Promise.all(programScreeningPromises)
            programScreeningResults.forEach(screenings => {
              if (screenings) allScreenings.push(...screenings)
            })

            // Sort all screenings by date and time without timezone conversion
            allScreenings.sort((a, b) => {
              // Compare dates as strings (YYYY-MM-DD format)
              const dateCompare = a.screening_date.localeCompare(b.screening_date)
              if (dateCompare !== 0) return dateCompare

              // If dates are equal, compare times
              return a.start_time.localeCompare(b.start_time)
            })

            // Filter to only show screenings the guest is attending (not in non_attending_screenings array)
            const nonAttendingIds = guest.non_attending_screenings || []
            const attendingScreenings = allScreenings.filter(screening => !nonAttendingIds.includes(screening.id))

            setFilmScreenings(attendingScreenings)
          } catch (error) {
            console.error('Error loading film screenings:', error)
            setFilmScreenings([])
          }
        }
        
        await loadFilmScreenings()

        // Load special events for all films/programs this guest is associated with
        const loadSpecialEvents = async () => {
          try {
            // Get all film and program titles for this guest
            const allTitles: string[] = []

            // Get films from guest_films
            const { data: guestFilms } = await supabase
              .from('guest_films')
              .select('film_title')
              .eq('guest_id', guest.id)

            if (guestFilms) {
              allTitles.push(...guestFilms.map(gf => gf.film_title))

              // For each film, check if it's a short film and add its shorts program
              for (const guestFilm of guestFilms) {
                const { data: shortFilm } = await supabase
                  .from('short_films')
                  .select('shorts_program_id')
                  .eq('title', guestFilm.film_title)
                  .single()

                if (shortFilm && shortFilm.shorts_program_id) {
                  // Get the shorts program name
                  const { data: shortsProgram } = await supabase
                    .from('shorts_programs')
                    .select('program_name')
                    .eq('id', shortFilm.shorts_program_id)
                    .single()

                  if (shortsProgram) {
                    allTitles.push(shortsProgram.program_name)
                  }
                }
              }
            }

            // Get programs from guest_programs
            const { data: guestPrograms } = await supabase
              .from('guest_programs')
              .select('program_title')
              .eq('guest_id', guest.id)

            if (guestPrograms) {
              allTitles.push(...guestPrograms.map(gp => gp.program_title))
            }

            // Also check films_display field for program associations
            if (guest.films_display) {
              const displayFilms = guest.films_display.split(', ').map(f => f.trim())

              // Check if any of these are programs
              for (const displayFilm of displayFilms) {
                const { data: programCheck } = await supabase
                  .from('programs')
                  .select('title')
                  .eq('title', displayFilm)
                  .single()

                if (programCheck) {
                  allTitles.push(displayFilm)
                }
              }
            }

            // Remove duplicates
            const uniqueTitles = [...new Set(allTitles)]

            if (uniqueTitles.length === 0) {
              setSpecialEvents([])
              return
            }

            // Load special events and program events for these titles
            const allEvents: any[] = []

            for (const title of uniqueTitles) {
              // Search both special_events and programs tables
              const [specialEventsResult, programsResult] = await Promise.all([
                supabase
                  .from('special_events')
                  .select(`
                    id,
                    title,
                    event_date,
                    event_time,
                    event_type,
                    description,
                    venues(name)
                  `)
                  .eq('title', title)
                  .order('event_date', { ascending: true })
                  .order('event_time', { ascending: true }),

                supabase
                  .from('programs')
                  .select(`
                    id,
                    title,
                    event_date,
                    start_time,
                    end_time,
                    venue_name,
                    participants,
                    description,
                    is_industry_days
                  `)
                  .eq('title', title)
              ])

              // Add special events
              if (specialEventsResult.data) {
                const formattedSpecialEvents = specialEventsResult.data.map(event => ({
                  ...event,
                  venue_name: event.venues?.name || 'TBD',
                  type: 'special_event'
                }))
                allEvents.push(...formattedSpecialEvents)
              }

              // Add program events
              if (programsResult.data) {
                const formattedProgramEvents = programsResult.data.map(program => ({
                  id: program.id,
                  title: program.title,
                  event_date: program.event_date,
                  event_time: program.start_time,
                  end_time: program.end_time,
                  venue_name: program.venue_name || 'TBD',
                  participants: program.participants,
                  description: program.description,
                  event_type: program.is_industry_days ? 'Industry Days' : 'Program Event',
                  type: 'program_event'
                }))
                allEvents.push(...formattedProgramEvents)
              }
            }

            // Sort all events by date and time
            allEvents.sort((a, b) => {
              const dateCompare = a.event_date.localeCompare(b.event_date)
              if (dateCompare !== 0) return dateCompare
              return a.event_time.localeCompare(b.event_time)
            })

            setSpecialEvents(allEvents)
          } catch (error) {
            console.error('Error loading special events:', error)
            setSpecialEvents([])
          }
        }

        await loadSpecialEvents()
      } catch (error) {
        console.error('Error loading events:', error)
      }
    }

    loadEvents()
  }, [guest.name, guest.id, supabase])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }, [isDragging, dragStart.x, dragStart.y])

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove])

  const getGuestTypeIcon = (type: string) => {
    switch (type) {
      case 'Features':
        return '🎬'
      case 'Shorts':
        return '📽️'
      case 'Industry':
        return '💼'
      case 'CineYouth':
        return '🎓'
      case 'Jury':
        return '⚖️'
      case 'Other':
        return '👤'
      default:
        return '👥'
    }
  }

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Not specified'
    // Parse date string directly without timezone conversion
    if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-')
      const shortYear = year.slice(-2)
      return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${shortYear}`
    }
    return dateString
  }

  const formatTime = (timeString: string | undefined): string => {
    if (!timeString) return ''

    // Just return the time string as-is - no formatting
    return timeString.trim()
  }

  const formatTimeForDisplay = (timeString: string | undefined): string => {
    if (!timeString) return 'Not specified'
    
    // Convert 24-hour format to 12-hour AM/PM format
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    
    return `${hour12}:${minutes} ${ampm}`
  }

  const openFilmCard = async (filmTitle: string) => {
    try {
      // Try to find the film in feature_films first
      let { data: filmData, error } = await supabase
        .from('feature_films')
        .select('*')
        .eq('title', filmTitle)
        .single()

      if (error) {
        // If not found in feature films, try short films
        const { data: shortFilmData, error: shortError } = await supabase
          .from('short_films')
          .select('*')
          .eq('title', filmTitle)
          .single()

        if (shortError) {
          // If not found in films, try programs
          const { data: programData, error: programError } = await supabase
            .from('programs')
            .select('*')
            .eq('title', filmTitle)
            .single()

          if (programError) {
            console.warn('Title not found in database:', filmTitle)
            alert(`"${filmTitle}" not found in database`)
            return
          }
          
          // Found a program - set it as filmData to display
          filmData = programData
        } else {
          filmData = shortFilmData
        }
      }

      if (filmData) {
        setShowFilmCard(filmData)
      }
    } catch (error) {
      console.error('Error fetching title:', error)
      alert('Error loading details')
    }
  }

  const renderFilmTitles = (filmsDisplay: string | undefined) => {
    if (!filmsDisplay || filmsDisplay === '—') {
      return <span className="text-gray-500">No films assigned</span>
    }
    
    // Split by comma and make each film title clickable
    const filmTitles = filmsDisplay.split(', ')
    return (
      <div className="flex flex-wrap gap-1">
        {filmTitles.map((title, index) => (
          <span key={index}>
            <button
              onClick={() => openFilmCard(title.trim())}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {title}
            </button>
            {index < filmTitles.length - 1 && <span className="text-gray-400">, </span>}
          </span>
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Transparent background overlay */}
      <div 
        className="fixed inset-0 bg-transparent z-[100]"
        onClick={onClose}
      />
      
      <div
        className="fixed bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden z-[110] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          cursor: isDragging ? 'grabbing' : 'default',
          maxWidth: '1000px',
          width: '90vw',
          maxHeight: '90vh'
        }}
      >
        {/* Header with drag handle */}
        <div
          className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg flex justify-between items-center flex-shrink-0"
        >
          <div className="flex items-center">
            <span className="text-2xl mr-3">{getGuestTypeIcon(guest.guest_type)}</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{guest.name}</h2>
              <p className="text-sm text-gray-600">{guest.guest_type}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (onEdit) {
                  onEdit(guest)
                }
              }}
              className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {/* Basic Information */}
          <CollapsibleSection title="Basic Information" defaultExpanded={true}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Name</span>
                <p className="text-sm text-gray-900 mt-1">{guest.name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Guest Type</span>
                <p className="text-sm text-gray-900 mt-1">{guest.guest_type}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Country</span>
                <p className="text-sm text-gray-900 mt-1">{guest.country || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Role</span>
                <p className="text-sm text-gray-900 mt-1">{guest.role || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Confirmed</span>
                <p className="text-sm mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    guest.confirmed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {guest.confirmed ? 'Yes' : 'No'}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Check-in Status</span>
                <p className="text-sm mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    guest.checked_in 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {guest.checked_in ? 'Checked In' : 'Not Checked In'}
                  </span>
                </p>
              </div>
              <div className="md:col-span-2">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Films</span>
                <div className="text-sm text-gray-900 mt-1">
                  {renderFilmTitles(guest.films_display)}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Contact Information */}
          <CollapsibleSection 
            title="Contact Information" 
            isEmpty={!guest.contact_name && !guest.contact_email}
          >
            {guest.contact_name || guest.contact_email ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guest.contact_name && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Contact Name</span>
                    <p className="text-sm text-gray-900 mt-1">{guest.contact_name}</p>
                  </div>
                )}
                {guest.contact_email && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Contact Email</span>
                    <p className="text-sm text-gray-900 mt-1">
                      <a href={`mailto:${guest.contact_email}`} className="text-blue-600 hover:text-blue-800">
                        {guest.contact_email}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No contact information available.</p>
            )}
          </CollapsibleSection>

          {/* Travel Information */}
          <CollapsibleSection 
            title="Travel Information"
            isEmpty={!guest.arrival_date && !guest.departure_date && !guest.hotel_name}
          >
            <div className="space-y-6">
              {/* Travel Arrangement */}
              <div>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Arranging Travel</span>
                <p className="text-sm text-gray-900 mt-1">{guest.arranging_travel}</p>
              </div>

              {/* Arrival Information */}
              {guest.arrival_date && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">✈️ Arrival Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Date</span>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(guest.arrival_date)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Times</span>
                      <p className="text-sm text-gray-900 mt-1">
                        {guest.inbound_departure_time && `Takeoff: ${formatTime(guest.inbound_departure_time)}`}
                        {guest.inbound_departure_time && guest.inbound_arrival_time && ' | '}
                        {guest.inbound_arrival_time && `Landing: ${formatTime(guest.inbound_arrival_time)}`}
                        {!guest.inbound_departure_time && !guest.inbound_arrival_time && 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Flight</span>
                      <p className="text-sm text-gray-900 mt-1">
                        {guest.arrival_airline && guest.arrival_flight_number 
                          ? `${guest.arrival_airline} ${guest.arrival_flight_number}`
                          : 'Not specified'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Route</span>
                      <p className="text-sm text-gray-900 mt-1">
                        {guest.arrival_origin_airport && guest.arrival_airport
                          ? `${guest.arrival_origin_airport} → ${guest.arrival_airport}`
                          : 'Not specified'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Departure Information */}
              {guest.departure_date && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">🛫 Departure Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Date</span>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(guest.departure_date)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Times</span>
                      <p className="text-sm text-gray-900 mt-1">
                        {guest.outbound_departure_time && `Takeoff: ${formatTime(guest.outbound_departure_time)}`}
                        {guest.outbound_departure_time && guest.outbound_arrival_time && ' | '}
                        {guest.outbound_arrival_time && `Landing: ${formatTime(guest.outbound_arrival_time)}`}
                        {!guest.outbound_departure_time && !guest.outbound_arrival_time && 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Flight</span>
                      <p className="text-sm text-gray-900 mt-1">
                        {guest.departure_airline && guest.departure_flight_number 
                          ? `${guest.departure_airline} ${guest.departure_flight_number}`
                          : 'Not specified'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Route</span>
                      <p className="text-sm text-gray-900 mt-1">
                        {guest.departure_airport && guest.destination_airport
                          ? `${guest.departure_airport} → ${guest.destination_airport}`
                          : 'Not specified'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hotel Information */}
              {guest.hotel_name && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">🏨 Hotel Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Hotel Name</span>
                      <p className="text-sm text-gray-900 mt-1">{guest.hotel_name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Confirmation Number</span>
                      <p className="text-sm text-gray-900 mt-1">{guest.hotel_confirmation_number || 'Not provided'}</p>
                    </div>
                    {guest.hotel_address && (
                      <div className="md:col-span-2">
                        <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Address</span>
                        <p className="text-sm text-gray-900 mt-1 whitespace-pre-line">{guest.hotel_address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!guest.arrival_date && !guest.departure_date && !guest.hotel_name && (
                <p className="text-sm text-gray-500">No travel information available.</p>
              )}
            </div>
          </CollapsibleSection>

          {/* Future Integration Sections */}
          <CollapsibleSection title="Interviews" isEmpty={guestInterviews.length === 0}>
            {guestInterviews.length > 0 ? (
              <div className="space-y-3">
                {guestInterviews.map((interview) => (
                  <div key={interview.id} className="bg-gray-50 rounded-lg p-3">
                    {/* Single Line: Main Info + Status Badge */}  
                    <div className="text-sm text-gray-900 mb-1 flex items-center flex-wrap gap-2">
                      <span className="font-medium">{interview.film_title}</span>
                      {interview.journalist_name && <span> | Journalist: {interview.journalist_name}</span>}
                      {interview.outlet && <span> | Outlet: {interview.outlet}</span>}
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        interview.status === 'Complete' ? 'bg-green-100 text-green-800' :
                        interview.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                        interview.status === 'Declined' ? 'bg-red-100 text-red-800' :
                        interview.status === 'Pitching' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {interview.status}
                      </span>
                    </div>
                    
                    {/* Line 3: Scheduling Info (only when scheduled) */}
                    {interview.status === 'Scheduled' && (
                      <div className="text-sm text-gray-600">
                        {interview.interview_date && <span>Date: {formatDate(interview.interview_date)}</span>}
                        {interview.interview_time && <span> | Time: {formatTimeForDisplay(interview.interview_time)}</span>}
                        {interview.location && <span> | Location: {interview.location}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </CollapsibleSection>

          <CollapsibleSection title="Red Carpets & Photo Shoots" isEmpty={photoShoots.length === 0 && redCarpets.length === 0}>
            {(photoShoots.length > 0 || redCarpets.length > 0) ? (
              <div className="space-y-2">
                {/* Photo Shoots */}
                {photoShoots.map((shoot) => {
                  const date = shoot.shoot_date ? (() => {
                    // Parse date string directly without timezone conversion
                    if (shoot.shoot_date.includes('-')) {
                      const [year, month, day] = shoot.shoot_date.split('-')
                      const shortYear = year.slice(-2)
                      return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${shortYear}`
                    }
                    return shoot.shoot_date
                  })() : 'TBD'
                  
                  const time = shoot.shoot_time ? formatTimeForDisplay(shoot.shoot_time) : 'TBD'
                  const venue = shoot.venue_name_from_fk || 'TBD'
                  const subjects = shoot.subjects_display_combined || 'TBD'
                  
                  return (
                    <div key={`shoot-${shoot.id}`} className="text-sm text-gray-900">
                      📸 Photo Shoot - {date}, {time} at {venue} ({subjects})
                    </div>
                  )
                })}
                
                {/* Red Carpets */}
                {redCarpets.map((carpet) => {
                  const date = carpet.carpet_date ? (() => {
                    // Parse date string directly without timezone conversion
                    if (carpet.carpet_date.includes('-')) {
                      const [year, month, day] = carpet.carpet_date.split('-')
                      const shortYear = year.slice(-2)
                      return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${shortYear}`
                    }
                    return carpet.carpet_date
                  })() : 'TBD'
                  
                  const time = carpet.carpet_start_time ? (() => {
                    const [hours, minutes] = carpet.carpet_start_time.split(':')
                    const hour24 = parseInt(hours, 10)
                    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
                    const ampm = hour24 >= 12 ? 'PM' : 'AM'
                    return `${hour12}:${minutes} ${ampm}`
                  })() : 'TBD'
                  
                  const venue = carpet.venues?.name || 'TBD'
                  const subjects = carpet.subjects_display || 'TBD'
                  
                  return (
                    <div key={`carpet-${carpet.id}`} className="text-sm text-gray-900">
                      🎭 Red Carpet - {date}, {time} at {venue} ({subjects})
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No red carpets or photo shoots found for this guest.</p>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Events" isEmpty={specialEvents.length === 0}>
            {specialEvents.length > 0 ? (
              <div className="space-y-3">
                {specialEvents.map((event) => {
                  // Format date as DD/MM/YYYY
                  const date = event.event_date ? (() => {
                    const eventDate = new Date(event.event_date + 'T00:00:00')
                    const day = eventDate.getDate().toString().padStart(2, '0')
                    const month = (eventDate.getMonth() + 1).toString().padStart(2, '0')
                    const year = eventDate.getFullYear()
                    return `${day}/${month}/${year}`
                  })() : 'TBD'

                  // Format time as AM/PM
                  const time = event.event_time ? (() => {
                    const [hours, minutes] = event.event_time.split(':')
                    const hour24 = parseInt(hours, 10)
                    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
                    const ampm = hour24 >= 12 ? 'PM' : 'AM'
                    return `${hour12}:${minutes} ${ampm}`
                  })() : 'TBD'

                  // Format end time for program events
                  const endTime = event.end_time ? (() => {
                    const [hours, minutes] = event.end_time.split(':')
                    const hour24 = parseInt(hours, 10)
                    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
                    const ampm = hour24 >= 12 ? 'PM' : 'AM'
                    return `${hour12}:${minutes} ${ampm}`
                  })() : null

                  const isProgram = event.type === 'program_event'

                  return (
                    <div
                      key={event.id}
                      className={`border-l-4 pl-4 py-2 ${isProgram ? 'border-blue-400' : 'border-orange-400'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {event.event_type ? `${event.event_type}` : 'Special Event'}
                            {isProgram && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Program</span>}
                          </p>
                          <p className="text-sm text-gray-600">{event.title}</p>
                          <p className="text-sm text-gray-600">
                            {date} at {time}{endTime && ` - ${endTime}`}
                          </p>
                          <p className="text-sm text-gray-600">{event.venue_name || event.venues?.name || 'TBD'}</p>
                          {event.participants && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Participants:</span> {event.participants}
                            </p>
                          )}
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No special events found for this guest's films/programs.</p>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Intros & Q&As" isEmpty={filmScreenings.length === 0}>
            {filmScreenings.length > 0 ? (
              <div className="space-y-3">
                {filmScreenings.map((screening) => {
                  // Format date as "Mon, Oct 23" without timezone conversion
                  const date = screening.screening_date ? (() => {
                    if (screening.screening_date.includes('-')) {
                      const [year, month, day] = screening.screening_date.split('-').map(Number)

                      // Use Zeller's congruence to calculate day of week
                      let zYear = year
                      let zMonth = month
                      if (zMonth < 3) {
                        zMonth += 12
                        zYear -= 1
                      }

                      const k = zYear % 100
                      const j = Math.floor(zYear / 100)
                      let h = (day + Math.floor((13 * (zMonth + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
                      if (h < 0) h += 7

                      const dayNames = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                      const dayName = dayNames[h]
                      const monthName = monthNames[month - 1]
                      return `${dayName}, ${monthName} ${day}`
                    }
                    return screening.screening_date
                  })() : 'TBD'

                  // Format time as "7:00 PM"
                  const time = screening.start_time ? (() => {
                    const [hours, minutes] = screening.start_time.split(':')
                    const hour24 = parseInt(hours, 10)
                    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
                    const ampm = hour24 >= 12 ? 'PM' : 'AM'
                    return `${hour12}:${minutes} ${ampm}`
                  })() : 'TBD'

                  const venue = screening.venue_name || 'TBD'
                  const title = screening.film_title || 'Unknown Film'

                  // Determine event type and color
                  const getEventTypeInfo = (type: string, eventType?: string) => {
                    switch (type) {
                      case 'screening':
                        return { label: 'Screening', color: 'border-blue-400' }
                      case 'special_event':
                        return {
                          label: eventType ? `Special Event - ${eventType}` : 'Special Event',
                          color: 'border-purple-400'
                        }
                      default:
                        return { label: 'Event', color: 'border-gray-400' }
                    }
                  }

                  const { label, color } = getEventTypeInfo(screening.type, screening.event_type)

                  return (
                    <div
                      key={`${screening.type}-${screening.id}`}
                      className={`border-l-4 pl-4 py-2 ${color}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm ${screening.is_cancelled ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                            {title}, {date} at {time}, {venue}
                            {screening.is_cancelled && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                Cancelled
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      {screening.notes && (
                        <p className="text-sm text-gray-500 mt-1">{screening.notes}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No public screenings or events scheduled for this guest's films/programs.</p>
            )}
          </CollapsibleSection>

          {/* Notes */}
          <CollapsibleSection 
            title="Notes" 
            isEmpty={!guest.notes}
          >
            {guest.notes ? (
              <div className="whitespace-pre-wrap text-sm text-gray-900">
                {guest.notes}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No notes available.</p>
            )}
          </CollapsibleSection>
        </div>
      </div>

      {/* Film Card Popup */}
      {showFilmCard && (
        <FilmCardPopup
          film={showFilmCard}
          onClose={() => setShowFilmCard(null)}
        />
      )}
    </>
  )
}