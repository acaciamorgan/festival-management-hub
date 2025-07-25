'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FilmCard } from '@/types'
import { FilmCardPopup } from '@/components/cards/film-card-popup'

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
  screenwriter: string
  cinematographer: string
  art_director: string
  editor: string
  principal_cast: string
  sound_designer: string
  music_score: string
  producer: string
  executive_producer: string
  production_companies: string
  film_website: string
  trailer_url: string
  premiere_status: string
  content_warnings: string
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
  screenwriter: string
  cinematographer: string
  art_director: string
  editor: string
  principal_cast: string
  sound_designer: string
  music_score: string
  producer: string
  executive_producer: string
  production_companies: string
  film_website: string
  trailer_url: string
  content_warnings: string
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
  const [viewMode, setViewMode] = useState<ViewMode>('features')
  const [films, setFilms] = useState<FeatureFilm[]>([])
  const [shorts, setShorts] = useState<ShortFilm[]>([])
  const [filteredFilms, setFilteredFilms] = useState<FeatureFilm[]>([])
  const [filteredShorts, setFilteredShorts] = useState<ShortFilm[]>([])
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
  
  const supabase = createClient()

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
      // Query with shorts program relationship
      const { data, error } = await supabase
        .from('short_films')
        .select(`
          *,
          shorts_programs(id, program_name, program_number)
        `)
        .order('shorts_program_id, program_order')
      
      if (error) {
        console.error('Error loading shorts:', error)
        setShorts([])
        setFilteredShorts([])
      } else {
        const processedShorts = (data || []).map(short => ({
          ...short,
          programs: [short.program_1, short.program_2, short.program_3]
            .filter(Boolean).join(', '),
          genres: [short.genre_1, short.genre_2, short.genre_3]
            .filter(Boolean).join(', '),
          shorts_program: short.shorts_programs
        }))
        
        setShorts(processedShorts)
        setFilteredShorts(processedShorts)
      }
    } catch (error) {
      console.error('Error loading shorts:', error)
      setShorts([])
      setFilteredShorts([])
    } finally {
      setLoading(false)
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
        film.art_director, film.editor, film.principal_cast,
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
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const searchableText = [
          item.title, item.original_language_title, item.director,
          item.countries, item.screenwriter, item.cinematographer,
          item.art_director, item.editor, item.principal_cast,
          item.sound_designer, item.music_score, item.producer,
          item.executive_producer, item.production_companies
        ].join(' ').toLowerCase()
        
        if (!searchableText.includes(searchLower)) return false
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
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof (FeatureFilm | ShortFilm)]
        const bVal = b[sortConfig.key as keyof (FeatureFilm | ShortFilm)]
        
        const aNorm = normalizeForSort(aVal?.toString())
        const bNorm = normalizeForSort(bVal?.toString())
        
        if (aNorm < bNorm) return sortConfig.direction === 'asc' ? -1 : 1
        if (aNorm > bNorm) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
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
        // Look for key header fields that indicate this is the complete header row
        if (row.some(cell => cell.includes('Screenwriter')) && 
            row.some(cell => cell.includes('Cinematographer')) &&
            row.some(cell => cell.includes('Principal Cast'))) {
          headerRowIndex = i
          headers = row
          break
        }
      }
      
      // Fallback to first row if header detection fails
      if (headers.length === 0) {
        headers = rows[0]
        headerRowIndex = 0
      }
      
      console.log('Using header row index:', headerRowIndex)
      console.log('Headers:', headers)
      
      // Detect if this is a shorts CSV
      const isShortsCsv = headers.some(header => 
        header.trim().toLowerCase().includes('order coding') ||
        headers.length > 20 // Shorts CSV has many more columns
      )

      if (isShortsCsv) {
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

  const processFeatureFilmsCSV = async (rows: string[][], headers: string[]) => {
    // Create field mapping with exact header matching
    const fieldMap: Record<string, string> = {
      'Title': 'title',
      'Source': 'source',
      'Original Language Title': 'original_language_title',
      'Director': 'director',
      'Country/ies (Please list United Kingdom or United States for UK and US.\nExample for multiple countries: Argentina | Brazil | Mexico)\nList Main country and then co-production countries following.': 'countries',
      'Program 1': 'program_1',
      'Program 2': 'program_2', 
      'Program 3': 'program_3',
      'Program 4': 'program_4',
      'Genre 1': 'genre_1',
      'Genre 2': 'genre_2',
      'Genre 3': 'genre_3', 
      'Genre 4': 'genre_4',
      'Run time': 'run_time',
      'Language': 'language',
      'Subtitles? (Yes or No)': 'subtitles',
      'Captions (open or closed or no)': 'captions',
      'Original Release Year': 'original_release_year',
      'Screenwriter': 'screenwriter',
      'Cinematographer': 'cinematographer',
      'Art Director': 'art_director',
      'Editor': 'editor',
      'Principal Cast': 'principal_cast',
      'Sound Designer': 'sound_designer',
      'Music/Score': 'music_score',
      'Producer': 'producer',
      'Executive Producer': 'executive_producer',
      'Production Companies': 'production_companies',
      'Film website': 'film_website',
      'Trailer (YouTube or Vimeo only)': 'trailer_url',
      'Premiere Status': 'premiere_status',
      'Content Warnings': 'content_warnings'
    }

    const filmsToInsert = []
    
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i]
      const filmData: Partial<FilmCard> = {}
      
      headers.forEach((header, index) => {
        const cleanHeader = header.trim()
        const dbField = fieldMap[cleanHeader]
        if (dbField && values[index]) {
          const value = values[index].trim()
          
          // Convert numeric fields
          if (dbField === 'run_time' || dbField === 'original_release_year') {
            const numValue = parseInt(value)
            if (!isNaN(numValue)) {
              (filmData as Record<string, number | string>)[dbField] = numValue
            }
          } else if (value) {
            (filmData as Record<string, number | string>)[dbField] = value
          }
        }
      })
      
      if (filmData.title) {
        filmsToInsert.push(filmData)
      }
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
      
      // Check if Card with this exact title already exists
      const existingCard = (existingCards || []).find(card => card.title === filmData.title)
      
      if (existingCard) {
        // UPDATE existing Card - newest data takes priority
        const { error } = await supabase
          .from('feature_films')
          .update({ ...filmData, updated_at: new Date().toISOString() })
          .eq('id', existingCard.id)
        
        if (!error) updated++
      } else {
        // CREATE new Card
        const { error } = await supabase
          .from('feature_films')
          .insert([filmData])
        
        if (!error) created++
      }
    }

    setUploadStatus(`Successfully processed ${filmsToInsert.length} films! Created: ${created}, Updated: ${updated}`)
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
      'Art Director': 'art_director',
      'Editor': 'editor',
      'Principal Cast': 'principal_cast',
      'Music/Score': 'music_score',
      'Producer': 'producer',
      'Executive Producer': 'executive_producer',
      'Production Companies': 'production_companies',
      'Film website': 'film_website',
      'Trailer (YouTube or Vimeo only)': 'trailer_url',
      'Premiere Status': 'premiere_status',
      'Content Warnings': 'content_warnings'
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
        art_director: rowData.art_director,
        editor: rowData.editor,
        principal_cast: rowData.principal_cast,
        music_score: rowData.music_score,
        producer: rowData.producer,
        executive_producer: rowData.executive_producer,
        production_companies: rowData.production_companies,
        film_website: rowData.film_website,
        trailer_url: rowData.trailer_url,
        content_warnings: rowData.content_warnings,
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
          .update({ ...shortData, updated_at: new Date().toISOString() })
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
    
    // Find column indices directly
    const indices = {
      title: headers.indexOf('Film Title'),
      source: headers.indexOf('Source'),
      original_language_title: headers.indexOf('Original Language Title'),
      language: headers.indexOf('Language'),
      subtitles: headers.indexOf('Subtitles? (Yes or No)'),
      run_time: headers.indexOf('Run time'),
      director: headers.indexOf('Director'),
      countries: headers.findIndex(h => h && h.includes('Country')),
      program_1: headers.indexOf('Program 1'),
      program_2: headers.indexOf('Program 2'),
      genre_1: headers.indexOf('Genre 1'),
      genre_2: headers.indexOf('Genre 2'),
      genre_3: headers.indexOf('Genre 3'),
      captions: headers.findIndex(h => h && h.includes('Captions')),
      screenwriter: headers.indexOf('Screenwriter'),
      cinematographer: headers.indexOf('Cinematographer'),
      art_director: headers.indexOf('Art Director'),
      editor: headers.indexOf('Editor'),
      principal_cast: headers.indexOf('Principal Cast'),
      music_score: headers.indexOf('Music/Score'),
      producer: headers.indexOf('Producer'),
      executive_producer: headers.indexOf('Executive Producer'),
      production_companies: headers.indexOf('Production Companies'),
      film_website: headers.indexOf('Film website'),
      trailer_url: headers.findIndex(h => h && h.includes('Trailer')),
      premiere_status: headers.indexOf('Premiere Status'),
      content_warnings: headers.indexOf('Content Warnings')
    }

    console.log('Column indices found:', indices)
    
    // NEW SIMPLE APPROACH - Skip all the complex mapping
    let created = 0
    let updated = 0

    // Process each row directly (start after header row)
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0 || !row[indices.title]?.trim()) continue

      const title = row[indices.title]?.trim()
      if (!title) continue
      
      // Skip program header rows (they have titles in other columns but not film data)
      // These rows typically have content like "Shorts 1 - Comedic Shorts: Doing the Most"
      if (title.toLowerCase().includes('shorts ') && title.includes(' - ')) {
        console.log(`Skipping program header row: "${title}"`)
        continue
      }

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
        art_director: row[indices.art_director]?.replace(/^\s+|\s+$/g, '') || null,
        editor: row[indices.editor]?.replace(/^\s+|\s+$/g, '') || null,
        principal_cast: row[indices.principal_cast]?.replace(/^\s+|\s+$/g, '') || null,
        music_score: row[indices.music_score]?.replace(/^\s+|\s+$/g, '') || null,
        producer: row[indices.producer]?.replace(/^\s+|\s+$/g, '') || null,
        executive_producer: row[indices.executive_producer]?.replace(/^\s+|\s+$/g, '') || null,
        production_companies: row[indices.production_companies]?.replace(/^\s+|\s+$/g, '') || null,
        film_website: row[indices.film_website]?.trim() || null,
        trailer_url: row[indices.trailer_url]?.trim() || null,
        premiere_status: row[indices.premiere_status]?.trim() || null,
        content_warnings: row[indices.content_warnings]?.trim() || null
      }

      // Handle numeric fields
      if (row[indices.run_time]) {
        const runtime = parseInt(row[indices.run_time])
        if (!isNaN(runtime)) shortData.run_time = runtime
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
    await loadShorts()
  }

  useEffect(() => {
    if (viewMode === 'features') {
      loadFilms()
    } else if (viewMode === 'shorts') {
      loadShorts()
    }
  }, [loadFilms, loadShorts, viewMode])
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">🎬 Films</h1>
            <p className="text-sm text-gray-600 mt-1">
              {viewMode === 'features' && `${filteredFilms.length} of ${films.length} films`}
              {viewMode === 'shorts' && `${filteredShorts.length} of ${shorts.length} shorts`}
              {viewMode === 'programs' && 'Program Cards (Coming Soon)'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {viewMode === 'shorts' && (
              <button
                onClick={() => setShowCreateProgramModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                ➕ Create Shorts Program
              </button>
            )}
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
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h2 className="text-lg font-medium mb-4">Program Cards</h2>
            <p className="text-gray-600 mb-4">Program Cards feature coming soon.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">
                Loading {viewMode === 'features' ? 'films' : 'shorts'}...
              </p>
            </div>
          </div>
        ) : (viewMode === 'features' ? films.length === 0 : shorts.length === 0) ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h2 className="text-lg font-medium mb-4">
              No {viewMode === 'features' ? 'Films' : 'Shorts'} Yet
            </h2>
            <p className="text-gray-600 mb-4">
              Upload a CSV file to add {viewMode === 'features' ? 'films' : 'shorts'} to the database.
            </p>
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
          </div>
        ) : viewMode === 'features' ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
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
                      { key: 'original_release_year', label: 'Year', width: 70 },
                      { key: 'screenwriter', label: 'Screenwriter', width: 150 },
                      { key: 'cinematographer', label: 'Cinematographer', width: 150 },
                      { key: 'art_director', label: 'Art Director', width: 120 },
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
                      { key: 'content_warnings', label: 'Content Warnings', width: 150 }
                    ].map((column) => (
                      <th
                        key={column.key}
                        className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50"
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
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
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
                        className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 cursor-pointer hover:bg-blue-50" 
                        style={{ minWidth: `${columnWidths['title'] || 200}px` }}
                        onClick={() => setSelectedFilm(film)}
                      >
                        <span className="text-blue-600 hover:text-blue-800 hover:underline">
                          {film.title}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['source'] || 100}px` }}>{film.source}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['original_language_title'] || 180}px` }}>{film.original_language_title}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['director'] || 150}px` }}>{film.director}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['countries'] || 150}px` }}>{film.countries}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['programs'] || 150}px` }}>{film.programs}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['genres'] || 120}px` }}>{film.genres}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['run_time'] || 80}px` }}>{film.run_time ? `${film.run_time} min` : ''}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['language'] || 100}px` }}>{film.language}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['subtitles'] || 80}px` }}>{film.subtitles}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['captions'] || 80}px` }}>{film.captions}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['original_release_year'] || 70}px` }}>{film.original_release_year}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['screenwriter'] || 150}px` }}>{film.screenwriter}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['cinematographer'] || 150}px` }}>{film.cinematographer}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['art_director'] || 120}px` }}>{film.art_director}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['editor'] || 100}px` }}>{film.editor}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['principal_cast'] || 200}px` }}>{film.principal_cast}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['sound_designer'] || 120}px` }}>{film.sound_designer}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['music_score'] || 120}px` }}>{film.music_score}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['producer'] || 150}px` }}>{film.producer}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['executive_producer'] || 150}px` }}>{film.executive_producer}</td>
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
                      <td className="px-3 py-2 text-sm text-gray-900" style={{ minWidth: `${columnWidths['content_warnings'] || 150}px` }}>{film.content_warnings}</td>
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
              // Group shorts by Shorts Program
              const groupedShorts = filteredShorts.reduce((groups, short) => {
                const programName = short.shorts_program?.program_name || 'Unassigned Shorts'
                if (!groups[programName]) {
                  groups[programName] = []
                }
                groups[programName].push(short)
                return groups
              }, {} as Record<string, ShortFilm[]>)

              return Object.entries(groupedShorts).map(([programName, programShorts]) => (
                <div key={programName} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* Program Header */}
                  <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{programName}</h3>
                      <p className="text-sm text-gray-300">{programShorts.length} shorts</p>
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
                            { key: 'programs', label: 'Programs', width: 150 },
                            { key: 'genres', label: 'Genres', width: 120 },
                            { key: 'run_time', label: 'Runtime', width: 80 },
                            { key: 'language', label: 'Language', width: 100 },
                            { key: 'subtitles', label: 'Subtitles', width: 80 },
                            { key: 'captions', label: 'Captions', width: 80 },
                            { key: 'original_release_year', label: 'Year', width: 70 },
                            { key: 'screenwriter', label: 'Screenwriter', width: 150 },
                            { key: 'cinematographer', label: 'Cinematographer', width: 150 },
                            { key: 'art_director', label: 'Art Director', width: 120 },
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
                            { key: 'content_warnings', label: 'Content Warnings', width: 150 }
                          ].map((column) => (
                            <th
                              key={column.key}
                              className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50"
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
                                className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
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
                              className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 cursor-pointer hover:bg-blue-50" 
                              style={{ minWidth: `${columnWidths['title'] || 200}px` }}
                              onClick={() => setSelectedFilm(short)}
                            >
                              <span className="text-blue-600 hover:text-blue-800 hover:underline">
                                {short.title}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['source'] || 100}px` }}>{short.source}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['original_language_title'] || 180}px` }}>{short.original_language_title}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['director'] || 150}px` }}>{short.director}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['countries'] || 150}px` }}>{short.countries}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['programs'] || 150}px` }}>{short.programs}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['genres'] || 120}px` }}>{short.genres}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['run_time'] || 80}px` }}>{short.run_time ? `${short.run_time} min` : ''}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['language'] || 100}px` }}>{short.language}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['subtitles'] || 80}px` }}>{short.subtitles}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['captions'] || 80}px` }}>{short.captions}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['original_release_year'] || 70}px` }}>{short.original_release_year}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['screenwriter'] || 150}px` }}>{short.screenwriter}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['cinematographer'] || 150}px` }}>{short.cinematographer}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['art_director'] || 120}px` }}>{short.art_director}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['editor'] || 100}px` }}>{short.editor}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['principal_cast'] || 200}px` }}>{short.principal_cast}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['sound_designer'] || 120}px` }}>{short.sound_designer}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['music_score'] || 120}px` }}>{short.music_score}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['producer'] || 150}px` }}>{short.producer}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['executive_producer'] || 150}px` }}>{short.executive_producer}</td>
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
                            <td className="px-3 py-2 text-sm text-gray-900" style={{ minWidth: `${columnWidths['content_warnings'] || 150}px` }}>{short.content_warnings}</td>
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
  const [searchTerm, setSearchTerm] = useState('')
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

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

        // First, remove all shorts from this program
        await supabase
          .from('short_films')
          .update({
            shorts_program_id: null,
            program_order: null
          })
          .eq('shorts_program_id', editingProgram.id)
      } else {
        // Create new program
        const { data: newProgram, error: programError } = await supabase
          .from('shorts_programs')
          .insert([{
            program_number: Math.floor(Math.random() * 1000000), // Simple unique number
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

      // Assign selected shorts to this program
      for (let i = 0; i < selectedShorts.length; i++) {
        const short = selectedShorts[i]
        await supabase
          .from('short_films')
          .update({
            shorts_program_id: programId,
            program_order: i + 1
          })
          .eq('id', short.id)
      }

      onSave()
    } catch (error) {
      console.error('Error saving program:', error)
    } finally {
      setSaving(false)
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

  // Filter available shorts based on search term
  const filteredAvailableShorts = availableShorts.filter(short =>
    short.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    short.director.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
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
                    <div className="text-xs text-gray-600">{short.director} • {short.run_time}min</div>
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
                      <div className="text-xs text-gray-600">{short.director} • {short.run_time}min</div>
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
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!programName.trim() || selectedShorts.length === 0 || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create Program'}
          </button>
        </div>
      </div>
    </div>
  )
}