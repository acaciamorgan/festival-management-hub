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
  const [filmTitleMap, setFilmTitleMap] = useState<Map<string, { title: string, film_type: string }>>(new Map())
  const [guestNameMap, setGuestNameMap] = useState<Map<string, string>>(new Map())
  const [guestFilmsMap, setGuestFilmsMap] = useState<Map<string, Set<string>>>(new Map())

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
      let rawText = await file.text()
      // Strip BOM
      if (rawText.charCodeAt(0) === 0xFEFF) rawText = rawText.slice(1)
      const rows = parseCSV(rawText)

      if (rows.length === 0) {
        setUploadStatus('Error: CSV file is empty')
        return
      }

      const headers = rows[0]

      // Map both template headers and actual CSV headers
      const fieldMap: Record<string, string> = {
        'Film/Program': 'film_program_text',
        'Subjects': 'subjects_text',
        'Venue': 'venue_text',
        'House': 'house',
        'Date': 'shoot_date',
        'Shoot Date': 'shoot_date',
        'Call Time': 'call_time',
        'Shoot Time': 'shoot_time',
        'Film/Program Start Time': 'film_program_start_time',
        'Photographer': 'photographer',
        'Videographer': 'videographer',
        'Type': 'intro_qa',
        'Intro Q&A': 'intro_qa',
        'Selects Received': 'selects_received',
        'Sent to PR': 'sent_to_pr'
      }

      // Parse rows into raw records
      const parsedRows: any[] = []
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row || row.length === 0 || row.every(cell => !cell || !cell.trim())) continue

        const record: any = {}

        headers.forEach((header, index) => {
          const fieldName = fieldMap[header.trim()]
          if (fieldName && row[index]) {
            let value: any = row[index].trim()

            if (fieldName === 'shoot_date') {
              // Handle MM/DD (no year), MM/DD/YY, MM/DD/YYYY, YYYY-MM-DD
              if (value.includes('/')) {
                const parts = value.split('/')
                if (parts.length === 2) {
                  // MM/DD — default to festival year
                  const month = parts[0].padStart(2, '0')
                  const day = parts[1].padStart(2, '0')
                  value = `${currentYear}-${month}-${day}`
                } else if (parts.length === 3) {
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

        if (record.film_program_text || record.subjects_text || record.shoot_date) {
          parsedRows.push(record)
        }
      }

      if (parsedRows.length === 0) {
        setUploadStatus('Error: No valid photo shoot data found in CSV')
        return
      }

      setUploadStatus(`Loading reference data...`)

      // Load all reference data in parallel
      const [
        { data: allVenues },
        { data: allHouses },
        { data: featureFilms },
        { data: shortFilms },
        { data: shortsPrograms },
        { data: programsList },
        { data: allGuests },
        { data: existingShoots }
      ] = await Promise.all([
        supabase.from('venues').select('id, name').eq('festival_year', currentYear),
        supabase.from('theater_houses').select('id, venue_id, house_name, short_code'),
        supabase.from('feature_films').select('id, title').eq('festival_year', currentYear),
        supabase.from('short_films').select('id, title').eq('festival_year', currentYear),
        supabase.from('shorts_programs').select('id, program_name').eq('festival_year', currentYear),
        supabase.from('programs').select('id, title').eq('festival_year', currentYear),
        supabase.from('guests').select('id, name').eq('festival_year', currentYear),
        supabase.from('photo_shoots').select('id, venue_id, venue_description, shoot_date, film_program_start_time, house').eq('festival_year', currentYear)
      ])

      // Build venue lookup: short_code -> { venue_id, house_name }
      const shortCodeMap = new Map<string, { venue_id: string, house_name: string }>()
      ;(allHouses || []).forEach(h => {
        if (h.short_code) {
          shortCodeMap.set(h.short_code.toLowerCase().trim(), { venue_id: h.venue_id, house_name: h.house_name })
        }
      })

      // Build venue name lookup: name (lowercase) -> venue_id
      const venueNameMap = new Map<string, string>()
      ;(allVenues || []).forEach(v => {
        venueNameMap.set(v.name.toLowerCase().trim(), v.id)
      })

      // Find the "Red Carpet" house for AMC venue
      const amcVenueId = venueNameMap.get('amc') || venueNameMap.get('amc newcity') || venueNameMap.get('amc newcity 14')
      let amcRedCarpetHouse: string | null = null
      if (amcVenueId) {
        const rcHouse = (allHouses || []).find(h => h.venue_id === amcVenueId && h.house_name?.toLowerCase().includes('red carpet'))
        amcRedCarpetHouse = rcHouse?.house_name || 'Red Carpet'
      }

      // Build film title lookup: title (lowercase) -> { id, type }
      const filmLookup = new Map<string, { id: string, type: string }>()
      ;(featureFilms || []).forEach(f => filmLookup.set(f.title.toLowerCase().trim(), { id: f.id, type: 'feature' }))
      ;(shortFilms || []).forEach(f => filmLookup.set(f.title.toLowerCase().trim(), { id: f.id, type: 'short' }))
      ;(shortsPrograms || []).forEach(p => filmLookup.set(p.program_name.toLowerCase().trim(), { id: p.id, type: 'shorts_program' }))
      ;(programsList || []).forEach(p => filmLookup.set(p.title.toLowerCase().trim(), { id: p.id, type: 'program' }))

      // Build guest name lookup: name (lowercase) -> id
      const guestLookup = new Map<string, string>()
      ;(allGuests || []).forEach(g => guestLookup.set(g.name.toLowerCase().trim(), g.id))

      // Build dedup key for existing shoots: "venue_id|venue_desc|date|start_time" -> shoot
      const existingMap = new Map<string, any>()
      ;(existingShoots || []).forEach(s => {
        const key = `${s.venue_id || ''}|${(s.venue_description || '').toLowerCase()}|${s.shoot_date || ''}|${s.film_program_start_time || ''}`
        existingMap.set(key, s)
      })

      setUploadStatus(`Processing ${parsedRows.length} photo shoots...`)

      let createdCount = 0
      let updatedCount = 0
      let errorCount = 0

      for (const record of parsedRows) {
        // --- Resolve venue ---
        let venue_id: string | null = null
        let house: string | null = record.house || null
        let venue_description: string | null = null

        if (record.venue_text) {
          const venueText = record.venue_text.trim()
          const venueLower = venueText.toLowerCase().trim()

          // 1. Try short_code match
          const shortCodeMatch = shortCodeMap.get(venueLower)
          if (shortCodeMatch) {
            venue_id = shortCodeMatch.venue_id
            house = shortCodeMatch.house_name
          } else {
            // 2. Try venue name match
            const venueIdMatch = venueNameMap.get(venueLower)
            if (venueIdMatch) {
              venue_id = venueIdMatch
              // Special case: bare AMC -> Red Carpet house
              if (venueLower === 'amc' && amcRedCarpetHouse) {
                house = amcRedCarpetHouse
              }
            } else {
              // 3. No match -> free text
              venue_description = venueText
            }
          }
        }

        // --- Resolve film/program ---
        const filmJunctions: { film_id: string, film_type: string }[] = []
        let freeTextFilms: string[] = []

        if (record.film_program_text) {
          // Film/Program is typically a single title per row
          const title = record.film_program_text.trim()
          const filmMatch = filmLookup.get(title.toLowerCase())
          if (filmMatch) {
            filmJunctions.push({ film_id: filmMatch.id, film_type: filmMatch.type })
          } else {
            freeTextFilms.push(title)
          }
        }

        // --- Resolve subjects ---
        const subjectJunctions: { guest_id: string }[] = []
        let freeTextSubjects: string[] = []

        if (record.subjects_text) {
          const names = record.subjects_text.split(',').map((n: string) => n.trim()).filter(Boolean)
          for (const name of names) {
            const guestId = guestLookup.get(name.toLowerCase())
            if (guestId) {
              subjectJunctions.push({ guest_id: guestId })
            } else {
              freeTextSubjects.push(name)
            }
          }
        }

        // --- Build photo shoot record ---
        const shootRecord: any = {
          venue_id: venue_id,
          venue_description: venue_description,
          house: house,
          shoot_date: record.shoot_date || null,
          call_time: record.call_time || null,
          shoot_time: record.shoot_time || null,
          film_program_start_time: record.film_program_start_time || null,
          photographer: record.photographer || null,
          videographer: record.videographer || null,
          intro_qa: record.intro_qa || null,
          film_program_description: freeTextFilms.length > 0 ? freeTextFilms.join(', ') : null,
          subjects_description: freeTextSubjects.length > 0 ? freeTextSubjects.join(', ') : null,
          selects_received: record.selects_received === true ? true : false,
          sent_to_pr: record.sent_to_pr === true ? true : false,
          festival_year: currentYear,
        }

        // --- Dedup check ---
        const dedupKey = `${venue_id || ''}|${(venue_description || '').toLowerCase()}|${record.shoot_date || ''}|${record.film_program_start_time || ''}`
        const existing = existingMap.get(dedupKey)

        let shootId: string

        if (existing) {
          // Additive update: only overwrite non-null CSV values
          const updateData: any = {}
          for (const [key, value] of Object.entries(shootRecord)) {
            if (key === 'festival_year') continue
            if (value !== null && value !== undefined && value !== '' && value !== false) {
              updateData[key] = value
            }
          }
          // Always update booleans if explicitly set in CSV
          if (record.selects_received === true) updateData.selects_received = true
          if (record.sent_to_pr === true) updateData.sent_to_pr = true

          const { error } = await supabase
            .from('photo_shoots')
            .update(updateData)
            .eq('id', existing.id)

          if (error) {
            console.error('Update error:', error)
            errorCount++
            continue
          }
          shootId = existing.id
          updatedCount++

          // Clear existing junction entries so we can re-insert
          await Promise.all([
            supabase.from('photo_shoot_films').delete().eq('photo_shoot_id', existing.id),
            supabase.from('photo_shoot_subjects').delete().eq('photo_shoot_id', existing.id)
          ])
        } else {
          // Insert new
          shootRecord.created_by = user?.id
          const { data: inserted, error } = await supabase
            .from('photo_shoots')
            .insert(shootRecord)
            .select('id')
            .single()

          if (error) {
            console.error('Insert error:', error)
            errorCount++
            continue
          }
          shootId = inserted.id
          createdCount++

          // Add to dedup map so later rows in same upload can match
          existingMap.set(dedupKey, { id: shootId, ...shootRecord })
        }

        // --- Insert junction entries ---
        if (filmJunctions.length > 0) {
          const filmInserts = filmJunctions.map(fj => ({
            photo_shoot_id: shootId,
            film_id: fj.film_id,
            film_type: fj.film_type,
            festival_year: currentYear,
          }))
          const { error } = await supabase.from('photo_shoot_films').insert(filmInserts)
          if (error) console.error('Film junction error:', error)
        }

        if (subjectJunctions.length > 0) {
          const subjectInserts = subjectJunctions.map(sj => ({
            photo_shoot_id: shootId,
            guest_id: sj.guest_id,
            festival_year: currentYear,
          }))
          const { error } = await supabase.from('photo_shoot_subjects').insert(subjectInserts)
          if (error) console.error('Subject junction error:', error)
        }
      }

      const parts = []
      if (createdCount > 0) parts.push(`${createdCount} created`)
      if (updatedCount > 0) parts.push(`${updatedCount} updated`)
      if (errorCount > 0) parts.push(`${errorCount} errors`)
      setUploadStatus(`Import complete: ${parts.join(', ')}`)
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

        // Load film titles, guest names, and guest_films
        const allFilmEntries: JunctionFilm[] = []
        filmsMap.forEach(films => allFilmEntries.push(...films))
        const featureIds = [...new Set(allFilmEntries.filter(f => f.film_type === 'feature').map(f => f.film_id))]
        const shortIds = [...new Set(allFilmEntries.filter(f => f.film_type === 'short').map(f => f.film_id))]
        const spIds = [...new Set(allFilmEntries.filter(f => f.film_type === 'shorts_program').map(f => f.film_id))]
        const progIds = [...new Set(allFilmEntries.filter(f => f.film_type === 'program').map(f => f.film_id))]
        const allGuestIds = [...new Set((subjectsData || []).map((s: any) => s.guest_id).filter(Boolean))]

        const [gfResult, guestNamesResult, featResult, shortResult, spResult, progResult] = await Promise.all([
          allGuestIds.length > 0
            ? supabase.from('guest_films').select('guest_id, film_id').in('guest_id', allGuestIds).eq('festival_year', currentYear)
            : { data: [] },
          allGuestIds.length > 0
            ? supabase.from('guests').select('id, name').in('id', allGuestIds)
            : { data: [] },
          featureIds.length > 0 ? supabase.from('feature_films').select('id, title').in('id', featureIds) : { data: [] },
          shortIds.length > 0 ? supabase.from('short_films').select('id, title').in('id', shortIds) : { data: [] },
          spIds.length > 0 ? supabase.from('shorts_programs').select('id, program_name').in('id', spIds) : { data: [] },
          progIds.length > 0 ? supabase.from('programs').select('id, title').in('id', progIds) : { data: [] },
        ])

        const gfMap = new Map<string, Set<string>>()
        ;(gfResult.data || []).forEach((gf: any) => {
          const set = gfMap.get(gf.guest_id) || new Set<string>()
          set.add(gf.film_id)
          gfMap.set(gf.guest_id, set)
        })
        setGuestFilmsMap(gfMap)

        const nameMap = new Map<string, string>()
        ;(guestNamesResult.data || []).forEach((g: any) => nameMap.set(g.id, g.name))
        setGuestNameMap(nameMap)

        const titleMap = new Map<string, { title: string, film_type: string }>()
        ;(featResult.data || []).forEach((f: any) => titleMap.set(f.id, { title: f.title, film_type: 'feature' }))
        ;(shortResult.data || []).forEach((f: any) => titleMap.set(f.id, { title: f.title, film_type: 'short' }))
        ;(spResult.data || []).forEach((f: any) => titleMap.set(f.id, { title: f.program_name, film_type: 'shorts_program' }))
        ;(progResult.data || []).forEach((f: any) => titleMap.set(f.id, { title: f.title, film_type: 'program' }))
        setFilmTitleMap(titleMap)
      } else {
        setJunctionFilmsMap(new Map())
        setJunctionSubjectsMap(new Map())
        setGuestFilmsMap(new Map())
        setGuestNameMap(new Map())
        setFilmTitleMap(new Map())
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

  // Helper: render films with subjects grouped underneath, using junction data
  const renderFilmsAndSubjects = (shoot: PhotoShootCard) => {
    const junctionFilms = junctionFilmsMap.get(shoot.id) || []
    const junctionSubjects = junctionSubjectsMap.get(shoot.id) || []

    if (junctionFilms.length === 0 && junctionSubjects.length === 0) {
      // Fall back to display strings if no junction data
      if (shoot.film_program_display_combined || shoot.subjects_display_combined) {
        return (
          <div>
            {shoot.film_program_display_combined && <div className="font-medium">{shoot.film_program_display_combined}</div>}
            {shoot.subjects_display_combined && <div className="text-xs text-gray-600 ml-2">{shoot.subjects_display_combined}</div>}
          </div>
        )
      }
      return '—'
    }

    // Build subjects list with names from source
    const subjects = junctionSubjects.map(js => ({
      name: guestNameMap.get(js.guest_id) || 'Unknown',
      guest_id: js.guest_id,
    }))

    // Build films from junction data with real titles
    const films = junctionFilms.map(jf => {
      const filmInfo = filmTitleMap.get(jf.film_id)
      return {
        title: filmInfo?.title || 'Unknown Film',
        film_id: jf.film_id,
        film_type: jf.film_type,
      }
    })

    // Scope subjects to films using guest_films
    const assignedGuestIds = new Set<string>()
    const filmsWithSubjects = films.map(film => {
      const filmSubjects = subjects.filter(s => {
        const guestFilms = guestFilmsMap.get(s.guest_id)
        if (guestFilms && guestFilms.has(film.film_id)) {
          assignedGuestIds.add(s.guest_id)
          return true
        }
        return false
      })
      return { ...film, subjects: filmSubjects }
    })

    const ungroupedSubjects = subjects.filter(s => !assignedGuestIds.has(s.guest_id))

    // Add free text subjects to ungrouped
    if (shoot.subjects_description) {
      const freeTextNames = shoot.subjects_description.split(',').map((n: string) => n.trim()).filter(Boolean)
      freeTextNames.forEach(name => {
        ungroupedSubjects.push({ name, guest_id: undefined as any })
      })
    }

    // Add free text films (film_program_description) that aren't in junction data
    const freeTextFilmEntries: string[] = []
    if (shoot.film_program_description) {
      shoot.film_program_description.split(',').map((t: string) => t.trim()).filter(Boolean).forEach((title: string) => {
        freeTextFilmEntries.push(title)
      })
    }

    return (
      <div className="space-y-1">
        {freeTextFilmEntries.map((title, idx) => (
          <div key={`freetext-film-${idx}`} className="border-l-2 border-gray-200 pl-2">
            <div className="font-medium text-gray-900">{title}</div>
          </div>
        ))}
        {filmsWithSubjects.map((film, filmIndex) => (
          <div key={filmIndex} className="border-l-2 border-blue-200 pl-2">
            <div className="font-medium">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openFilmCard(film.film_id, film.film_type)
                }}
                className="text-blue-600 hover:text-blue-800 hover:underline text-left"
              >
                {film.title}
              </button>
            </div>
            {film.subjects.length > 0 && (
              <div className="text-xs text-gray-600 ml-2">
                {film.subjects.map((subject, subjectIndex) => (
                  <span key={subjectIndex}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openGuestCard(subject.guest_id)
                      }}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {subject.name}
                    </button>
                    {subjectIndex < film.subjects.length - 1 && <span className="text-gray-400">, </span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {ungroupedSubjects.length > 0 && (
          <div className="border-l-2 border-gray-200 pl-2">
            <div className="text-xs text-gray-600 ml-2">
              {ungroupedSubjects.map((subject, index) => (
                <span key={`ungrouped-${index}`}>
                  {subject.guest_id ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openGuestCard(subject.guest_id)
                      }}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {subject.name}
                    </button>
                  ) : (
                    <span className="text-gray-900">{subject.name}</span>
                  )}
                  {index < ungroupedSubjects.length - 1 && <span className="text-gray-400">, </span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">📸 Photo Shoots</h1>
            <p className="text-sm text-gray-600 mt-1">
              {sortedPhotoShoots.length} of {photoShoots.length} photo shoots
            </p>
          </div>
          <div className="hidden md:flex flex-wrap items-center gap-3">
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
                className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 font-medium"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    { key: 'films_subjects', label: 'Films & Subjects', width: 300, sortable: false },
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
                        column.key === 'films_subjects' ? 'sticky left-0 bg-gray-50 z-10' : ''
                      }`}
                      style={{
                        width: columnWidths[column.key] || column.width,
                        minWidth: column.key === 'films_subjects' ? `${column.width}px` : '100px',
                        maxWidth: column.key === 'films_subjects' ? `${columnWidths[column.key] || column.width}px` : 'none',
                        left: '0px'
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
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 sticky left-0 bg-white z-10" style={{ minWidth: `${columnWidths['films_subjects'] || 300}px`, maxWidth: `${columnWidths['films_subjects'] || 300}px` }}>
                      {renderFilmsAndSubjects(shoot)}
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
                    <td colSpan={canEditPhotoShoots ? 12 : 11} className="px-6 py-12 text-center text-gray-500">
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
