'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FilmContact, InterviewCard } from '@/types'
import { GuestCardPopup } from './guest-card-popup'
import { getInterviewsForFilmCard } from '@/lib/interviews-client'
import { getFestivalYear } from '@/lib/smart-date-parser'

interface FilmCardProps {
  film: {
    id: string
    title: string
    original_language_title?: string
    director?: string
    countries?: string
    programs: string // combined programs
    premiere_status?: string
  }
  onClose: () => void
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  isEmpty?: boolean
  badge?: React.ReactNode
}

function CollapsibleSection({ title, children, isEmpty = false, badge }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-4 px-6 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {badge && <div>{badge}</div>}
        </div>
        <div className="flex items-center space-x-2">
          {isEmpty && (
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              No data
            </span>
          )}
          <span className="text-gray-400">
            {isExpanded ? '−' : '+'}
          </span>
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-4">
          {isEmpty ? (
            <p className="text-gray-500 text-sm">
              No information available. Data will appear here when {title.toLowerCase()} are added through other modules.
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}

export function FilmCardPopup({ film, onClose }: FilmCardProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [filmPhotoShoots, setFilmPhotoShoots] = useState<any[]>([])
  const [filmRedCarpets, setFilmRedCarpets] = useState<any[]>([])
  const [filmContacts, setFilmContacts] = useState<FilmContact[]>([])
  const [filmPressScreenings, setFilmPressScreenings] = useState<any[]>([])
  const [filmDetails, setFilmDetails] = useState<any>(null)
  const [showGuestCard, setShowGuestCard] = useState<any>(null)
  const [filmGuests, setFilmGuests] = useState<any[]>([])
  const [screenerData, setScreenerData] = useState<any>(null)
  const [filmInterviews, setFilmInterviews] = useState<InterviewCard[]>([])
  const [filmScreenings, setFilmScreenings] = useState<any[]>([])
  const [screeningsWithGuests, setScreeningsWithGuests] = useState<Set<string>>(new Set())

  const supabase = createClient()

  const renderScreenerBadge = () => {
    if (!screenerData || screenerData.access_type === 'tbd') {
      return null
    }

    const badgeConfig = {
      cinesend: { text: 'CineSend', className: 'bg-blue-100 text-blue-800' },
      link_available: { text: 'Link Available', className: 'bg-green-100 text-green-800' },
      request_link: { text: 'Request Link', className: 'bg-yellow-100 text-yellow-800' },
      no_links: { text: 'No Links', className: 'bg-red-100 text-red-800' }
    }

    const config = badgeConfig[screenerData.access_type as keyof typeof badgeConfig]
    if (!config) return null

    return (
      <div className="mb-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
          {config.text}
        </span>
      </div>
    )
  }

  const renderHeaderBadge = () => {
    if (!screenerData || screenerData.access_type === 'tbd') {
      return null
    }

    const badgeConfig = {
      cinesend: { text: 'CineSend', className: 'bg-blue-200 text-blue-700' },
      link_available: { text: 'Link Available', className: 'bg-green-200 text-green-700' },
      request_link: { text: 'Request Link', className: 'bg-yellow-200 text-yellow-700' },
      no_links: { text: 'No Links', className: 'bg-red-200 text-red-700' }
    }

    const config = badgeConfig[screenerData.access_type as keyof typeof badgeConfig]
    if (!config) return null

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${config.className}`}>
        {config.text}
      </span>
    )
  }

  const openGuestCard = async (guestName: string) => {
    try {
      const festivalYear = await getFestivalYear()
      const { data: guestData, error } = await supabase
        .from('guests')
        .select('*')
        .eq('name', guestName)
        .eq('festival_year', parseInt(festivalYear, 10))
        .single()

      if (error || !guestData) {
        console.warn('Guest not found in database:', guestName)
        return
      }

      const formattedGuest = {
        ...guestData,
        films: [],
        films_display: guestData.films_display || '—'
      }

      setShowGuestCard(formattedGuest)
    } catch (error) {
      console.error('Error fetching guest:', error)
    }
  }

  const formatTimeForDisplay = (timeString: string | undefined): string => {
    if (!timeString) return 'TBD'
    
    // Convert 24-hour format to 12-hour AM/PM format
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    
    return `${hour12}:${minutes} ${ampm}`
  }

  const formatDateForDisplay = (dateString: string | undefined): string => {
    if (!dateString) return 'TBD'
    // Parse YYYY-MM-DD format without timezone conversion
    const parts = dateString.split('-')
    if (parts.length !== 3) return dateString
    const year = parts[0].slice(-2)
    const month = parts[1]
    const day = parts[2]
    return `${month}/${day}/${year}`
  }

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

  // Load photo shoots and red carpets for this film
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const festivalYear = await getFestivalYear()

        // Check if this is a short film and get its program name
        let shortsProgramName: string | null = null
        let shortsProgramId: string | null = null
        const { data: shortFilm } = await supabase
          .from('short_films')
          .select('shorts_program_id')
          .eq('title', film.title)
          .eq('festival_year', parseInt(festivalYear, 10))
          .single()

        if (shortFilm && shortFilm.shorts_program_id) {
          shortsProgramId = shortFilm.shorts_program_id
          const { data: shortsProgram } = await supabase
            .from('shorts_programs')
            .select('program_name')
            .eq('id', shortFilm.shorts_program_id)
            .single()

          if (shortsProgram) {
            shortsProgramName = shortsProgram.program_name
          }
        }

        // Load photo shoots using junction table

        // Get photo shoot IDs from junction table
        const { data: junctionData, error: junctionError } = await supabase
          .from('photo_shoot_films')
          .select('photo_shoot_id')
          .eq('film_id', film.id)
          .eq('festival_year', parseInt(festivalYear, 10))

        if (junctionError) {
          console.error('Error loading photo shoot links:', junctionError)
        } else if (junctionData && junctionData.length > 0) {
          const photoShootIds = junctionData.map(j => j.photo_shoot_id)

          // Get full photo shoot data from view
          const { data: shootsData, error: shootsError } = await supabase
            .from('photo_shoots_with_details')
            .select('*')
            .in('id', photoShootIds)
            .eq('festival_year', parseInt(festivalYear, 10))
            .order('shoot_date', { ascending: false })

          if (shootsError) {
            console.error('Error loading photo shoots:', shootsError)
          } else {
            setFilmPhotoShoots(shootsData || [])
          }
        } else {
          setFilmPhotoShoots([])
        }

        // Load red carpets via junction table
        const redCarpetIds = new Set<string>()

        const { data: rcFilmJunction } = await supabase
          .from('red_carpet_films')
          .select('red_carpet_id')
          .eq('film_id', film.id)
          .eq('film_type', 'feature')
          .eq('festival_year', parseInt(festivalYear, 10))

        if (rcFilmJunction) {
          rcFilmJunction.forEach(j => redCarpetIds.add(j.red_carpet_id))
        }

        if (shortsProgramId) {
          const { data: rcProgramJunction } = await supabase
            .from('red_carpet_films')
            .select('red_carpet_id')
            .eq('film_id', shortsProgramId)
            .eq('film_type', 'shorts_program')
            .eq('festival_year', parseInt(festivalYear, 10))

          if (rcProgramJunction) {
            rcProgramJunction.forEach(j => redCarpetIds.add(j.red_carpet_id))
          }
        }

        if (redCarpetIds.size > 0) {
          const { data: carpetsData, error: carpetsError } = await supabase
            .from('red_carpets_with_details')
            .select('*')
            .in('id', [...redCarpetIds])
            .eq('festival_year', parseInt(festivalYear, 10))
            .order('carpet_date', { ascending: false })

          if (carpetsError) {
            console.error('Error loading red carpets:', carpetsError)
          } else {
            setFilmRedCarpets(carpetsData || [])
          }
        } else {
          setFilmRedCarpets([])
        }

        // Load press screenings (base table has no title column, use film_id)
        const { data: screeningsData, error: screeningsError } = await supabase
          .from('press_screenings')
          .select(`
            id,
            screening_date,
            screening_time,
            venue_id,
            house,
            short_code,
            rsvp_responses_url,
            canceled,
            venues(name)
          `)
          .or(`film_id.eq.${film.id}${shortsProgramId ? `,film_id.eq.${shortsProgramId}` : ''}`)
          .eq('festival_year', parseInt(festivalYear, 10))
          .order('screening_date', { ascending: true })

        if (screeningsError) {
          console.error('Error loading press screenings:', screeningsError)
        } else {
          setFilmPressScreenings(screeningsData || [])
        }

        // Load film contacts - determine film type and load accordingly
        const loadContacts = async () => {
          try {
            // Try feature films first
            const { data: featureData, error: featureError } = await supabase
              .from('feature_films')
              .select('id')
              .eq('id', film.id)
              .single()

            let filmType: 'feature' | 'short' = 'feature'
            
            if (featureError || !featureData) {
              // If not found in features, it's likely a short film
              filmType = 'short'
            }

            // Load contacts for this film with full contact details
            const { data: contactsData, error: contactsError } = await supabase
              .from('film_contacts')
              .select(`
                *,
                contacts!inner(
                  contact_name,
                  contact_company,
                  contact_email,
                  phone,
                  contact_type,
                  mailing_address,
                  notes
                )
              `)
              .eq('film_id', film.id)
              .eq('film_type', filmType)
              .eq('festival_year', parseInt(festivalYear, 10))
              .order('contact_type, name')

            if (contactsError) {
              console.error('Error loading film contacts:', contactsError)
              setFilmContacts([])
            } else {
              setFilmContacts(contactsData || [])
            }
          } catch (error) {
            console.error('Error loading film contacts:', error)
            setFilmContacts([])
          }
        }

        await loadContacts()

        // Load guests associated with this film
        const loadGuests = async () => {
          try {
            let allGuests: any[] = []

            // Check if this is a short film and find guests via shorts programs
            const { data: shortFilm, error: shortFilmError } = await supabase
              .from('short_films')
              .select('id, shorts_program_id')
              .eq('title', film.title)
              .single()

            if (!shortFilmError && shortFilm && shortFilm.shorts_program_id) {

              // Get guests associated with the shorts program
              const { data: shortsProgram, error: shortsProgramError } = await supabase
                .from('shorts_programs')
                .select('id, program_name')
                .eq('id', shortFilm.shorts_program_id)
                .single()

              if (!shortsProgramError && shortsProgram) {
                // Find guests associated with this shorts program via guest_films junction
                const { data: guestPrograms, error: guestProgramsError } = await supabase
                  .from('guest_films')
                  .select(`
                    guest_id,
                    guests (
                      id,
                      name,
                      role,
                      arrival_date,
                      departure_date,
                      confirmed,
                      checked_in
                    )
                  `)
                  .eq('film_id', shortsProgram.id)
                  .eq('film_type', 'shorts_program')

                if (!guestProgramsError && guestPrograms) {
                  const programGuests = guestPrograms.map((gp: any) => gp.guests).filter(Boolean)
                  allGuests = [...allGuests, ...programGuests]
                }
              }
            }

            // Also check for direct film associations via guest_films
            const { data: guestFilms, error: guestFilmsError } = await supabase
              .from('guest_films')
              .select(`
                guest_id,
                guests (
                  id,
                  name,
                  role,
                  arrival_date,
                  departure_date,
                  confirmed,
                  checked_in
                )
              `)
              .eq('film_id', film.id)

            if (!guestFilmsError && guestFilms) {
              const filmGuests = guestFilms.map((gf: any) => gf.guests).filter(Boolean)
              allGuests = [...allGuests, ...filmGuests]
            }

            // Also check for guests associated with this film as a program via guest_films junction
            const { data: guestPrograms, error: guestProgramsError } = await supabase
              .from('guest_films')
              .select(`
                guest_id,
                guests (
                  id,
                  name,
                  role,
                  arrival_date,
                  departure_date,
                  confirmed,
                  checked_in
                )
              `)
              .eq('film_id', film.id)
              .eq('film_type', 'program')

            if (!guestProgramsError && guestPrograms) {
              const programGuests = guestPrograms.map((gp: any) => gp.guests).filter(Boolean)
              allGuests = [...allGuests, ...programGuests]
            }

            // Remove duplicates based on guest ID
            const uniqueGuests = allGuests.filter((guest, index, self) =>
              index === self.findIndex(g => g.id === guest.id)
            )

            setFilmGuests(uniqueGuests)

            // Calculate which screenings have attending guests
            await calculateScreeningsWithGuests(uniqueGuests)
          } catch (error) {
            console.error('Error loading film guests:', error)
            setFilmGuests([])
          }
        }

        const calculateScreeningsWithGuests = async (guests: any[]) => {
          try {
            // Load all published screenings for this film and check which ones have attending guests
            const { data: allScreenings } = await supabase
              .from('ticketing_screenings')
              .select('id')
              .eq('film_id', film.id)

            if (!allScreenings || allScreenings.length === 0) return

            const screeningIdsWithGuests = new Set<string>()

            for (const screening of allScreenings) {
              // Check if any guest is attending this screening
              const hasAttendingGuests = guests.some(guest => {
                const nonAttendingIds = guest.non_attending_screenings || []
                return !nonAttendingIds.includes(screening.id)
              })

              if (hasAttendingGuests) {
                screeningIdsWithGuests.add(screening.id)
              }
            }

            setScreeningsWithGuests(screeningIdsWithGuests)
          } catch (error) {
            console.error('Error calculating screenings with guests:', error)
          }
        }

        await loadGuests()

        // Load screener access data
        const { data: screenerAccessData, error: screenerError } = await supabase
          .from('screener_access')
          .select('*')
          .eq('film_id', film.id)
          .eq('festival_year', parseInt(festivalYear, 10))
          .single()

        if (!screenerError && screenerAccessData) {
          setScreenerData(screenerAccessData)
        }

        // Load interviews for this film
        try {
          const filmInterviews = await getInterviewsForFilmCard(film.id)
          setFilmInterviews(filmInterviews)
        } catch (error) {
          console.error('Error loading film interviews:', error)
          setFilmInterviews([])
        }

        // Load ticketing screenings for this film
        const loadScreenings = async () => {
          try {
            let allScreenings: any[] = []
            const festivalYearInt = parseInt(festivalYear, 10)

            // Primary: query by film_id using the view (base table has no film_title column)
            if (film.id) {
              const { data: idScreenings } = await supabase
                .from('ticketing_screenings_with_films')
                .select(`
                  id, film_title, screening_date, day_of_week,
                  start_time, venue_short_code, is_cancelled, notes
                `)
                .eq('film_id', film.id)
                .eq('festival_year', festivalYearInt)
                .order('screening_date', { ascending: true })
                .order('start_time', { ascending: true })

              if (idScreenings) {
                allScreenings.push(...idScreenings)
              }

              // For shorts: also check if film.id is a short_film whose shorts_program has screenings
              const { data: shortFilm } = await supabase
                .from('short_films')
                .select('shorts_program_id')
                .eq('id', film.id)
                .single()

              if (shortFilm?.shorts_program_id) {
                const { data: programScreenings } = await supabase
                  .from('ticketing_screenings_with_films')
                  .select(`
                    id, film_title, screening_date, day_of_week,
                    start_time, venue_short_code, is_cancelled, notes
                  `)
                  .eq('film_id', shortFilm.shorts_program_id)
                  .eq('festival_year', festivalYearInt)
                  .order('screening_date', { ascending: true })
                  .order('start_time', { ascending: true })

                if (programScreenings) {
                  allScreenings.push(...programScreenings)
                }
              }
            }

            // Fallback: text match using view for legacy data
            if (allScreenings.length === 0) {
              const { data: textScreenings } = await supabase
                .from('ticketing_screenings_with_films')
                .select(`
                  id, film_title, screening_date, day_of_week,
                  start_time, venue_short_code, is_cancelled, notes
                `)
                .eq('film_title', film.title)
                .eq('festival_year', festivalYearInt)
                .order('screening_date', { ascending: true })
                .order('start_time', { ascending: true })

              if (textScreenings) {
                allScreenings.push(...textScreenings)
              }
            }

            // Remove duplicates and resolve venue names
            const uniqueScreenings = allScreenings.filter((screening, index, self) =>
              index === self.findIndex(s => s.id === screening.id)
            )

            const screeningsWithVenues = await Promise.all(
              uniqueScreenings.map(async (screening) => {
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
                    return { ...screening, venue_name: houseData.venues.name }
                  }
                }
                return { ...screening, venue_name: screening.venue_short_code }
              })
            )

            setFilmScreenings(screeningsWithVenues)
          } catch (error) {
            console.error('Error loading ticketing screenings:', error)
            setFilmScreenings([])
          }
        }

        await loadScreenings()
      } catch (error) {
        console.error('Error loading events:', error)
      }
    }

    loadEvents()
  }, [film.title, film.id, supabase])

  return (
    <>
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-transparent z-50"
        onClick={onClose}
      />
      
      <div 
        className="fixed bg-white rounded-lg shadow-2xl border border-gray-300 max-w-4xl w-[800px] max-h-[calc(100vh-2rem)] overflow-y-auto z-[60] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default',
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto'
        }}
      >
      {/* Draggable Header */}
      <div 
        className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <h1 className="text-lg font-semibold text-gray-900">Film Details</h1>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl font-bold w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
          aria-label="Close"
        >
          ×
        </button>
      </div>

        <div className="flex-1 overflow-y-auto">
          {/* Top-level info */}
          <div className="p-6 bg-blue-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {film.title}
                  </h2>
                  {film.original_language_title && film.original_language_title !== film.title && (
                    <p className="text-lg text-gray-600 italic">
                      {film.original_language_title}
                    </p>
                  )}
                </div>
                
                {film.director && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Director</span>
                    <p className="text-lg text-gray-900 mt-1">{film.director}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {film.countries && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Countries</span>
                    <p className="text-lg text-gray-900 mt-1">{film.countries}</p>
                  </div>
                )}
                
                {film.programs && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Programs</span>
                    <p className="text-lg text-gray-900 mt-1">{film.programs}</p>
                  </div>
                )}
                
                {film.premiere_status && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Premiere Status</span>
                    <p className="text-lg text-gray-900 mt-1">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        {film.premiere_status}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible sections */}
          <div className="divide-y divide-gray-200">
            {/* Screenings Section - At the top */}
            <CollapsibleSection title="Screenings" isEmpty={filmScreenings.length === 0}>
              {filmScreenings.length > 0 ? (
                <div className="space-y-2">
                  {filmScreenings.map((screening) => {
                    // Format date using the day_of_week from database
                    const date = screening.screening_date && screening.day_of_week ? (() => {
                      const parts = screening.screening_date.split('-')
                      if (parts.length !== 3) return screening.screening_date
                      const month = parseInt(parts[1])
                      const day = parseInt(parts[2])
                      
                      // Use the day_of_week directly from database
                      const dayName = screening.day_of_week.substring(0, 3) // Get first 3 chars of day name
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                      const monthName = monthNames[month - 1]
                      return `${dayName}, ${monthName} ${day}`
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
                    
                    return (
                      <div 
                        key={`ticketing-screening-${screening.id}`} 
                        className={`text-sm ${screening.is_cancelled ? 'text-red-600' : 'text-gray-900'}`}
                      >
                        <div className="flex items-center">
                          <span className={screening.is_cancelled ? 'line-through' : ''}>
                            {screening.film_title && screening.film_title !== film.title
                              ? `${screening.film_title} • ${date} • ${time} • ${venue}`
                              : `${date} • ${time} • ${venue}`
                            }
                          </span>
                          {screening.is_cancelled && (
                            <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              Cancelled
                            </span>
                          )}
                          {screeningsWithGuests.has(screening.id) && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              Intro/Q&A
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No public screenings scheduled.</p>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Press Screenings & Links"
              isEmpty={filmPressScreenings.length === 0}
              badge={renderHeaderBadge()}
            >
              {filmPressScreenings.length > 0 ? (
                <div className="space-y-2">
                  {filmPressScreenings.map((screening) => {
                    const date = screening.screening_date ? (() => {
                      const parts = screening.screening_date.split('-')
                      if (parts.length !== 3) return screening.screening_date
                      const year = parseInt(parts[0])
                      const month = parseInt(parts[1])
                      const day = parseInt(parts[2])
                      
                      // Calculate day of week using Zeller's congruence
                      let q = day
                      let m = month
                      let k = year % 100
                      let j = Math.floor(year / 100)
                      
                      if (m < 3) {
                        m += 12
                        if (k === 0) {
                          k = 99
                          j--
                        } else {
                          k--
                        }
                      }
                      
                      const h = (q + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
                      const dayIndex = (h + 6) % 7
                      
                      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                      const dayName = dayNames[dayIndex]
                      const monthStr = month.toString().padStart(2, '0')
                      const dayStr = day.toString().padStart(2, '0')
                      return `${dayName}, ${monthStr}/${dayStr}`
                    })() : 'TBD'
                    
                    const time = screening.screening_time ? (() => {
                      const [hours, minutes] = screening.screening_time.split(':')
                      const hour24 = parseInt(hours, 10)
                      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
                      const ampm = hour24 >= 12 ? 'PM' : 'AM'
                      return `${hour12}:${minutes} ${ampm}`
                    })() : 'TBD'
                    
                    const venue = screening.short_code || screening.venues?.name || 'TBD'
                    const house = screening.house ? ` ${screening.house}` : ''
                    const canceledText = screening.canceled ? ' [CANCELED]' : ''
                    
                    return (
                      <div key={`screening-${screening.id}`} className={`text-sm ${screening.canceled ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                        <div className="flex items-center justify-between">
                          <span>
                            🎬 Press Screening - {date}, {time} at {venue}{house}{canceledText}
                          </span>
                          {screening.rsvp_responses_url && !screening.canceled && (
                            <button
                              onClick={() => window.open(screening.rsvp_responses_url, '_blank')}
                              className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                            >
                              View RSVPs
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No press screenings scheduled for this film.</p>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Red Carpets & Photo Shoots" isEmpty={filmPhotoShoots.length === 0 && filmRedCarpets.length === 0}>
              {(filmPhotoShoots.length > 0 || filmRedCarpets.length > 0) ? (
                <div className="space-y-2">
                  {/* Photo Shoots */}
                  {filmPhotoShoots.map((shoot) => {
                    const date = formatDateForDisplay(shoot.shoot_date)
                    const time = formatTimeForDisplay(shoot.shoot_time)
                    const venue = shoot.venues?.name || 'TBD'
                    const subjects = shoot.subjects_display || 'TBD'
                    
                    return (
                      <div key={`shoot-${shoot.id}`} className="text-sm text-gray-900">
                        📸 Photo Shoot - {date}, {time} at {venue} (
                        {shoot.subjects_display_combined ? (
                          <span>
                            {shoot.subjects_display_combined.split(', ').map((name, index) => {
                              const trimmedName = name.trim()
                              return (
                                <span key={index}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openGuestCard(trimmedName)
                                    }}
                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    {name}
                                  </button>
                                  {index < shoot.subjects_display_combined.split(', ').length - 1 && <span className="text-gray-400">, </span>}
                                </span>
                              )
                            })}
                          </span>
                        ) : (
                          'TBD'
                        )})
                      </div>
                    )
                  })}
                  
                  {/* Red Carpets */}
                  {filmRedCarpets.map((carpet) => {
                    const date = formatDateForDisplay(carpet.carpet_date)

                    const time = carpet.carpet_start_time ? (() => {
                      const [hours, minutes] = carpet.carpet_start_time.split(':')
                      const hour24 = parseInt(hours, 10)
                      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
                      const ampm = hour24 >= 12 ? 'PM' : 'AM'
                      return `${hour12}:${minutes} ${ampm}`
                    })() : 'TBD'

                    const venue = carpet.venue_name_from_fk || carpet.venues?.name || 'TBD'
                    const subjects = carpet.subjects_display_combined || 'TBD'

                    return (
                      <div key={`carpet-${carpet.id}`} className="text-sm text-gray-900">
                        🎭 Red Carpet - {date}, {time} at {venue} ({subjects})
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No red carpets or photo shoots found for this film.</p>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Interviews" isEmpty={filmInterviews.length === 0}>
              {filmInterviews.length > 0 ? (
                <div className="space-y-2">
                  {filmInterviews.map((interview) => (
                    <div key={interview.id} className="bg-gray-50 rounded-lg px-3 py-2">
                      {/* Single Line Display */}
                      <div className="text-sm text-gray-900 flex items-center flex-wrap gap-2">
                        <span className="font-medium">{interview.resolved_journalist_name || interview.journalist_name || 'Journalist TBD'}</span>
                        {(interview.resolved_outlet || interview.outlet) && <span className="text-gray-600">| {interview.resolved_outlet || interview.outlet}</span>}
                        {interview.subject_names && <span className="text-gray-600">| {interview.subject_names}</span>}
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          interview.status === 'Complete' ? 'bg-green-100 text-green-800' :
                          interview.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                          interview.status === 'Declined' ? 'bg-red-100 text-red-800' :
                          interview.status === 'Pitching' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {interview.status}
                        </span>
                        {interview.status === 'Scheduled' && interview.interview_date && (
                          <span className="text-gray-500 text-xs">
                            | {formatDateForDisplay(interview.interview_date)}
                            {interview.interview_time && ` at ${formatTimeForDisplay(interview.interview_time)}`}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CollapsibleSection>

            <CollapsibleSection title="In Attendance" isEmpty={filmGuests.length === 0}>
              {filmGuests.length > 0 ? (
                <div className="space-y-3">
                  {filmGuests.map((guest) => {
                    const arrivalDate = formatDateForDisplay(guest.arrival_date)
                    const departureDate = formatDateForDisplay(guest.departure_date)
                    
                    return (
                      <div key={guest.id} className="border-l-4 border-green-400 pl-4 py-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openGuestCard(guest.name)
                                }}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                              >
                                {guest.name}
                              </button>
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                                guest.confirmed 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {guest.confirmed ? 'Confirmed' : 'Pending'}
                              </span>
                              {guest.checked_in && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  Checked In
                                </span>
                              )}
                            </div>
                            {guest.role && (
                              <p className="text-sm text-gray-600 mt-1">{guest.role}</p>
                            )}
                            <div className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">In:</span> {arrivalDate} • <span className="font-medium">Out:</span> {departureDate}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No confirmed guests found for this film.</p>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Contact Information" isEmpty={filmContacts.length === 0}>
              {filmContacts.length > 0 ? (
                <div className="space-y-4">
                  {filmContacts.map((contact) => {
                    const fullContact = contact.contacts || contact;
                    return (
                      <div key={contact.id} className="border-l-4 border-blue-400 pl-4 py-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {fullContact.contact_name || contact.name}
                            </h4>
                            {(fullContact.contact_company || contact.company) && (
                              <p className="text-sm text-gray-600 mt-1">
                                {fullContact.contact_company || contact.company}
                              </p>
                            )}
                            {(fullContact.contact_email || contact.email) && (
                              <p className="text-sm text-blue-600 mt-1">
                                <a href={`mailto:${fullContact.contact_email || contact.email}`} className="hover:underline">
                                  {fullContact.contact_email || contact.email}
                                </a>
                              </p>
                            )}
                            {fullContact.phone && (
                              <p className="text-sm text-gray-600 mt-1">
                                <a href={`tel:${fullContact.phone}`} className="hover:underline">
                                  📞 {fullContact.phone}
                                </a>
                              </p>
                            )}
                            {fullContact.mailing_address && (
                              <p className="text-sm text-gray-600 mt-1">
                                📍 {fullContact.mailing_address}
                              </p>
                            )}
                            {fullContact.notes && (
                              <p className="text-sm text-gray-500 mt-2 italic">
                                {fullContact.notes}
                              </p>
                            )}
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ml-4">
                            {fullContact.contact_type || contact.contact_type}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">
                  No contact information available for this film.
                </div>
              )}
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Guest Card Popup */}
      {showGuestCard && (
        <GuestCardPopup
          guest={showGuestCard}
          onClose={() => setShowGuestCard(null)}
        />
      )}
    </>
  )
}