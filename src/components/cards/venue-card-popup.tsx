'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { VenueCard, TheaterHouse } from '@/types'

interface VenueCardPopupProps {
  venue: VenueCard
  onClose: () => void
  onUpdate?: (updatedVenue: VenueCard) => void
  onDelete?: (venueId: string) => void
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  isEmpty?: boolean
}

function CollapsibleSection({ title, children, isEmpty = false }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(!isEmpty)

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

export function VenueCardPopup({ venue, onClose, onUpdate, onDelete }: VenueCardPopupProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

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

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${venue.name}? This action cannot be undone.`)) {
      return
    }
    
    try {
      await supabase
        .from('theater_houses')
        .delete()
        .eq('venue_id', venue.id)

      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venue.id)
      
      if (error) {
        console.error('Error deleting venue:', error)
        alert('Error deleting venue. Please try again.')
      } else {
        if (onDelete) {
          onDelete(venue.id)
        }
        onClose()
      }
    } catch (error) {
      console.error('Error deleting venue:', error)
      alert('Error deleting venue. Please try again.')
    }
  }

  const getVenueTypeIcon = (type: string) => {
    switch (type) {
      case 'Movie Theater':
        return '🎬'
      case 'Restaurant':
        return '🍽️'
      case 'Event Space':
        return '🏛️'
      default:
        return '🏢'
    }
  }

  const getTotalSeats = (houses: TheaterHouse[] | undefined): number => {
    if (!houses || houses.length === 0) return 0
    return houses.reduce((total, house) => total + house.seat_count, 0)
  }

  return (
    <div 
      className="fixed inset-0 bg-transparent flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Header with drag handle */}
        <div 
          className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg cursor-grab active:cursor-grabbing flex justify-between items-center"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center">
            <span className="text-2xl mr-3">{getVenueTypeIcon(venue.venue_type)}</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{venue.name}</h2>
              <p className="text-sm text-gray-600">{venue.venue_type}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                // TODO: Open edit modal - will be implemented when edit functionality is added
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
          <CollapsibleSection title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Venue Name</span>
                <p className="text-sm text-gray-900 mt-1">{venue.name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Venue Type</span>
                <p className="text-sm text-gray-900 mt-1">{venue.venue_type}</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Address</span>
                <p className="text-sm text-gray-900 mt-1 whitespace-pre-line">{venue.address}</p>
              </div>
              {venue.accessibility && (
                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Accessibility</span>
                  <p className="text-sm text-gray-900 mt-1 whitespace-pre-line">{venue.accessibility}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Contact Information */}
          <CollapsibleSection 
            title="Contact Information" 
            isEmpty={!venue.contact_names?.length && !venue.contact_emails?.length && !venue.contact_phones?.length}
          >
            {venue.contact_names?.length || venue.contact_emails?.length || venue.contact_phones?.length ? (
              <div className="space-y-4">
                {venue.contact_names?.map((name, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {name && (
                      <div>
                        <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Name</span>
                        <p className="text-sm text-gray-900 mt-1">{name}</p>
                      </div>
                    )}
                    {venue.contact_emails?.[index] && (
                      <div>
                        <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Email</span>
                        <p className="text-sm text-gray-900 mt-1">
                          <a href={`mailto:${venue.contact_emails[index]}`} className="text-blue-600 hover:text-blue-800">
                            {venue.contact_emails[index]}
                          </a>
                        </p>
                      </div>
                    )}
                    {venue.contact_phones?.[index] && (
                      <div>
                        <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Phone</span>
                        <p className="text-sm text-gray-900 mt-1">
                          <a href={`tel:${venue.contact_phones[index]}`} className="text-blue-600 hover:text-blue-800">
                            {venue.contact_phones[index]}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No contact information available.</p>
            )}
          </CollapsibleSection>

          {/* Theater Houses (only for Movie Theaters) */}
          {venue.venue_type === 'Movie Theater' && (
            <CollapsibleSection 
              title={`Theater Houses ${venue.houses?.length ? `(${venue.houses.length} houses, ${getTotalSeats(venue.houses)} total seats)` : ''}`}
              isEmpty={!venue.houses?.length}
            >
              {venue.houses && venue.houses.length > 0 ? (
                <div className="space-y-3">
                  {venue.houses.map((house, index) => (
                    <div key={house.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">{house.house_name}</span>
                        {house.short_code && (
                          <span className="ml-2 text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            {house.short_code}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {house.seat_count} seats
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No theater houses configured for this movie theater.</p>
              )}
            </CollapsibleSection>
          )}

          {/* Usage in Modules */}
          <CollapsibleSection title="Module Usage" isEmpty={true}>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">This venue can be referenced in:</p>
              <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
                <li>Press Screenings</li>
                <li>Special Events</li>
                <li>Photo Shoots</li>
                <li>Interview Management</li>
                <li>Red Carpets</li>
              </ul>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  )
}