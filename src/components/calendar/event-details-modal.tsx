'use client'

import { useState, useCallback, useEffect } from 'react'
import { SpecialEventCard } from '@/types'

interface EventDetailsModalProps {
  event: SpecialEventCard | null
  isOpen: boolean
  onClose: () => void
}

export function EventDetailsModal({ event, isOpen, onClose }: EventDetailsModalProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  if (!isOpen || !event) return null

  const isInterview = (event as any)._type === 'interview'

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
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '—'
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${ampm}`
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—'
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${dayNames[date.getDay()]}, ${monthNames[month - 1]} ${day}, ${year}`
  }

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 pointer-events-none">
      <div
        className="bg-white rounded-lg shadow-2xl border border-gray-300 overflow-y-auto pointer-events-auto"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '600px',
          maxHeight: '80vh',
          position: 'fixed',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Draggable */}
        <div
          className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center">
            {isInterview ? (
              <span className="text-2xl mr-3">🎤</span>
            ) : (
              <span className="text-2xl mr-3">✨</span>
            )}
            <h2 className="text-xl font-semibold text-gray-900">{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Type */}
          <div>
            <span className="text-sm font-medium text-gray-500">Type</span>
            <div className="mt-1">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                isInterview ? 'bg-purple-100 text-purple-800' :
                event.event_type === 'Reception' ? 'bg-blue-100 text-blue-800' :
                event.event_type === 'Mixer' ? 'bg-green-100 text-green-800' :
                event.event_type === 'Party' ? 'bg-pink-100 text-pink-800' :
                event.event_type === 'Awards' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {isInterview ? 'Interview' : event.event_type}
              </span>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Date</span>
              <div className="mt-1 text-gray-900">{formatDate(event.event_date)}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Time</span>
              <div className="mt-1 text-gray-900">
                {formatTime(event.start_time)}
                {event.end_time && ` - ${formatTime(event.end_time)}`}
              </div>
            </div>
          </div>

          {/* Venue */}
          {event.venue_name && (
            <div>
              <span className="text-sm font-medium text-gray-500">Venue</span>
              <div className="mt-1 text-gray-900">{event.venue_name}</div>
              {event.location_details && (
                <div className="text-sm text-gray-600">{event.location_details}</div>
              )}
            </div>
          )}

          {/* Films/Programs */}
          {event.films_programs_display && (
            <div>
              <span className="text-sm font-medium text-gray-500">
                {isInterview ? 'Film/Program' : 'Films/Programs Associated'}
              </span>
              <div className="mt-1 text-gray-900">{event.films_programs_display}</div>
            </div>
          )}

          {/* Guests */}
          {event.guests_display && (
            <div>
              <span className="text-sm font-medium text-gray-500">
                {isInterview ? 'Interview Subject(s)' : 'Guests Associated'}
              </span>
              <div className="mt-1 text-gray-900">{event.guests_display}</div>
            </div>
          )}

          {/* Lead Staff */}
          {event.lead_staff && (
            <div>
              <span className="text-sm font-medium text-gray-500">Lead Staff</span>
              <div className="mt-1 text-gray-900">{event.lead_staff}</div>
            </div>
          )}

          {/* Invited Tags */}
          {event.invited_tags && (
            <div>
              <span className="text-sm font-medium text-gray-500">Invited</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {event.invited_tags.split(',').map((tag, index) => (
                  <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Open Press */}
          {event.open_press === 'Yes' && (
            <div>
              <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md bg-green-100 text-green-800">
                📰 Open Press
              </span>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div>
              <span className="text-sm font-medium text-gray-500">Notes</span>
              <div className="mt-1 text-gray-900 whitespace-pre-wrap">{event.notes}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
