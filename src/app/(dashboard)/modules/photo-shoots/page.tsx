'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { PhotoShootFormModal } from '@/components/forms/photo-shoot-form-modal'
import { FilmCardPopup } from '@/components/cards/film-card-popup'
import { GuestCardPopup } from '@/components/cards/guest-card-popup'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'
import { PhotoShootCard } from '@/types'
import * as XLSX from 'xlsx-js-style'

interface JunctionFilm {
  photo_shoot_id: string
  film_id: string
  film_type: string
}

interface JunctionSubject {
  photo_shoot_id: string
  guest_id: string
}

export default function PhotoShootsPage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const { currentYear } = useFestivalYear()
  const [photoShoots, setPhotoShoots] = useState<PhotoShootCard[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedShoot, setSelectedShoot] = useState<PhotoShootCard | null>(null)
  const [selectsFilter, setSelectsFilter] = useState<'all' | 'pending' | 'received'>('all')
  const [prFilter, setPrFilter] = useState<'all' | 'pending' | 'sent'>('all')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'shoot_date', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [showFilmCard, setShowFilmCard] = useState<any>(null)
  const [showGuestCard, setShowGuestCard] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')

  // Junction data maps: shoot_id -> films/subjects with IDs
  const [junctionFilmsMap, setJunctionFilmsMap] = useState<Map<string, JunctionFilm[]>>(new Map())
  const [junctionSubjectsMap, setJunctionSubjectsMap] = useState<Map<string, JunctionSubject[]>>(new Map())

  const supabase = createClient()

  // Check if user has edit permissions for photo shoots
  const canEditPhotoShoots = permissions?.modulePermissions?.['photoShoots']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false

  // Export template function for Photo Shoots
  const exportPhotoShootsTemplate = () => {
    // Define headers with proper display names
    const headerMapping = [
      { field: 'film_program_display_combined', display: 'Film/Program' },
      { field: 'subjects_display_combined', display: 'Subjects' },
      { field: 'venue_name_from_fk', display: 'Venue' },
      { field: 'house', display: 'House' },
      { field: 'shoot_date', display: 'Shoot Date' },
      { field: 'call_time', display: 'Call Time' },
      { field: 'shoot_time', display: 'Shoot Time' },
      { field: 'film_program_start_time', display: 'Film/Program Start Time' },
      { field: 'photographer', display: 'Photographer' },
      { field: 'videographer', display: 'Videographer' },
      { field: 'intro_qa', display: 'Intro Q&A' },
      { field: 'selects_received', display: 'Selects Received' },
      { field: 'sent_to_pr', display: 'Sent to PR' }
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

    XLSX.utils.book_append_sheet(wb, ws, 'Photo Shoots Template')
    XLSX.writeFile(wb, 'photo_shoots_import_template.xlsx')
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
        'Shoot Date': 'shoot_date',
        'Call Time': 'call_time',
        'Shoot Time': 'shoot_time',
        'Film/Program Start Time': 'film_program_start_time',
        'Photographer': 'photographer',
        'Videographer': 'videographer',
        'Intro Q&A': 'intro_qa',
        'Selects Received': 'selects_received',
        'Sent to PR': 'sent_to_pr'
      }

      const shootData = []
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row || row.length === 0 || row.every(cell => !cell || !cell.trim())) continue

        const record: any = {}

        headers.forEach((header, index) => {
          const fieldName = fieldMap[header]
          if (fieldName && row[index]) {
            let value: any = row[index].trim()

            if (fieldName === 'shoot_date') {
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
            } else if (['call_time', 'shoot_time', 'film_program_start_time'].includes(fieldName)) {
              value = convertTo24Hour(value)
            } else if (fieldName === 'intro_qa') {
              const lower = value.toLowerCase()
              value = lower === 'yes' || lower === 'true' || lower === '1' || lower === 'y'
            } else if (fieldName === 'selects_received') {
              const lower = value.toLowerCase()
              value = lower === 'yes' || lower === 'true' || lower === '1' || lower === 'received' || lower === 'y'
            } else if (fieldName === 'sent_to_pr') {
              const lower = value.toLowerCase()
              value = lower === 'yes' || lower === 'true' || lower === '1' || lower === 'sent' || lower === 'y'
            }

            record[fieldName] = value
          }
        })

        if (record.film_program_display || record.subjects_display || record.shoot_date) {
          shootData.push(record)
        }
      }

      if (shootData.length === 0) {
        setUploadStatus('Error: No valid photo shoot data found in CSV')
        return
      }

      setUploadStatus(`Processing ${shootData.length} photo shoots...`)

      const { data: allVenues } = await supabase
        .from('venues')
        .select('id, name')
        .eq('festival_year', currentYear)

      const venueMap = new Map(
        (allVenues || []).map(v => [v.name.toLowerCase().trim(), v.id])
      )

      let insertedCount = 0

      for (const shoot of shootData) {
        if (shoot.venue_name) {
          const venueId = venueMap.get(shoot.venue_name.toLowerCase().trim())
          if (venueId) {
            shoot.venue_id = venueId
          }
          delete shoot.venue_name
        }

        shoot.festival_year = currentYear
        shoot.created_by = user?.id

        const { error: insertError } = await supabase
          .from('photo_shoots')
          .insert(shoot)

        if (insertError) {
          console.error('Insert error:', insertError)
          setUploadStatus(`Error inserting photo shoot: ${insertError.message}`)
          return
        }
        insertedCount++
      }

      setUploadStatus(`Successfully imported ${insertedCount} photo shoots!`)
      loadPhotoShoots()
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

  const loadPhotoShoots = useCallback(async () => {
    setLoading(true)
    try {
      const { data: shootsData, error } = await supabase
        .from('photo_shoots_with_details')
        .select('*')
        .eq('festival_year', currentYear)
        .order('shoot_date', { ascending: false })

      if (error) throw error

      const shoots: PhotoShootCard[] = shootsData || []
      setPhotoShoots(shoots)

      // Load junction data for all loaded shoot IDs
      if (shoots.length > 0) {
        const shootIds = shoots.map(s => s.id)

        const [{ data: filmsData }, { data: subjectsData }] = await Promise.all([
          supabase
            .from('photo_shoot_films')
            .select('photo_shoot_id, film_id, film_type')
            .in('photo_shoot_id', shootIds),
          supabase
            .from('photo_shoot_subjects')
            .select('photo_shoot_id, guest_id')
            .in('photo_shoot_id', shootIds),
        ])

        // Build maps
        const filmsMap = new Map<string, JunctionFilm[]>()
        ;(filmsData || []).forEach(jf => {
          const list = filmsMap.get(jf.photo_shoot_id) || []
          list.push(jf)
          filmsMap.set(jf.photo_shoot_id, list)
        })
        setJunctionFilmsMap(filmsMap)

        const subjectsMap = new Map<string, JunctionSubject[]>()
        ;(subjectsData || []).forEach(js => {
          const list = subjectsMap.get(js.photo_shoot_id) || []
          list.push(js)
          subjectsMap.set(js.photo_shoot_id, list)
        })
        setJunctionSubjectsMap(subjectsMap)
      } else {
        setJunctionFilmsMap(new Map())
        setJunctionSubjectsMap(new Map())
      }
    } catch (error) {
      console.error('Error loading photo shoots:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, currentYear])

  useEffect(() => {
    loadPhotoShoots()
  }, [loadPhotoShoots])

  // Filter and search logic
  const filteredPhotoShoots = useMemo(() => {
    return photoShoots.filter(shoot => {
      // Search filter with accent-insensitive search
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<PhotoShootCard>(
          searchTerm,
          (shoot) => [
            shoot.film_program_display_combined,
            shoot.subjects_display_combined,
            shoot.photographer,
            shoot.videographer,
            shoot.venue_name_from_fk
          ]
        )
        if (!searchFilter(shoot)) return false
      }

      // Selects filter
      if (selectsFilter === 'pending' && shoot.selects_received) return false
      if (selectsFilter === 'received' && !shoot.selects_received) return false

      // PR filter
      if (prFilter === 'pending' && shoot.sent_to_pr) return false
      if (prFilter === 'sent' && !shoot.sent_to_pr) return false

      return true
    })
  }, [photoShoots, searchTerm, selectsFilter, prFilter])

  // Sort logic
  const sortedPhotoShoots = useMemo(() => {
    if (!sortConfig) return filteredPhotoShoots

    return [...filteredPhotoShoots].sort((a, b) => {
      const keyMap: Record<string, string> = {
        'film_program_display': 'film_program_display_combined',
        'venue_name': 'venue_name_from_fk',
      }
      const actualKey = keyMap[sortConfig.key] || sortConfig.key
      const aValue = a[actualKey as keyof PhotoShootCard]
      const bValue = b[actualKey as keyof PhotoShootCard]

      if (aValue === null) return 1
      if (bValue === null) return -1

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredPhotoShoots, sortConfig])

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

    // Parse YYYY-MM-DD format with string manipulation only
    const parts = dateString.split('-')
    if (parts.length !== 3) return dateString // Return as-is if not expected format

    const year = parts[0].slice(-2) // Get last 2 digits
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

    return `${hour12}:${(minutes || '00').padStart(2, '0')} ${ampm}`
  }

  const toggleCheckbox = async (shootId: string, field: 'selects_received' | 'sent_to_pr', currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('photo_shoots')
        .update({ [field]: !currentValue })
        .eq('id', shootId)

      if (error) throw error

      setPhotoShoots(prev => prev.map(shoot =>
        shoot.id === shootId
          ? { ...shoot, [field]: !currentValue }
          : shoot
      ))
    } catch (error) {
      console.error(`Error updating ${field}:`, error)
      alert(`Error updating ${field}. Please try again.`)
    }
  }

  // Open film card by ID — queries the correct source table
  const openFilmCard = async (filmId: string, filmType: string) => {
    try {
      let tableName: string

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
        .select('*')
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

  // Helper: render film titles with clickable links for FK-linked items
  const renderFilmTitles = (shoot: PhotoShootCard) => {
    if (!shoot.film_program_display_combined) return '—'

    const titles = shoot.film_program_display_combined.split(' || ').map(t => t.trim())
    const junctionFilms = junctionFilmsMap.get(shoot.id) || []

    return (
      <div className="flex flex-wrap gap-1">
        {titles.map((title, index) => {
          // Try to match this title to a junction film by position
          // Junction films are ordered, display titles from view are ordered the same way
          const jf = index < junctionFilms.length ? junctionFilms[index] : undefined

          return (
            <span key={index}>
              {jf ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openFilmCard(jf.film_id, jf.film_type)
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                >
                  {title}
                </button>
              ) : (
                <span className="text-gray-900">{title}</span>
              )}
              {index < titles.length - 1 && <span className="text-gray-400">, </span>}
            </span>
          )
        })}
      </div>
    )
  }

  // Helper: render subject names with clickable links for FK-linked items
  const renderSubjectNames = (shoot: PhotoShootCard) => {
    if (!shoot.subjects_display_combined) return '—'

    const names = shoot.subjects_display_combined.split(', ').map(n => n.trim())
    const junctionSubjects = junctionSubjectsMap.get(shoot.id) || []

    return (
      <div className="flex flex-wrap gap-1">
        {names.map((name, index) => {
          // Match by position — junction subjects are ordered, display names are ordered the same way
          const js = index < junctionSubjects.length ? junctionSubjects[index] : undefined

          return (
            <span key={index}>
              {js ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openGuestCard(js.guest_id)
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                >
                  {name}
                </button>
              ) : (
                <span className="text-gray-900">{name}</span>
              )}
              {index < names.length - 1 && <span className="text-gray-400">, </span>}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">📸 Photo Shoots</h1>
            <p className="text-sm text-gray-600 mt-1">
              {sortedPhotoShoots.length} of {photoShoots.length} photo shoots
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {canEditPhotoShoots && (
              <button
                onClick={exportPhotoShootsTemplate}
                className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
              >
                Create Photo Shoot CSV Template
              </button>
            )}
            {canEditPhotoShoots && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                Add Shoot
              </button>
            )}
            {canEditPhotoShoots && (
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer transition-colors font-medium">
                {uploading ? 'Uploading...' : 'Upload Photo Shoot CSV'}
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
        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search titles, subjects, photographers, videographers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Selects Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Selects:</label>
            <select
              value={selectsFilter}
              onChange={(e) => setSelectsFilter(e.target.value as 'all' | 'pending' | 'received')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
            </select>
          </div>

          {/* PR Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">PR Status:</label>
            <select
              value={prFilter}
              onChange={(e) => setPrFilter(e.target.value as 'all' | 'pending' | 'sent')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || selectsFilter !== 'all' || prFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectsFilter('all')
                setPrFilter('all')
              }}
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden bg-white">
        <div className="overflow-auto" style={{ height: 'calc(100vh - 220px)', overflowX: 'auto', overflowY: 'auto' }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-500">Loading photo shoots...</div>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {[
                    { key: 'film_program_display', label: 'Film / Program', width: 200, sortable: true },
                    { key: 'subjects_display', label: 'Subject(s)', width: 200, sortable: false },
                    { key: 'venue_name', label: 'Venue', width: 150, sortable: true },
                    { key: 'shoot_date', label: 'Date', width: 100, sortable: true },
                    { key: 'call_time', label: 'Call Time', width: 100, sortable: true },
                    { key: 'shoot_time', label: 'Shoot Time', width: 100, sortable: true },
                    { key: 'film_program_start_time', label: 'Film/Program Start', width: 120, sortable: true },
                    { key: 'photographer', label: 'Photographer', width: 120, sortable: true },
                    { key: 'videographer', label: 'Videographer', width: 120, sortable: true },
                    { key: 'intro_qa', label: 'Type', width: 100, sortable: true },
                    { key: 'selects_received', label: 'Selects Received', width: 120, sortable: true },
                    { key: 'sent_to_pr', label: 'Sent to PR', width: 100, sortable: true }
                  ].map((column) => (
                    <th
                      key={column.key}
                      className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 relative ${
                        column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                      } ${
                        column.key === 'film_program_display' ? 'sticky left-0 bg-gray-50 z-10' :
                        column.key === 'subjects_display' ? 'sticky bg-gray-50 z-9' : ''
                      }`}
                      style={{
                        width: columnWidths[column.key] || column.width,
                        minWidth: column.key === 'film_program_display' || column.key === 'subjects_display' ? `${column.width}px` : '100px',
                        maxWidth: column.key === 'film_program_display' || column.key === 'subjects_display' ? `${columnWidths[column.key] || column.width}px` : 'none',
                        left: column.key === 'subjects_display' ? `${columnWidths['film_program_display'] || 200}px` : '0px'
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
                  {canEditPhotoShoots && (
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedPhotoShoots.map((shoot) => (
                  <tr key={shoot.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 sticky left-0 bg-white z-10" style={{ minWidth: `${columnWidths['film_program_display'] || 200}px`, maxWidth: `${columnWidths['film_program_display'] || 200}px` }}>
                      {renderFilmTitles(shoot)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 sticky left-200px bg-white z-9" style={{ minWidth: `${columnWidths['subjects_display'] || 200}px`, maxWidth: `${columnWidths['subjects_display'] || 200}px`, left: `${columnWidths['film_program_display'] || 200}px` }}>
                      {renderSubjectNames(shoot)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['venue_name'] || 150}px` }}>
                      {shoot.venue_name_from_fk ? (
                        <div>
                          <div>{shoot.venue_name_from_fk}</div>
                          {shoot.house && <div className="text-xs text-gray-500">{shoot.house}</div>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['shoot_date'] || 100}px` }}>
                      {formatDate(shoot.shoot_date)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['call_time'] || 100}px` }}>
                      {formatTime(shoot.call_time)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['shoot_time'] || 100}px` }}>
                      {formatTime(shoot.shoot_time)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['film_program_start_time'] || 120}px` }}>
                      {formatTime(shoot.film_program_start_time)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['photographer'] || 120}px` }}>
                      {shoot.photographer || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['videographer'] || 120}px` }}>
                      {shoot.videographer || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['intro_qa'] || 100}px` }}>
                      {shoot.intro_qa || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center" style={{ minWidth: `${columnWidths['selects_received'] || 120}px` }}>
                      <input
                        type="checkbox"
                        checked={shoot.selects_received}
                        onChange={() => toggleCheckbox(shoot.id, 'selects_received', shoot.selects_received)}
                        disabled={!canEditPhotoShoots}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center" style={{ minWidth: `${columnWidths['sent_to_pr'] || 100}px` }}>
                      <input
                        type="checkbox"
                        checked={shoot.sent_to_pr}
                        onChange={() => toggleCheckbox(shoot.id, 'sent_to_pr', shoot.sent_to_pr)}
                        disabled={!canEditPhotoShoots}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
                      />
                    </td>
                    {canEditPhotoShoots && (
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">
                        <button
                          onClick={() => setSelectedShoot(shoot)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {sortedPhotoShoots.length === 0 && (
                  <tr>
                    <td colSpan={canEditPhotoShoots ? 13 : 12} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || selectsFilter !== 'all' || prFilter !== 'all'
                        ? 'No photo shoots match your filters.'
                        : 'No photo shoots found. Click "Add Shoot" to create your first photo shoot.'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Photo Shoot Form Modal */}
      <PhotoShootFormModal
        photoShoot={selectedShoot}
        isOpen={showAddModal || !!selectedShoot}
        onClose={() => {
          setShowAddModal(false)
          setSelectedShoot(null)
        }}
        onSave={() => {
          loadPhotoShoots()
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
