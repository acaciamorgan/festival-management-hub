'use client'

import { useState, useMemo } from 'react'
import { SpecialEventCard } from '@/types'

interface SpecialEventsTimelineProps {
  events: SpecialEventCard[]
  onEventClick: (event: SpecialEventCard) => void
}

export function SpecialEventsTimeline({ events, onEventClick }: SpecialEventsTimelineProps) {
  const [selectedVenues, setSelectedVenues] = useState<string[]>([])
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [openPressOnly, setOpenPressOnly] = useState(false)

  // Get all unique venues
  const allVenues = useMemo(() => {
    const venues = new Set<string>()
    events.forEach(event => {
      if (event.venue_name) venues.add(event.venue_name)
    })
    return Array.from(venues).sort()
  }, [events])

  // Get all unique event types
  const allEventTypes = useMemo(() => {
    const types = new Set<string>()
    events.forEach(event => {
      if (event.event_type) types.add(event.event_type)
    })
    return Array.from(types).sort()
  }, [events])

  // Get event type color
  const getEventTypeColor = (type: string | null): string => {
    switch (type) {
      case 'Interview': return 'bg-purple-500 border-purple-600'
      case 'Reception': return 'bg-blue-500 border-blue-600'
      case 'Mixer': return 'bg-green-500 border-green-600'
      case 'Party': return 'bg-pink-500 border-pink-600'
      case 'Awards': return 'bg-yellow-500 border-yellow-600'
      case 'Media Filing': return 'bg-orange-500 border-orange-600'
      case 'Other': return 'bg-gray-500 border-gray-600'
      default: return 'bg-gray-500 border-gray-600'
    }
  }

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Venue filter
      if (selectedVenues.length > 0 && event.venue_name && !selectedVenues.includes(event.venue_name)) {
        return false
      }
      // Event type filter
      if (selectedEventTypes.length > 0 && event.event_type && !selectedEventTypes.includes(event.event_type)) {
        return false
      }
      // Open press filter
      if (openPressOnly && event.open_press !== 'Yes') {
        return false
      }
      return true
    })
  }, [events, selectedVenues, selectedEventTypes, openPressOnly])

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, SpecialEventCard[]> = {}
    filteredEvents.forEach(event => {
      if (event.event_date) {
        if (!grouped[event.event_date]) {
          grouped[event.event_date] = []
        }
        grouped[event.event_date].push(event)
      }
    })
    return grouped
  }, [filteredEvents])

  // Get sorted dates
  const sortedDates = useMemo(() => {
    return Object.keys(eventsByDate).sort()
  }, [eventsByDate])

  // Get venues to display (filtered or all)
  const displayVenues = useMemo(() => {
    if (selectedVenues.length > 0) {
      return selectedVenues
    }
    return allVenues
  }, [selectedVenues, allVenues])

  // Convert time to minutes since midnight
  const timeToMinutes = (timeString: string | null): number => {
    if (!timeString) return 0
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
  }

  // Format date for display
  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${dayNames[date.getDay()]}, ${monthNames[month - 1]} ${day}`
  }

  // Format time for display
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return ''
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${ampm}`
  }

  // Generate time slots from 9 AM to 11 PM
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 9; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    return slots
  }, [])

  // Toggle venue filter
  const toggleVenue = (venue: string) => {
    if (selectedVenues.includes(venue)) {
      setSelectedVenues(selectedVenues.filter(v => v !== venue))
    } else {
      setSelectedVenues([...selectedVenues, venue])
    }
  }

  // Toggle event type filter
  const toggleEventType = (type: string) => {
    if (selectedEventTypes.includes(type)) {
      setSelectedEventTypes(selectedEventTypes.filter(t => t !== type))
    } else {
      setSelectedEventTypes([...selectedEventTypes, type])
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filters Header - Sticky */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 space-y-3">
        {/* Venue Filters */}
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700 mr-2">Venues:</span>
          <button
            onClick={() => setSelectedVenues([])}
            className={`px-3 py-1 text-xs rounded-md border ${
              selectedVenues.length === 0
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {allVenues.map(venue => (
            <button
              key={venue}
              onClick={() => toggleVenue(venue)}
              className={`px-3 py-1 text-xs rounded-md border ${
                selectedVenues.includes(venue)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {venue}
            </button>
          ))}
        </div>

        {/* Event Type Filters */}
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700 mr-2">Event Types:</span>
          <button
            onClick={() => setSelectedEventTypes([])}
            className={`px-3 py-1 text-xs rounded-md border ${
              selectedEventTypes.length === 0
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {allEventTypes.map(type => (
            <button
              key={type}
              onClick={() => toggleEventType(type)}
              className={`px-3 py-1 text-xs rounded-md border ${
                selectedEventTypes.includes(type)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Open Press Filter */}
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={openPressOnly}
              onChange={(e) => setOpenPressOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Open Press Only</span>
          </label>
        </div>
      </div>

      {/* Timeline - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-white">
        {sortedDates.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No events match the selected filters
          </div>
        ) : (
          sortedDates.map(date => {
            const dayEvents = eventsByDate[date] || []

            return (
              <div key={date} className="border-b border-gray-300 mb-8 pb-8">
                {/* Day Header */}
                <div className="sticky top-0 bg-blue-50 px-6 py-3 border-b border-blue-200 z-10">
                  <h3 className="text-lg font-semibold text-gray-900">{formatDate(date)}</h3>
                </div>

                {/* Timeline Grid */}
                <div className="overflow-x-auto">
                  <div className="min-w-[1200px] px-6 py-4">
                    {/* Time Header */}
                    <div className="flex mb-2">
                      <div className="w-32 flex-shrink-0"></div>
                      <div className="flex-1 flex">
                        {timeSlots.map(slot => (
                          <div key={slot} className="flex-1 text-xs text-gray-500 text-center border-l border-gray-200">
                            {formatTime(slot)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Venue Rows */}
                    {displayVenues.map(venue => {
                      const venueEvents = dayEvents.filter(e => e.venue_name === venue)

                      return (
                        <div key={venue} className="flex items-stretch mb-2 min-h-[60px]">
                          {/* Venue Label */}
                          <div className="w-32 flex-shrink-0 pr-4 flex items-center">
                            <span className="text-sm font-medium text-gray-700">{venue}</span>
                          </div>

                          {/* Timeline */}
                          <div className="flex-1 relative border border-gray-300 bg-gray-50">
                            {/* Time grid lines */}
                            {timeSlots.map((slot, index) => (
                              <div
                                key={slot}
                                className="absolute top-0 bottom-0 border-l border-gray-200"
                                style={{ left: `${(index / timeSlots.length) * 100}%` }}
                              />
                            ))}

                            {/* Events */}
                            {venueEvents.map(event => {
                              const isInterview = event.event_type === 'Interview'
                              const startMinutes = timeToMinutes(event.start_time)
                              const endMinutes = timeToMinutes(event.end_time)
                              const startPercent = ((startMinutes - 9 * 60) / (15 * 60)) * 100 // 9 AM = start, 15 hours total
                              const widthPercent = ((endMinutes - startMinutes) / (15 * 60)) * 100

                              return (
                                <div
                                  key={event.id}
                                  onClick={() => onEventClick(event)}
                                  className={`absolute top-1 bottom-1 ${getEventTypeColor(event.event_type)} text-white rounded px-2 py-1 cursor-pointer hover:opacity-90 transition-opacity border-2 overflow-hidden`}
                                  style={{
                                    left: `${Math.max(0, startPercent)}%`,
                                    width: `${Math.min(100 - startPercent, widthPercent)}%`
                                  }}
                                >
                                  <div className="text-xs font-semibold truncate">
                                    {isInterview && <span className="mr-1">🎤</span>}
                                    {event.title}
                                  </div>
                                  <div className="text-xs opacity-90">
                                    {formatTime(event.start_time)}{event.end_time ? ` - ${formatTime(event.end_time)}` : ''}
                                  </div>
                                  {event.open_press === 'Yes' && (
                                    <div className="text-xs opacity-90">📰 Open Press</div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}

                    {/* Show message if no events for displayed venues */}
                    {displayVenues.every(venue => !dayEvents.some(e => e.venue_name === venue)) && (
                      <div className="text-center text-gray-500 py-8">
                        No events at selected venues on this day
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center space-x-4 text-xs flex-wrap">
          <span className="font-medium text-gray-700">Event Types:</span>
          {allEventTypes.map(type => (
            <div key={type} className="flex items-center">
              <div className={`w-4 h-4 rounded mr-1 ${getEventTypeColor(type).split(' ')[0]}`} />
              <span className="text-gray-600">{type === 'Interview' ? '🎤 Interview' : type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
