'use client'

import { useState, useMemo } from 'react'
import { SpecialEventCard } from '@/types'

interface SpecialEventsCalendarProps {
  events: SpecialEventCard[]
  onEventClick: (event: SpecialEventCard) => void
}

export function SpecialEventsCalendar({ events, onEventClick }: SpecialEventsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  
  // Calculate calendar bounds using pure math (no timezone shifts)
  const firstDayOfMonth = useMemo(() => {
    return { year: currentDate.year, month: currentDate.month, day: 1 }
  }, [currentDate])
  
  const daysInMonth = useMemo(() => {
    const year = currentDate.year
    const month = currentDate.month + 1 // JavaScript months are 0-based
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
    const daysInMonths = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return daysInMonths[currentDate.month]
  }, [currentDate])
  
  const firstDayOfWeek = useMemo(() => {
    // Use Zeller's congruence to find day of week for first day of month
    let year = currentDate.year
    let month = currentDate.month + 1 // Convert to 1-based month
    const day = 1
    
    if (month < 3) {
      month += 12
      year -= 1
    }
    
    const k = year % 100
    const j = Math.floor(year / 100)
    
    let h = (day + Math.floor((13 * (month + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
    if (h < 0) h += 7
    
    // Convert Zeller's result to JavaScript day of week (0=Sunday)
    return (h + 6) % 7
  }, [currentDate])
  
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
  
  // Generate calendar days using pure math
  const calendarDays = useMemo(() => {
    const days = []
    
    // Calculate previous month's trailing days
    const prevMonth = currentDate.month === 0 ? 11 : currentDate.month - 1
    const prevYear = currentDate.month === 0 ? currentDate.year - 1 : currentDate.year
    const prevMonthDays = prevMonth === 1 ? 
      ((prevYear % 4 === 0 && prevYear % 100 !== 0) || (prevYear % 400 === 0) ? 29 : 28) :
      [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][prevMonth]
    
    // Add trailing days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        year: prevYear,
        month: prevMonth,
        day: prevMonthDays - i,
        isCurrentMonth: false
      })
    }
    
    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        year: currentDate.year,
        month: currentDate.month,
        day,
        isCurrentMonth: true
      })
    }
    
    // Add leading days from next month to fill 42 slots (6 weeks)
    const nextMonth = currentDate.month === 11 ? 0 : currentDate.month + 1
    const nextYear = currentDate.month === 11 ? currentDate.year + 1 : currentDate.year
    
    let nextMonthDay = 1
    while (days.length < 42) {
      days.push({
        year: nextYear,
        month: nextMonth,
        day: nextMonthDay++,
        isCurrentMonth: false
      })
    }
    
    return days
  }, [currentDate, firstDayOfWeek, daysInMonth])
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      if (direction === 'prev') {
        if (prev.month === 0) {
          return { year: prev.year - 1, month: 11 }
        } else {
          return { year: prev.year, month: prev.month - 1 }
        }
      } else {
        if (prev.month === 11) {
          return { year: prev.year + 1, month: 0 }
        } else {
          return { year: prev.year, month: prev.month + 1 }
        }
      }
    })
  }
  
  const formatDateKey = (date: {year: number, month: number, day: number}): string => {
    return `${date.year}-${String(date.month + 1).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
  }
  
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return ''
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    return `${hour12}:${(minutes || '00').padStart(2, '0')} ${ampm}`
  }

  const getEventTypeColor = (type: string | null): string => {
    switch (type) {
      case 'Interview': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'Reception': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Mixer': return 'bg-green-100 text-green-800 border-green-200'
      case 'Party': return 'bg-pink-100 text-pink-800 border-pink-200'
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
          {monthNames[currentDate.month]} {currentDate.year}
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
      <div className="overflow-x-auto">
      <div className="grid grid-cols-7 min-w-[500px]">
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
          const isCurrentMonth = date.isCurrentMonth
          const today = new Date()
          const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          const isToday = todayKey === dateKey
          
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
                {date.day}
              </div>
              
              {/* Events for this day */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event, eventIndex) => {
                  const isInterview = event.event_type === 'Interview'
                  const tentativeStyle = !event.confirmed ? 'border-dashed opacity-70' : ''
                  return (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={`text-xs px-2 py-1 rounded border cursor-pointer hover:opacity-80 transition-opacity ${getEventTypeColor(event.event_type)} ${tentativeStyle}`}
                  >
                    <div className="font-medium truncate">
                      {isInterview && <span className="mr-1">🎤</span>}
                      {event.title}
                    </div>
                    {event.start_time && (
                      <div className="text-xs opacity-75">{formatTime(event.start_time)}</div>
                    )}
                  </div>
                  )
                })}
                
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
      </div>

      {/* Legend */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center gap-x-4 gap-y-2 text-xs flex-wrap">
          <span className="font-medium text-gray-700">Event Types:</span>
          {['Interview', 'Reception', 'Mixer', 'Party', 'Awards'].map(type => (
            <div key={type} className="flex items-center">
              <div className={`w-3 h-3 rounded mr-1 ${getEventTypeColor(type).replace('text-', 'bg-').split(' ')[0]}`} />
              <span className="text-gray-600">{type === 'Interview' ? '🎤 Interview' : type}</span>
            </div>
          ))}
          <span className="text-gray-400 mx-1">|</span>
          <span className="flex items-center">
            <span className="w-4 h-3 bg-gray-200 border border-gray-400 border-dashed rounded inline-block mr-1 opacity-70"></span>
            <span className="text-gray-500">Tentative</span>
          </span>
          <span className="flex items-center">
            <span className="w-4 h-3 bg-gray-200 border border-gray-400 rounded inline-block mr-1"></span>
            <span className="text-gray-600">Confirmed</span>
          </span>
        </div>
      </div>

    </div>
  )
}