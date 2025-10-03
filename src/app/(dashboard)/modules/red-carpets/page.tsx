'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { RedCarpetFormModal } from '@/components/forms/red-carpet-form-modal'
import { FilmCardPopup } from '@/components/cards/film-card-popup'
import { GuestCardPopup } from '@/components/cards/guest-card-popup'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'
import * as XLSX from 'xlsx-js-style'

interface RedCarpet {
  id: string
  film_program_display: string // Complete display string including free text
  subjects_display: string // Complete display string including free text
  venue_id: string | null
  venue_name: string | null
  house: string | null
  carpet_date: string | null
  call_time: string | null
  carpet_start_time: string | null
  film_program_start_time: string | null
  rsvp_form_url: string | null
  rsvp_responses_url: string | null
  run_of_show_url: string | null
  created_at: string
  updated_at: string
  created_by: string
}

interface RedCarpetFormData {
  film_program_titles: string
  subjects: string
  venue_id: string
  carpet_date: string
  call_time: string
  carpet_start_time: string
  film_program_start_time: string
  rsvp_form_url: string
  rsvp_responses_url: string
  run_of_show_url: string
}

interface GroupedRedCarpetEvent {
  eventKey: string
  carpet_date: string | null
  carpet_start_time: string | null
  venue_name: string | null
  house: string | null
  rsvp_form_url: string | null
  rsvp_responses_url: string | null
  run_of_show_url: string | null
  films: {
    title: string
    subjects: string[]
  }[]
  rawEvents: RedCarpet[]
}

export default function RedCarpetsPage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const [redCarpets, setRedCarpets] = useState<RedCarpet[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCarpet, setSelectedCarpet] = useState<RedCarpet | null>(null)
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'carpet_date', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [showFilmCard, setShowFilmCard] = useState<any>(null)
  const [showGuestCard, setShowGuestCard] = useState<any>(null)
  const [existingFilms, setExistingFilms] = useState<Set<string>>(new Set())
  const [existingGuests, setExistingGuests] = useState<Set<string>>(new Set())

  const supabase = createClient()

  // Check if user has edit permissions for red carpets
  const canEditRedCarpets = permissions?.modulePermissions?.['redCarpets']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false

  // Export template function for Red Carpets
  const exportRedCarpetsTemplate = () => {
    // Define headers with proper display names
    const headerMapping = [
      { field: 'film_program_display', display: 'Film/Program' },
      { field: 'subjects_display', display: 'Subjects' },
      { field: 'venue_name', display: 'Venue' },
      { field: 'house', display: 'House' },
      { field: 'carpet_date', display: 'Carpet Date' },
      { field: 'call_time', display: 'Call Time' },
      { field: 'carpet_start_time', display: 'Carpet Start Time' },
      { field: 'film_program_start_time', display: 'Film/Program Start Time' },
      { field: 'rsvp_form_url', display: 'RSVP Form URL' },
      { field: 'rsvp_responses_url', display: 'RSVP Responses URL' }
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
    
    XLSX.utils.book_append_sheet(wb, ws, 'Red Carpets Template')
    XLSX.writeFile(wb, 'red_carpets_import_template.xlsx')
  }

  const loadRedCarpets = useCallback(async () => {
    setLoading(true)
    try {
      const { data: carpetsData, error } = await supabase
        .from('red_carpets')
        .select(`
          *,
          venues(name)
        `)
        .order('carpet_date', { ascending: false })

      if (error) throw error

      const carpetsWithVenues = (carpetsData || []).map(carpet => ({
        ...carpet,
        venue_name: carpet.venues?.name || null
      }))

      setRedCarpets(carpetsWithVenues)
      
      // Check which films/programs and guests exist in database
      await checkExistingItems(carpetsWithVenues)
    } catch (error) {
      console.error('Error loading red carpets:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const checkExistingItems = async (carpets: RedCarpet[]) => {
    const allFilmTitles = new Set<string>()
    const allGuestNames = new Set<string>()
    
    // Collect all unique titles and names
    carpets.forEach(carpet => {
      if (carpet.film_program_display) {
        carpet.film_program_display.split(',').forEach(title => {
          allFilmTitles.add(title.trim())
        })
      }
      // DON'T add subjects from red carpet data - only use actual guest cards
    })
    
    // For now, assume all items exist and make them clickable
    // We'll check existence when clicked instead of preloading
    setExistingFilms(allFilmTitles)
    // Only use actual guest names from the guests table, not from red carpet data
    const actualGuestNames = new Set((guestsData || []).map(g => g.name))
    setExistingGuests(actualGuestNames)
  }

  useEffect(() => {
    loadRedCarpets()
  }, [loadRedCarpets])

  // Group red carpets by date + time + venue = one event
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, GroupedRedCarpetEvent>()
    
    redCarpets.forEach(carpet => {
      const eventKey = `${carpet.carpet_date || ''}-${carpet.carpet_start_time || ''}-${carpet.venue_name || ''}-${carpet.house || ''}`
      
      if (!groups.has(eventKey)) {
        groups.set(eventKey, {
          eventKey,
          carpet_date: carpet.carpet_date,
          carpet_start_time: carpet.carpet_start_time,
          venue_name: carpet.venue_name,
          house: carpet.house,
          rsvp_form_url: carpet.rsvp_form_url,
          rsvp_responses_url: carpet.rsvp_responses_url,
          run_of_show_url: carpet.run_of_show_url,
          films: [],
          rawEvents: []
        })
      }
      
      const group = groups.get(eventKey)!
      group.rawEvents.push(carpet)
      
      // Add films with their subjects
      if (carpet.film_program_display) {
        const titles = carpet.film_program_display.split(',').map(t => t.trim())
        titles.forEach(title => {
          const existingFilm = group.films.find(f => f.title === title)
          const subjects = carpet.subjects_display ? carpet.subjects_display.split(',').map(s => s.trim()) : []
          
          if (existingFilm) {
            // Add unique subjects to existing film
            subjects.forEach(subject => {
              if (!existingFilm.subjects.includes(subject)) {
                existingFilm.subjects.push(subject)
              }
            })
          } else {
            // Add new film
            group.films.push({
              title,
              subjects
            })
          }
        })
      }
    })
    
    return Array.from(groups.values())
  }, [redCarpets])

  // Filter and search logic
  const filteredEvents = useMemo(() => {
    return groupedEvents.filter(event => {
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<any>(
          searchTerm,
          (event) => [
            ...event.films.map((f: any) => f.title),
            ...event.films.flatMap((f: any) => f.subjects),
            event.venue_name
          ]
        )
        if (!searchFilter(event)) return false
      }
      return true
    })
  }, [groupedEvents, searchTerm])

  // Sort logic
  const sortedEvents = useMemo(() => {
    if (!sortConfig) return filteredEvents

    return [...filteredEvents].sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortConfig.key) {
        case 'carpet_date':
          aValue = a.carpet_date
          bValue = b.carpet_date
          break
        case 'carpet_start_time':
          aValue = a.carpet_start_time
          bValue = b.carpet_start_time
          break
        case 'venue_name':
          aValue = a.venue_name
          bValue = b.venue_name
          break
        default:
          aValue = a[sortConfig.key as keyof GroupedRedCarpetEvent]
          bValue = b[sortConfig.key as keyof GroupedRedCarpetEvent]
      }
      
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

  const handleResize = (key: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [key]: width }))
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—'
    const parts = dateString.split('-')
    if (parts.length !== 3) return dateString
    const year = parts[0].slice(-2)
    const month = parts[1]
    const day = parts[2]
    return `${month}/${day}/${year}`
  }

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '—'
    
    // Convert 24-hour format to 12-hour AM/PM format
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    
    return `${hour12}:${minutes} ${ampm}`
  }

  const checkIfFilmExists = async (filmTitle: string): Promise<boolean> => {
    try {
      // Check feature films
      const { data: featureData } = await supabase
        .from('feature_films')
        .select('id')
        .eq('title', filmTitle)
        .single()
      
      if (featureData) return true
      
      // Check short films
      const { data: shortData } = await supabase
        .from('short_films')
        .select('id')
        .eq('title', filmTitle)
        .single()
      
      if (shortData) return true
      
      // Check programs
      const { data: programData } = await supabase
        .from('programs')
        .select('id')
        .eq('title', filmTitle)
        .single()
      
      return !!programData
    } catch {
      return false
    }
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

  const checkIfGuestExists = async (guestName: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('guests')
        .select('id')
        .eq('name', guestName)
        .single()
      
      return !!data
    } catch {
      return false
    }
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

      if (error) {
        console.warn('Guest not found in database:', guestName)
        alert(`Guest "${guestName}" not found in database`)
        return
      }

      // Format the guest data for the popup
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
      alert('Error loading guest details')
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">🎭 Red Carpets</h1>
            <p className="text-sm text-gray-600 mt-1">
              {sortedEvents.length} red carpet events
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {canEditRedCarpets && (
              <button
                onClick={exportRedCarpetsTemplate}
                className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
              >
                📄 Create Red Carpets Template
              </button>
            )}
            {canEditRedCarpets && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                Add Carpet
              </button>
            )}
            {canEditRedCarpets && (
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    // TODO: Implement CSV import
                    console.log('CSV import not yet implemented')
                  }}
                />
                <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium">
                  Import CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search films, subjects, venues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Clear Filters */}
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden bg-white">
        <div className="overflow-auto" style={{ height: 'calc(100vh - 220px)', overflowX: 'auto', overflowY: 'auto' }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-500">Loading red carpets...</div>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {[
                    { key: 'films_subjects', label: 'Films & Subjects', width: 400, sortable: false },
                    { key: 'venue_name', label: 'Venue', width: 150, sortable: true },
                    { key: 'carpet_date', label: 'Date', width: 100, sortable: true },
                    { key: 'call_time', label: 'Call Time', width: 100, sortable: true },
                    { key: 'carpet_start_time', label: 'Carpet Start Time', width: 120, sortable: true },
                    { key: 'film_program_start_time', label: 'Film/Program Start', width: 120, sortable: true },
                    { key: 'rsvps', label: 'RSVPs', width: 100, sortable: false },
                    { key: 'ros', label: 'ROS', width: 80, sortable: false }
                  ].map((column) => (
                    <th
                      key={column.key}
                      className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 relative ${
                        column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                      } ${
                        column.key === 'films_subjects' ? 'sticky left-0 bg-gray-50 z-10' : ''
                      }`}
                      style={{ 
                        width: columnWidths[column.key] || column.width,
                        minWidth: column.key === 'films_subjects' ? `${column.width}px` : '100px',
                        maxWidth: column.key === 'films_subjects' ? `${columnWidths[column.key] || column.width}px` : 'none'
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
                        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
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
                  {canEditRedCarpets && (
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedEvents.map((event) => (
                  <tr key={event.eventKey} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 sticky left-0 bg-white z-10" style={{ minWidth: `${columnWidths['films_subjects'] || 400}px`, maxWidth: `${columnWidths['films_subjects'] || 400}px` }}>
                      <div className="space-y-1">
                        {event.films.map((film, filmIndex) => (
                          <div key={filmIndex} className="border-l-2 border-blue-200 pl-2">
                            <div className="font-medium">
                              {existingFilms.has(film.title) ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openFilmCard(film.title)
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                                >
                                  {film.title}
                                </button>
                              ) : (
                                <span className="text-gray-900">{film.title}</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 ml-2">
                              {film.subjects.map((subject, subjectIndex) => (
                                <span key={subjectIndex}>
                                  {existingGuests.has(subject) ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openGuestCard(subject)
                                      }}
                                      className="text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      {subject}
                                    </button>
                                  ) : (
                                    <span className="text-gray-900">{subject}</span>
                                  )}
                                  {subjectIndex < film.subjects.length - 1 && <span className="text-gray-400">, </span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['venue_name'] || 150}px` }}>
                      {event.venue_name ? (
                        <div>
                          <div>{event.venue_name}</div>
                          {event.house && <div className="text-xs text-gray-500">{event.house}</div>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['carpet_date'] || 100}px` }}>
                      {formatDate(event.carpet_date)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['call_time'] || 100}px` }}>
                      {formatTime(event.rawEvents[0]?.call_time)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['carpet_start_time'] || 120}px` }}>
                      {formatTime(event.carpet_start_time)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['film_program_start_time'] || 120}px` }}>
                      {formatTime(event.rawEvents[0]?.film_program_start_time)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['rsvps'] || 100}px` }}>
                      <div className="flex flex-wrap gap-1">
                        {event.rsvp_responses_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(event.rsvp_responses_url!, '_blank')
                            }}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                            title="View RSVP responses in Google Sheets"
                          >
                            View RSVPs
                          </button>
                        )}
                        {event.rsvp_form_url && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(event.rsvp_form_url!, '_blank')
                              }}
                              className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700"
                              title="Open RSVP form in new tab"
                            >
                              Open Form
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(event.rsvp_form_url!)
                                // Show temporary feedback
                                const btn = e.target as HTMLButtonElement
                                const originalText = btn.textContent
                                btn.textContent = 'Copied!'
                                setTimeout(() => {
                                  btn.textContent = originalText
                                }, 1000)
                              }}
                              className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                              title="Copy RSVP form link to clipboard"
                            >
                              Copy RSVP Link
                            </button>
                          </>
                        )}
                        {!event.rsvp_responses_url && !event.rsvp_form_url && '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['ros'] || 80}px` }}>
                      {event.run_of_show_url ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(event.run_of_show_url!, '_blank')
                          }}
                          className="bg-orange-600 text-white px-2 py-1 rounded text-xs hover:bg-orange-700"
                          title="Open Run of Show document"
                        >
                          ROS
                        </button>
                      ) : '—'}
                    </td>
                    {canEditRedCarpets && (
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">
                        <button
                          onClick={() => setSelectedCarpet(event.rawEvents[0])}
                          className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {sortedEvents.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm 
                        ? 'No red carpets match your search.'
                        : 'No red carpets found. Click "Add Carpet" to create your first red carpet event.'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Red Carpet Form Modal */}
      <RedCarpetFormModal
        redCarpet={selectedCarpet}
        isOpen={showAddModal || !!selectedCarpet}
        onClose={() => {
          setShowAddModal(false)
          setSelectedCarpet(null)
        }}
        onSave={(savedCarpet) => {
          if (selectedCarpet) {
            // Update existing carpet in the list
            setRedCarpets(prev => prev.map(carpet => 
              carpet.id === savedCarpet.id ? savedCarpet : carpet
            ))
          } else {
            // Add new carpet to the list
            setRedCarpets(prev => [savedCarpet, ...prev])
          }
        }}
      />

      {/* Film Card Popup */}
      {showFilmCard && (
        <FilmCardPopup
          film={showFilmCard}
          onClose={() => setShowFilmCard(null)}
        />
      )}

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