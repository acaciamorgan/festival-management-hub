'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GuestCard, FilmCard, InterviewCard } from '@/types'
import { FilmCardPopup } from './film-card-popup'
import { getInterviewsForGuestCard } from '@/lib/interviews-client'

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
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || !isEmpty)

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

  const supabase = createClient()

  // Load photo shoots and red carpets for this guest
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
          .or(`subjects_display.ilike.%${guest.name}%`)
          .order('shoot_date', { ascending: false })

        if (shootsError) {
          console.error('Error loading photo shoots:', shootsError)
        } else {
          // Filter to only include shoots where this guest is actually mentioned
          const relevantShoots = (shootsData || []).filter(shoot => {
            if (!shoot.subjects_display) return false
            const subjects = shoot.subjects_display.split(',').map((s: string) => s.trim())
            return subjects.includes(guest.name)
          })
          setPhotoShoots(relevantShoots)
        }

        // Load red carpets
        const { data: carpetsData, error: carpetsError } = await supabase
          .from('red_carpets')
          .select(`
            id,
            carpet_date,
            carpet_start_time,
            subjects_display,
            venues(name)
          `)
          .or(`subjects_display.ilike.%${guest.name}%`)
          .order('carpet_date', { ascending: false })

        if (carpetsError) {
          console.error('Error loading red carpets:', carpetsError)
        } else {
          // Filter to only include carpets where this guest is actually mentioned
          const relevantCarpets = (carpetsData || []).filter(carpet => {
            if (!carpet.subjects_display) return false
            const subjects = carpet.subjects_display.split(',').map((s: string) => s.trim())
            return subjects.includes(guest.name)
          })
          setRedCarpets(relevantCarpets)
        }

        // Load interviews for this guest
        try {
          const interviews = await getInterviewsForGuestCard(guest.id)
          setGuestInterviews(interviews)
        } catch (error) {
          console.error('Error loading guest interviews:', error)
          setGuestInterviews([])
        }
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
    const date = new Date(dateString)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
    return `${month}/${day}/${year}`
  }

  const formatTime = (timeString: string | undefined): string => {
    if (!timeString) return ''
    
    // Convert 24-hour format to 12-hour AM/PM format
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    
    return `${hour12}:${minutes} ${ampm}`
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
        className="fixed inset-0 bg-transparent z-50"
        onClick={onClose}
      />
      
      <div
        className="fixed bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto z-[60]"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default',
          maxWidth: '1000px',
          width: '90vw'
        }}
      >
        {/* Header with drag handle */}
        <div 
          className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg cursor-grab active:cursor-grabbing flex justify-between items-center"
          onMouseDown={handleMouseDown}
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
              onClick={() => {
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
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
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
                        {guest.arrival_takeoff_time && `Takeoff: ${formatTime(guest.arrival_takeoff_time)}`}
                        {guest.arrival_takeoff_time && guest.arrival_landing_time && ' | '}
                        {guest.arrival_landing_time && `Landing: ${formatTime(guest.arrival_landing_time)}`}
                        {!guest.arrival_takeoff_time && !guest.arrival_landing_time && 'Not specified'}
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
                        {guest.arrival_origin && guest.arrival_destination
                          ? `${guest.arrival_origin} → ${guest.arrival_destination}`
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
                        {guest.departure_takeoff_time && `Takeoff: ${formatTime(guest.departure_takeoff_time)}`}
                        {guest.departure_takeoff_time && guest.departure_landing_time && ' | '}
                        {guest.departure_landing_time && `Landing: ${formatTime(guest.departure_landing_time)}`}
                        {!guest.departure_takeoff_time && !guest.departure_landing_time && 'Not specified'}
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
                        {guest.departure_origin && guest.departure_destination
                          ? `${guest.departure_origin} → ${guest.departure_destination}`
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
                      <span className="font-medium">{interview.film_title}</span>
                      {interview.journalist_name && <span> | Journalist: {interview.journalist_name}</span>}
                      {interview.outlet && <span> | Outlet: {interview.outlet}</span>}
                    </div>
                    
                    {/* Line 3: Scheduling Info (only when scheduled) */}
                    {interview.status === 'Scheduled' && (
                      <div className="text-sm text-gray-600">
                        {interview.interview_date && <span>Date: {formatDate(interview.interview_date)}</span>}
                        {interview.interview_time && <span> | Time: {formatTime(interview.interview_time)}</span>}
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
                    const d = new Date(shoot.shoot_date)
                    const month = (d.getMonth() + 1).toString().padStart(2, '0')
                    const day = d.getDate().toString().padStart(2, '0')
                    const year = d.getFullYear().toString().slice(-2)
                    return `${month}/${day}/${year}`
                  })() : 'TBD'
                  
                  const time = shoot.shoot_time ? formatTimeForDisplay(shoot.shoot_time) : 'TBD'
                  const venue = shoot.venues?.name || 'TBD'
                  const subjects = shoot.subjects_display || 'TBD'
                  
                  return (
                    <div key={`shoot-${shoot.id}`} className="text-sm text-gray-900">
                      📸 Photo Shoot - {date}, {time} at {venue} ({subjects})
                    </div>
                  )
                })}
                
                {/* Red Carpets */}
                {redCarpets.map((carpet) => {
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
              <p className="text-sm text-gray-500">No red carpets or photo shoots found for this guest.</p>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Events" isEmpty={true}>
            <p className="text-sm text-gray-500">Event data will be pulled from Special Events Module when implemented.</p>
          </CollapsibleSection>

          <CollapsibleSection title="Intros & Q&As" isEmpty={true}>
            <p className="text-sm text-gray-500">Public screening and Q&A data will be pulled from respective modules when implemented.</p>
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