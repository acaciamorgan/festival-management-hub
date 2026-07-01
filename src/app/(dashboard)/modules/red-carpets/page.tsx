'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { RedCarpetFormModal } from '@/components/forms/red-carpet-form-modal'
import { FilmCardPopup } from '@/components/cards/film-card-popup'
import { GuestCardPopup } from '@/components/cards/guest-card-popup'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'
import { RedCarpetCard } from '@/types'
import * as XLSX from 'xlsx-js-style'

interface JunctionFilm {
  red_carpet_id: string
  film_id: string
  film_type: string
}

interface JunctionSubject {
  red_carpet_id: string
  guest_id: string
}

interface GroupedFilm {
  title: string
  film_id?: string
  film_type?: string
  subjects: {
    name: string
    guest_id?: string
  }[]
}

interface GroupedRedCarpetEvent {
  eventKey: string
  carpet_date: string | null
  carpet_start_time: string | null
  venue_name_from_fk: string | null
  house: string | null
  rsvp_form_url: string | null
  rsvp_responses_url: string | null
  run_of_show_url: string | null
  films: GroupedFilm[]
  rawEvents: RedCarpetCard[]
}

export default function RedCarpetsPage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const [redCarpets, setRedCarpets] = useState<RedCarpetCard[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCarpet, setSelectedCarpet] = useState<RedCarpetCard[] | null>(null)
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'carpet_date', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [showFilmCard, setShowFilmCard] = useState<any>(null)
  const [showGuestCard, setShowGuestCard] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')

  // Junction data maps: carpet_id -> films/subjects with IDs
  const [junctionFilmsMap, setJunctionFilmsMap] = useState<Map<string, JunctionFilm[]>>(new Map())
  const [junctionSubjectsMap, setJunctionSubjectsMap] = useState<Map<string, JunctionSubject[]>>(new Map())

  const supabase = createClient()
  const { currentYear } = useFestivalYear()

  // Check if user has edit permissions for red carpets
  const canEditRedCarpets = permissions?.modulePermissions?.['redCarpets']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false

  // Export template function for Red Carpets
  const exportRedCarpetsTemplate = () => {
    const headerMapping = [
      { field: 'film_program_display_combined', display: 'Film/Program' },
      { field: 'subjects_display_combined', display: 'Subjects' },
      { field: 'venue_name_from_fk', display: 'Venue' },
      { field: 'house', display: 'House' },
      { field: 'carpet_date', display: 'Carpet Date' },
      { field: 'call_time', display: 'Call Time' },
      { field: 'carpet_start_time', display: 'Carpet Start Time' },
      { field: 'film_program_start_time', display: 'Film/Program Start Time' },
      { field: 'rsvp_form_url', display: 'RSVP Form URL' },
      { field: 'rsvp_responses_url', display: 'RSVP Responses URL' }
    ]

    const headers = headerMapping.map(h => h.display)

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers])

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

    const cols: any[] = []
    headers.forEach((header, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: index })
      if (!ws[cellRef]) ws[cellRef] = {}
      ws[cellRef].s = headerStyle

      cols.push({ wch: Math.min(Math.max(header.length + 2, 15), 30) })
    })

    ws['!cols'] = cols
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }

    XLSX.utils.book_append_sheet(wb, ws, 'Red Carpets Template')
    XLSX.writeFile(wb, 'red_carpets_import_template.xlsx')
  }

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
          currentField += '"'
          i += 2
          continue
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField.trim())
        currentField = ''
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
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

    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim())
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow)
      }
    }

    return rows
  }

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

      const fieldMap: Record<string, string> = {
        'Film/Program': 'film_program_display',
        'Subjects': 'subjects_display',
        'Venue': 'venue_name',
        'House': 'house',
        'Carpet Date': 'carpet_date',
        'Call Time': 'call_time',
        'Carpet Start Time': 'carpet_start_time',
        'Film/Program Start Time': 'film_program_start_time',
        'RSVP Form URL': 'rsvp_form_url',
        'RSVP Responses URL': 'rsvp_responses_url'
      }

      const carpetData = []
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row || row.length === 0 || row.every(cell => !cell || !cell.trim())) continue

        const record: any = {}

        headers.forEach((header, index) => {
          const fieldName = fieldMap[header]
          if (fieldName && row[index]) {
            let value: any = row[index].trim()

            if (fieldName === 'carpet_date') {
              if (value.includes('/')) {
                const parts = value.split('/')
                if (parts.length === 3) {
                  const month = parts[0].padStart(2, '0')
                  const day = parts[1].padStart(2, '0')
                  const year = parts[2].length === 2 ? '20' + parts[2] : parts[2]
                  value = `${year}-${month}-${day}`
                }
              } else if (value.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
                const [year, month, day] = value.split('-')
                value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
              }
            } else if (['call_time', 'carpet_start_time', 'film_program_start_time'].includes(fieldName)) {
              value = convertTo24Hour(value)
            }

            record[fieldName] = value
          }
        })

        if (record.film_program_display || record.carpet_date) {
          carpetData.push(record)
        }
      }

      if (carpetData.length === 0) {
        setUploadStatus('Error: No valid red carpet data found in CSV')
        return
      }

      setUploadStatus(`Processing ${carpetData.length} red carpet events...`)

      const { data: allVenues } = await supabase
        .from('venues')
        .select('id, name')
        .eq('festival_year', currentYear)

      const venueMap = new Map(
        (allVenues || []).map(v => [v.name.toLowerCase().trim(), v.id])
      )

      let insertedCount = 0

      for (const carpet of carpetData) {
        if (carpet.venue_name) {
          const venueId = venueMap.get(carpet.venue_name.toLowerCase().trim())
          if (venueId) {
            carpet.venue_id = venueId
          }
          delete carpet.venue_name
        }

        carpet.festival_year = currentYear
        carpet.created_by = user?.id

        const { error: insertError } = await supabase
          .from('red_carpets')
          .insert(carpet)

        if (insertError) {
          console.error('Insert error:', insertError)
          setUploadStatus(`Error inserting red carpet: ${insertError.message}`)
          return
        }
        insertedCount++
      }

      setUploadStatus(`Successfully imported ${insertedCount} red carpet events!`)
      loadRedCarpets()
    } catch (error) {
      console.error('CSV processing error:', error)
      setUploadStatus('Error: Failed to process CSV file')
    } finally {
      setUploading(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const convertTo24Hour = (timeStr: string): string | null => {
    if (!timeStr) return null
    const trimmed = timeStr.trim()
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed) && !trimmed.toLowerCase().includes('am') && !trimmed.toLowerCase().includes('pm')) {
      const parts = trimmed.split(':')
      return `${parts[0].padStart(2, '0')}:${parts[1]}:${parts[2] || '00'}`
    }
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!match) return trimmed
    let hours = parseInt(match[1], 10)
    const minutes = match[2]
    const ampm = match[3].toUpperCase()
    if (ampm === 'PM' && hours !== 12) hours += 12
    else if (ampm === 'AM' && hours === 12) hours = 0
    return `${hours.toString().padStart(2, '0')}:${minutes}:00`
  }

  const loadRedCarpets = useCallback(async () => {
    setLoading(true)
    try {
      const { data: carpetsData, error } = await supabase
        .from('red_carpets_with_details')
        .select('*')
        .eq('festival_year', currentYear)
        .order('carpet_date', { ascending: false })

      if (error) throw error

      const carpets: RedCarpetCard[] = carpetsData || []
      setRedCarpets(carpets)

      // Load junction data for all loaded carpet IDs
      if (carpets.length > 0) {
        const carpetIds = carpets.map(c => c.id)

        const [{ data: filmsData }, { data: subjectsData }] = await Promise.all([
          supabase
            .from('red_carpet_films')
            .select('red_carpet_id, film_id, film_type')
            .in('red_carpet_id', carpetIds),
          supabase
            .from('red_carpet_subjects')
            .select('red_carpet_id, guest_id')
            .in('red_carpet_id', carpetIds),
        ])

        // Build maps
        const filmsMap = new Map<string, JunctionFilm[]>()
        ;(filmsData || []).forEach(jf => {
          const list = filmsMap.get(jf.red_carpet_id) || []
          list.push(jf)
          filmsMap.set(jf.red_carpet_id, list)
        })
        setJunctionFilmsMap(filmsMap)

        const subjectsMap = new Map<string, JunctionSubject[]>()
        ;(subjectsData || []).forEach(js => {
          const list = subjectsMap.get(js.red_carpet_id) || []
          list.push(js)
          subjectsMap.set(js.red_carpet_id, list)
        })
        setJunctionSubjectsMap(subjectsMap)
      } else {
        setJunctionFilmsMap(new Map())
        setJunctionSubjectsMap(new Map())
      }
    } catch (error) {
      console.error('Error loading red carpets:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, currentYear])

  useEffect(() => {
    loadRedCarpets()
  }, [loadRedCarpets])

  // Group red carpets by date + time + venue = one event
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, GroupedRedCarpetEvent>()

    redCarpets.forEach(carpet => {
      const eventKey = `${carpet.carpet_date || ''}-${carpet.carpet_start_time || ''}-${carpet.venue_name_from_fk || ''}-${carpet.house || ''}`

      if (!groups.has(eventKey)) {
        groups.set(eventKey, {
          eventKey,
          carpet_date: carpet.carpet_date,
          carpet_start_time: carpet.carpet_start_time,
          venue_name_from_fk: carpet.venue_name_from_fk,
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

      // Get junction films for this carpet
      const carpetJunctionFilms = junctionFilmsMap.get(carpet.id) || []
      // Get junction subjects for this carpet
      const carpetJunctionSubjects = junctionSubjectsMap.get(carpet.id) || []

      // Parse display strings for titles and subjects (from the view)
      const filmTitles = carpet.film_program_display_combined
        ? carpet.film_program_display_combined.split(' || ').map(t => t.trim())
        : []
      const subjectNames = carpet.subjects_display_combined
        ? carpet.subjects_display_combined.split(',').map(s => s.trim())
        : []

      // Build structured film objects with IDs from junction data
      filmTitles.forEach(title => {
        const existingFilm = group.films.find(f => f.title === title)

        // Match display title to junction film by position
        // Each red_carpets row typically has one film, so junction films align with filmTitles
        let filmId: string | undefined
        let filmType: string | undefined
        const titleIndex = filmTitles.indexOf(title)
        if (titleIndex >= 0 && titleIndex < carpetJunctionFilms.length) {
          filmId = carpetJunctionFilms[titleIndex].film_id
          filmType = carpetJunctionFilms[titleIndex].film_type
        }

        // Build subjects with guest IDs, matched by position
        const subjects = subjectNames.map((name, idx) => ({
          name,
          guest_id: idx < carpetJunctionSubjects.length ? carpetJunctionSubjects[idx].guest_id : undefined,
        }))

        if (existingFilm) {
          // Add unique subjects to existing film
          subjects.forEach(subject => {
            if (!existingFilm.subjects.some(s => s.name === subject.name)) {
              existingFilm.subjects.push(subject)
            }
          })
        } else {
          group.films.push({
            title,
            film_id: filmId,
            film_type: filmType,
            subjects
          })
        }
      })
    })

    return Array.from(groups.values())
  }, [redCarpets, junctionFilmsMap, junctionSubjectsMap])

  // Filter and search logic
  const filteredEvents = useMemo(() => {
    return groupedEvents.filter(event => {
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<any>(
          searchTerm,
          (event) => [
            ...event.films.map((f: any) => f.title),
            ...event.films.flatMap((f: any) => f.subjects.map((s: any) => s.name)),
            event.venue_name_from_fk
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
          aValue = a.venue_name_from_fk
          bValue = b.venue_name_from_fk
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

    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'

    return `${hour12}:${(minutes || '00').padStart(2, '0')} ${ampm}`
  }

  const handleDeleteCarpetEvent = async (event: GroupedRedCarpetEvent) => {
    const filmTitles = event.films.map(f => f.title).join(', ')
    if (!confirm(`Are you sure you want to delete this red carpet event for: ${filmTitles}?`)) {
      return
    }

    try {
      const idsToDelete = event.rawEvents.map(carpet => carpet.id)
      const { error } = await supabase
        .from('red_carpets')
        .delete()
        .in('id', idsToDelete)

      if (error) throw error

      setRedCarpets(prev => prev.filter(carpet => !idsToDelete.includes(carpet.id)))
    } catch (error) {
      console.error('Error deleting red carpet event:', error)
      alert('Error deleting red carpet event')
    }
  }

  // Open film card by ID — queries the correct source table
  const openFilmCard = async (filmId: string, filmType: string) => {
    try {
      let tableName: string
      let selectFields = '*'

      switch (filmType) {
        case 'feature':
          tableName = 'feature_films'
          break
        case 'short':
          tableName = 'short_films'
          break
        case 'shorts_program':
          tableName = 'shorts_programs'
          break
        case 'program':
          tableName = 'programs'
          break
        default:
          tableName = 'feature_films'
      }

      const { data, error } = await supabase
        .from(tableName)
        .select(selectFields)
        .eq('id', filmId)
        .eq('festival_year', currentYear)
        .maybeSingle()

      if (error || !data) {
        console.warn('Film not found:', filmId, filmType)
        alert('Film not found in database')
        return
      }

      setShowFilmCard(data)
    } catch (error) {
      console.error('Error fetching film:', error)
      alert('Error loading film details')
    }
  }

  // Open guest card by ID
  const openGuestCard = async (guestId: string) => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .eq('festival_year', currentYear)
        .maybeSingle()

      if (error || !data) {
        console.warn('Guest not found:', guestId)
        alert('Guest not found in database')
        return
      }

      setShowGuestCard(data)
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
            <h1 className="text-2xl font-semibold text-gray-900">Red Carpets</h1>
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
                Create Red Carpet CSV Template
              </button>
            )}
            {canEditRedCarpets && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 font-medium"
              >
                Add Carpet
              </button>
            )}
            {canEditRedCarpets && (
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer transition-colors font-medium">
                {uploading ? 'Uploading...' : 'Upload Red Carpet CSV'}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search films, subjects, venues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

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
                              {film.film_id ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openFilmCard(film.film_id!, film.film_type!)
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
                                  {subject.guest_id ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openGuestCard(subject.guest_id!)
                                      }}
                                      className="text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      {subject.name}
                                    </button>
                                  ) : (
                                    <span className="text-gray-900">{subject.name}</span>
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
                      {event.venue_name_from_fk ? (
                        <div>
                          <div>{event.venue_name_from_fk}</div>
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
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setSelectedCarpet(event.rawEvents)}
                            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCarpetEvent(event)}
                            className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
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
        onSave={() => {
          loadRedCarpets()
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
