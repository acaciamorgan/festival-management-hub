'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { SpecialEventCard } from '@/types'
import { SpecialEventFormModal } from '@/components/forms/special-event-form-modal'
import { SpecialEventsCalendar } from '@/components/calendar/special-events-calendar'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'
import * as XLSX from 'xlsx-js-style'

export default function SpecialEventsPage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const [specialEvents, setSpecialEvents] = useState<SpecialEventCard[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'event_date', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<SpecialEventCard | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid')
  
  // Filter states
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [openPressFilter, setOpenPressFilter] = useState<string>('all')
  const [photographyFilter, setPhotographyFilter] = useState<string>('all')
  
  // Calendar venue filter
  const [selectedVenues, setSelectedVenues] = useState<string[]>(['all'])
  const [availableVenues, setAvailableVenues] = useState<{id: string, name: string}[]>([])

  const supabase = createClient()

  // Check if user has edit permissions for special events
  const canEditSpecialEvents = permissions?.modulePermissions?.['specialEvents']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false

  // Export template function for Special Events
  const exportSpecialEventsTemplate = () => {
    // Define headers with proper display names (21 columns total)
    const headerMapping = [
      { field: 'event_date', display: 'Date' },
      { field: 'title', display: 'Event' },
      { field: 'event_type', display: 'Event Type' },
      { field: 'films_programs_display', display: 'Films/Programs Associated' },
      { field: 'guests_display', display: 'Guests Associated' },
      { field: 'access_time', display: 'Access Time' },
      { field: 'start_time', display: 'Start Time' },
      { field: 'end_time', display: 'End Time' },
      { field: 'venue_name', display: 'Location' },
      { field: 'lead_staff', display: 'Lead Staff' },
      { field: 'invited_tags', display: 'Invited' },
      { field: 'number_expected', display: 'Number Expected' },
      { field: 'beverages', display: 'Beverages' },
      { field: 'bartender', display: 'Bartender' },
      { field: 'food', display: 'Food' },
      { field: 'caterer', display: 'Caterer' },
      { field: 'photography', display: 'Photography' },
      { field: 'notes', display: 'Notes' },
      { field: 'open_press', display: 'Open Press' },
      { field: 'actual_attendance', display: 'Actual Attendance' },
      { field: 'rsvps', display: 'RSVPs' }
    ]
    
    const headers = headerMapping.map(h => h.display)
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers])
    
    // Style headers - bold with light grey background
    const headerStyle = { 
      font: { bold: true, sz: 12, name: 'Arial' }, 
      fill: { patternType: "solid", fgColor: { rgb: "E8E8E8" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } }
      }
    }
    
    // Apply styles and set column widths based on header length
    const cols: any[] = []
    headers.forEach((header, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: index })
      if (!ws[cellRef]) ws[cellRef] = {}
      ws[cellRef].s = headerStyle
      
      // Calculate column width based on header length (min 15, max 30)
      cols.push({ wch: Math.min(Math.max(header.length + 2, 15), 30) })
    })
    
    ws['!cols'] = cols
    
    // Freeze the header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    
    XLSX.utils.book_append_sheet(wb, ws, 'Special Events Template')
    XLSX.writeFile(wb, 'special_events_import_template.xlsx')
  }

  // CSV parsing function
  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = []
    let currentRow: string[] = []
    let currentField = ''
    let inQuotes = false
    let i = 0

    while (i < text.length) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"'
          i += 2
          continue
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        currentRow.push(currentField.trim())
        currentField = ''
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        // Row separator
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField.trim())
          if (currentRow.some(field => field.length > 0)) {
            rows.push(currentRow)
          }
          currentRow = []
          currentField = ''
        }
      } else {
        currentField += char
      }
      i++
    }

    // Handle last row
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim())
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow)
      }
    }

    return rows
  }

  // CSV upload handler
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadStatus('Processing CSV...')

    try {
      const text = await file.text()
      const rows = parseCSV(text)
      
      if (rows.length === 0) {
        setUploadStatus('Error: CSV file is empty')
        return
      }

      const headers = rows[0]
      
      // Field mapping for Special Events CSV
      const fieldMap: Record<string, string> = {
        'Date': 'event_date',
        'Event': 'title',
        'Event Type': 'event_type',
        'Films/Programs Associated': 'films_programs_display',
        'Guests Associated': 'guests_display',
        'Access Time': 'access_time',
        'Start Time': 'start_time',
        'End Time': 'end_time',
        'Location': 'venue_name',
        'Lead Staff': 'lead_staff',
        'Invited': 'invited_tags',
        'Number Expected': 'number_expected',
        'Beverages': 'beverages',
        'Bartender': 'bartender',
        'Food': 'food',
        'Caterer': 'caterer',
        'Photography': 'photography',
        'Notes': 'notes',
        'Open Press': 'open_press',
        'Actual Attendance': 'actual_attendance',
        'RSVPs': 'rsvps'
      }

      // Process data rows
      const eventData = []
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        const eventRecord: any = {}
        
        headers.forEach((header, index) => {
          const fieldName = fieldMap[header]
          if (fieldName && row[index]) {
            let value = row[index].trim()
            
            // Handle boolean fields
            if (['open_press', 'photography'].includes(fieldName)) {
              value = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' || value === '1'
            }
            // Handle numeric fields
            else if (['number_expected', 'actual_attendance', 'rsvps'].includes(fieldName)) {
              const numValue = parseInt(value)
              if (!isNaN(numValue)) {
                value = numValue
              }
            }
            // Handle date field
            else if (fieldName === 'event_date') {
              // Parse date strings directly without timezone conversion
              if (value && typeof value === 'string') {
                // Handle MM/DD/YYYY format
                if (value.includes('/')) {
                  const parts = value.split('/')
                  if (parts.length === 3) {
                    const month = parts[0].padStart(2, '0')
                    const day = parts[1].padStart(2, '0')
                    const year = parts[2].length === 2 ? '20' + parts[2] : parts[2]
                    value = `${year}-${month}-${day}`
                  }
                }
                // Handle other formats by preserving as-is if already YYYY-MM-DD
                else if (value.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
                  const [year, month, day] = value.split('-')
                  value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                }
              }
            }
            
            eventRecord[fieldName] = value
          }
        })
        
        // Only add if we have required fields
        if (eventRecord.title) {
          eventData.push(eventRecord)
        }
      }

      if (eventData.length === 0) {
        setUploadStatus('Error: No valid event data found in CSV')
        return
      }

      setUploadStatus(`Uploading ${eventData.length} events...`)

      // Insert events into database
      const { error } = await supabase
        .from('special_events')
        .insert(eventData)

      if (error) {
        console.error('Upload error:', error)
        setUploadStatus(`Error: ${error.message}`)
        return
      }

      setUploadStatus(`Successfully uploaded ${eventData.length} special events!`)
      
      // Reload the events
      loadSpecialEvents()

    } catch (error) {
      console.error('CSV processing error:', error)
      setUploadStatus('Error: Failed to process CSV file')
    } finally {
      setUploading(false)
      // Clear the file input
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const loadSpecialEvents = useCallback(async () => {
    setLoading(true)
    try {
      // Load special events and venues
      const [eventsResult, venuesResult] = await Promise.all([
        supabase
          .from('special_events')
          .select(`
            *,
            venues(name, address)
          `)
          .order('event_date', { ascending: true }),
        supabase
          .from('venues')
          .select('id, name')
          .order('name')
      ])

      if (eventsResult.error) throw eventsResult.error
      if (venuesResult.error) throw venuesResult.error

      const eventsWithDetails = (eventsResult.data || []).map(event => ({
        ...event,
        venue_name: event.venues?.name || null,
        venue_address: event.venues?.address || null
      }))

      setSpecialEvents(eventsWithDetails)
      setAvailableVenues(venuesResult.data || [])
    } catch (error) {
      console.error('Error loading special events:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadSpecialEvents()
  }, [loadSpecialEvents])

  // Filter and search logic
  const filteredEvents = useMemo(() => {
    if (!specialEvents || specialEvents.length === 0) {
      return []
    }
    
    return specialEvents.filter(event => {
      // Search filter
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<SpecialEventCard>(
          searchTerm,
          (event) => [
            event.title,
            event.event_type,
            event.venue_name,
            event.lead_staff,
            event.invited_tags,
            event.films_programs_display,
            event.guests_display,
            event.notes
          ]
        )
        if (!searchFilter(event)) return false
      }
      
      // Event type filter
      if (eventTypeFilter !== 'all' && event.event_type !== eventTypeFilter) {
        return false
      }
      
      // Location filter
      if (locationFilter !== 'all') {
        if (locationFilter === 'no-location') {
          if (event.venue_name) return false
        } else if (event.venue_name !== locationFilter) {
          return false
        }
      }
      
      // Open press filter
      if (openPressFilter !== 'all' && event.open_press !== openPressFilter) {
        return false
      }
      
      // Photography filter
      if (photographyFilter !== 'all') {
        const hasPhotography = event.photography && event.photography.trim() !== ''
        if (photographyFilter === 'yes' && !hasPhotography) return false
        if (photographyFilter === 'no' && hasPhotography) return false
      }
      
      // Calendar venue filter (only applies in calendar view)
      if (viewMode === 'calendar' && !selectedVenues.includes('all')) {
        if (!event.venue_name || !selectedVenues.includes(event.venue_name)) {
          return false
        }
      }
      
      return true
    })
  }, [specialEvents, searchTerm, eventTypeFilter, locationFilter, openPressFilter, photographyFilter, viewMode, selectedVenues])

  // Sort logic
  const sortedEvents = useMemo(() => {
    if (!sortConfig) return filteredEvents

    return [...filteredEvents].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof SpecialEventCard]
      const bValue = b[sortConfig.key as keyof SpecialEventCard]
      
      if (aValue === null && bValue === null) return 0
      if (aValue === null) return 1
      if (bValue === null) return -1
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredEvents, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return '↕️'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const handleAddEvent = () => {
    setEditingEvent(null)
    setShowAddModal(true)
  }

  const handleEditEvent = (event: SpecialEventCard) => {
    setEditingEvent(event)
    setShowAddModal(true)
  }

  const handleDeleteEvent = async (event: SpecialEventCard) => {
    if (!confirm(`Are you sure you want to delete "${event.title}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('special_events')
        .delete()
        .eq('id', event.id)

      if (error) {
        console.error('Error deleting event:', error)
        alert('Error deleting event')
      } else {
        loadSpecialEvents()
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Error deleting event')
    }
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—'
    // Parse date string directly without timezone conversion
    if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-').map(Number)
      
      // Use Zeller's congruence to calculate day of week
      let zYear = year
      let zMonth = month
      if (zMonth < 3) {
        zMonth += 12
        zYear -= 1
      }
      
      const k = zYear % 100
      const j = Math.floor(zYear / 100)
      let h = (day + Math.floor((13 * (zMonth + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
      if (h < 0) h += 7
      
      const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      const dayName = dayNames[h]
      
      return `${dayName}, ${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`
    }
    return dateString
  }

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '—'
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${ampm}`
  }

  const handleRSVPAction = (event: SpecialEventCard, action: 'share' | 'view') => {
    if (action === 'share' && event.rsvp_responder_link) {
      navigator.clipboard.writeText(event.rsvp_responder_link)
      // TODO: Show toast notification
    } else if (action === 'view' && event.rsvp_response_link) {
      window.open(event.rsvp_response_link, '_blank')
    }
  }

  // Filter helper functions
  const clearAllFilters = () => {
    setEventTypeFilter('all')
    setLocationFilter('all')
    setOpenPressFilter('all')
    setPhotographyFilter('all')
    setSearchTerm('')
  }

  const hasActiveFilters = () => {
    return eventTypeFilter !== 'all' || 
           locationFilter !== 'all' || 
           openPressFilter !== 'all' || 
           photographyFilter !== 'all' || 
           searchTerm !== ''
  }

  // Calendar venue filter helpers
  const toggleVenue = (venueName: string) => {
    if (venueName === 'all') {
      setSelectedVenues(['all'])
    } else {
      setSelectedVenues(prev => {
        const newVenues = prev.filter(v => v !== 'all')
        if (newVenues.includes(venueName)) {
          const filtered = newVenues.filter(v => v !== venueName)
          return filtered.length === 0 ? ['all'] : filtered
        } else {
          return [...newVenues, venueName]
        }
      })
    }
  }

  const removeVenue = (venueName: string) => {
    if (venueName === 'all') return
    setSelectedVenues(prev => {
      const filtered = prev.filter(v => v !== venueName && v !== 'all')
      return filtered.length === 0 ? ['all'] : filtered
    })
  }

  // Get unique venue names from events
  const eventVenues = useMemo(() => {
    const venues = specialEvents
      .map(event => event.venue_name)
      .filter((venue, index, arr) => venue && arr.indexOf(venue) === index)
      .sort()
    return venues
  }, [specialEvents])

  // Inline edit functions
  const updateEventField = async (eventId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('special_events')
        .update({ [field]: value, updated_at: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0') + ':' + String(new Date().getSeconds()).padStart(2, '0') })
        .eq('id', eventId)

      if (error) throw error

      // Update local state
      setSpecialEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, [field]: value } : event
      ))
    } catch (error) {
      console.error('Error updating event:', error)
      alert('Error updating event. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading special events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✨</span>
            <h1 className="text-2xl font-semibold text-gray-900">Special Events</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {canEditSpecialEvents && (
              <>
                <button
                  onClick={exportSpecialEventsTemplate}
                  className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
                >
                  📄 Create Special Events Template
                </button>
                <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer transition-colors font-medium">
                  {uploading ? 'Uploading...' : '📂 Upload CSV'}
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </>
            )}
            {canEditSpecialEvents && (
              <button
                onClick={handleAddEvent}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Add Event
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upload Status */}
      {uploadStatus && (
        <div className="px-6">
          <div className={`mt-3 p-3 rounded-md ${
            uploadStatus.includes('Error') 
              ? 'bg-red-100 text-red-700 border border-red-200'
              : uploadStatus.includes('Successfully')
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {uploadStatus}
          </div>
        </div>
      )}

      {/* Filters and View Toggle */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 space-y-4">
        {/* First Row: Search and View Toggle */}
        <div className="flex items-center space-x-4">
          {viewMode === 'grid' && (
            <>
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </>
          )}
          
          {/* View Toggle - Always visible */}
          <div className={`flex bg-gray-100 rounded-md p-1 ${viewMode === 'calendar' ? 'ml-auto' : ''}`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm font-medium rounded ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 text-sm font-medium rounded ${
                viewMode === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>

        {/* Second Row: Quick Filters (Grid) or Venue Filters (Calendar) */}
        {viewMode === 'grid' ? (
          <div className="flex items-center space-x-4 flex-wrap">
            {/* Event Type Filter */}
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Event Types</option>
              <option value="Reception">Reception</option>
              <option value="Mixer">Mixer</option>
              <option value="Party">Party</option>
              <option value="Awards">Awards</option>
            </select>

            {/* Location Filter */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Locations</option>
              <option value="no-location">No Location Set</option>
              {eventVenues.map(venue => (
                <option key={venue} value={venue}>{venue}</option>
              ))}
            </select>

            {/* Open Press Filter */}
            <select
              value={openPressFilter}
              onChange={(e) => setOpenPressFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Press Access</option>
              <option value="Yes">Open Press</option>
              <option value="No">Closed Press</option>
              <option value="Limited">Limited Press</option>
            </select>

            {/* Photography Filter */}
            <select
              value={photographyFilter}
              onChange={(e) => setPhotographyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Photography</option>
              <option value="yes">Has Photography</option>
              <option value="no">No Photography</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilters() && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          /* Calendar Venue Filter */
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Filter by venues:</span>
            
            {/* Active venue chips */}
            {selectedVenues.includes('all') ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                All Venues
                <button
                  onClick={() => setSelectedVenues([])}
                  className="ml-2 hover:text-blue-600"
                >
                  ×
                </button>
              </span>
            ) : (
              <>
                {selectedVenues.map(venue => (
                  <span key={venue} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    {venue}
                    <button
                      onClick={() => removeVenue(venue)}
                      className="ml-2 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
                
                {/* Add venue dropdown */}
                <select
                  value=""
                  onChange={(e) => e.target.value && toggleVenue(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                >
                  <option value="">+ Add Venue</option>
                  <option value="all">All Venues</option>
                  {eventVenues.filter(venue => !selectedVenues.includes(venue)).map(venue => (
                    <option key={venue} value={venue}>{venue}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6">
        {viewMode === 'grid' ? (
          <>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)]">
                <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {[
                    { key: 'event_date', label: 'Date', width: 150, sortable: true },
                    { key: 'title', label: 'Event', width: 200, sortable: true },
                    { key: 'event_type', label: 'Event Type', width: 120, sortable: true },
                    { key: 'films_programs_display', label: 'Films/Programs Associated', width: 250, sortable: false },
                    { key: 'guests_display', label: 'Guests Associated', width: 200, sortable: false },
                    { key: 'access_time', label: 'Access Time', width: 100, sortable: false },
                    { key: 'start_time', label: 'Start Time', width: 100, sortable: false },
                    { key: 'end_time', label: 'End Time', width: 100, sortable: false },
                    { key: 'venue_name', label: 'Location', width: 150, sortable: true },
                    { key: 'lead_staff', label: 'Lead Staff', width: 120, sortable: true },
                    { key: 'invited_tags', label: 'Invited', width: 150, sortable: false },
                    { key: 'number_expected', label: 'Number Expected', width: 130, sortable: false },
                    { key: 'beverages', label: 'Beverages', width: 120, sortable: false },
                    { key: 'bartender', label: 'Bartender', width: 120, sortable: false },
                    { key: 'food', label: 'Food', width: 120, sortable: false },
                    { key: 'caterer', label: 'Caterer', width: 120, sortable: false },
                    { key: 'photography', label: 'Photography', width: 120, sortable: false },
                    { key: 'notes', label: 'Notes', width: 200, sortable: false },
                    { key: 'open_press', label: 'Open Press', width: 100, sortable: false },
                    { key: 'actual_attendance', label: 'Actual Attendance', width: 130, sortable: false },
                    { key: 'rsvps', label: 'RSVPs', width: 120, sortable: false },
                    { key: 'actions', label: 'Actions', width: 100, sortable: false }
                  ].map((column) => (
                    <th
                      key={column.key}
                      className={`relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 ${
                        column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                      }`}
                      style={{ minWidth: `${columnWidths[column.key] || column.width}px` }}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{column.label}</span>
                        {column.sortable && (
                          <span className="text-gray-400 ml-1">
                            {getSortIcon(column.key)}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    {/* Date */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['event_date'] || 150}px` }}>
                      {formatDate(event.event_date)}
                    </td>
                    
                    {/* Event (Title) */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 font-medium" style={{ minWidth: `${columnWidths['title'] || 200}px` }}>
                      {event.title}
                    </td>
                    
                    {/* Event Type */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['event_type'] || 120}px` }}>
                      {event.event_type || '—'}
                    </td>
                    
                    {/* Films/Programs Associated */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['films_programs_display'] || 250}px` }}>
                      {event.films_programs_display || '—'}
                    </td>
                    
                    {/* Guests Associated */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['guests_display'] || 200}px` }}>
                      {event.guests_display || '—'}
                    </td>
                    
                    {/* Access Time */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['access_time'] || 100}px` }}>
                      {formatTime(event.access_time)}
                    </td>
                    
                    {/* Start Time */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['start_time'] || 100}px` }}>
                      {formatTime(event.start_time)}
                    </td>
                    
                    {/* End Time */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['end_time'] || 100}px` }}>
                      {formatTime(event.end_time)}
                    </td>
                    
                    {/* Location */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['venue_name'] || 150}px` }}>
                      <div>
                        {event.venue_name && <div>{event.venue_name}</div>}
                        {event.location_details && <div className="text-xs text-gray-500">{event.location_details}</div>}
                        {!event.venue_name && !event.location_details && '—'}
                      </div>
                    </td>
                    
                    {/* Lead Staff */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['lead_staff'] || 120}px` }}>
                      {event.lead_staff || '—'}
                    </td>
                    
                    {/* Invited */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['invited_tags'] || 150}px` }}>
                      {event.invited_tags && (
                        <div className="flex flex-wrap gap-1">
                          {event.invited_tags.split(',').map((tag, index) => (
                            <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                      {!event.invited_tags && '—'}
                    </td>
                    
                    {/* Number Expected */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['number_expected'] || 130}px` }}>
                      {event.number_expected || '—'}
                    </td>
                    
                    {/* Beverages */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['beverages'] || 120}px` }}>
                      {event.beverages || '—'}
                    </td>
                    
                    {/* Bartender */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['bartender'] || 120}px` }}>
                      {event.bartender || '—'}
                    </td>
                    
                    {/* Food */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['food'] || 120}px` }}>
                      {event.food || '—'}
                    </td>
                    
                    {/* Caterer */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['caterer'] || 120}px` }}>
                      {event.caterer || '—'}
                    </td>
                    
                    {/* Photography */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['photography'] || 120}px` }}>
                      {event.photography || '—'}
                    </td>
                    
                    {/* Notes */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['notes'] || 200}px` }}>
                      {event.notes && (
                        <div className="truncate" title={event.notes}>
                          {event.notes}
                        </div>
                      )}
                      {!event.notes && '—'}
                    </td>
                    
                    {/* Open Press */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center" style={{ minWidth: `${columnWidths['open_press'] || 100}px` }}>
                      <input
                        type="checkbox"
                        checked={event.open_press === 'Yes'}
                        onChange={(e) => updateEventField(event.id, 'open_press', e.target.checked ? 'Yes' : 'No')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        title={`Open Press: ${event.open_press === 'Yes' ? 'Yes' : 'No'}`}
                      />
                    </td>
                    
                    {/* Actual Attendance */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['actual_attendance'] || 130}px` }}>
                      {event.actual_attendance || '—'}
                    </td>
                    
                    {/* RSVPs */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['rsvps'] || 120}px` }}>
                      <div className="flex flex-col gap-1">
                        {event.rsvp_responder_link && (
                          <button
                            onClick={() => handleRSVPAction(event, 'share')}
                            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                            title="Copy Invite Link"
                          >
                            Share Invite
                          </button>
                        )}
                        {event.rsvp_response_link && (
                          <button
                            onClick={() => handleRSVPAction(event, 'view')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                            title="View RSVPs"
                          >
                            View RSVPs
                          </button>
                        )}
                        {!event.rsvp_responder_link && !event.rsvp_response_link && '—'}
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 py-2 text-sm text-gray-900" style={{ minWidth: `${columnWidths['actions'] || 100}px` }}>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event)}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
                </table>
              </div>
            </div>

            {sortedEvents.length === 0 && !loading && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden mt-4">
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-4">✨</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No special events found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first special event'}
                  </p>
                  <button
                    onClick={handleAddEvent}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Add Event
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Calendar View */
          <SpecialEventsCalendar
            events={filteredEvents}
            onEventClick={handleEditEvent}
          />
        )}
      </div>

      {/* Special Event Form Modal */}
      <SpecialEventFormModal
        event={editingEvent}
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditingEvent(null)
        }}
        onSave={() => {
          setShowAddModal(false)
          setEditingEvent(null)
          loadSpecialEvents()
        }}
      />
    </div>
  )
}