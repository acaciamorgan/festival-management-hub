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
    const date = new Date(dateString)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
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
            rsvp_responses_url,
            canceled,
            venues(name)
          `)
          .eq('title', film.title)
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

            // Load contacts for this film
            const { data: contactsData, error: contactsError } = await supabase
              .from('film_contacts')
              .select('*')
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
              .eq('film_title', film.title)

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
      } catch (error) {
        console.error('Error loading events:', error)
      }
    }

    loadEvents()
  }, [film.title, film.id, supabase])

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div 
        className="bg-white rounded-lg shadow-2xl border border-gray-300 max-w-4xl w-[800px] max-h-[80vh] overflow-hidden pointer-events-auto"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default'
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

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
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
            <CollapsibleSection title="Press Screenings & Links" isEmpty={filmPressScreenings.length === 0}>
              {renderScreenerBadge()}
              {filmPressScreenings.length > 0 ? (
                <div className="space-y-2">
                  {filmPressScreenings.map((screening) => {
                    const date = screening.screening_date ? (() => {
                      const d = new Date(screening.screening_date)
                      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                      const dayName = dayNames[d.getDay()]
                      const month = (d.getMonth() + 1).toString().padStart(2, '0')
                      const day = d.getDate().toString().padStart(2, '0')
                      return `${dayName}, ${month}/${day}`
                    })() : 'TBD'
                    
                    const time = screening.screening_time ? (() => {
                      const [hours, minutes] = screening.screening_time.split(':')
                      const hour24 = parseInt(hours, 10)
                      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
                      const ampm = hour24 >= 12 ? 'PM' : 'AM'
                      return `${hour12}:${minutes} ${ampm}`
                    })() : 'TBD'
                    
                    const venue = screening.venues?.name || 'TBD'
                    const house = screening.house ? ` (${screening.house})` : ''
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
                    const date = carpet.carpet_date ? (() => {
                      const d = new Date(carpet.carpet_date)
                      const month = (d.getMonth() + 1).toString().padStart(2, '0')
                      const day = d.getDate().toString().padStart(2, '0')
                      const year = d.getFullYear().toString().slice(-2)
                      return `${month}/${day}/${year}`
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
                <p className="text-sm text-gray-500">No red carpets or photo shoots found for this film.</p>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Interviews" isEmpty={filmInterviews.length === 0}>
              {filmInterviews.length > 0 ? (
                <div className="space-y-3">
                  {filmInterviews.map((interview) => (
                    <div key={interview.id} className="bg-gray-50 rounded-lg p-3">
                      {/* Line 1: Status Badge */}
                      <div className="mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          interview.status === 'Complete' ? 'bg-green-100 text-green-800' :
                          interview.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                          interview.status === 'Declined' ? 'bg-red-100 text-red-800' :
                          interview.status === 'Pitching' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {interview.status}
                        </span>
                      </div>
                      
                      {/* Line 2: Main Info */}
                      <div className="text-sm text-gray-900 mb-1">
                        <span className="font-medium">{interview.journalist_name || 'Journalist TBD'}</span>
                        {interview.outlet && <span> | Outlet: {interview.outlet}</span>}
                        {interview.subject_names && <span> | Subject(s): {interview.subject_names}</span>}
                      </div>
                      
                      {/* Line 3: Scheduling Info (only when scheduled) */}
                      {interview.status === 'Scheduled' && (
                        <div className="text-sm text-gray-600">
                          {interview.interview_date && <span>Date: {formatDateForDisplay(interview.interview_date)}</span>}
                          {interview.interview_time && <span> | Time: {formatTimeForDisplay(interview.interview_time)}</span>}
                          {interview.location && <span> | Location: {interview.location}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </CollapsibleSection>

            <CollapsibleSection title="In Attendance" isEmpty={filmGuests.length === 0}>
              {filmGuests.length > 0 ? (
                <div className="space-y-3">
                  {filmGuests.map((guest) => {
                    const arrivalDate = guest.arrival_date ? (() => {
                      const d = new Date(guest.arrival_date)
                      const month = (d.getMonth() + 1).toString().padStart(2, '0')
                      const day = d.getDate().toString().padStart(2, '0')
                      const year = d.getFullYear().toString().slice(-2)
                      return `${month}/${day}/${year}`
                    })() : 'TBD'
                    
                    const departureDate = guest.departure_date ? (() => {
                      const d = new Date(guest.departure_date)
                      const month = (d.getMonth() + 1).toString().padStart(2, '0')
                      const day = d.getDate().toString().padStart(2, '0')
                      const year = d.getFullYear().toString().slice(-2)
                      return `${month}/${day}/${year}`
                    })() : 'TBD'
                    
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
                  {filmContacts.map((contact) => (
                    <div key={contact.id} className="border-l-4 border-blue-400 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{contact.name}</h4>
                          {contact.company && (
                            <p className="text-sm text-gray-600 mt-1">{contact.company}</p>
                          )}
                          {contact.email && (
                            <p className="text-sm text-blue-600 mt-1">
                              <a href={`mailto:${contact.email}`} className="hover:underline">
                                {contact.email}
                              </a>
                            </p>
                          )}
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ml-4">
                          {contact.contact_type}
                        </span>
                      </div>
                    </div>
                  ))}
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
    </div>
  )
}