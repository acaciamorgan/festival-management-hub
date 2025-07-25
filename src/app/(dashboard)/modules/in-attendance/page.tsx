'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GuestCard, GuestType, GuestFilm } from '@/types'
import { GuestCardPopup } from '@/components/cards/guest-card-popup'
import { GuestFormModal } from '@/components/forms/guest-form-modal'
import { FilmCardPopup } from '@/components/cards/film-card-popup'
import { parseCSVContent, importGuestsFromCSV } from '@/lib/csv-import'

export default function InAttendancePage() {
  const [guests, setGuests] = useState<GuestCard[]>([])
  const [filteredGuests, setFilteredGuests] = useState<GuestCard[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGuestType, setSelectedGuestType] = useState('')
  const [confirmedFilter, setConfirmedFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [checkedInFilter, setCheckedInFilter] = useState<'all' | 'in' | 'out'>('all')
  const [arrangingTravelFilter, setArrangingTravelFilter] = useState('')
  const [todayDate, setTodayDate] = useState('')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'name', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [selectedGuest, setSelectedGuest] = useState<GuestCard | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showGuestCard, setShowGuestCard] = useState<GuestCard | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')

  const supabase = createClient()

  const loadGuests = useCallback(async () => {
    setLoading(true)
    try {
      // Load guests with their films
      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select('*')
        .order('name', { ascending: true })

      if (guestsError) throw guestsError

      // Load guest-film relationships
      const { data: guestFilmsData, error: filmsError } = await supabase
        .from('guest_films')
        .select('*')

      if (filmsError) throw filmsError

      // Combine guests with their films and create display string
      const guestsWithFilms = (guestsData || []).map(guest => {
        const guestFilms = (guestFilmsData || []).filter(gf => gf.guest_id === guest.id)
        
        const films_display = guestFilms.length > 0
          ? guestFilms.map(gf => gf.film_title).join(', ')
          : '—'

        return {
          ...guest,
          films: guestFilms,
          films_display
        }
      })

      setGuests(guestsWithFilms)
      setFilteredGuests(guestsWithFilms)
    } catch (error) {
      console.error('Error loading guests:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Get unique guest types for filtering
  const uniqueGuestTypes = useMemo(() => {
    const types = new Set<string>()
    guests.forEach(guest => {
      if (guest.guest_type) types.add(guest.guest_type)
    })
    return Array.from(types).sort()
  }, [guests])

  // Get unique arranging travel options for filtering
  const uniqueArrangingTravel = useMemo(() => {
    const options = new Set<string>()
    guests.forEach(guest => {
      if (guest.arranging_travel) options.add(guest.arranging_travel)
    })
    return Array.from(options).sort()
  }, [guests])

  // Smart sorting function (ignores articles and special characters)
  const normalizeForSort = (str: string | undefined | null): string => {
    if (!str) return ''
    return str
      .replace(/^(the|a|an)\\s+/i, '')
      .replace(/[^\\w\\s]/g, '')
      .toLowerCase()
      .trim()
  }

  // Filtering and sorting
  const applyFiltersAndSort = useMemo(() => {
    const filtered = guests.filter(guest => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const searchableText = [
          guest.name,
          guest.country,
          guest.role,
          guest.guest_type,
          guest.films_display,
          guest.hotel_name,
          guest.notes
        ].filter(Boolean).map(text => text?.toString().toLowerCase()).join(' ')
        
        if (!searchableText.includes(searchLower)) return false
      }

      // Guest type filter
      if (selectedGuestType && guest.guest_type !== selectedGuestType) {
        return false
      }

      // Confirmed filter
      if (confirmedFilter !== 'all') {
        if (confirmedFilter === 'yes' && !guest.confirmed) return false
        if (confirmedFilter === 'no' && guest.confirmed) return false
      }

      // Checked in filter
      if (checkedInFilter !== 'all') {
        if (checkedInFilter === 'in' && !guest.checked_in) return false
        if (checkedInFilter === 'out' && guest.checked_in) return false
      }

      // Arranging travel filter
      if (arrangingTravelFilter && guest.arranging_travel !== arrangingTravelFilter) {
        return false
      }

      // Today filter - show guests who arrive or depart on selected date
      if (todayDate) {
        const arrivalMatch = guest.arrival_date === todayDate
        const departureMatch = guest.departure_date === todayDate
        if (!arrivalMatch && !departureMatch) return false
      }

      return true
    })

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof GuestCard]
        const bVal = b[sortConfig.key as keyof GuestCard]
        
        const aNorm = normalizeForSort(aVal?.toString())
        const bNorm = normalizeForSort(bVal?.toString())
        
        if (aNorm < bNorm) return sortConfig.direction === 'asc' ? -1 : 1
        if (aNorm > bNorm) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [guests, searchTerm, selectedGuestType, confirmedFilter, checkedInFilter, arrangingTravelFilter, todayDate, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return { key, direction: 'asc' }
    })
  }

  const handleResize = (columnKey: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: width
    }))
  }

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString()
  }

  const formatArrivalInfo = (guest: GuestCard): string => {
    const parts = []
    if (guest.arrival_airline && guest.arrival_flight_number) {
      parts.push(`${guest.arrival_airline} ${guest.arrival_flight_number}`)
    }
    if (guest.inbound_arrival_time) {
      parts.push(`arrives ${guest.inbound_arrival_time}`)
    }
    if (guest.arrival_origin_airport) {
      parts.push(`from ${guest.arrival_origin_airport}`)
    }
    return parts.length > 0 ? parts.join(' ') : '—'
  }

  const formatDepartureInfo = (guest: GuestCard): string => {
    const parts = []
    if (guest.departure_airline && guest.departure_flight_number) {
      parts.push(`${guest.departure_airline} ${guest.departure_flight_number}`)
    }
    if (guest.outbound_departure_time) {
      parts.push(`departs ${guest.outbound_departure_time}`)
    }
    if (guest.destination_airport) {
      parts.push(`to ${guest.destination_airport}`)
    }
    return parts.length > 0 ? parts.join(' ') : '—'
  }

  const handleCheckInToggle = async (guestId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('guests')
        .update({ checked_in: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', guestId)

      if (error) throw error

      // Update local state
      setGuests(prev => prev.map(guest => 
        guest.id === guestId ? { ...guest, checked_in: !currentStatus } : guest
      ))
    } catch (error) {
      console.error('Error updating check-in status:', error)
      alert('Error updating check-in status')
    }
  }

  const [showFilmCard, setShowFilmCard] = useState<any>(null)

  const openFilmCard = async (filmTitle: string) => {
    try {
      // Try to find the film in feature_films first
      let { data: filmData, error } = await supabase
        .from('feature_films')
        .select('*')
        .eq('title', filmTitle)
        .maybeSingle()

      if (!filmData || error) {
        // If not found in feature films, try short films
        const { data: shortFilmData, error: shortError } = await supabase
          .from('short_films')
          .select('*')
          .eq('title', filmTitle)
          .maybeSingle()

        if (shortFilmData && !shortError) {
          filmData = shortFilmData
        }
      }

      if (filmData) {
        setShowFilmCard(filmData)
      } else {
        alert(`Film "${filmTitle}" not found in database`)
      }
    } catch (error) {
      console.error('Error fetching film:', error)
      alert('Error loading film details')
    }
  }

  const [allFilmTitles, setAllFilmTitles] = useState<string[]>([])

  // Load all film titles for smart parsing
  useEffect(() => {
    const loadFilmTitles = async () => {
      try {
        const [featureFilms, shortFilms] = await Promise.all([
          supabase.from('feature_films').select('title'),
          supabase.from('short_films').select('title')
        ])
        
        const titles = [
          ...(featureFilms.data || []).map(f => f.title),
          ...(shortFilms.data || []).map(f => f.title)
        ].filter(Boolean)
        
        setAllFilmTitles(titles)
      } catch (error) {
        console.error('Error loading film titles:', error)
      }
    }
    
    loadFilmTitles()
  }, [supabase])

  const smartParseFilmTitles = (filmsText: string): string[] => {
    if (!filmsText || filmsText === '—' || allFilmTitles.length === 0) {
      return []
    }

    // Sort film titles by length (longest first) to match longer titles first
    const sortedTitles = [...allFilmTitles].sort((a, b) => b.length - a.length)
    const foundTitles: string[] = []
    let remainingText = filmsText

    for (const title of sortedTitles) {
      if (remainingText.includes(title)) {
        foundTitles.push(title)
        // Remove the found title from the text
        remainingText = remainingText.replace(title, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
      }
    }

    return foundTitles
  }

  const renderFilmTitles = (filmsDisplay: string | undefined) => {
    if (!filmsDisplay || filmsDisplay === '—') {
      return <span className="text-gray-500">—</span>
    }
    
    // Use smart parsing to get actual film titles
    const filmTitles = smartParseFilmTitles(filmsDisplay)
    
    if (filmTitles.length === 0) {
      // Fallback to simple comma split if smart parsing finds nothing
      const simpleTitles = filmsDisplay.split(', ')
      return (
        <div className="flex flex-wrap gap-1">
          {simpleTitles.map((title, index) => (
            <span key={index}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openFilmCard(title.trim())
                }}
                className="text-blue-600 hover:text-blue-800 hover:underline text-left"
              >
                {title}
              </button>
              {index < simpleTitles.length - 1 && <span className="text-gray-400">, </span>}
            </span>
          ))}
        </div>
      )
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {filmTitles.map((title, index) => (
          <span key={index}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                openFilmCard(title.trim())
              }}
              className="text-blue-600 hover:text-blue-800 hover:underline text-left"
            >
              {title}
            </button>
            {index < filmTitles.length - 1 && <span className="text-gray-400">, </span>}
          </span>
        ))}
      </div>
    )
  }

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadStatus('Reading CSV file...')

    try {
      const csvContent = await file.text()
      setUploadStatus('Parsing CSV data...')
      
      const csvRows = await parseCSVContent(csvContent)
      setUploadStatus(`Processing ${csvRows.length} rows...`)
      
      const result = await importGuestsFromCSV(csvRows)
      
      if (result.success) {
        setUploadStatus(`Successfully imported ${result.importedGuests} guests!`)
        await loadGuests() // Reload the guests list
        
        if (result.warnings.length > 0) {
          console.warn('Import warnings:', result.warnings)
          alert(`Import completed with ${result.warnings.length} warnings. Check console for details.`)
        }
      } else {
        setUploadStatus('Import failed')
        alert(`Import failed with errors:\n${result.errors.join('\n')}`)
      }
    } catch (error) {
      console.error('CSV import error:', error)
      setUploadStatus('Import failed')
      alert('Error importing CSV file. Please check the file format.')
    } finally {
      setUploading(false)
      // Clear the file input
      event.target.value = ''
      // Clear status after a delay
      setTimeout(() => setUploadStatus(''), 3000)
    }
  }

  useEffect(() => {
    setFilteredGuests(applyFiltersAndSort)
  }, [applyFiltersAndSort])

  useEffect(() => {
    loadGuests()
  }, [loadGuests])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">👥</span>
            <h1 className="text-2xl font-semibold text-gray-900">In Attendance</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Add Guest
            </button>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <button
                disabled={uploading}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
              >
                {uploading ? 'Importing...' : 'Import CSV'}
              </button>
            </div>
            {uploadStatus && (
              <span className="text-sm text-gray-600">{uploadStatus}</span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search guests, films, hotels..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Guest Type Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Type:</label>
              <select
                value={selectedGuestType}
                onChange={(e) => setSelectedGuestType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                {uniqueGuestTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Confirmed Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Confirmed:</label>
              <select
                value={confirmedFilter}
                onChange={(e) => setConfirmedFilter(e.target.value as 'all' | 'yes' | 'no')}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Check-in Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Checked In:</label>
              <select
                value={checkedInFilter}
                onChange={(e) => setCheckedInFilter(e.target.value as 'all' | 'in' | 'out')}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="in">Checked In</option>
                <option value="out">Not Checked In</option>
              </select>
            </div>

            {/* Arranging Travel Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Travel:</label>
              <select
                value={arrangingTravelFilter}
                onChange={(e) => setArrangingTravelFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                {uniqueArrangingTravel.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* Today Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Today:</label>
              <input
                type="date"
                value={todayDate}
                onChange={(e) => setTodayDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Clear Filters */}
            {(searchTerm || selectedGuestType || confirmedFilter !== 'all' || checkedInFilter !== 'all' || arrangingTravelFilter || todayDate) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedGuestType('')
                  setConfirmedFilter('all')
                  setCheckedInFilter('all')
                  setArrangingTravelFilter('')
                  setTodayDate('')
                }}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-gray-50 px-6 py-2 text-sm text-gray-600 border-b border-gray-200">
        Showing {filteredGuests.length} of {guests.length} guests
        {searchTerm && ` for "${searchTerm}"`}
        {selectedGuestType && ` (${selectedGuestType})`}
        {todayDate && ` on ${formatDate(todayDate)}`}
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden bg-white">
        <div className="overflow-x-auto overflow-y-auto h-full">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-500">Loading guests...</div>
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {[
                  { key: 'checked_in', label: 'Checked In', width: 80, sortable: true },
                  { key: 'name', label: 'Name', width: 150, sortable: true },
                  { key: 'role', label: 'Role', width: 120, sortable: false },
                  { key: 'films_display', label: 'Film / Program Titles', width: 200, sortable: false },
                  { key: 'guest_type', label: 'Type', width: 80, sortable: true },
                  { key: 'arranging_travel', label: 'Travel', width: 80, sortable: true },
                  { key: 'country', label: 'Country', width: 100, sortable: true },
                  { key: 'arrival_date', label: 'Arrival Date', width: 100, sortable: true },
                  { key: 'arrival_airline', label: 'Arrival Airline', width: 100, sortable: false },
                  { key: 'arrival_flight_number', label: 'Flight #', width: 80, sortable: false },
                  { key: 'inbound_departure_time', label: 'Depart Time', width: 100, sortable: false },
                  { key: 'arrival_origin_airport', label: 'Origin', width: 80, sortable: false },
                  { key: 'arrival_airport', label: 'Arrival Airport', width: 100, sortable: false },
                  { key: 'inbound_arrival_time', label: 'Arrive Time', width: 100, sortable: false },
                  { key: 'departure_date', label: 'Departure Date', width: 100, sortable: true },
                  { key: 'outbound_departure_time', label: 'Depart Time', width: 100, sortable: false },
                  { key: 'departure_airline', label: 'Departure Airline', width: 100, sortable: false },
                  { key: 'departure_flight_number', label: 'Flight #', width: 80, sortable: false },
                  { key: 'departure_airport', label: 'Departure Airport', width: 100, sortable: false },
                  { key: 'destination_airport', label: 'Destination', width: 100, sortable: false },
                  { key: 'outbound_arrival_time', label: 'Arrive Time', width: 100, sortable: false },
                  { key: 'hotel_name', label: 'Hotel', width: 120, sortable: false },
                  { key: 'confirmed', label: 'Confirmed', width: 80, sortable: true },
                  { key: 'notes', label: 'Notes', width: 200, sortable: false }
                ].map((column) => (
                  <th
                    key={column.key}
                    className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 relative ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    style={{ 
                      width: columnWidths[column.key] || column.width,
                      minWidth: '100px'
                    }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <span className="ml-2">
                          {sortConfig?.key === column.key ? (
                            sortConfig.direction === 'asc' ? '↑' : '↓'
                          ) : '↕️'}
                        </span>
                      )}
                    </div>
                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        
                        const startX = e.pageX
                        const startWidth = columnWidths[column.key] || column.width || 150

                        const handleMouseMove = (e: MouseEvent) => {
                          e.preventDefault()
                          const newWidth = Math.max(100, startWidth + (e.pageX - startX))
                          handleResize(column.key, newWidth)
                        }

                        const handleMouseUp = (e: MouseEvent) => {
                          e.preventDefault()
                          document.removeEventListener('mousemove', handleMouseMove)
                          document.removeEventListener('mouseup', handleMouseUp)
                        }

                        document.addEventListener('mousemove', handleMouseMove)
                        document.addEventListener('mouseup', handleMouseUp)
                      }}
                    />
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGuests.map((guest) => (
                <tr
                  key={guest.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setShowGuestCard(guest)}
                >
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center" style={{ minWidth: `${columnWidths['checked_in'] || 80}px` }}>
                    <input
                      type="checkbox"
                      checked={guest.checked_in}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleCheckInToggle(guest.id, guest.checked_in)
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['name'] || 150}px` }}>
                    {guest.name}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['role'] || 120}px` }}>
                    {guest.role || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['films_display'] || 200}px` }}>
                    {renderFilmTitles(guest.films_display)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['guest_type'] || 100}px` }}>
                    {guest.guest_type}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['arranging_travel'] || 80}px` }}>
                    {guest.arranging_travel || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['country'] || 100}px` }}>
                    {guest.country || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['arrival_date'] || 100}px` }}>
                    {formatDate(guest.arrival_date)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['arrival_airline'] || 100}px` }}>
                    {guest.arrival_airline || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['arrival_flight_number'] || 80}px` }}>
                    {guest.arrival_flight_number || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['inbound_departure_time'] || 100}px` }}>
                    {guest.inbound_departure_time || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['arrival_origin_airport'] || 80}px` }}>
                    {guest.arrival_origin_airport || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['arrival_airport'] || 100}px` }}>
                    {guest.arrival_airport || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['inbound_arrival_time'] || 100}px` }}>
                    {guest.inbound_arrival_time || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['departure_date'] || 100}px` }}>
                    {formatDate(guest.departure_date)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['outbound_departure_time'] || 100}px` }}>
                    {guest.outbound_departure_time || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['departure_airline'] || 100}px` }}>
                    {guest.departure_airline || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['departure_flight_number'] || 80}px` }}>
                    {guest.departure_flight_number || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['departure_airport'] || 100}px` }}>
                    {guest.departure_airport || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['destination_airport'] || 100}px` }}>
                    {guest.destination_airport || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['outbound_arrival_time'] || 100}px` }}>
                    {guest.outbound_arrival_time || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['hotel_name'] || 120}px` }}>
                    {guest.hotel_name || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 border-r border-gray-100" style={{ minWidth: `${columnWidths['notes'] || 200}px` }}>
                    <div className="text-xs truncate" title={guest.notes || ''}>{guest.notes || '—'}</div>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['confirmed'] || 80}px` }}>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      guest.confirmed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {guest.confirmed ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedGuest(guest)
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-xs font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {!loading && filteredGuests.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {guests.length === 0 ? 'No guests found. Add your first guest or import from CSV!' : 'No guests match your search criteria.'}
          </div>
        )}
        </div>
      </div>

      {/* Guest Form Modal */}
      <GuestFormModal
        guest={showAddModal ? null : selectedGuest}
        isOpen={showAddModal || !!selectedGuest}
        onClose={() => {
          setShowAddModal(false)
          setSelectedGuest(null)
        }}
        onSave={(savedGuest) => {
          if (selectedGuest) {
            // Update existing guest in list
            setGuests(prev => 
              prev.map(g => g.id === savedGuest.id ? savedGuest : g)
            )
          } else {
            // Add new guest to list
            setGuests(prev => [savedGuest, ...prev])
          }
          setShowAddModal(false)
          setSelectedGuest(null)
        }}
      />

      {/* Guest Card Popup */}
      {showGuestCard && (
        <GuestCardPopup
          guest={showGuestCard}
          onClose={() => setShowGuestCard(null)}
          onUpdate={(updatedGuest) => {
            setGuests(prev => 
              prev.map(g => g.id === updatedGuest.id ? updatedGuest : g)
            )
            setShowGuestCard(null)
          }}
          onDelete={(guestId) => {
            setGuests(prev => prev.filter(g => g.id !== guestId))
            setShowGuestCard(null)
          }}
        />
      )}

      {/* Film Card Popup */}
      {showFilmCard && (
        <FilmCardPopup
          film={showFilmCard}
          onClose={() => setShowFilmCard(null)}
        />
      )}
    </div>
  )
}