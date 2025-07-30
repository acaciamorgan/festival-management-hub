'use client'

import { useState, useMemo } from 'react'
import { SpecialEventCard } from '@/types'

interface SpecialEventsCalendarProps {
  events: SpecialEventCard[]
  onEventClick: (event: SpecialEventCard) => void
}

export function SpecialEventsCalendar({ events, onEventClick }: SpecialEventsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Get the first day of the month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  
  // Get the first day of the calendar (including previous month's days)
  const startDate = new Date(firstDayOfMonth)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  
  // Get the last day of the calendar (including next month's days)
  const endDate = new Date(lastDayOfMonth)
  if (endDate.getDay() !== 6) {
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))
  }
  
  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, SpecialEventCard[]> = {}
    
    if (!events || events.length === 0) {
      return grouped
    }
    
    events.forEach(event => {
      if (event.event_date) {
        const dateKey = event.event_date
        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(event)
      }
    })
    
    return grouped
  }, [events])
  
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }, [startDate, endDate])
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }
  
  const formatDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return ''
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${ampm}`
  }
  
  const getEventTypeColor = (type: string | null): string => {
    switch (type) {
      case 'Reception': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Mixer': return 'bg-green-100 text-green-800 border-green-200'
      case 'Party': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Awards': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b border-gray-200">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-200 rounded-md transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h2 className="text-xl font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-200 rounded-md transition-colors"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {/* Day Headers */}
        {dayNames.map(day => (
          <div key={day} className="bg-gray-50 px-2 py-3 text-center text-xs font-medium text-gray-700 uppercase border-b border-r border-gray-200">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {calendarDays.map((date, index) => {
          const dateKey = formatDateKey(date)
          const dayEvents = eventsByDate[dateKey] || []
          const isCurrentMonth = date.getMonth() === currentDate.getMonth()
          const isToday = formatDateKey(new Date()) === dateKey
          
          return (
            <div
              key={index}
              className={`min-h-[120px] p-2 border-b border-r border-gray-200 ${
                !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
              } ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${
                !isCurrentMonth ? 'text-gray-400' : 'text-gray-900'
              }`}>
                {date.getDate()}
              </div>
              
              {/* Events for this day */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event, eventIndex) => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={`text-xs px-2 py-1 rounded border cursor-pointer hover:opacity-80 transition-opacity ${getEventTypeColor(event.event_type)}`}
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    {event.start_time && (
                      <div className="text-xs opacity-75">{formatTime(event.start_time)}</div>
                    )}
                  </div>
                ))}
                
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 px-2">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Legend */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center space-x-4 text-xs">
          <span className="font-medium text-gray-700">Event Types:</span>
          {['Reception', 'Mixer', 'Party', 'Awards'].map(type => (
            <div key={type} className="flex items-center">
              <div className={`w-3 h-3 rounded mr-1 ${getEventTypeColor(type).replace('text-', 'bg-').split(' ')[0]}`} />
              <span className="text-gray-600">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}