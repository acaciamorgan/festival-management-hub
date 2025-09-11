'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { FilmCard, ProgramCard, VenueCard, GuestCard } from '@/types'
import { FilmCardPopup } from '@/components/cards/film-card-popup'
import { GuestCardPopup } from '@/components/cards/guest-card-popup'
import { ProgramCardPopup } from '@/components/cards/program-card-popup'
import { FilmEditModal } from '@/components/forms/film-edit-modal'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'
import { normalizeDateValue } from '@/lib/date-utils'
import * as XLSX from 'xlsx-js-style'

interface FeatureFilm {
  id: string
  title: string
  source: string
  original_language_title: string
  director: string
  countries: string
  programs: string // combined program_1, program_2, etc.
  genres: string // combined genre_1, genre_2, etc.
  run_time: number
  language: string
  subtitles: string
  captions: string
  original_release_year: number
  principal_cast: string
  screenwriter: string
  cinematographer: string
  editor: string
  animator: string
  sound_designer: string
  music_score: string
  producer: string
  executive_producer: string
  archivist: string
  production_companies: string
  film_website: string
  trailer_url: string
  premiere_status: string
  content_considerations: string
  // Original separate fields for database operations
  program_1?: string
  program_2?: string
  program_3?: string
  program_4?: string
  genre_1?: string
  genre_2?: string
  genre_3?: string
  genre_4?: string
}

interface ShortFilm {
  id: string
  title: string
  source: string
  original_language_title: string
  director: string
  countries: string
  run_time: number
  language: string
  subtitles: string
  captions: string
  original_release_year: number
  principal_cast: string
  screenwriter: string
  cinematographer: string
  editor: string
  animator: string
  sound_designer: string
  music_score: string
  producer: string
  executive_producer: string
  archivist: string
  production_companies: string
  film_website: string
  trailer_url: string
  content_considerations: string
  shorts_program_id: string
  program_order: number
  // Festival Programs (separate from Shorts Programs)
  program_1?: string
  program_2?: string
  program_3?: string
  genre_1?: string
  genre_2?: string
  genre_3?: string
  // Combined display fields
  programs: string // combined program_1, program_2, etc.
  genres: string // combined genre_1, genre_2, etc.
  shorts_program?: {
    program_name: string
  }
}

type ViewMode = 'features' | 'shorts' | 'programs'

export default function TitlesPage() {
  const { } = useAuth()
  const { permissions } = usePermissions()
  const [viewMode, setViewMode] = useState<ViewMode>('features')
  const [films, setFilms] = useState<FeatureFilm[]>([])
  const [shorts, setShorts] = useState<ShortFilm[]>([])
  const [programs, setPrograms] = useState<ProgramCard[]>([])
  const [filteredFilms, setFilteredFilms] = useState<FeatureFilm[]>([])
  const [filteredShorts, setFilteredShorts] = useState<ShortFilm[]>([])
  const [filteredPrograms, setFilteredPrograms] = useState<ProgramCard[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedPremiereStatus, setSelectedPremiereStatus] = useState('')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [selectedFilm, setSelectedFilm] = useState<FeatureFilm | ShortFilm | null>(null)
  const [showCreateProgramModal, setShowCreateProgramModal] = useState(false)
  const [editingProgram, setEditingProgram] = useState<any>(null)
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ProgramCard | null>(null)
  const [showIndustryDaysOnly, setShowIndustryDaysOnly] = useState(false)
  const [editingFilm, setEditingFilm] = useState<FeatureFilm | ShortFilm | null>(null)
  const [editingFilmType, setEditingFilmType] = useState<'feature' | 'short'>('feature')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showGuestCard, setShowGuestCard] = useState<GuestCard | null>(null)
  const [showProgramCard, setShowProgramCard] = useState<ProgramCard | null>(null)
  const [showGuestMode, setShowGuestMode] = useState(false)
  const [confirmedGuests, setConfirmedGuests] = useState<Set<string>>(new Set())
  const [showAddFilmModal, setShowAddFilmModal] = useState(false)
  
  const supabase = createClient()

  // Check if user has edit permissions for titles module
  const canEditTitles = permissions?.modulePermissions?.['titles']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false

  // Export template function for Features
  const exportFeaturesTemplate = () => {
    // Define headers with proper display names
    const headerMapping = [
      { field: 'title', display: 'Title' },
      { field: 'source', display: 'Source' },
      { field: 'original_language_title', display: 'Original Language Title' },
      { field: 'director', display: 'Director' },
      { field: 'countries', display: 'Countries' },
      { field: 'original_release_year', display: 'Original Release Year' },
      { field: 'run_time', display: 'Run Time' },
      { field: 'language', display: 'Language' },
      { field: 'subtitles', display: 'Subtitles' },
      { field: 'captions', display: 'Captions' },
      { field: 'program_1', display: 'Program 1' },
      { field: 'program_2', display: 'Program 2' },
      { field: 'program_3', display: 'Program 3' },
      { field: 'program_4', display: 'Program 4' },
      { field: 'genre_1', display: 'Genre 1' },
      { field: 'genre_2', display: 'Genre 2' },
      { field: 'genre_3', display: 'Genre 3' },
      { field: 'genre_4', display: 'Genre 4' },
      { field: 'premiere_status', display: 'Premiere Status' },
      { field: 'principal_cast', display: 'Principal Cast' },
      { field: 'screenwriter', display: 'Screenwriter' },
      { field: 'cinematographer', display: 'Cinematographer' },
      { field: 'editor', display: 'Editor' },
      { field: 'animator', display: 'Animator' },
      { field: 'sound_designer', display: 'Sound Designer' },
      { field: 'music_score', display: 'Music Score' },
      { field: 'producer', display: 'Producer' },
      { field: 'executive_producer', display: 'Executive Producer' },
      { field: 'archivist', display: 'Archivist' },
      { field: 'production_companies', display: 'Production Companies' },
      { field: 'film_website', display: 'Film Website' },
      { field: 'trailer_url', display: 'Trailer URL' },
      { field: 'content_considerations', display: 'Content Considerations' }
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
    
    XLSX.utils.book_append_sheet(wb, ws, 'Features Template')
    XLSX.writeFile(wb, 'features_import_template.xlsx')
  }

  // Export template function for Shorts
  const exportShortsTemplate = () => {
    // Define headers with proper display names
    const headerMapping = [
      { field: 'title', display: 'Title' },
      { field: 'source', display: 'Source' },
      { field: 'original_language_title', display: 'Original Language Title' },
      { field: 'director', display: 'Director' },
      { field: 'countries', display: 'Countries' },
      { field: 'original_release_year', display: 'Original Release Year' },
      { field: 'run_time', display: 'Run Time' },
      { field: 'language', display: 'Language' },
      { field: 'subtitles', display: 'Subtitles' },
      { field: 'captions', display: 'Captions' },
      { field: 'shorts_program_id', display: 'Shorts Program ID' },
      { field: 'shorts_program_name', display: 'Shorts Program Name' },
      { field: 'program_order', display: 'Program Order' },
      { field: 'program_1', display: 'Program 1' },
      { field: 'program_2', display: 'Program 2' },
      { field: 'program_3', display: 'Program 3' },
      { field: 'genre_1', display: 'Genre 1' },
      { field: 'genre_2', display: 'Genre 2' },
      { field: 'genre_3', display: 'Genre 3' },
      { field: 'principal_cast', display: 'Principal Cast' },
      { field: 'screenwriter', display: 'Screenwriter' },
      { field: 'cinematographer', display: 'Cinematographer' },
      { field: 'editor', display: 'Editor' },
      { field: 'animator', display: 'Animator' },
      { field: 'sound_designer', display: 'Sound Designer' },
      { field: 'music_score', display: 'Music Score' },
      { field: 'producer', display: 'Producer' },
      { field: 'executive_producer', display: 'Executive Producer' },
      { field: 'archivist', display: 'Archivist' },
      { field: 'production_companies', display: 'Production Companies' },
      { field: 'film_website', display: 'Film Website' },
      { field: 'trailer_url', display: 'Trailer URL' },
      { field: 'content_considerations', display: 'Content Considerations' }
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
    
    XLSX.utils.book_append_sheet(wb, ws, 'Shorts Template')
    XLSX.writeFile(wb, 'shorts_import_template.xlsx')
  }

  // Export template function for Programs
  const exportProgramsTemplate = () => {
    // Define headers with proper display names
    const headerMapping = [
      { field: 'program_number', display: 'Program Number' },
      { field: 'program_name', display: 'Program Name' },
      { field: 'description', display: 'Description' },
      { field: 'total_runtime', display: 'Total Runtime' }
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
    
    XLSX.utils.book_append_sheet(wb, ws, 'Programs Template')
    XLSX.writeFile(wb, 'programs_import_template.xlsx')
  }

  // Load confirmed guests only when Show Guests toggle is activated
  useEffect(() => {
    const loadConfirmedGuests = async () => {
      if (!showGuestMode) {
        setConfirmedGuests(new Set())
        return
      }

      try {
        const { data: guests, error } = await supabase
          .from('guests')
          .select('name')
          .eq('confirmed', true)

        if (!error && guests) {
          setConfirmedGuests(new Set(guests.map(g => g.name)))
        }
      } catch (error) {
        console.error('Error loading confirmed guest names:', error)
      }
    }

    loadConfirmedGuests()
  }, [showGuestMode, supabase])

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

      if (error || !guestData) {
        console.warn('Guest not found in database:', guestName)
        return
      }

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
    }
  }

  const renderPersonName = (name: string | undefined) => {
    if (!name) return '—'
    
    // Split by comma and check each name for guest card existence
    const names = name.split(',').map(n => n.trim()).filter(n => n)
    if (names.length === 0) return '—'
    
    return (
      <div className="flex flex-wrap gap-1">
        {names.map((personName, index) => {
          // Only show as clickable if Show Guests mode is on AND person is a confirmed guest
          const isConfirmedGuest = showGuestMode && confirmedGuests.has(personName)
          
          return (
            <span key={index}>
              {isConfirmedGuest ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openGuestCard(personName)
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                >
                  {personName}
                </button>
              ) : (
                <span className="text-gray-900">{personName}</span>
              )}
              {index < names.length - 1 && <span className="text-gray-400">, </span>}
            </span>
          )
        })}
      </div>
    )
  }

  const loadFilms = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('feature_films')
        .select('*')
        .order('title')
      
      if (error) {
        console.error('Error loading title cards:', error)
      } else {
        // Debug: Check for Mistress Dispeller specifically
        const mistressFilm = (data || []).find(film => film.title === 'Mistress Dispeller')
        if (mistressFilm) {
          console.log('DEBUG: Mistress Dispeller found in database:', mistressFilm)
        } else {
          console.log('DEBUG: Mistress Dispeller NOT found in database')
          console.log('DEBUG: Total films in database:', (data || []).length)
          console.log('DEBUG: Films starting with M:', (data || []).filter(f => f.title?.startsWith('M')).map(f => f.title))
        }
        // Combine program and genre fields for display
        const filmsWithCombined = (data || []).map(film => ({
          ...film,
          programs: [film.program_1, film.program_2, film.program_3, film.program_4]
            .filter(Boolean).join(', '),
          genres: [film.genre_1, film.genre_2, film.genre_3, film.genre_4]
            .filter(Boolean).join(', ')
        }))
        
        setFilms(filmsWithCombined)
        setFilteredFilms(filmsWithCombined)
      }
    } catch (error) {
      console.error('Error loading title cards:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const loadShorts = useCallback(async () => {
    setLoading(true)
    try {
      // First get all short films with proper ordering
      const { data: shortsData, error: shortsError } = await supabase
        .from('short_films')
        .select('*')
        .order('title')
      
      if (shortsError) {
        console.error('Error loading shorts:', shortsError)
        setShorts([])
        setFilteredShorts([])
        return
      }
      
      // Then get all program assignments from junction table
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('short_film_programs')
        .select(`
          short_film_id,
          program_order,
          shorts_programs(id, program_name, program_number)
        `)
        .order('shorts_program_id')
        .order('program_order')
      
      if (assignmentsError) {
        console.error('Error loading program assignments:', assignmentsError)
      }
      
      // Process shorts with their program assignments
      const processedShorts = (shortsData || []).map(short => {
        // Find all program assignments for this short
        const programAssignments = assignmentsData?.filter(a => a.short_film_id === short.id) || []
        
        // For backward compatibility, use first program assignment as primary
        const primaryAssignment = programAssignments[0]
        
        return {
          ...short,
          programs: [short.program_1, short.program_2, short.program_3]
            .filter(Boolean).join(', '),
          genres: [short.genre_1, short.genre_2, short.genre_3]
            .filter(Boolean).join(', '),
          // Keep backward compatibility with single program
          shorts_program: primaryAssignment?.shorts_programs || null,
          shorts_program_id: primaryAssignment?.shorts_programs?.id || short.shorts_program_id,
          program_order: primaryAssignment?.program_order || short.program_order,
          // New: all program assignments
          all_programs: programAssignments.map(a => a.shorts_programs)
        }
      })
      
      console.log('Loaded shorts:', processedShorts.length, 'shorts')
      console.log('Sample short:', processedShorts[0])
      setShorts(processedShorts)
      setFilteredShorts(processedShorts)
    } catch (error) {
      console.error('Error loading shorts:', error)
      setShorts([])
      setFilteredShorts([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return ''
    
    // Convert 24-hour format to 12-hour AM/PM format
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    
    return `${hour12}:${minutes} ${ampm}`
  }

  const loadPrograms = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('event_date, start_time, title')
      
      if (error) {
        console.error('Error loading programs:', error)
        setPrograms([])
        setFilteredPrograms([])
      } else {
        setPrograms(data || [])
        setFilteredPrograms(data || [])
      }
    } catch (error) {
      console.error('Error loading programs:', error)
      setPrograms([])
      setFilteredPrograms([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Sync shorts programs to feature_films table for ticketing
  const syncShortsToFeatureFilms = useCallback(async () => {
    try {
      console.log('Starting shorts sync to feature_films...')
      
      // Get all shorts programs first
      const { data: programsData, error: programsError } = await supabase
        .from('shorts_programs')
        .select('id, program_name')
      
      if (programsError) {
        console.error('Error fetching shorts programs:', programsError)
        throw programsError
      }
      
      console.log('Raw programs data:', programsData)
      
      // Then get films for each program separately
      const programsWithFilms = await Promise.all(
        (programsData || []).map(async (program) => {
          const { data: filmsData, error: filmsError } = await supabase
            .from('short_films') 
            .select('id, title, run_time')
            .eq('shorts_program_id', program.id)
          
          if (filmsError) {
            console.error(`Error fetching films for program ${program.program_name}:`, filmsError)
          }
          
          console.log(`Films for ${program.program_name}:`, filmsData?.length || 0)
          
          return {
            ...program,
            short_films: filmsData || []
          }
        })
      )
      
      console.log('Found shorts programs:', programsWithFilms?.length || 0)
      programsWithFilms?.forEach(p => console.log('Program:', p.program_name))
      
      for (const program of programsWithFilms || []) {
        const totalRuntime = program.short_films?.reduce((total: number, film: any) => {
          return total + (film.run_time || 0)
        }, 0) || 0
        
        console.log(`Processing program: ${program.program_name}, runtime: ${totalRuntime}min`)
        
        // Check if program already exists in feature_films
        const { data: existingFilm, error: checkError } = await supabase
          .from('feature_films')
          .select('id')
          .eq('title', program.program_name)
          .single()
        
        const filmData = {
          title: program.program_name,
          source: 'Shorts Program',
          original_language_title: program.program_name,
          director: 'Multiple Directors',
          countries: '',
          run_time: totalRuntime,
          language: 'Multiple Languages',
          subtitles: '',
          captions: '',
          original_release_year: 2024,
          screenwriter: '',
          cinematographer: '',
          animator: '',
          editor: '',
          principal_cast: '',
          sound_designer: '',
          music_score: '',
          producer: '',
          executive_producer: '',
          archivist: '',
          production_companies: '',
          film_website: '',
          trailer_url: '',
          premiere_status: '',
          content_considerations: ''
        }
        
        if (existingFilm) {
          // Update existing entry
          console.log(`Updating existing program: ${program.program_name}`)
          const { error: updateError } = await supabase
            .from('feature_films')
            .update(filmData)
            .eq('id', existingFilm.id)
          
          if (updateError) {
            console.error(`Error updating ${program.program_name}:`, updateError)
            throw updateError
          }
        } else {
          // Insert new entry  
          console.log(`Inserting new program: ${program.program_name}`)
          const { error: insertError } = await supabase
            .from('feature_films')
            .insert([filmData])
          
          if (insertError) {
            console.error(`Error inserting ${program.program_name}:`, insertError)
            throw insertError
          }
        }
      }
      
      console.log('Shorts programs synced to feature_films successfully')
    } catch (error) {
      console.error('Error syncing shorts programs:', error)
    }
  }, [supabase])

  // Get unique values for filters
  const uniquePrograms = useMemo(() => {
    const programs = new Set<string>()
    if (viewMode === 'features') {
      films.forEach(film => {
        [film.program_1, film.program_2, film.program_3, film.program_4]
          .filter((program): program is string => Boolean(program))
          .forEach(program => programs.add(program))
      })
    } else if (viewMode === 'shorts') {
      shorts.forEach(short => {
        [short.program_1, short.program_2, short.program_3]
          .filter((program): program is string => Boolean(program))
          .forEach(program => programs.add(program))
      })
    }
    return Array.from(programs).sort()
  }, [films, shorts, viewMode])

  const uniqueGenres = useMemo(() => {
    const genres = new Set<string>()
    if (viewMode === 'features') {
      films.forEach(film => {
        [film.genre_1, film.genre_2, film.genre_3, film.genre_4]
          .filter((genre): genre is string => Boolean(genre))
          .forEach(genre => genres.add(genre))
      })
    } else if (viewMode === 'shorts') {
      shorts.forEach(short => {
        [short.genre_1, short.genre_2, short.genre_3]
          .filter((genre): genre is string => Boolean(genre))
          .forEach(genre => genres.add(genre))
      })
    }
    return Array.from(genres).sort()
  }, [films, shorts, viewMode])

  const uniquePremiereStatuses = useMemo(() => {
    const statuses = new Set<string>()
    if (viewMode === 'features') {
      films.forEach(film => {
        if (film.premiere_status) statuses.add(film.premiere_status)
      })
    } else if (viewMode === 'shorts') {
      shorts.forEach(short => {
        if (short.premiere_status) statuses.add(short.premiere_status)
      })
    }
    return Array.from(statuses).sort()
  }, [films, shorts, viewMode])

  // Normalize text for sorting (remove articles and special chars)
  const normalizeForSort = (text: string | undefined): string => {
    if (!text) return ''
    return text
      .toLowerCase()
      .replace(/^(the|a|an)\s+/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
  }

  // Search functionality
  const generateSearchSuggestions = (term: string) => {
    if (term.length < 2) return []
    
    const suggestions = new Set<string>()
    const searchLower = term.toLowerCase()
    
    films.forEach(film => {
      // Search in titles
      if (film.title?.toLowerCase().includes(searchLower)) {
        suggestions.add(film.title)
      }
      if (film.original_language_title?.toLowerCase().includes(searchLower)) {
        suggestions.add(film.original_language_title)
      }
      
      // Search in names (director, cast, crew)
      const nameFields = [
        film.director, film.screenwriter, film.cinematographer, 
        film.animator, film.editor, film.principal_cast,
        film.sound_designer, film.music_score, film.producer, 
        film.executive_producer
      ]
      
      nameFields.forEach(field => {
        if (field) {
          field.split(',').forEach(name => {
            if (name.trim().toLowerCase().includes(searchLower)) {
              suggestions.add(name.trim())
            }
          })
        }
      })
      
      // Search in countries
      if (film.countries?.toLowerCase().includes(searchLower)) {
        film.countries.split(',').forEach(country => {
          if (country.trim().toLowerCase().includes(searchLower)) {
            suggestions.add(country.trim())
          }
        })
      }
    })
    
    return Array.from(suggestions).slice(0, 10)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (term.length >= 2) {
      const suggestions = generateSearchSuggestions(term)
      setSearchSuggestions(suggestions)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  // Filtering and sorting
  const applyFiltersAndSort = useMemo(() => {
    const currentData = viewMode === 'features' ? films : shorts
    const filtered = currentData.filter(item => {
      // Search filter (accent-insensitive)
      if (searchTerm) {
        const searchableFields = [
          item.title, item.original_language_title, item.director,
          item.countries, item.screenwriter, item.cinematographer,
          item.animator, item.editor, item.principal_cast,
          item.sound_designer, item.music_score, item.producer,
          item.executive_producer, item.production_companies
        ]
        
        const accentInsensitiveFilter = createAccentInsensitiveFilter(
          searchTerm,
          () => searchableFields
        )
        
        if (!accentInsensitiveFilter(item)) return false
      }
      
      // Program filter
      if (selectedProgram) {
        const programFields = viewMode === 'features' 
          ? [(item as FeatureFilm).program_1, (item as FeatureFilm).program_2, (item as FeatureFilm).program_3, (item as FeatureFilm).program_4]
          : [(item as ShortFilm).program_1, (item as ShortFilm).program_2, (item as ShortFilm).program_3]
        const hasProgram = programFields.some(program => program === selectedProgram)
        if (!hasProgram) return false
      }
      
      // Genre filter
      if (selectedGenre) {
        const genreFields = viewMode === 'features'
          ? [(item as FeatureFilm).genre_1, (item as FeatureFilm).genre_2, (item as FeatureFilm).genre_3, (item as FeatureFilm).genre_4]
          : [(item as ShortFilm).genre_1, (item as ShortFilm).genre_2, (item as ShortFilm).genre_3]
        const hasGenre = genreFields.some(genre => genre === selectedGenre)
        if (!hasGenre) return false
      }
      
      // Premiere status filter
      if (selectedPremiereStatus && item.premiere_status !== selectedPremiereStatus) {
        return false
      }
      
      return true
    })

    // Apply sorting
    if (sortConfig) {
      console.log('Applying sort:', sortConfig.key, sortConfig.direction)
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof (FeatureFilm | ShortFilm)]
        const bVal = b[sortConfig.key as keyof (FeatureFilm | ShortFilm)]
        
        if (sortConfig.key === 'title') {
          console.log('Sorting titles:', aVal, 'vs', bVal)
        }
        
        const aNorm = normalizeForSort(aVal?.toString())
        const bNorm = normalizeForSort(bVal?.toString())
        
        if (aNorm < bNorm) return sortConfig.direction === 'asc' ? -1 : 1
        if (aNorm > bNorm) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
      console.log('Sorted result sample:', filtered.slice(0, 3).map(f => f.title))
    }

    return filtered
  }, [films, shorts, searchTerm, selectedProgram, selectedGenre, selectedPremiereStatus, sortConfig, viewMode])

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  useEffect(() => {
    if (viewMode === 'features') {
      setFilteredFilms(applyFiltersAndSort as FeatureFilm[])
    } else if (viewMode === 'shorts') {
      setFilteredShorts(applyFiltersAndSort as ShortFilm[])
    }
  }, [applyFiltersAndSort, viewMode])

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
        // Skip \r\n combinations
        if (char === '\r' && nextChar === '\n') {
          i++
        }
      } else {
        currentField += char
      }
      i++
    }

    // Add final field/row
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
    console.log('Starting CSV upload, file name:', file.name)

    try {
      const text = await file.text()
      console.log('File text length:', text.length)
      const rows = parseCSV(text)
      console.log('Parsed rows:', rows.length)
      
      if (rows.length === 0) {
        setUploadStatus('Error: CSV file is empty')
        return
      }

      // Find the row that contains the complete headers (look for key fields)
      let headerRowIndex = 0
      let headers: string[] = []
      
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const row = rows[i]
        // Look for essential header fields that indicate this is the header row
        // Check for basic required fields that should be in any film CSV
        if ((row.some(cell => cell && cell.toLowerCase().includes('title')) || 
             row.some(cell => cell && cell.toLowerCase().includes('film'))) && 
            (row.some(cell => cell && cell.toLowerCase().includes('director')) ||
             row.some(cell => cell && cell.toLowerCase().includes('source')))) {
          headerRowIndex = i
          headers = row
          console.log(`Found headers at row ${i}:`, headers)
          break
        }
      }
      
      // Fallback to first row if header detection fails
      if (headers.length === 0) {
        headers = rows[0]
        headerRowIndex = 0
        console.log('Using first row as headers:', headers)
      }
      
      console.log('Using header row index:', headerRowIndex)
      console.log('Headers found:', headers)
      console.log('Headers length:', headers.length)
      
      // Debug: show first few data rows
      if (rows.length > headerRowIndex + 1) {
        console.log('Sample data row:', rows[headerRowIndex + 1])
      }
      
      // Respect the current tab context when determining how to process the CSV
      // If user is on Shorts tab, process as shorts. If on Features tab, process as features.
      // This ensures uploads stay in the correct tab as expected by the user.
      const shouldProcessAsShorts = viewMode === 'shorts'
      
      console.log('Current view mode:', viewMode)
      console.log('Processing as:', shouldProcessAsShorts ? 'shorts' : 'features')

      if (shouldProcessAsShorts) {
        await processShortsCSV(rows, headers, headerRowIndex)
      } else {
        await processFeatureFilmsCSV(rows, headers)
      }
    } catch (error) {
      console.error('CSV processing error:', error)
      setUploadStatus(`Error processing CSV: ${error}`)
    } finally {
      setUploading(false)
      // Clear the file input
      event.target.value = ''
    }
  }

  // Fixed header mapping for the exact CSV format
  const getColumnIndex = (headers: string[], targetHeader: string): number => {
    return headers.findIndex(header => 
      header && header.trim() === targetHeader
    )
  }

  const processFeatureFilmsCSV = async (rows: string[][], headers: string[]) => {
    setUploadStatus('Processing feature films CSV...')
    console.log('Headers found:', headers)
    
    // Exact header mapping for the fixed CSV format
    const indices = {
      title: getColumnIndex(headers, 'Title'),
      source: getColumnIndex(headers, 'Source'),
      original_language_title: getColumnIndex(headers, 'Original Language Title'),
      director: getColumnIndex(headers, 'Director'),
      countries: getColumnIndex(headers, 'Countries'),
      program_1: getColumnIndex(headers, 'Program 1'),
      program_2: getColumnIndex(headers, 'Program 2'),
      program_3: getColumnIndex(headers, 'Program 3'),
      program_4: getColumnIndex(headers, 'Program 4'),
      genre_1: getColumnIndex(headers, 'Genre 1'),
      genre_2: getColumnIndex(headers, 'Genre 2'),
      genre_3: getColumnIndex(headers, 'Genre 3'),
      genre_4: getColumnIndex(headers, 'Genre 4'),
      run_time: getColumnIndex(headers, 'Run Time'),
      language: getColumnIndex(headers, 'Language'),
      subtitles: getColumnIndex(headers, 'Subtitles'),
      captions: getColumnIndex(headers, 'Captions'),
      original_release_year: getColumnIndex(headers, 'Original Release Year'),
      screenwriter: getColumnIndex(headers, 'Screenwriter'),
      cinematographer: getColumnIndex(headers, 'Cinematographer'),
      animator: getColumnIndex(headers, 'Animator'),
      editor: getColumnIndex(headers, 'Editor'),
      principal_cast: getColumnIndex(headers, 'Principal Cast'),
      sound_designer: getColumnIndex(headers, 'Sound Designer'),
      music_score: getColumnIndex(headers, 'Music Score'),
      producer: getColumnIndex(headers, 'Producer'),
      executive_producer: getColumnIndex(headers, 'Executive Producer'),
      production_companies: getColumnIndex(headers, 'Production Companies'),
      film_website: getColumnIndex(headers, 'Film Website'),
      trailer_url: getColumnIndex(headers, 'Trailer URL'),
      premiere_status: getColumnIndex(headers, 'Premiere Status'),
      content_considerations: getColumnIndex(headers, 'Content Considerations')
    }

    console.log('Column indices found:', indices)
    console.log('First few headers:', headers.slice(0, 10))
    console.log('Looking for Title at indices:', indices.title)
    if (rows.length > 1) console.log('Sample data row:', rows[1])
    
    // Check if we found required indices
    if (indices.title === -1) {
      setUploadStatus('Error: Could not find Title column in CSV headers')
      return
    }
    
    const filmsToInsert = []
    
    // Process each data row using the column indices
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      
      // Skip completely empty rows or rows where all cells are empty
      if (!row || row.length === 0 || row.every(cell => !cell || !cell.trim())) {
        continue
      }
      
      // Debug specific film
      const titleValue = row[indices.title]?.trim()
      if (titleValue === 'Mistress Dispeller') {
        console.log(`DEBUG: Found Mistress Dispeller at row ${i + 1}`)
        console.log('Raw row data:', row)
        console.log('Title value:', titleValue)
      }
      
      const filmData: any = {}
      
      // Extract data using column indices - only include fields that have valid indices
      // Clean function to remove null characters and other problematic Unicode
      const cleanText = (text: string) => text.replace(/\u0000/g, '').trim()
      
      if (indices.title !== -1 && row[indices.title]?.trim()) {
        filmData.title = cleanText(row[indices.title])
      }
      if (indices.source !== -1 && row[indices.source]?.trim()) {
        filmData.source = cleanText(row[indices.source])
      }
      if (indices.original_language_title !== -1 && row[indices.original_language_title]?.trim()) {
        filmData.original_language_title = cleanText(row[indices.original_language_title])
      }
      if (indices.director !== -1 && row[indices.director]?.trim()) {
        filmData.director = cleanText(row[indices.director])
      }
      if (indices.countries !== -1 && row[indices.countries]?.trim()) {
        filmData.countries = cleanText(row[indices.countries])
      }
      if (indices.program_1 !== -1 && row[indices.program_1]?.trim()) {
        filmData.program_1 = cleanText(row[indices.program_1])
      }
      if (indices.program_2 !== -1 && row[indices.program_2]?.trim()) {
        filmData.program_2 = cleanText(row[indices.program_2])
      }
      if (indices.program_3 !== -1 && row[indices.program_3]?.trim()) {
        filmData.program_3 = cleanText(row[indices.program_3])
      }
      if (indices.program_4 !== -1 && row[indices.program_4]?.trim()) {
        filmData.program_4 = cleanText(row[indices.program_4])
      }
      if (indices.genre_1 !== -1 && row[indices.genre_1]?.trim()) {
        filmData.genre_1 = cleanText(row[indices.genre_1])
      }
      if (indices.genre_2 !== -1 && row[indices.genre_2]?.trim()) {
        filmData.genre_2 = cleanText(row[indices.genre_2])
      }
      if (indices.genre_3 !== -1 && row[indices.genre_3]?.trim()) {
        filmData.genre_3 = cleanText(row[indices.genre_3])
      }
      if (indices.genre_4 !== -1 && row[indices.genre_4]?.trim()) {
        filmData.genre_4 = cleanText(row[indices.genre_4])
      }
      if (indices.run_time !== -1 && row[indices.run_time]?.trim()) {
        const runtime = parseInt(row[indices.run_time].trim())
        if (!isNaN(runtime)) filmData.run_time = runtime
      }
      if (indices.language !== -1 && row[indices.language]?.trim()) {
        filmData.language = cleanText(row[indices.language])
      }
      if (indices.subtitles !== -1 && row[indices.subtitles]?.trim()) {
        filmData.subtitles = cleanText(row[indices.subtitles])
      }
      if (indices.captions !== -1 && row[indices.captions]?.trim()) {
        filmData.captions = cleanText(row[indices.captions])
      }
      if (indices.original_release_year !== -1 && row[indices.original_release_year]?.trim()) {
        const year = parseInt(row[indices.original_release_year].trim())
        if (!isNaN(year)) filmData.original_release_year = year
      }
      if (indices.screenwriter !== -1 && row[indices.screenwriter]?.trim()) {
        filmData.screenwriter = cleanText(row[indices.screenwriter])
      }
      if (indices.cinematographer !== -1 && row[indices.cinematographer]?.trim()) {
        filmData.cinematographer = cleanText(row[indices.cinematographer])
      }
      if (indices.animator !== -1 && row[indices.animator]?.trim()) {
        filmData.animator = cleanText(row[indices.animator])
      }
      if (indices.editor !== -1 && row[indices.editor]?.trim()) {
        filmData.editor = cleanText(row[indices.editor])
      }
      if (indices.principal_cast !== -1 && row[indices.principal_cast]?.trim()) {
        filmData.principal_cast = cleanText(row[indices.principal_cast])
      }
      if (indices.sound_designer !== -1 && row[indices.sound_designer]?.trim()) {
        filmData.sound_designer = cleanText(row[indices.sound_designer])
      }
      if (indices.music_score !== -1 && row[indices.music_score]?.trim()) {
        filmData.music_score = cleanText(row[indices.music_score])
      }
      if (indices.producer !== -1 && row[indices.producer]?.trim()) {
        filmData.producer = cleanText(row[indices.producer])
      }
      if (indices.executive_producer !== -1 && row[indices.executive_producer]?.trim()) {
        filmData.executive_producer = cleanText(row[indices.executive_producer])
      }
      if (indices.production_companies !== -1 && row[indices.production_companies]?.trim()) {
        filmData.production_companies = cleanText(row[indices.production_companies])
      }
      if (indices.film_website !== -1 && row[indices.film_website]?.trim()) {
        filmData.film_website = cleanText(row[indices.film_website])
      }
      if (indices.trailer_url !== -1 && row[indices.trailer_url]?.trim()) {
        filmData.trailer_url = cleanText(row[indices.trailer_url])
      }
      if (indices.premiere_status !== -1 && row[indices.premiere_status]?.trim()) {
        filmData.premiere_status = cleanText(row[indices.premiere_status])
      }
      if (indices.content_considerations !== -1 && row[indices.content_considerations]?.trim()) {
        filmData.content_considerations = cleanText(row[indices.content_considerations])
      }
      
      // Only add if we have at least a title
      if (filmData.title) {
        filmsToInsert.push(filmData)
        // Debug specific film
        if (filmData.title === 'Mistress Dispeller') {
          console.log('DEBUG: Mistress Dispeller added to filmsToInsert:', filmData)
        }
      } else if (titleValue === 'Mistress Dispeller') {
        console.log('DEBUG: Mistress Dispeller EXCLUDED - no title in filmData')
      }
    }
    
    console.log(`Parsed ${filmsToInsert.length} films from CSV`)
    
    if (filmsToInsert.length === 0) {
      setUploadStatus('Error: No valid films found in CSV. Check that your CSV has a Title column and data rows.')
      return
    }

    setUploadStatus(`Processing ${filmsToInsert.length} films...`)

    // Get existing title cards
    const { data: existingCards, error: fetchError } = await supabase
      .from('feature_films')
      .select('*')
    
    if (fetchError) {
      setUploadStatus(`Error loading existing cards: ${fetchError.message}`)
      return
    }
    
    let created = 0
    let updated = 0
    
    for (const filmData of filmsToInsert) {
      if (!filmData.title) continue
      
      // Debug specific film
      if (filmData.title === 'Mistress Dispeller') {
        console.log('DEBUG: Processing Mistress Dispeller for database insert')
      }
      
      // Check if Card with this exact title already exists
      const existingCard = (existingCards || []).find(card => card.title === filmData.title)
      
      if (existingCard) {
        // UPDATE existing Card - newest data takes priority
        const { error } = await supabase
          .from('feature_films')
          .update({ ...filmData })
          .eq('id', existingCard.id)
        
        if (error) {
          console.error(`Error updating card "${filmData.title}":`, error)
          if (filmData.title === 'Mistress Dispeller') {
            console.log('DEBUG: Mistress Dispeller update error details:', error)
          }
        } else {
          updated++
          if (filmData.title === 'Mistress Dispeller') {
            console.log('DEBUG: Mistress Dispeller updated successfully')
          }
        }
      } else {
        // CREATE new Card
        const { error } = await supabase
          .from('feature_films')
          .insert([filmData])
        
        if (error) {
          console.error(`Error creating card "${filmData.title}":`, error)
          if (filmData.title === 'Mistress Dispeller') {
            console.log('DEBUG: Mistress Dispeller insert error details:', error)
          }
        } else {
          created++
          if (filmData.title === 'Mistress Dispeller') {
            console.log('DEBUG: Mistress Dispeller created successfully')
          }
        }
      }
    }

    setUploadStatus(`Successfully processed ${filmsToInsert.length} films! Created: ${created}, Updated: ${updated}`)
    console.log(`CSV Upload Complete - Created: ${created}, Updated: ${updated}`)
    await loadFilms() // Reload the Cards
  }

  const processSimpleShortsCSV = async (rows: string[][], headers: string[]) => {
    setUploadStatus('Processing shorts CSV...')

    // Create exact header mapping based on your CSV
    const fieldMap: Record<string, string> = {
      'Film Title': 'title',
      'Source': 'source',
      'Original Language Title': 'original_language_title',
      'Language': 'language',
      'Subtitles? (Yes or No)': 'subtitles',
      'Run time': 'run_time',
      'Director': 'director',
      'Country/ies (Please list United Kingdom or United States for UK and US.\nExample for multiple countries: Argentina | Brazil | Mexico)\nList Main country and then co-production countries following.': 'countries',
      'Program 1': 'program_1',
      'Program 2': 'program_2',
      'Genre 1': 'genre_1',
      'Genre 2': 'genre_2',
      'Genre 3': 'genre_3',
      'Captions (open or closed or no)': 'captions',
      'Screenwriter': 'screenwriter',
      'Cinematographer': 'cinematographer',
      'Animator': 'animator',
      'Editor': 'editor',
      'Principal Cast': 'principal_cast',
      'Music/Score': 'music_score',
      'Producer': 'producer',
      'Executive Producer': 'executive_producer',
      'Production Companies': 'production_companies',
      'Film website': 'film_website',
      'Trailer (YouTube or Vimeo only)': 'trailer_url',
      'Premiere Status': 'premiere_status',
      'Content Considerations': 'content_considerations'
    }

    const shortsToInsert: Array<any> = []
    
    console.log('CSV Headers:', headers.map((h, i) => `${i}: "${h}"`))
    console.log('Looking for Program 1 and Genre 1 in headers...')
    headers.forEach((header, index) => {
      if (header.includes('Program') || header.includes('Genre')) {
        console.log(`Header ${index}: "${header}" -> maps to: ${fieldMap[header.trim()]}`)
      }
    })
    
    // Process each row (skip program headers and empty rows)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      
      // Skip completely empty rows or rows where all cells are empty
      if (!row || row.length === 0 || row.every(cell => !cell || !cell.trim())) {
        continue
      }
      
      const rowData: any = {}
      
      // Skip rows that are program headers (no film title)
      const titleIndex = headers.findIndex(h => h.trim() === 'Film Title')
      if (!row[titleIndex] || !row[titleIndex].trim()) continue
      
      // Map each header to its value
      headers.forEach((header, index) => {
        const cleanHeader = header.trim()
        const dbField = fieldMap[cleanHeader]
        if (dbField && row[index]) {
          const value = row[index].trim()
          if (value) {
            rowData[dbField] = value
          }
        }
      })
      
      // Skip if no title
      if (!rowData.title) continue
      
      // Debug: log the first few rows to see program/genre data
      if (i <= 5) {
        console.log(`Row ${i} - Title: "${rowData.title}", Program 1: "${rowData.program_1}", Genre 1: "${rowData.genre_1}"`)
      }
      
      // Prepare short film data (no shorts_program_id - will be assigned later)
      const shortData: any = {
        title: rowData.title,
        source: rowData.source,
        original_language_title: rowData.original_language_title,
        language: rowData.language,
        subtitles: rowData.subtitles,
        director: rowData.director,
        countries: rowData.countries,
        program_1: rowData.program_1,
        program_2: rowData.program_2,
        genre_1: rowData.genre_1,
        genre_2: rowData.genre_2,
        genre_3: rowData.genre_3,
        captions: rowData.captions,
        screenwriter: rowData.screenwriter,
        cinematographer: rowData.cinematographer,
        animator: rowData.animator,
        editor: rowData.editor,
        principal_cast: rowData.principal_cast,
        music_score: rowData.music_score,
        producer: rowData.producer,
        executive_producer: rowData.executive_producer,
        production_companies: rowData.production_companies,
        film_website: rowData.film_website,
        trailer_url: rowData.trailer_url,
        content_considerations: rowData.content_considerations,
        shorts_program_id: null // Will be assigned through the UI
      }
      
      // Convert numeric fields
      if (rowData.run_time) {
        const runtime = parseInt(rowData.run_time)
        if (!isNaN(runtime)) shortData.run_time = runtime
      }
      
      shortsToInsert.push(shortData)
    }

    setUploadStatus(`Processing ${shortsToInsert.length} shorts...`)

    // Insert shorts
    let created = 0
    let updated = 0

    for (const shortData of shortsToInsert) {
      if (!shortData.title) continue

      // Check if short with this title already exists
      const { data: existingShort, error: findError } = await supabase
        .from('short_films')
        .select('*')
        .eq('title', shortData.title)
        .single()

      if (findError && findError.code !== 'PGRST116') {
        console.error('Error finding existing short:', findError)
        continue
      }

      if (existingShort) {
        // Update existing short
        const { error: updateError } = await supabase
          .from('short_films')
          .update({ ...shortData })
          .eq('id', existingShort.id)

        if (updateError) {
          console.error('Update error:', updateError)
          setUploadStatus(`Update error: ${updateError.message}`)
          return
        } else {
          updated++
        }
      } else {
        // Create new short
        const { error: insertError } = await supabase
          .from('short_films')
          .insert([shortData])

        if (insertError) {
          console.error('Insert error:', insertError)
          setUploadStatus(`Insert error: ${insertError.message}`)
          return
        } else {
          created++
        }
      }
    }

    setUploadStatus(`Successfully processed ${shortsToInsert.length} shorts! Created: ${created}, Updated: ${updated}`)
    await loadShorts() // Reload the shorts data
  }

  const processShortsCSV = async (rows: string[][], headers: string[], headerRowIndex: number = 0) => {
    setUploadStatus('Processing shorts CSV with new simple approach...')
    
    // Find column indices - match EXACT CSV headers
    const indices = {
      title: headers.indexOf('Title'),
      source: headers.indexOf('Source'),
      original_language_title: headers.indexOf('Original Language Title'),
      language: headers.indexOf('Language'),
      subtitles: headers.indexOf('Subtitles'),
      run_time: headers.indexOf('Runtime') !== -1 ? headers.indexOf('Runtime') : headers.indexOf('Run Time'),
      director: headers.indexOf('Director'),
      countries: headers.indexOf('Countries'),
      program_1: headers.indexOf('Program 1'),
      program_2: headers.indexOf('Program 2'),
      program_3: headers.indexOf('Program 3'),
      genre_1: headers.indexOf('Genre 1'),
      genre_2: headers.indexOf('Genre 2'),
      genre_3: headers.indexOf('Genre 3'),
      captions: headers.indexOf('Captions'),
      screenwriter: headers.indexOf('Screenwriter'),
      cinematographer: headers.indexOf('Cinematographer'),
      animator: headers.indexOf('Animator'),
      editor: headers.indexOf('Editor'),
      sound_designer: headers.indexOf('Sound Designer'),
      principal_cast: headers.indexOf('Principal Cast'),
      music_score: headers.indexOf('Music Score'),
      producer: headers.indexOf('Producer'),
      executive_producer: headers.indexOf('Executive Producer'),
      archivist: headers.indexOf('Archivist'),
      production_companies: headers.indexOf('Production Companies'),
      film_website: headers.indexOf('Film Website'),
      trailer_url: headers.indexOf('Trailer URL'),
      premiere_status: headers.indexOf('Premiere Status'),
      content_considerations: headers.indexOf('Content Considerations'),
      shorts_program_id: headers.indexOf('Shorts Program ID'),
      shorts_program_name: headers.indexOf('Shorts Program Name'),
      program_order: headers.indexOf('Program Order')
    }

    console.log('Column indices found:', indices)
    console.log('Headers found:', headers)
    console.log('Title column index:', indices.title)
    console.log('Run Time column index:', indices.run_time)
    console.log('Countries column index:', indices.countries)
    console.log('Language column index:', indices.language)
    
    if (indices.title === -1) {
      console.error('ERROR: Could not find title column! Headers are:', headers)
      setUploadStatus('Error: Could not find title column in CSV. Looking for "Film Title" or "Title"')
      return
    }
    
    // NEW SIMPLE APPROACH - Skip all the complex mapping
    let created = 0
    let updated = 0
    
    // Cache for program names to IDs to avoid repeated queries
    const programCache: { [key: string]: string } = {}

    // Process each row directly (start after header row)
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i]
      
      // Skip completely empty rows or rows where all cells are empty
      if (!row || row.length === 0 || row.every(cell => !cell || !cell.trim())) {
        console.log(`Skipping empty row ${i}`)
        continue
      }
      
      if (!row[indices.title]?.trim()) continue

      const title = row[indices.title]?.trim()
      if (!title) continue
      
      // Skip program header rows (they have titles in other columns but not film data)
      // These rows typically have content like "Shorts 1 - Comedic Shorts: Doing the Most"
      if (title.toLowerCase().includes('shorts ') && title.includes(' - ')) {
        console.log(`Skipping program header row: "${title}"`)
        continue
      }

      console.log(`Processing row ${i}: Title="${title}"`)
      console.log(`  Raw countries data: "${row[indices.countries]}"`)
      console.log(`  Raw run_time data: "${row[indices.run_time]}"`)
      console.log(`  Raw language data: "${row[indices.language]}"`)
      
      // Build the short data object directly from indices
      const shortData: any = {
        title,
        source: row[indices.source]?.trim() || null,
        original_language_title: row[indices.original_language_title]?.trim() || null,
        language: row[indices.language]?.trim() || null,
        subtitles: row[indices.subtitles]?.trim() || null,
        director: row[indices.director]?.trim() || null,
        countries: row[indices.countries]?.trim() || null,
        program_1: row[indices.program_1]?.trim() || null,
        program_2: row[indices.program_2]?.trim() || null,
        genre_1: row[indices.genre_1]?.trim() || null,
        genre_2: row[indices.genre_2]?.trim() || null,
        genre_3: row[indices.genre_3]?.trim() || null,
        captions: row[indices.captions]?.trim() || null,
        screenwriter: row[indices.screenwriter]?.replace(/^\s+|\s+$/g, '') || null,
        cinematographer: row[indices.cinematographer]?.replace(/^\s+|\s+$/g, '') || null,
        animator: row[indices.animator]?.replace(/^\s+|\s+$/g, '') || null,
        editor: row[indices.editor]?.replace(/^\s+|\s+$/g, '') || null,
        sound_designer: row[indices.sound_designer]?.replace(/^\s+|\s+$/g, '') || null,
        principal_cast: row[indices.principal_cast]?.replace(/^\s+|\s+$/g, '') || null,
        music_score: row[indices.music_score]?.replace(/^\s+|\s+$/g, '') || null,
        producer: row[indices.producer]?.replace(/^\s+|\s+$/g, '') || null,
        executive_producer: row[indices.executive_producer]?.replace(/^\s+|\s+$/g, '') || null,
        archivist: row[indices.archivist]?.replace(/^\s+|\s+$/g, '') || null,
        production_companies: row[indices.production_companies]?.replace(/^\s+|\s+$/g, '') || null,
        film_website: row[indices.film_website]?.trim() || null,
        trailer_url: row[indices.trailer_url]?.trim() || null,
        premiere_status: row[indices.premiere_status]?.trim() || null,
        content_considerations: row[indices.content_considerations]?.trim() || null
      }

      // Handle numeric fields
      if (row[indices.run_time]) {
        const runtime = parseInt(row[indices.run_time])
        if (!isNaN(runtime)) shortData.run_time = runtime
      }

      // Handle Shorts Program Name and Order
      const shortsProgramName = row[indices.shorts_program_name]?.trim()
      if (shortsProgramName) {
        // Check cache first
        if (!programCache[shortsProgramName]) {
          // Check if program exists
          const { data: existingProgram } = await supabase
            .from('shorts_programs')
            .select('id')
            .eq('program_name', shortsProgramName)
            .single()
          
          if (existingProgram) {
            programCache[shortsProgramName] = existingProgram.id
          } else {
            // Get the next program number
            const { data: existingPrograms } = await supabase
              .from('shorts_programs')
              .select('program_number')
              .order('program_number', { ascending: false })
              .limit(1)

            const nextProgramNumber = existingPrograms && existingPrograms.length > 0 
              ? (existingPrograms[0].program_number || 0) + 1 
              : 1

            console.log(`Creating new program "${shortsProgramName}" with program_number: ${nextProgramNumber}`)
            
            // Create new program
            const { data: newProgram, error } = await supabase
              .from('shorts_programs')
              .insert({ 
                program_name: shortsProgramName,
                program_number: nextProgramNumber
              })
              .select('id')
              .single()
            
            if (newProgram && !error) {
              programCache[shortsProgramName] = newProgram.id
              console.log(`Created new shorts program: ${shortsProgramName}`)
            } else {
              console.error(`Failed to create shorts program: ${shortsProgramName}`, error)
            }
          }
        }
        
        // Set the shorts_program_id
        if (programCache[shortsProgramName]) {
          shortData.shorts_program_id = programCache[shortsProgramName]
          console.log(`Setting shorts_program_id for "${title}" to ${programCache[shortsProgramName]} (${shortsProgramName})`)
        }
      }
      
      // Handle Program Order
      if (row[indices.program_order]) {
        const order = parseInt(row[indices.program_order])
        if (!isNaN(order)) {
          shortData.program_order = order
        }
      }

      console.log(`Processing: ${title} - crew data imported successfully`)

      // Check if record exists (preserve program assignments)
      const { data: existingRecord } = await supabase
        .from('short_films')
        .select('id, shorts_program_id, program_order')
        .eq('title', title)
        .single()

      if (existingRecord) {
        // Update existing - preserve program assignment
        const { error: updateError } = await supabase
          .from('short_films')
          .update(shortData)
          .eq('id', existingRecord.id)

        if (updateError) {
          console.error('Update error:', updateError)
          setUploadStatus(`Update error for ${title}: ${updateError.message}`)
          return
        } else {
          updated++
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('short_films')
          .insert([shortData])

        if (insertError) {
          console.error('Insert error:', insertError)
          setUploadStatus(`Insert error for ${title}: ${insertError.message}`)
          return
        } else {
          created++
        }
      }
    }

    setUploadStatus(`Successfully processed! Created: ${created}, Updated: ${updated}`)
    console.log('Program cache at end of import:', programCache)
    
    // Force a complete reload with relationships
    setTimeout(async () => {
      await loadShorts()
      console.log('Shorts reloaded after import')
    }, 500)
  }

  useEffect(() => {
    if (viewMode === 'features') {
      loadFilms()
    } else if (viewMode === 'shorts') {
      loadShorts()
    } else if (viewMode === 'programs') {
      loadPrograms()
    }
  }, [loadFilms, loadShorts, loadPrograms, viewMode])
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">🎬 Titles & Programs</h1>
            <p className="text-sm text-gray-600 mt-1">
              {viewMode === 'features' && `${filteredFilms.length} of ${films.length} films`}
              {viewMode === 'shorts' && `${filteredShorts.length} of ${shorts.length} shorts`}
              {viewMode === 'programs' && `${filteredPrograms.length} of ${programs.length} programs`}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {canEditTitles && (
              <>
                {viewMode === 'features' && (
                  <>
                    <button
                      onClick={exportFeaturesTemplate}
                      className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
                    >
                      📄 Create Features Template
                    </button>
                    <button
                      onClick={() => setShowAddFilmModal(true)}
                      className="px-4 py-2 rounded-md transition-colors font-medium bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      ➕ Add Film
                    </button>
                  </>
                )}
                {viewMode === 'shorts' && (
                  <button
                    onClick={exportShortsTemplate}
                    className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
                  >
                    📄 Create Shorts Template
                  </button>
                )}
                {viewMode === 'programs' && (
                  <button
                    onClick={exportProgramsTemplate}
                    className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
                  >
                    📄 Create Programs Template
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => setShowGuestMode(!showGuestMode)}
              className={`px-4 py-2 rounded-md transition-colors font-medium ${
                showGuestMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              👥 {showGuestMode ? 'Hide Guests' : 'Show Guests'}
            </button>
            {canEditTitles && viewMode === 'shorts' && (
              <>
                <button
                  onClick={() => setShowCreateProgramModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  ➕ Create Shorts Program
                </button>
                <button
                  onClick={() => {
                    syncShortsToFeatureFilms()
                    alert('Shorts programs synced to feature films for ticketing!')
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  🔄 Sync Shorts to Ticketing
                </button>
              </>
            )}
            {viewMode === 'programs' && (
              <>
                {canEditTitles && (
                  <button
                    onClick={() => setShowCreateEventModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    ➕ Create Program
                  </button>
                )}
                <button
                  onClick={() => setShowIndustryDaysOnly(!showIndustryDaysOnly)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    showIndustryDaysOnly
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {showIndustryDaysOnly ? '📋 Show All Programs' : '🏢 Industry Days Only'}
                </button>
              </>
            )}
            {canEditTitles && (
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer transition-colors">
                {uploading ? 'Uploading...' : '📂 Upload CSV'}
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
        
        {/* View Mode Toggle */}
        <div className="mt-4">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setViewMode('features')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'features'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Features
            </button>
            <button
              onClick={() => setViewMode('shorts')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'shorts'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Shorts
            </button>
            <button
              onClick={() => setViewMode('programs')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'programs'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Programs
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        {viewMode !== 'programs' && (
          <div className="mt-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search films, names, countries..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchTerm(suggestion)
                      setShowSuggestions(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-4">
            {/* Program Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Program:</label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Programs</option>
                {uniquePrograms.map(program => (
                  <option key={program} value={program}>{program}</option>
                ))}
              </select>
            </div>
            
            {/* Genre Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Genre:</label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Genres</option>
                {uniqueGenres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            
            {/* Premiere Status Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Premiere:</label>
              <select
                value={selectedPremiereStatus}
                onChange={(e) => setSelectedPremiereStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                {uniquePremiereStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            
            {/* Clear Filters */}
            {(searchTerm || selectedProgram || selectedGenre || selectedPremiereStatus) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedProgram('')
                  setSelectedGenre('')
                  setSelectedPremiereStatus('')
                  setShowSuggestions(false)
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
        )}
        {uploadStatus && (
          <div className={`mt-3 p-3 rounded-md ${
            uploadStatus.includes('Error') 
              ? 'bg-red-100 text-red-700 border border-red-200'
              : uploadStatus.includes('Successfully')
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {uploadStatus}
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'programs' ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {[
                      { key: 'title', label: 'Program Title', width: 250 },
                      { key: 'event_date', label: 'Date', width: 100 },
                      { key: 'start_time', label: 'Start Time', width: 100 },
                      { key: 'end_time', label: 'End Time', width: 100 },
                      { key: 'venue_name', label: 'Venue', width: 150 },
                      { key: 'participants', label: 'Participants', width: 200 },
                      { key: 'description', label: 'Description', width: 300 },
                      { key: 'is_industry_days', label: 'Industry Days', width: 120 },
                      { key: 'actions', label: 'Actions', width: 100 }
                    ].map((column) => (
                      <th
                        key={column.key}
                        className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 ${
                          column.key === 'title' ? 'sticky left-0 z-20' : ''
                        }`}
                        style={{ minWidth: `${columnWidths[column.key] || column.width}px` }}
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleSort(column.key)}
                            className="flex items-center space-x-1 hover:text-gray-700"
                          >
                            <span>{column.label}</span>
                            {sortConfig?.key === column.key && (
                              <span className="text-blue-600">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </button>
                        </div>
                        <div
                          className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-gray-200 hover:bg-blue-500 opacity-30 hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            const startX = e.clientX
                            const startWidth = columnWidths[column.key] || column.width
                            
                            const handleMouseMove = (e: MouseEvent) => {
                              const newWidth = Math.max(50, startWidth + (e.clientX - startX))
                              setColumnWidths(prev => ({ ...prev, [column.key]: newWidth }))
                            }
                            
                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove)
                              document.removeEventListener('mouseup', handleMouseUp)
                            }
                            
                            document.addEventListener('mousemove', handleMouseMove)
                            document.addEventListener('mouseup', handleMouseUp)
                          }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(showIndustryDaysOnly ? filteredPrograms.filter(p => p.is_industry_days) : filteredPrograms).map((program) => (
                    <tr key={program.id} className="hover:bg-gray-50">
                      <td 
                        className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 cursor-pointer hover:bg-blue-50 sticky left-0 bg-white z-20 shadow-sm" 
                        style={{ minWidth: `${columnWidths['title'] || 250}px` }}
                        onClick={() => setShowProgramCard(program)}
                      >
                        <span className="text-blue-600 hover:text-blue-800 hover:underline">
                          {program.title}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['event_date'] || 100}px` }}>
                        {program.event_date ? (() => {
                          const parts = program.event_date.split('-')
                          if (parts.length !== 3) return program.event_date
                          const year = parts[0].slice(-2)
                          const month = parts[1]
                          const day = parts[2]
                          return `${month}/${day}/${year}`
                        })() : ''}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['start_time'] || 100}px` }}>{formatTime(program.start_time)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['end_time'] || 100}px` }}>{formatTime(program.end_time)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['venue_name'] || 150}px` }}>
                        {program.venue_name && (
                          <span className="text-blue-600 hover:text-blue-800 cursor-pointer hover:underline">
                            {program.venue_name}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['participants'] || 200}px` }}>{program.participants}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['description'] || 300}px` }}>
                        <div className="max-w-xs truncate" title={program.description || ''}>
                          {program.description}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['is_industry_days'] || 120}px` }}>
                        {program.is_industry_days && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Industry Days
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900" style={{ minWidth: `${columnWidths['actions'] || 100}px` }}>
                        {canEditTitles && (
                          <button
                            onClick={() => {
                              setEditingEvent(program)
                              setShowCreateEventModal(true)
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">
                Loading {viewMode === 'features' ? 'films' : viewMode === 'shorts' ? 'shorts' : 'programs'}...
              </p>
            </div>
          </div>
        ) : (viewMode === 'features' ? films.length === 0 : viewMode === 'shorts' ? shorts.length === 0 : programs.length === 0) ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h2 className="text-lg font-medium mb-4">
              No {viewMode === 'features' ? 'Films' : viewMode === 'shorts' ? 'Shorts' : 'Programs'} Yet
            </h2>
            <p className="text-gray-600 mb-4">
              {viewMode === 'programs' 
                ? (canEditTitles ? 'Click "Create Program" to add your first program event.' : 'No program events have been created yet.')
                : (canEditTitles 
                    ? `Upload a CSV file to add ${viewMode === 'features' ? 'films' : 'shorts'} to the database.`
                    : `No ${viewMode === 'features' ? 'films' : 'shorts'} have been added yet.`
                  )
              }
            </p>
            {canEditTitles && viewMode !== 'programs' && (
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md cursor-pointer transition-colors inline-block">
                📂 Upload CSV File
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
        ) : viewMode === 'features' ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)]">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {[
                      { key: 'title', label: 'Title', width: 200 },
                      { key: 'source', label: 'Source', width: 100 },
                      { key: 'original_language_title', label: 'Original Title', width: 180 },
                      { key: 'director', label: 'Director', width: 150 },
                      { key: 'countries', label: 'Countries', width: 150 },
                      { key: 'programs', label: 'Programs', width: 150 },
                      { key: 'genres', label: 'Genres', width: 120 },
                      { key: 'run_time', label: 'Runtime', width: 80 },
                      { key: 'language', label: 'Language', width: 100 },
                      { key: 'subtitles', label: 'Subtitles', width: 80 },
                      { key: 'captions', label: 'Captions', width: 80 },
                      { key: 'principal_cast', label: 'Principal Cast', width: 200 },
                      { key: 'screenwriter', label: 'Screenwriter', width: 150 },
                      { key: 'cinematographer', label: 'Cinematographer', width: 150 },
                      { key: 'editor', label: 'Editor', width: 100 },
                      { key: 'animator', label: 'Animator', width: 120 },
                      { key: 'sound_designer', label: 'Sound Designer', width: 120 },
                      { key: 'music_score', label: 'Music/Score', width: 120 },
                      { key: 'producer', label: 'Producer', width: 150 },
                      { key: 'executive_producer', label: 'Executive Producer', width: 150 },
                      { key: 'archivist', label: 'Archivist', width: 120 },
                      { key: 'production_companies', label: 'Production Companies', width: 180 },
                      { key: 'film_website', label: 'Film Website', width: 150 },
                      { key: 'trailer_url', label: 'Trailer URL', width: 150 },
                      { key: 'premiere_status', label: 'Premiere Status', width: 120 },
                      { key: 'content_considerations', label: 'Content Considerations', width: 150 },
                      { key: 'actions', label: 'Actions', width: 80 }
                    ].map((column) => (
                      <th
                        key={column.key}
                        className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 ${
                          column.key === 'title' ? 'sticky left-0 z-20' : ''
                        }`}
                        style={{ minWidth: `${columnWidths[column.key] || column.width}px` }}
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleSort(column.key)}
                            className="flex items-center space-x-1 hover:text-gray-700"
                          >
                            <span>{column.label}</span>
                            {sortConfig?.key === column.key && (
                              <span className="text-blue-600">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </button>
                        </div>
                        {/* Resize Handle */}
                        <div
                          className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-gray-200 hover:bg-blue-500 opacity-30 hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            const startX = e.clientX
                            const startWidth = columnWidths[column.key] || column.width
                            
                            const handleMouseMove = (e: MouseEvent) => {
                              const newWidth = Math.max(50, startWidth + (e.clientX - startX))
                              setColumnWidths(prev => ({ ...prev, [column.key]: newWidth }))
                            }
                            
                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove)
                              document.removeEventListener('mouseup', handleMouseUp)
                            }
                            
                            document.addEventListener('mousemove', handleMouseMove)
                            document.addEventListener('mouseup', handleMouseUp)
                          }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFilms.map((film) => (
                    <tr key={film.id} className="hover:bg-gray-50">
                      <td 
                        className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 cursor-pointer hover:bg-blue-50 sticky left-0 bg-white z-20 shadow-sm" 
                        style={{ minWidth: `${columnWidths['title'] || 200}px` }}
                        onClick={() => setSelectedFilm(film)}
                      >
                        <span className="text-blue-600 hover:text-blue-800 hover:underline">
                          {film.title}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['source'] || 100}px` }}>{film.source}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['original_language_title'] || 180}px` }}>{film.original_language_title}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['director'] || 150}px` }}>{renderPersonName(film.director)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['countries'] || 150}px` }}>{film.countries}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['programs'] || 150}px` }}>{film.programs}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['genres'] || 120}px` }}>{film.genres}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['run_time'] || 80}px` }}>{film.run_time ? `${film.run_time} min` : ''}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['language'] || 100}px` }}>{film.language}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['subtitles'] || 80}px` }}>{film.subtitles}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['captions'] || 80}px` }}>{film.captions}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['principal_cast'] || 200}px` }}>{renderPersonName(film.principal_cast)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['screenwriter'] || 150}px` }}>{renderPersonName(film.screenwriter)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['cinematographer'] || 150}px` }}>{renderPersonName(film.cinematographer)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['editor'] || 100}px` }}>{renderPersonName(film.editor)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['animator'] || 120}px` }}>{renderPersonName(film.animator)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['sound_designer'] || 120}px` }}>{renderPersonName(film.sound_designer)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['music_score'] || 120}px` }}>{renderPersonName(film.music_score)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['producer'] || 150}px` }}>{renderPersonName(film.producer)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['executive_producer'] || 150}px` }}>{renderPersonName(film.executive_producer)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['archivist'] || 120}px` }}>{renderPersonName(film.archivist)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['production_companies'] || 180}px` }}>{film.production_companies}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['film_website'] || 150}px` }}>
                        {film.film_website && (
                          <a href={film.film_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 break-all">
                            {film.film_website}
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['trailer_url'] || 150}px` }}>
                        {film.trailer_url && (
                          <a href={film.trailer_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 break-all">
                            {film.trailer_url}
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['premiere_status'] || 120}px` }}>{film.premiere_status}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['content_considerations'] || 150}px` }}>{film.content_considerations}</td>
                      <td className="px-3 py-2 text-sm text-gray-900" style={{ minWidth: `${columnWidths['actions'] || 80}px` }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingFilm(film)
                            setEditingFilmType('feature')
                            setShowEditModal(true)
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Shorts Grouped View */
          <div className="overflow-auto max-h-[calc(100vh-350px)] space-y-6">
            {(() => {
              // Group shorts by Shorts Program - now supporting multiple programs per short
              const groupedShorts = filteredShorts.reduce((groups, short) => {
                // If the short has multiple programs, add it to each with proper program_order
                if (short.all_programs && short.all_programs.length > 0) {
                  // Get the original assignments data to find program_order for each program
                  short.all_programs.forEach((program, index) => {
                    const programName = program?.program_name || 'Unassigned Shorts'
                    if (!groups[programName]) {
                      groups[programName] = []
                    }
                    // Create a copy of the short with the correct program_order for this specific program
                    const shortForThisProgram = {
                      ...short,
                      program_order: short.program_order || 0 // This will need to be fixed to get the right order per program
                    }
                    groups[programName].push(shortForThisProgram)
                  })
                } else {
                  // Fallback to old single program for backward compatibility
                  const programName = short.shorts_program?.program_name || 'Unassigned Shorts'
                  if (!groups[programName]) {
                    groups[programName] = []
                  }
                  groups[programName].push(short)
                }
                return groups
              }, {} as Record<string, ShortFilm[]>)

              // Sort programs by program number (extract number from program name)
              const sortedPrograms = Object.entries(groupedShorts).sort(([nameA], [nameB]) => {
                // Put 'Unassigned Shorts' at the end
                if (nameA === 'Unassigned Shorts') return 1
                if (nameB === 'Unassigned Shorts') return -1
                
                // Extract program numbers for sorting
                const numberA = parseInt(nameA.match(/\d+/)?.[0] || '999')
                const numberB = parseInt(nameB.match(/\d+/)?.[0] || '999')
                
                return numberA - numberB
              })

              return sortedPrograms.map(([programName, programShorts]) => (
                <div key={programName} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* Program Header */}
                  <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{programName}</h3>
                      <p className="text-sm text-gray-300">
                        {programShorts.length} shorts, {programShorts.reduce((total, short) => total + (short.run_time || 0), 0)} mins
                      </p>
                    </div>
                    {programName !== 'Unassigned Shorts' && (
                      <button
                        onClick={() => {
                          // Find the program to edit
                          const programToEdit = programShorts[0]?.shorts_program
                          if (programToEdit) {
                            setEditingProgram({
                              ...programToEdit,
                              shorts: programShorts
                            })
                            setShowCreateProgramModal(true)
                          }
                        }}
                        className="px-3 py-1 text-sm text-white bg-gray-700 hover:bg-gray-600 rounded-md border border-gray-600 transition-colors"
                      >
                        Edit Program
                      </button>
                    )}
                  </div>
                  
                  {/* Shorts Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {[
                            { key: 'program_order', label: 'Order', width: 60 },
                            { key: 'title', label: 'Title', width: 200 },
                            { key: 'source', label: 'Source', width: 100 },
                            { key: 'original_language_title', label: 'Original Title', width: 180 },
                            { key: 'director', label: 'Director', width: 150 },
                            { key: 'countries', label: 'Countries', width: 150 },
                            { key: 'shorts_program_name', label: 'Shorts Program', width: 180 },
                            { key: 'programs', label: 'Programs', width: 150 },
                            { key: 'genres', label: 'Genres', width: 120 },
                            { key: 'run_time', label: 'Runtime', width: 80 },
                            { key: 'language', label: 'Language', width: 100 },
                            { key: 'subtitles', label: 'Subtitles', width: 80 },
                            { key: 'captions', label: 'Captions', width: 80 },
                            { key: 'original_release_year', label: 'Year', width: 70 },
                            { key: 'screenwriter', label: 'Screenwriter', width: 150 },
                            { key: 'cinematographer', label: 'Cinematographer', width: 150 },
                            { key: 'animator', label: 'Animator', width: 120 },
                            { key: 'editor', label: 'Editor', width: 100 },
                            { key: 'principal_cast', label: 'Principal Cast', width: 200 },
                            { key: 'sound_designer', label: 'Sound Designer', width: 120 },
                            { key: 'music_score', label: 'Music/Score', width: 120 },
                            { key: 'producer', label: 'Producer', width: 150 },
                            { key: 'executive_producer', label: 'Executive Producer', width: 150 },
                            { key: 'production_companies', label: 'Production Companies', width: 180 },
                            { key: 'film_website', label: 'Film Website', width: 150 },
                            { key: 'trailer_url', label: 'Trailer URL', width: 150 },
                            { key: 'premiere_status', label: 'Premiere Status', width: 120 },
                            { key: 'content_considerations', label: 'Content Considerations', width: 150 },
                            { key: 'actions', label: 'Actions', width: 80 }
                          ].map((column) => (
                            <th
                              key={column.key}
                              className={`relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 ${
                                column.key === 'title' ? 'sticky left-0 z-10' : ''
                              }`}
                              style={{ minWidth: `${columnWidths[column.key] || column.width}px` }}
                            >
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => handleSort(column.key)}
                                  className="flex items-center space-x-1 hover:text-gray-700"
                                >
                                  <span>{column.label}</span>
                                  {sortConfig?.key === column.key && (
                                    <span className="text-blue-600">
                                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                    </span>
                                  )}
                                </button>
                              </div>
                              {/* Resize Handle */}
                              <div
                                className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-gray-200 hover:bg-blue-500 opacity-30 hover:opacity-100 transition-opacity"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  const startX = e.clientX
                                  const startWidth = columnWidths[column.key] || column.width
                                  
                                  const handleMouseMove = (e: MouseEvent) => {
                                    const newWidth = Math.max(50, startWidth + (e.clientX - startX))
                                    setColumnWidths(prev => ({ ...prev, [column.key]: newWidth }))
                                  }
                                  
                                  const handleMouseUp = () => {
                                    document.removeEventListener('mousemove', handleMouseMove)
                                    document.removeEventListener('mouseup', handleMouseUp)
                                  }
                                  
                                  document.addEventListener('mousemove', handleMouseMove)
                                  document.addEventListener('mouseup', handleMouseUp)
                                }}
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {programShorts
                          .sort((a, b) => (a.program_order || 0) - (b.program_order || 0))
                          .map((short) => (
                          <tr key={short.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center font-medium" style={{ minWidth: `${columnWidths['program_order'] || 60}px` }}>
                              {short.program_order}
                            </td>
                            <td 
                              className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 cursor-pointer hover:bg-blue-50 sticky left-0 bg-white z-20 shadow-sm" 
                              style={{ minWidth: `${columnWidths['title'] || 200}px` }}
                              onClick={() => setSelectedFilm(short)}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-blue-600 hover:text-blue-800 hover:underline">
                                  {short.title}
                                </span>
                                {short.all_programs && short.all_programs.length > 1 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800" title={`In ${short.all_programs.length} programs`}>
                                    {short.all_programs.length}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['source'] || 100}px` }}>{short.source}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['original_language_title'] || 180}px` }}>{short.original_language_title}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['director'] || 150}px` }}>{renderPersonName(short.director)}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['countries'] || 150}px` }}>{short.countries}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['shorts_program_name'] || 180}px` }}>{short.shorts_program?.program_name || ''}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['programs'] || 150}px` }}>{short.programs}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['genres'] || 120}px` }}>{short.genres}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['run_time'] || 80}px` }}>{short.run_time ? `${short.run_time} min` : ''}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['language'] || 100}px` }}>{short.language}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['subtitles'] || 80}px` }}>{short.subtitles}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['captions'] || 80}px` }}>{short.captions}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['principal_cast'] || 200}px` }}>{renderPersonName(short.principal_cast)}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['screenwriter'] || 150}px` }}>{short.screenwriter}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['cinematographer'] || 150}px` }}>{short.cinematographer}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['editor'] || 100}px` }}>{short.editor}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['animator'] || 120}px` }}>{renderPersonName(short.animator)}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['sound_designer'] || 120}px` }}>{short.sound_designer}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['music_score'] || 120}px` }}>{short.music_score}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['producer'] || 150}px` }}>{renderPersonName(short.producer)}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['executive_producer'] || 150}px` }}>{renderPersonName(short.executive_producer)}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['archivist'] || 120}px` }}>{renderPersonName(short.archivist)}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['production_companies'] || 180}px` }}>{short.production_companies}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['film_website'] || 150}px` }}>
                              {short.film_website && (
                                <a href={short.film_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 break-all">
                                  {short.film_website}
                                </a>
                              )}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['trailer_url'] || 150}px` }}>
                              {short.trailer_url && (
                                <a href={short.trailer_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 break-all">
                                  {short.trailer_url}
                                </a>
                              )}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['premiere_status'] || 120}px` }}>{short.premiere_status}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['content_considerations'] || 150}px` }}>{short.content_considerations}</td>
                            <td className="px-3 py-2 text-sm text-gray-900" style={{ minWidth: `${columnWidths['actions'] || 80}px` }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingFilm(short)
                                  setEditingFilmType('short')
                                  setShowEditModal(true)
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            })()}
          </div>
        )}
      </div>
      
      {/* Film Card Popup */}
      {selectedFilm && (
        <FilmCardPopup
          film={selectedFilm}
          onClose={() => setSelectedFilm(null)}
        />
      )}

      {/* Guest Card Popup */}
      {showGuestCard && (
        <GuestCardPopup
          guest={showGuestCard}
          onClose={() => setShowGuestCard(null)}
        />
      )}

      {/* Program Card Popup */}
      {showProgramCard && (
        <ProgramCardPopup
          program={showProgramCard}
          onClose={() => setShowProgramCard(null)}
        />
      )}

      {/* Create Shorts Program Modal */}
      {showCreateProgramModal && (
        <CreateShortsProgramModal
          onClose={() => {
            setShowCreateProgramModal(false)
            setEditingProgram(null)
          }}
          onSave={() => {
            setShowCreateProgramModal(false)
            setEditingProgram(null)
            loadShorts() // Reload shorts to show updated program assignments
          }}
          availableShorts={shorts.filter(short => 
            !short.shorts_program_id || 
            (editingProgram && short.shorts_program_id === editingProgram.id)
          )}
          editingProgram={editingProgram}
          supabase={supabase}
        />
      )}

      {/* Create Program Event Modal */}
      {showCreateEventModal && (
        <CreateProgramEventModal
          onClose={() => {
            setShowCreateEventModal(false)
            setEditingEvent(null)
          }}
          onSave={() => {
            setShowCreateEventModal(false)
            setEditingEvent(null)
            loadPrograms()
          }}
          editingEvent={editingEvent}
          supabase={supabase}
        />
      )}

      {/* Film Edit Modal */}
      <FilmEditModal
        film={editingFilm}
        filmType={editingFilmType}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingFilm(null)
        }}
        onSave={() => {
          setShowEditModal(false)
          setEditingFilm(null)
          if (editingFilmType === 'feature') {
            loadFilms()
          } else {
            loadShorts()
          }
        }}
        onDelete={() => {
          setShowEditModal(false)
          setEditingFilm(null)
          if (editingFilmType === 'feature') {
            loadFilms()
          } else {
            loadShorts()
          }
        }}
      />

      {/* Add Film Modal */}
      {showAddFilmModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <AddFilmModal
              isOpen={showAddFilmModal}
              onClose={() => setShowAddFilmModal(false)}
              onSave={() => {
                setShowAddFilmModal(false)
                loadFilms()
              }}
              availablePrograms={uniquePrograms}
              availableGenres={uniqueGenres}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Add Film Modal Component
interface AddFilmModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  availablePrograms: string[]
  availableGenres: string[]
}

function AddFilmModal({ isOpen, onClose, onSave, availablePrograms, availableGenres }: AddFilmModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    source: '',
    original_language_title: '',
    director: '',
    countries: '',
    program_1: '',
    program_2: '',
    program_3: '',
    program_4: '',
    genre_1: '',
    genre_2: '',
    genre_3: '',
    genre_4: '',
    run_time: '',
    language: '',
    subtitles: '',
    captions: '',
    original_release_year: '',
    screenwriter: '',
    cinematographer: '',
    animator: '',
    editor: '',
    principal_cast: '',
    sound_designer: '',
    music_score: '',
    producer: '',
    executive_producer: '',
    archivist: '',
    production_companies: '',
    film_website: '',
    trailer_url: '',
    premiere_status: '',
    content_considerations: ''
  })
  
  const [saving, setSaving] = useState(false)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // Autocomplete states
  const [programDropdowns, setProgramDropdowns] = useState({
    program_1: false,
    program_2: false,
    program_3: false,
    program_4: false
  })
  const [genreDropdowns, setGenreDropdowns] = useState({
    genre_1: false,
    genre_2: false,
    genre_3: false,
    genre_4: false
  })
  
  const supabase = createClient()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleProgramDropdown = (field: string) => {
    setProgramDropdowns(prev => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev]
    }))
    // Close other dropdowns
    Object.keys(programDropdowns).forEach(key => {
      if (key !== field) {
        setProgramDropdowns(prev => ({ ...prev, [key]: false }))
      }
    })
  }

  const toggleGenreDropdown = (field: string) => {
    setGenreDropdowns(prev => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev]
    }))
    // Close other dropdowns
    Object.keys(genreDropdowns).forEach(key => {
      if (key !== field) {
        setGenreDropdowns(prev => ({ ...prev, [key]: false }))
      }
    })
  }

  const selectProgram = (field: string, value: string) => {
    handleInputChange(field, value)
    setProgramDropdowns(prev => ({ ...prev, [field]: false }))
  }

  const selectGenre = (field: string, value: string) => {
    handleInputChange(field, value)
    setGenreDropdowns(prev => ({ ...prev, [field]: false }))
  }

  // Filter options based on current input
  const getFilteredPrograms = (currentValue: string) => {
    if (!currentValue) return availablePrograms
    return availablePrograms.filter(program => 
      program.toLowerCase().includes(currentValue.toLowerCase())
    )
  }

  const getFilteredGenres = (currentValue: string) => {
    if (!currentValue) return availableGenres
    return availableGenres.filter(genre => 
      genre.toLowerCase().includes(currentValue.toLowerCase())
    )
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Title is required')
      return
    }

    setSaving(true)
    try {
      const filmData = {
        ...formData,
        run_time: formData.run_time ? parseInt(formData.run_time) : null,
        original_release_year: formData.original_release_year ? parseInt(formData.original_release_year) : null
      }

      const { error } = await supabase
        .from('feature_films')
        .insert([filmData])

      if (error) throw error

      alert('Film added successfully!')
      onSave()
    } catch (error) {
      console.error('Error adding film:', error)
      alert('Error adding film. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - dragPosition.x,
      y: e.clientY - dragPosition.y
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setDragPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setProgramDropdowns({ program_1: false, program_2: false, program_3: false, program_4: false })
      setGenreDropdowns({ genre_1: false, genre_2: false, genre_3: false, genre_4: false })
    }

    if (Object.values(programDropdowns).some(Boolean) || Object.values(genreDropdowns).some(Boolean)) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [programDropdowns, genreDropdowns])

  if (!isOpen) return null

  return (
    <div 
      className="fixed bg-white rounded-lg shadow-2xl w-[800px] max-h-[90vh] overflow-hidden"
      style={{ 
        left: `calc(50% + ${dragPosition.x}px)`, 
        top: `calc(50% + ${dragPosition.y}px)`,
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Draggable Header */}
      <div 
        className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <h2 className="text-lg font-semibold text-gray-900">Add New Film</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl font-bold w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
        >
          ×
        </button>
      </div>

      {/* Form Content */}
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
        <div className="grid grid-cols-2 gap-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => handleInputChange('source', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Original Language Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Original Language Title
            </label>
            <input
              type="text"
              value={formData.original_language_title}
              onChange={(e) => handleInputChange('original_language_title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Director */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Director
            </label>
            <input
              type="text"
              value={formData.director}
              onChange={(e) => handleInputChange('director', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Countries */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Countries
            </label>
            <input
              type="text"
              value={formData.countries}
              onChange={(e) => handleInputChange('countries', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Runtime */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Runtime (minutes)
            </label>
            <input
              type="number"
              value={formData.run_time}
              onChange={(e) => handleInputChange('run_time', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <input
              type="text"
              value={formData.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Subtitles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitles
            </label>
            <input
              type="text"
              value={formData.subtitles}
              onChange={(e) => handleInputChange('subtitles', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Captions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Captions
            </label>
            <input
              type="text"
              value={formData.captions}
              onChange={(e) => handleInputChange('captions', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Original Release Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Original Release Year
            </label>
            <input
              type="number"
              value={formData.original_release_year}
              onChange={(e) => handleInputChange('original_release_year', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Programs */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program 1
            </label>
            <input
              type="text"
              value={formData.program_1}
              onChange={(e) => handleInputChange('program_1', e.target.value)}
              onFocus={() => toggleProgramDropdown('program_1')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Select or type program..."
            />
            {programDropdowns.program_1 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {getFilteredPrograms(formData.program_1).map((program, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectProgram('program_1', program)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  >
                    {program}
                  </button>
                ))}
                {getFilteredPrograms(formData.program_1).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No programs found</div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program 2
            </label>
            <input
              type="text"
              value={formData.program_2}
              onChange={(e) => handleInputChange('program_2', e.target.value)}
              onFocus={() => toggleProgramDropdown('program_2')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Select or type program..."
            />
            {programDropdowns.program_2 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {getFilteredPrograms(formData.program_2).map((program, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectProgram('program_2', program)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  >
                    {program}
                  </button>
                ))}
                {getFilteredPrograms(formData.program_2).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No programs found</div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program 3
            </label>
            <input
              type="text"
              value={formData.program_3}
              onChange={(e) => handleInputChange('program_3', e.target.value)}
              onFocus={() => toggleProgramDropdown('program_3')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Select or type program..."
            />
            {programDropdowns.program_3 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {getFilteredPrograms(formData.program_3).map((program, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectProgram('program_3', program)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  >
                    {program}
                  </button>
                ))}
                {getFilteredPrograms(formData.program_3).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No programs found</div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program 4
            </label>
            <input
              type="text"
              value={formData.program_4}
              onChange={(e) => handleInputChange('program_4', e.target.value)}
              onFocus={() => toggleProgramDropdown('program_4')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Select or type program..."
            />
            {programDropdowns.program_4 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {getFilteredPrograms(formData.program_4).map((program, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectProgram('program_4', program)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  >
                    {program}
                  </button>
                ))}
                {getFilteredPrograms(formData.program_4).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No programs found</div>
                )}
              </div>
            )}
          </div>

          {/* Genres */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Genre 1
            </label>
            <input
              type="text"
              value={formData.genre_1}
              onChange={(e) => handleInputChange('genre_1', e.target.value)}
              onFocus={() => toggleGenreDropdown('genre_1')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Select or type genre..."
            />
            {genreDropdowns.genre_1 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {getFilteredGenres(formData.genre_1).map((genre, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectGenre('genre_1', genre)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  >
                    {genre}
                  </button>
                ))}
                {getFilteredGenres(formData.genre_1).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No genres found</div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Genre 2
            </label>
            <input
              type="text"
              value={formData.genre_2}
              onChange={(e) => handleInputChange('genre_2', e.target.value)}
              onFocus={() => toggleGenreDropdown('genre_2')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Select or type genre..."
            />
            {genreDropdowns.genre_2 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {getFilteredGenres(formData.genre_2).map((genre, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectGenre('genre_2', genre)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  >
                    {genre}
                  </button>
                ))}
                {getFilteredGenres(formData.genre_2).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No genres found</div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Genre 3
            </label>
            <input
              type="text"
              value={formData.genre_3}
              onChange={(e) => handleInputChange('genre_3', e.target.value)}
              onFocus={() => toggleGenreDropdown('genre_3')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Select or type genre..."
            />
            {genreDropdowns.genre_3 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {getFilteredGenres(formData.genre_3).map((genre, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectGenre('genre_3', genre)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  >
                    {genre}
                  </button>
                ))}
                {getFilteredGenres(formData.genre_3).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No genres found</div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Genre 4
            </label>
            <input
              type="text"
              value={formData.genre_4}
              onChange={(e) => handleInputChange('genre_4', e.target.value)}
              onFocus={() => toggleGenreDropdown('genre_4')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Select or type genre..."
            />
            {genreDropdowns.genre_4 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {getFilteredGenres(formData.genre_4).map((genre, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectGenre('genre_4', genre)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  >
                    {genre}
                  </button>
                ))}
                {getFilteredGenres(formData.genre_4).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No genres found</div>
                )}
              </div>
            )}
          </div>

          {/* Crew Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Screenwriter
            </label>
            <input
              type="text"
              value={formData.screenwriter}
              onChange={(e) => handleInputChange('screenwriter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cinematographer
            </label>
            <input
              type="text"
              value={formData.cinematographer}
              onChange={(e) => handleInputChange('cinematographer', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Animator
            </label>
            <input
              type="text"
              value={formData.animator}
              onChange={(e) => handleInputChange('animator', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Editor
            </label>
            <input
              type="text"
              value={formData.editor}
              onChange={(e) => handleInputChange('editor', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sound Designer
            </label>
            <input
              type="text"
              value={formData.sound_designer}
              onChange={(e) => handleInputChange('sound_designer', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Music/Score
            </label>
            <input
              type="text"
              value={formData.music_score}
              onChange={(e) => handleInputChange('music_score', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Producer
            </label>
            <input
              type="text"
              value={formData.producer}
              onChange={(e) => handleInputChange('producer', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Executive Producer
            </label>
            <input
              type="text"
              value={formData.executive_producer}
              onChange={(e) => handleInputChange('executive_producer', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Archivist
            </label>
            <input
              type="text"
              value={formData.archivist}
              onChange={(e) => handleInputChange('archivist', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Premiere Status
            </label>
            <input
              type="text"
              value={formData.premiere_status}
              onChange={(e) => handleInputChange('premiere_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Full width fields */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Principal Cast
            </label>
            <input
              type="text"
              value={formData.principal_cast}
              onChange={(e) => handleInputChange('principal_cast', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Production Companies
            </label>
            <input
              type="text"
              value={formData.production_companies}
              onChange={(e) => handleInputChange('production_companies', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Film Website
            </label>
            <input
              type="url"
              value={formData.film_website}
              onChange={(e) => handleInputChange('film_website', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trailer URL
            </label>
            <input
              type="url"
              value={formData.trailer_url}
              onChange={(e) => handleInputChange('trailer_url', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content Considerations
            </label>
            <textarea
              value={formData.content_considerations}
              onChange={(e) => handleInputChange('content_considerations', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!formData.title.trim() || saving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Adding Film...' : 'Add Film'}
        </button>
      </div>
    </div>
  )
}

// Create Shorts Program Modal Component
interface CreateShortsProgramModalProps {
  onClose: () => void
  onSave: () => void
  availableShorts: ShortFilm[]
  editingProgram?: any
  supabase: any
}

function CreateShortsProgramModal({ onClose, onSave, availableShorts, editingProgram, supabase }: CreateShortsProgramModalProps) {
  const [programName, setProgramName] = useState('')
  const [selectedShorts, setSelectedShorts] = useState<ShortFilm[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Simple renderPersonName function for the modal
  const renderPersonName = (name: string | undefined) => {
    if (!name) return '—'
    return name
  }

  // Populate form when editing
  useEffect(() => {
    if (editingProgram) {
      setProgramName(editingProgram.program_name || '')
      setSelectedShorts(editingProgram.shorts || [])
    }
  }, [editingProgram])

  const handleSave = async () => {
    if (!programName.trim()) return

    setSaving(true)
    try {
      let programId = editingProgram?.id

      if (editingProgram) {
        if (!editingProgram.id) {
          console.error('No valid program ID found')
          alert('Error: No valid program ID found')
          return
        }

        // Update existing program
        const { error: updateError } = await supabase
          .from('shorts_programs')
          .update({ program_name: programName.trim() })
          .eq('id', editingProgram.id)

        if (updateError) {
          console.error('Error updating program:', updateError)
          alert(`Error updating program: ${updateError.message}`)
          return
        }

        // First, remove all shorts from this program in the junction table
        await supabase
          .from('short_film_programs')
          .delete()
          .eq('shorts_program_id', editingProgram.id)
      } else {
        // Get the next program number
        const { data: existingPrograms } = await supabase
          .from('shorts_programs')
          .select('program_number')
          .order('program_number', { ascending: false })
          .limit(1)

        const nextProgramNumber = existingPrograms && existingPrograms.length > 0 
          ? (existingPrograms[0].program_number || 0) + 1 
          : 1

        // Create new program
        const { data: newProgram, error: programError } = await supabase
          .from('shorts_programs')
          .insert([{
            program_number: nextProgramNumber,
            program_name: programName.trim()
          }])
          .select()
          .single()

        if (programError) {
          console.error('Error creating program:', programError)
          alert(`Error creating program: ${programError.message}`)
          return
        }

        programId = newProgram.id
      }

      // Assign selected shorts to this program using junction table
      if (selectedShorts.length > 0) {
        const assignments = selectedShorts.map((short, index) => ({
          short_film_id: short.id,
          shorts_program_id: programId,
          program_order: index + 1
        }))
        
        const { error: assignError } = await supabase
          .from('short_film_programs')
          .insert(assignments)
        
        if (assignError) {
          console.error('Error assigning shorts to program:', assignError)
          alert(`Error assigning shorts: ${assignError.message}`)
          return
        }
      }

      onSave()
    } catch (error) {
      console.error('Error saving program:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingProgram?.id) return
    
    setDeleting(true)
    try {
      // Delete all associations in junction table first
      await supabase
        .from('short_film_programs')
        .delete()
        .eq('shorts_program_id', editingProgram.id)
      
      // Then delete the program itself
      const { error } = await supabase
        .from('shorts_programs')
        .delete()
        .eq('id', editingProgram.id)
      
      if (error) {
        console.error('Error deleting program:', error)
        alert(`Error deleting program: ${error.message}`)
      } else {
        onSave() // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting program:', error)
      alert('Error deleting program')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const addShort = (short: ShortFilm) => {
    setSelectedShorts(prev => [...prev, short])
  }

  const removeShort = (shortId: string) => {
    setSelectedShorts(prev => prev.filter(s => s.id !== shortId))
  }

  const moveShort = (fromIndex: number, toIndex: number) => {
    setSelectedShorts(prev => {
      const newList = [...prev]
      const [movedItem] = newList.splice(fromIndex, 1)
      newList.splice(toIndex, 0, movedItem)
      return newList
    })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Filter available shorts based on search term (accent-insensitive)
  const filteredAvailableShorts = availableShorts.filter(
    createAccentInsensitiveFilter(searchTerm, (short) => [short.title, short.director])
  )

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'auto'
        }}
      >
        <div 
          className="px-6 py-4 border-b border-gray-200 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <h2 className="text-xl font-semibold text-gray-900 select-none">
            {editingProgram ? 'Edit Shorts Program' : 'Create Shorts Program'}
          </h2>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Program Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Program Name
            </label>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="e.g. Shorts 1 - Comedic Shorts: Doing the Most"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Available Shorts */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Available Shorts</h3>
              {/* Search Field */}
              <div className="mb-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title or director..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="border border-gray-300 rounded-md max-h-96 overflow-y-auto">
                {filteredAvailableShorts.map((short) => (
                  <div
                    key={short.id}
                    className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => addShort(short)}
                  >
                    <div className="font-medium text-sm">{short.title}</div>
                    <div className="text-xs text-gray-600">{renderPersonName(short.director)} • {short.run_time}min</div>
                  </div>
                ))}
                {filteredAvailableShorts.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    {searchTerm ? 'No shorts match your search' : 'No unassigned shorts available'}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Shorts */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Program Shorts (in order)</h3>
              <div className="border border-gray-300 rounded-md max-h-96 overflow-y-auto">
                {selectedShorts.map((short, index) => (
                  <div
                    key={short.id}
                    className="p-3 border-b border-gray-100 bg-blue-50 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{index + 1}. {short.title}</div>
                      <div className="text-xs text-gray-600">{renderPersonName(short.director)} • {short.run_time}min</div>
                    </div>
                    <div className="flex space-x-1">
                      {index > 0 && (
                        <button
                          onClick={() => moveShort(index, index - 1)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ↑
                        </button>
                      )}
                      {index < selectedShorts.length - 1 && (
                        <button
                          onClick={() => moveShort(index, index + 1)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ↓
                        </button>
                      )}
                      <button
                        onClick={() => removeShort(short.id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {selectedShorts.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    Click shorts from the left to add them
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          {editingProgram && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Delete Program
            </button>
          )}
          <div className={`flex space-x-3 ${!editingProgram ? 'ml-auto' : ''}`}>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!programName.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (editingProgram ? 'Saving...' : 'Creating...') : (editingProgram ? 'Save Program' : 'Create Program')}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-60 pointer-events-none">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 pointer-events-auto shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Shorts Program</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete "{programName}"? 
              {selectedShorts.length > 0 && (
                <span className="block mt-2 font-medium">
                  The {selectedShorts.length} short{selectedShorts.length !== 1 ? 's' : ''} in this program will become unassigned.
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Create Program Event Modal Component
interface CreateProgramEventModalProps {
  onClose: () => void
  onSave: () => void
  editingEvent?: ProgramCard | null
  supabase: any
}

function CreateProgramEventModal({ onClose, onSave, editingEvent, supabase }: CreateProgramEventModalProps) {
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [participants, setParticipants] = useState('')
  const [description, setDescription] = useState('')
  const [isIndustryDays, setIsIndustryDays] = useState(false)
  const [saving, setSaving] = useState(false)
  const [venues, setVenues] = useState<VenueCard[]>([])
  const [guests, setGuests] = useState<GuestCard[]>([])
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Load venues and guests for auto-suggest
  useEffect(() => {
    const loadVenuesAndGuests = async () => {
      const [venuesResponse, guestsResponse] = await Promise.all([
        supabase.from('venues').select('*'),
        supabase.from('guests').select('*')
      ])
      
      if (venuesResponse.data) setVenues(venuesResponse.data)
      if (guestsResponse.data) setGuests(guestsResponse.data)
    }
    loadVenuesAndGuests()
  }, [supabase])

  // Populate form when editing
  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title || '')
      setEventDate(editingEvent.event_date || '')
      setStartTime(editingEvent.start_time || '')
      setEndTime(editingEvent.end_time || '')
      setVenueName(editingEvent.venue_name || '')
      setVenueAddress(editingEvent.venue_address || '')
      setParticipants(editingEvent.participants || '')
      setDescription(editingEvent.description || '')
      setIsIndustryDays(editingEvent.is_industry_days || false)
    }
  }, [editingEvent])

  const handleVenueSelect = (venue: VenueCard) => {
    setVenueName(venue.name)
    setVenueAddress(venue.address)
  }

  const handleSave = async () => {
    if (!title.trim()) return

    setSaving(true)
    try {
      const programData = {
        title: title.trim(),
        event_date: eventDate || null,
        start_time: startTime || null,
        end_time: endTime || null,
        venue_name: venueName.trim() || null,
        venue_address: venueAddress.trim() || null,
        participants: participants.trim() || null,
        description: description.trim() || null,
        is_industry_days: isIndustryDays
      }

      if (editingEvent) {
        const { error } = await supabase
          .from('programs')
          .update(programData)
          .eq('id', editingEvent.id)

        if (error) {
          console.error('Error updating program:', error)
          alert(`Error updating program: ${error.message}`)
          return
        }
      } else {
        const { error } = await supabase
          .from('programs')
          .insert([programData])

        if (error) {
          console.error('Error creating program:', error)
          alert(`Error creating program: ${error.message}`)
          return
        }
      }

      onSave()
    } catch (error) {
      console.error('Error saving program:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'auto'
        }}
      >
        <div 
          className="px-6 py-4 border-b border-gray-200 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <h2 className="text-xl font-semibold text-gray-900 select-none">
            {editingEvent ? 'Edit Program' : 'Create Program'}
          </h2>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
          {/* Program Title - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Program/Event Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Industry Panel: The Future of Distribution"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeDateValue(e.target.value)
                  if (normalized !== e.target.value) {
                    setEventDate(normalized)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Search venues or enter manually..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              list="venues-datalist"
            />
            <datalist id="venues-datalist">
              {venues.map(venue => (
                <option key={venue.id} value={venue.name} />
              ))}
            </datalist>
            {venueAddress && (
              <p className="mt-1 text-sm text-gray-500">{venueAddress}</p>
            )}
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Participants</label>
            <textarea
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="List participants (names will auto-suggest from Guest Cards)..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Program Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the program/event..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Industry Days Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="industry-days"
              checked={isIndustryDays}
              onChange={(e) => setIsIndustryDays(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="industry-days" className="ml-2 block text-sm text-gray-700">
              Part of Industry Days
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : editingEvent ? 'Update Program' : 'Create Program'}
          </button>
        </div>
      </div>
    </div>
  )
}