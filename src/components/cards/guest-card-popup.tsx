'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GuestCard, FilmCard } from '@/types'
import { FilmCardPopup } from './film-card-popup'

interface GuestCardPopupProps {
  guest: GuestCard
  onClose: () => void
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

export function GuestCardPopup({ guest, onClose, onUpdate, onDelete }: GuestCardPopupProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showFilmCard, setShowFilmCard] = useState<FilmCard | null>(null)

  const supabase = createClient()

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
    return new Date(dateString).toLocaleDateString()
  }

  const formatTime = (timeString: string | undefined): string => {
    if (!timeString) return ''
    return timeString
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
          console.warn('Film not found in database:', filmTitle)
          alert(`Film "${filmTitle}" not found in database`)
          return
        }
        filmData = shortFilmData
      }

      if (filmData) {
        setShowFilmCard(filmData)
      }
    } catch (error) {
      console.error('Error fetching film:', error)
      alert('Error loading film details')
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
      <div
        className="fixed bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto z-50"
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
                // TODO: Open edit modal
                console.log('Edit guest:', guest.id)
              }}
              className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={onClose}
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
          <CollapsibleSection title="Interviews" isEmpty={true}>
            <p className="text-sm text-gray-500">Interview data will be pulled from Interview Management Module when implemented.</p>
          </CollapsibleSection>

          <CollapsibleSection title="Red Carpets & Photo Opps" isEmpty={true}>
            <p className="text-sm text-gray-500">Red carpet and photo opportunity data will be pulled from respective modules when implemented.</p>
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