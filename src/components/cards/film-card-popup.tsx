'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FilmContact, InterviewCard } from '@/types'
import { GuestCardPopup } from './guest-card-popup'
import { getInterviewsForFilmCard } from '@/lib/interviews-client'

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
}

function CollapsibleSection({ title, children, isEmpty = false }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-4 px-6 text-left hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
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

  const supabase = createClient()

  const renderScreenerBadge = () => {
    if (!screenerData || screenerData.access_type === 'tbd') {
      return null
    }

    const badgeConfig = {
      cinesend: { text: 'Cinesend', className: 'bg-blue-100 text-blue-800' },
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

  const openGuestCard = async (guestName: string) => {
    try {
      const { data: guestData, error } = await supabase
        .from('guests')
        .select(`
          *,
          guest_films:guest_films(film_title),
          guest_programs:guest_programs(program_title)
        `)
        .eq('name', guestName)
        .single()

      if (error || !guestData) {
        console.warn('Guest not found in database:', guestName)
        return
      }

      const formattedGuest = {
        ...guestData,
        films: guestData.guest_films || [],
        films_display: [
          ...(guestData.guest_films || []).map((f: any) => f.film_title),
          ...(guestData.guest_programs || []).map((p: any) => p.program_title)
        ].join(', ') || '—'
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
    console.log('DEBUG: Film Card useEffect triggered for film:', film.title, 'ID:', film.id)
    const loadEvents = async () => {
      try {
        // Load photo shoots
        const { data: shootsData, error: shootsError } = await supabase
          .from('photo_shoots')
          .select(`
            id,
            shoot_date,
            shoot_time,
            subjects_display,
            film_program_display,
            venue_id
          `)
          .or(`film_program_display.ilike.%${film.title}%`)
          .order('shoot_date', { ascending: false })

        if (shootsError) {
          console.error('Error loading photo shoots:', shootsError)
        } else {
          // Filter to only include shoots where this film is actually mentioned
          const relevantShoots = (shootsData || []).filter(shoot => {
            if (!shoot.film_program_display) return false
            const titles = shoot.film_program_display.split(',').map((s: string) => s.trim())
            return titles.includes(film.title)
          })
          
          // Load venue names for the photo shoots
          const shootsWithVenues = await Promise.all(
            relevantShoots.map(async (shoot) => {
              if (shoot.venue_id) {
                const { data: venueData } = await supabase
                  .from('venues')
                  .select('name')
                  .eq('id', shoot.venue_id)
                  .single()
                
                return { ...shoot, venues: venueData }
              }
              return { ...shoot, venues: null }
            })
          )
          
          setFilmPhotoShoots(shootsWithVenues)
        }

        // Load red carpets
        const { data: carpetsData, error: carpetsError } = await supabase
          .from('red_carpets')
          .select(`
            id,
            carpet_date,
            carpet_start_time,
            subjects_display,
            film_program_display,
            venues(name)
          `)
          .or(`film_program_display.ilike.%${film.title}%`)
          .order('carpet_date', { ascending: false })

        if (carpetsError) {
          console.error('Error loading red carpets:', carpetsError)
        } else {
          // Filter to only include carpets where this film is actually mentioned
          const relevantCarpets = (carpetsData || []).filter(carpet => {
            if (!carpet.film_program_display) return false
            const titles = carpet.film_program_display.split(',').map((s: string) => s.trim())
            return titles.includes(film.title)
          })
          setFilmRedCarpets(relevantCarpets)
        }

        // Load press screenings
        const { data: screeningsData, error: screeningsError } = await supabase
          .from('press_screenings')
          .select(`
            id,
            screening_date,
            screening_time,
            title,
            venue_id,
            house,
            short_code,
            rsvp_responses_url,
            canceled,
            venues(name)
          `)
          .eq('title', film.title)
          .order('screening_date', { ascending: true })

        if (screeningsError) {
          console.error('Error loading press screenings:', screeningsError)
        } else {
          console.log('DEBUG: Press screenings loaded:', screeningsData)
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
            // Load guests who have this film in their guest_films associations
            console.log('DEBUG: Looking for film title:', film.title)
            
            // Debug: Check all guest_films records to see what titles exist
            const { data: allGuestFilms, error: allGuestFilmsError } = await supabase
              .from('guest_films')
              .select('film_title, guests(name)')
            console.log('DEBUG: All guest_films records:', allGuestFilms)
            
            // First try to get ALL guest_films to see if any exist
            const { data: allGuestFilmsTest, error: allGuestFilmsTestError } = await supabase
              .from('guest_films')
              .select(`
                film_id,
                film_title,
                guest_id,
                guests (
                  id,
                  name,
                  role
                )
              `)
            console.log('DEBUG: ALL guest_films in database:', allGuestFilmsTest)
            console.log('DEBUG: Film ID we are looking for:', film.id)
            
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
            console.log('DEBUG: Guest films query result:', guestFilms)
            console.log('DEBUG: Guest films error:', guestFilmsError)

            let allGuests: any[] = []

            if (!guestFilmsError && guestFilms) {
              allGuests = guestFilms.map((gf: any) => gf.guests).filter(Boolean)
            }

            // Also check for guests associated via guest_programs if this is a program
            const { data: guestPrograms, error: guestProgramsError } = await supabase
              .from('guest_programs')
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
              .eq('program_title', film.title)

            if (!guestProgramsError && guestPrograms) {
              const programGuests = guestPrograms.map((gp: any) => gp.guests).filter(Boolean)
              allGuests = [...allGuests, ...programGuests]
            }

            // Remove duplicates based on guest ID
            const uniqueGuests = allGuests.filter((guest, index, self) => 
              index === self.findIndex(g => g.id === guest.id)
            )

            setFilmGuests(uniqueGuests)
          } catch (error) {
            console.error('Error loading film guests:', error)
            setFilmGuests([])
          }
        }

        await loadGuests()

        // Load screener access data
        const { data: screenerAccessData, error: screenerError } = await supabase
          .from('screener_access')
          .select('*')
          .eq('film_id', film.id)
          .single()

        if (!screenerError && screenerAccessData) {
          setScreenerData(screenerAccessData)
        }

        // Load interviews for this film
        try {
          const interviews = await getInterviewsForFilmCard(film.id)
          setFilmInterviews(interviews)
        } catch (error) {
          console.error('Error loading film interviews:', error)
          setFilmInterviews([])
        }

        // Load ticketing screenings for this film
        const loadScreenings = async () => {
          try {
            // First try to find programming_film_id for this film
            const { data: programmingFilm } = await supabase
              .from('programming_films')
              .select('id')
              .eq('film_title', film.title)
              .single()

            // Query published screenings (not ticketing screenings)
            const screeningsQuery = supabase
              .from('published_screenings')
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
              .eq('film_card_id', film.id)
              .order('screening_date', { ascending: true })
              .order('start_time', { ascending: true })

            const { data: screeningsData, error: screeningsError } = await screeningsQuery

            if (screeningsError) {
              console.error('Error loading ticketing screenings:', screeningsError)
              setFilmScreenings([])
            } else {
              // Attempt to resolve venue names from short codes
              const screeningsWithVenues = await Promise.all(
                (screeningsData || []).map(async (screening) => {
                  if (screening.venue_short_code) {
                    // Try to find the venue by short code in theater_houses
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
                  // If no venue found, use the short code as venue name
                  return { ...screening, venue_name: screening.venue_short_code }
                })
              )
              
              setFilmScreenings(screeningsWithVenues)
            }
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
        className="fixed bg-white rounded-lg shadow-2xl border border-gray-300 max-w-4xl w-[800px] max-h-[80vh] overflow-hidden z-[60] flex flex-col"
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
                    // Format date as "Mon, Oct 23" without timezone conversion
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
                      const dayIndex = (h + 5) % 7
                      
                      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                      const dayName = dayNames[dayIndex]
                      const monthName = monthNames[month - 1]
                      const dayNum = day
                      return `${dayName}, ${monthName} ${dayNum}`
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
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No public screenings scheduled.</p>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Press Screenings & Links" isEmpty={filmPressScreenings.length === 0}>
              {renderScreenerBadge()}
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
                      const dayIndex = (h + 5) % 7
                      
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
                        {shoot.subjects_display ? (
                          <span>
                            {shoot.subjects_display.split(', ').map((name, index) => {
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
                                  {index < shoot.subjects_display.split(', ').length - 1 && <span className="text-gray-400">, </span>}
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
                        <span className="font-medium">{interview.journalist_name || 'Journalist TBD'}</span>
                        {interview.outlet && <span className="text-gray-600">| {interview.outlet}</span>}
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