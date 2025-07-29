'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import * as XLSX from 'xlsx'

// Interface for theater house with short codes
interface TheaterHouse {
  id: string
  venue_id: string
  house_name: string
  seat_count: number
  short_code: string | null
  venue_name?: string
}

// Interface for films from Films Grid
interface FilmGridEntry {
  id: string
  film: string
  runtime: number | null
}

// Interface for ticketing screenings
interface TicketingScreening {
  id: string
  film_title: string
  programming_film_id: string | null
  screening_date: string
  day_of_week: string
  start_time: string
  run_time: number | null
  venue_short_code: string
  capacity: number | null
  notes: string | null
  is_cancelled: boolean
  created_at: string
  updated_at: string
  created_by: string
}

// Interface for screening form data
interface ScreeningFormData {
  film_title: string
  programming_film_id: string | null
  screening_date: string
  start_time: string
  run_time: number | null
  venue_short_code: string
  capacity: number | null
  notes: string
}

// Interface for film cards from titles database
interface FilmCardMatch {
  id: string
  title: string
  type: 'feature' | 'short'
  matchScore?: number
}

// Fuzzy matching utility functions
const normalizeTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
}

const moveArticleToEnd = (title: string): string => {
  const articles = ['the', 'a', 'an']
  const words = title.toLowerCase().split(' ')
  
  if (articles.includes(words[0])) {
    return `${words.slice(1).join(' ')}, ${words[0]}`
  }
  return title
}

const moveArticleToFront = (title: string): string => {
  const match = title.match(/^(.+),\s*(the|a|an)$/i)
  if (match) {
    return `${match[2]} ${match[1]}`
  }
  return title
}

const calculateLevenshteinDistance = (str1: string, str2: string): number => {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

const getSimilarityScore = (str1: string, str2: string): number => {
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 1
  
  const distance = calculateLevenshteinDistance(str1, str2)
  return (maxLength - distance) / maxLength
}

export default function TicketingGridPage() {
  const { user } = useAuth()
  const [screenings, setScreenings] = useState<TicketingScreening[]>([])
  const [filmsData, setFilmsData] = useState<FilmGridEntry[]>([])
  const [filmCards, setFilmCards] = useState<FilmCardMatch[]>([])
  const [theaterHouses, setTheaterHouses] = useState<TheaterHouse[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingScreening, setEditingScreening] = useState<TicketingScreening | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<ScreeningFormData>({
    film_title: '',
    programming_film_id: null,
    screening_date: '',
    start_time: '',
    run_time: null,
    venue_short_code: '',
    capacity: null,
    notes: ''
  })
  
  // Search/filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [filmSearchTerm, setFilmSearchTerm] = useState('')
  const [filmSearchResults, setFilmSearchResults] = useState<FilmGridEntry[]>([])
  const [showFilmSuggestions, setShowFilmSuggestions] = useState(false)
  const [venueSearchTerm, setVenueSearchTerm] = useState('')
  const [venueSearchResults, setVenueSearchResults] = useState<TheaterHouse[]>([])
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false)
  
  // CSV upload state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Download dropdown state
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false)
  
  // Publishing state
  const [selectedForPublish, setSelectedForPublish] = useState<Set<string>>(new Set())
  const [publishing, setPublishing] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [unmatchedTitles, setUnmatchedTitles] = useState<Array<{screening: TicketingScreening, matches: FilmCardMatch[]}>>([])
  
  // Column resizing and sorting state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null)

  const supabase = createClient()

  // Sorting functions (same smart sorting as other modules)
  const normalizeForSort = (str: string | undefined | null): string => {
    if (!str) return ''
    return str
      .toLowerCase()
      .trim()
  }

  const handleSort = (columnKey: string) => {
    setSortConfig(prev => {
      if (prev?.key === columnKey) {
        return {
          key: columnKey,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return { key: columnKey, direction: 'asc' }
    })
  }

  const handleResize = (columnKey: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: width
    }))
  }

  // Publishing functions
  const handleSelectForPublish = (screeningId: string, selected: boolean) => {
    setSelectedForPublish(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(screeningId)
      } else {
        newSet.delete(screeningId)
      }
      return newSet
    })
  }

  const handleSelectAllForPublish = (selected: boolean) => {
    if (selected) {
      const unpublishedIds = screenings.filter(s => !s.is_published).map(s => s.id)
      setSelectedForPublish(new Set(unpublishedIds))
    } else {
      setSelectedForPublish(new Set())
    }
  }

  const validateAndPublishScreenings = async () => {
    console.log('validateAndPublishScreenings called')
    console.log('selectedForPublish.size:', selectedForPublish.size)
    console.log('filmCards available:', filmCards.length)
    console.log('First few filmCards:', filmCards.slice(0, 3))
    if (selectedForPublish.size === 0) {
      console.log('Early return - no screenings selected')
      return
    }

    setPublishing(true)
    const screeningsToPublish = screenings.filter(s => selectedForPublish.has(s.id))
    const unmatched: Array<{screening: TicketingScreening, matches: FilmCardMatch[]}> = []
    const readyToPublish: Array<{screening: TicketingScreening, filmCard: FilmCardMatch}> = []

    // Validate each screening against film cards
    for (const screening of screeningsToPublish) {
      try {
        console.log(`Processing screening: ${screening.film_title}`)
        console.log('Available film cards for matching:', filmCards.map(f => f.title).slice(0, 10))
        const matches = findFilmCardMatches(screening.film_title, 0.85)
        console.log(`Found ${matches.length} matches for "${screening.film_title}":`, matches)
        
        if (matches.length === 0) {
          // No matches found
          console.log(`No matches found for: ${screening.film_title}`)
          unmatched.push({ screening, matches: [] })
        } else if (matches.length === 1 || (matches[0].matchScore === 1.0)) {
          // Exact match or single match - safe to auto-publish
          console.log(`Ready to publish: ${screening.film_title} → ${matches[0].title}`)
          console.log('filmCard object being added:', matches[0])
          if (!matches[0] || !matches[0].id) {
            console.error('Invalid filmCard object:', matches[0])
            unmatched.push({ screening, matches: [] })
          } else {
            readyToPublish.push({ screening, filmCard: matches[0] })
          }
        } else {
          // Multiple potential matches - need user confirmation
          console.log(`Multiple matches for: ${screening.film_title}`, matches)
          unmatched.push({ screening, matches })
        }
      } catch (error) {
        console.error(`Error processing screening ${screening.film_title}:`, error)
        // Skip this screening and continue with others
        unmatched.push({ screening, matches: [] })
      }
    }

    let publishedCount = 0
    // Publish the ones with clear matches
    for (const { screening, filmCard } of readyToPublish) {
      try {
        console.log(`Publishing: ${screening.film_title} → ${filmCard?.title}`)
        console.log('filmCard object:', filmCard)
        if (!filmCard || !filmCard.id) {
          console.error(`Invalid filmCard for ${screening.film_title}:`, filmCard)
          continue
        }
        await publishScreening(screening, filmCard)
        publishedCount++
      } catch (error) {
        console.error(`Error publishing screening ${screening.film_title}:`, error)
      }
    }

    // Reload data to refresh the grid
    await loadData()

    // Show modal for unmatched ones
    if (unmatched.length > 0) {
      setUnmatchedTitles(unmatched)
      setShowPublishModal(true)
      // Show success message for auto-published ones if any
      if (publishedCount > 0) {
        alert(`Successfully published ${publishedCount} screenings! ${unmatched.length} screenings require manual matching.`)
      }
    } else {
      // All screenings were published successfully
      setSelectedForPublish(new Set())
      alert(`Successfully published ${publishedCount} screenings!`)
    }

    setPublishing(false)
  }

  const publishScreening = async (screening: TicketingScreening, filmCard: FilmCardMatch) => {
    try {
      console.log('DEBUG: user object in publishScreening:', user)
      console.log('DEBUG: user.id:', user?.id)
      // Insert into published_screenings table
      const { error: publishError } = await supabase
        .from('published_screenings')
        .insert([{
          ticketing_screening_id: screening.id,
          film_card_id: filmCard.id,
          film_title: screening.film_title,
          screening_date: screening.screening_date,
          day_of_week: screening.day_of_week,
          start_time: screening.start_time,
          run_time: screening.run_time,
          venue_short_code: screening.venue_short_code,
          capacity: screening.capacity,
          notes: screening.notes,
          published_by: user?.id || '00000000-0000-0000-0000-000000000000'
        }])

      if (publishError) throw publishError

      // Mark original screening as published
      const { error: updateError } = await supabase
        .from('ticketing_screenings')
        .update({ is_published: true })
        .eq('id', screening.id)

      if (updateError) throw updateError

      console.log(`✅ Published screening: ${screening.film_title} → ${filmCard.title}`)
    } catch (error) {
      console.error('Error publishing screening:', error)
      throw error
    }
  }

  // Fuzzy match function to find film cards
  const findFilmCardMatches = (title: string, threshold: number = 0.8): FilmCardMatch[] => {
    const matches: FilmCardMatch[] = []
    const searchTitle = normalizeTitle(title)
    
    // Try multiple variations of the title
    const titleVariations = [
      title, // Original
      normalizeTitle(title), // Normalized
      moveArticleToEnd(title), // "The Piano" → "Piano, The"
      moveArticleToFront(title), // "Piano, The" → "The Piano"
      moveArticleToEnd(normalizeTitle(title)), // Normalized + article moved
      moveArticleToFront(normalizeTitle(title)) // Normalized + article moved
    ]
    
    filmCards.forEach(filmCard => {
      const cardTitle = normalizeTitle(filmCard.title)
      
      // Check each variation for matches
      titleVariations.forEach(variation => {
        const normalizedVariation = normalizeTitle(variation)
        
        // Exact match
        if (normalizedVariation === cardTitle) {
          const matchObj = { ...filmCard, matchScore: 1.0 }
          console.log('Exact match found:', matchObj)
          matches.push(matchObj)
          return
        }
        
        // Fuzzy match using Levenshtein distance
        const similarity = getSimilarityScore(normalizedVariation, cardTitle)
        if (similarity >= threshold) {
          matches.push({ ...filmCard, matchScore: similarity })
        }
        
        // Substring match
        if (cardTitle.includes(normalizedVariation) || normalizedVariation.includes(cardTitle)) {
          const substringSimilarity = Math.min(normalizedVariation.length, cardTitle.length) / Math.max(normalizedVariation.length, cardTitle.length)
          if (substringSimilarity >= threshold) {
            matches.push({ ...filmCard, matchScore: substringSimilarity })
          }
        }
      })
    })
    
    // Remove duplicates and sort by match score
    const uniqueMatches = matches.reduce((acc, match) => {
      const existing = acc.find(m => m.id === match.id)
      if (!existing || (match.matchScore && existing.matchScore && match.matchScore > existing.matchScore)) {
        acc = acc.filter(m => m.id !== match.id)
        acc.push(match)
      }
      return acc
    }, [] as FilmCardMatch[])
    
    return uniqueMatches.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
  }

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load screenings
      const { data: screeningsData, error: screeningsError } = await supabase
        .from('ticketing_screenings')
        .select('*')
        .order('screening_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (screeningsError) throw screeningsError
      console.log('DEBUG: Raw screening dates from database:', 
        (screeningsData || []).slice(0, 3).map(s => ({ 
          title: s.film_title, 
          raw_date: s.screening_date, 
          parsed: new Date(s.screening_date) 
        }))
      )
      setScreenings(screeningsData || [])

      // Load films from Films Grid
      const { data: filmsGridData, error: filmsError } = await supabase
        .from('programming_films')
        .select('id, film, runtime')
        .order('film', { ascending: true })

      if (filmsError) throw filmsError
      setFilmsData(filmsGridData || [])

      // Load film cards from both feature and short films tables
      const [featureFilmsResult, shortFilmsResult] = await Promise.all([
        supabase
          .from('feature_films')
          .select('id, title')
          .order('title', { ascending: true }),
        supabase
          .from('short_films')
          .select('id, title')
          .order('title', { ascending: true })
      ])

      if (featureFilmsResult.error) throw featureFilmsResult.error
      if (shortFilmsResult.error) throw shortFilmsResult.error

      const combinedFilmCards: FilmCardMatch[] = [
        ...(featureFilmsResult.data || []).map(film => ({ ...film, type: 'feature' as const })),
        ...(shortFilmsResult.data || []).map(film => ({ ...film, type: 'short' as const }))
      ]
      
      setFilmCards(combinedFilmCards)

      // Load theater houses with venue names
      const { data: housesData, error: housesError } = await supabase
        .from('theater_houses')
        .select(`
          id,
          venue_id,
          house_name,
          seat_count,
          short_code,
          venues!inner(name)
        `)
        .not('short_code', 'is', null)
        .order('short_code', { ascending: true })

      if (housesError) throw housesError
      
      const housesWithVenueName = (housesData || []).map(house => ({
        ...house,
        venue_name: house.venues?.name || 'Unknown Venue'
      }))
      
      setTheaterHouses(housesWithVenueName)

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Film search functionality
  useEffect(() => {
    if (filmSearchTerm.length > 0) {
      const filtered = filmsData.filter(film =>
        film.film.toLowerCase().includes(filmSearchTerm.toLowerCase())
      ).slice(0, 10) // Limit to 10 suggestions
      setFilmSearchResults(filtered)
      setShowFilmSuggestions(true)
    } else {
      setFilmSearchResults([])
      setShowFilmSuggestions(false)
    }
  }, [filmSearchTerm, filmsData])

  // Venue search functionality
  useEffect(() => {
    if (venueSearchTerm.length > 0) {
      const filtered = theaterHouses.filter(house =>
        house.short_code?.toLowerCase().includes(venueSearchTerm.toLowerCase()) ||
        house.venue_name?.toLowerCase().includes(venueSearchTerm.toLowerCase()) ||
        house.house_name.toLowerCase().includes(venueSearchTerm.toLowerCase())
      ).slice(0, 10) // Limit to 10 suggestions
      setVenueSearchResults(filtered)
      setShowVenueSuggestions(true)
    } else {
      setVenueSearchResults([])
      setShowVenueSuggestions(false)
    }
  }, [venueSearchTerm, theaterHouses])

  // Helper functions
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    console.log('DEBUG formatDate - input:', dateString, 'parsed date:', date)
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    const year = date.getFullYear()
    return `${month}. ${day}, ${year}`
  }

  const getDayOfWeek = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  const formatTime = (timeString: string): string => {
    const time = new Date(`2000-01-01 ${timeString}`)
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    })
  }

  // Form handlers
  const handleFilmSelect = (film: FilmGridEntry) => {
    setFormData(prev => ({
      ...prev,
      film_title: film.film,
      programming_film_id: film.id,
      run_time: prev.run_time || film.runtime // Use existing runtime or film's runtime
    }))
    setFilmSearchTerm(film.film)
    setShowFilmSuggestions(false)
  }

  const handleVenueSelect = (house: TheaterHouse) => {
    setFormData(prev => ({
      ...prev,
      venue_short_code: house.short_code || '',
      capacity: house.seat_count
    }))
    setVenueSearchTerm(house.short_code || '')
    setShowVenueSuggestions(false)
  }

  const handleDateChange = (dateValue: string) => {
    console.log('DEBUG: Date input value:', dateValue)
    
    // Bulletproof date validation and parsing
    if (!dateValue) {
      setFormData(prev => ({ ...prev, screening_date: '' }))
      return
    }

    // HTML date input should give us YYYY-MM-DD format
    // But let's validate it's actually reasonable
    const inputDate = new Date(dateValue + 'T00:00:00') // Force local timezone
    const year = inputDate.getFullYear()
    const currentYear = new Date().getFullYear()
    
    // Reject dates that are clearly wrong
    if (year < 2020 || year > currentYear + 5) {
      console.error('Invalid date detected:', dateValue, 'parsed as:', inputDate)
      console.error(`BLOCKING BAD DATE: "${dateValue}" parsed as year ${year}`)
      // alert(`Invalid date: "${dateValue}" parsed as year ${year}. Please check your date format.`)
      return
    }

    // Ensure we store the exact YYYY-MM-DD format
    const yyyy = inputDate.getFullYear()
    const mm = String(inputDate.getMonth() + 1).padStart(2, '0')
    const dd = String(inputDate.getDate()).padStart(2, '0')
    const safeDate = `${yyyy}-${mm}-${dd}`
    
    console.log('DEBUG: Storing safe date:', safeDate)
    setFormData(prev => ({
      ...prev,
      screening_date: safeDate
    }))
  }

  const resetForm = () => {
    setFormData({
      film_title: '',
      programming_film_id: null,
      screening_date: '',
      start_time: '',
      run_time: null,
      venue_short_code: '',
      capacity: null,
      notes: ''
    })
    setFilmSearchTerm('')
    setVenueSearchTerm('')
    setEditingScreening(null)
  }

  const handleAddScreening = () => {
    resetForm()
    setShowAddModal(true)
  }

  const handleEditScreening = (screening: TicketingScreening) => {
    setFormData({
      film_title: screening.film_title,
      programming_film_id: screening.programming_film_id,
      screening_date: screening.screening_date,
      start_time: screening.start_time,
      run_time: screening.run_time,
      venue_short_code: screening.venue_short_code,
      capacity: screening.capacity,
      notes: screening.notes || ''
    })
    setFilmSearchTerm(screening.film_title)
    setVenueSearchTerm(screening.venue_short_code)
    setEditingScreening(screening)
    setShowAddModal(true)
  }

  const handleSaveScreening = async () => {
    if (!user || !formData.film_title || !formData.screening_date || !formData.start_time || !formData.venue_short_code) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const screeningData = {
        film_title: formData.film_title,
        programming_film_id: formData.programming_film_id,
        screening_date: formData.screening_date,
        day_of_week: getDayOfWeek(formData.screening_date),
        start_time: formData.start_time,
        run_time: formData.run_time,
        venue_short_code: formData.venue_short_code,
        capacity: formData.capacity,
        notes: formData.notes || null,
        created_by: 'system'
      }

      let error
      if (editingScreening) {
        // Update existing screening
        const { error: updateError } = await supabase
          .from('ticketing_screenings')
          .update(screeningData)
          .eq('id', editingScreening.id)
        error = updateError
      } else {
        // Create new screening
        const { error: insertError } = await supabase
          .from('ticketing_screenings')
          .insert([screeningData])
        error = insertError
      }

      if (error) throw error

      // Update Films Grid runtime if needed
      if (formData.programming_film_id && formData.run_time) {
        await syncRuntimeToFilmsGrid(formData.programming_film_id, formData.run_time)
      }

      await loadData()
      setShowAddModal(false)
      resetForm()
    } catch (error) {
      console.error('Error saving screening:', error)
      alert('Error saving screening. Please try again.')
    }
  }

  // Sync runtime back to Films Grid
  const syncRuntimeToFilmsGrid = async (filmId: string, runtime: number) => {
    try {
      // Get current film data
      const { data: filmData, error: fetchError } = await supabase
        .from('programming_films')
        .select('runtime')
        .eq('id', filmId)
        .single()

      if (fetchError) throw fetchError

      // Only update if Films Grid doesn't have a runtime or if Ticketing Grid overrules
      if (!filmData.runtime) {
        const { error: updateError } = await supabase
          .from('programming_films')
          .update({ runtime })
          .eq('id', filmId)

        if (updateError) throw updateError
      }
    } catch (error) {
      console.error('Error syncing runtime to Films Grid:', error)
    }
  }

  const handleToggleCancel = async (screening: TicketingScreening) => {
    try {
      const { error } = await supabase
        .from('ticketing_screenings')
        .update({ is_cancelled: !screening.is_cancelled })
        .eq('id', screening.id)

      if (error) throw error

      setScreenings(prev => prev.map(s => 
        s.id === screening.id 
          ? { ...s, is_cancelled: !s.is_cancelled }
          : s
      ))
    } catch (error) {
      console.error('Error toggling screening cancellation:', error)
    }
  }

  // CSV Upload functionality
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    console.log('DEBUG: Starting CSV upload, file:', file.name)

    setUploading(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        alert('CSV file must have at least a header row and one data row')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const dataRows = lines.slice(1)
      
      console.log('=== CSV Upload Debug ===')
      console.log('Headers found:', headers)
      console.log('Available films in Films Grid:', filmsData.map(f => f.film))
      
      let processedCount = 0
      let skippedCount = 0

      for (const row of dataRows) {
        const values = row.split(',').map(v => v.trim().replace(/"/g, ''))
        const rowData: any = {}
        
        headers.forEach((header, index) => {
          rowData[header] = values[index] || ''
        })
        
        // Handle different possible column name variations
        const title = rowData.TITLE || rowData.Title || rowData.title
        const date = rowData.DATE || rowData.Date || rowData.date
        const venue = rowData.LOCATION || rowData.Location || rowData.location || rowData.VENUE || rowData.Venue || rowData.venue
        const startTime = rowData['START TIME'] || rowData['Start Time'] || rowData.startTime
        const runTime = rowData['Running Time'] || rowData['RUN TIME'] || rowData['Run Time'] || rowData.runtime
        const capacity = rowData.CAPACITY || rowData.Capacity || rowData.capacity
        const notes = rowData.NOTES || rowData.Notes || rowData.notes
        
        console.log(`Processing: "${title}" | Date: "${date}" | Venue: "${venue}" | Runtime: "${runTime}"`)

        // Skip empty rows
        if (!title || !date) {
          console.log(`Skipping empty row - Title: "${title}", Date: "${date}"`)
          skippedCount++
          continue
        }

        // Try to find matching film for runtime sync, but don't require it
        let matchingFilm = filmsData.find(film => film.film === title)
        if (!matchingFilm) {
          matchingFilm = filmsData.find(film => 
            film.film.toLowerCase() === title.toLowerCase()
          )
        }

        if (matchingFilm) {
          console.log(`✅ Found matching film: "${matchingFilm.film}"`)
        } else {
          console.log(`⚠️ No matching film in Films Grid for: "${title}" - will create screening anyway`)
        }

        // Parse date
        let screeningDate: string
        try {
          const parsedDate = new Date(date)
          screeningDate = parsedDate.toISOString().split('T')[0]
        } catch {
          console.warn(`Invalid date format: ${date}`)
          skippedCount++
          continue
        }

        // Parse runtime more robustly - extract numbers from strings like "94 mins", "94min", "94 minutes"
        let parsedRuntime = null
        if (runTime) {
          const runtimeMatch = runTime.toString().match(/(\d+)/)
          parsedRuntime = runtimeMatch ? parseInt(runtimeMatch[1]) : null
          console.log(`Runtime parsing: "${runTime}" → ${parsedRuntime}`)
        }
        
        const screeningData = {
          film_title: matchingFilm.film,
          programming_film_id: matchingFilm.id,
          screening_date: screeningDate,
          day_of_week: getDayOfWeek(screeningDate),
          start_time: startTime || '00:00',
          run_time: parsedRuntime || matchingFilm.runtime || null,
          venue_short_code: venue || '',
          capacity: capacity ? parseInt(capacity) : null,
          notes: notes || null,
          created_by: 'system'
        }
        
        console.log('Inserting screening data:', screeningData)

        // Check for existing screening to prevent duplicates
        const { data: existingScreening } = await supabase
          .from('ticketing_screenings')
          .select('id')
          .eq('film_title', screeningData.film_title)
          .eq('screening_date', screeningData.screening_date)
          .eq('start_time', screeningData.start_time)
          .eq('venue_short_code', screeningData.venue_short_code)
          .single()

        if (existingScreening) {
          console.log(`⚠️ Duplicate screening found for ${title} on ${screeningData.screening_date} at ${screeningData.start_time} - skipping`)
          skippedCount++
          continue
        }

        // Insert screening
        const { error } = await supabase
          .from('ticketing_screenings')
          .insert([screeningData])

        if (error) {
          console.error(`❌ Error inserting screening for ${title}:`, error)
          skippedCount++
        } else {
          console.log(`✅ Successfully inserted screening for ${title}`)
          processedCount++
          
          // Sync runtime to Films Grid if needed
          if (screeningData.run_time && matchingFilm.id) {
            await syncRuntimeToFilmsGrid(matchingFilm.id, screeningData.run_time)
          }
        }
      }

      await loadData()
      setShowUploadModal(false)
      alert(`CSV upload completed!\nProcessed: ${processedCount} screenings\nSkipped: ${skippedCount} rows`)
    } catch (error) {
      console.error('Error processing CSV:', error)
      alert('Error processing CSV file. Please check the format.')
    } finally {
      setUploading(false)
    }
  }

  // Export functions
  const exportData = (format: 'csv' | 'excel') => {
    const exportData = screenings.map(screening => ({
      'Title': screening.film_title,
      'Day': screening.day_of_week,
      'Date': formatDate(screening.screening_date),
      'Venue': screening.venue_short_code,
      'Start Time': formatTime(screening.start_time),
      'Run Time': screening.run_time ? `${screening.run_time}min` : '',
      'Capacity': screening.capacity || '',
      'Notes': screening.notes || '',
      'Status': screening.is_cancelled ? 'CANCELLED' : 'ACTIVE'
    }))

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `Ticketing Grid ${timestamp}`

    if (format === 'csv') {
      // CSV Export
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row] || ''
            const valueStr = String(value)
            return valueStr.includes(',') || valueStr.includes('"') || valueStr.includes('\n')
              ? `"${valueStr.replace(/"/g, '""')}"`
              : valueStr
          }).join(',')
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${filename}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      // Excel Export
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Ticketing Grid')
      XLSX.writeFile(workbook, `${filename}.xlsx`)
    }

    setShowDownloadDropdown(false)
  }

  // Filter and sort screenings
  const filteredScreenings = useMemo(() => {
    let filtered = screenings

    // Apply search filter
    if (searchTerm) {
      filtered = screenings.filter(screening =>
        screening.film_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        screening.venue_short_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        screening.day_of_week.toLowerCase().includes(searchTerm.toLowerCase()) ||
        screening.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply sorting
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortConfig.key as keyof TicketingScreening]
        const bVal = b[sortConfig.key as keyof TicketingScreening]
        
        // Special handling for different data types
        if (sortConfig.key === 'screening_date') {
          const aDate = new Date(aVal as string).getTime()
          const bDate = new Date(bVal as string).getTime()
          return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate
        }
        
        if (sortConfig.key === 'run_time' || sortConfig.key === 'capacity') {
          const aNum = (aVal as number) || 0
          const bNum = (bVal as number) || 0
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum
        }
        
        // String sorting with normalization
        const aNorm = normalizeForSort(aVal?.toString())
        const bNorm = normalizeForSort(bVal?.toString())
        
        if (aNorm < bNorm) return sortConfig.direction === 'asc' ? -1 : 1
        if (aNorm > bNorm) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [screenings, searchTerm, sortConfig])

  // Table column configuration
  const tableColumns = [
    { key: 'film_title', label: 'Title', width: 200, sortable: true },
    { key: 'day_of_week', label: 'Day', width: 120, sortable: true },
    { key: 'screening_date', label: 'Date', width: 120, sortable: true },
    { key: 'venue_short_code', label: 'Venue', width: 120, sortable: true },
    { key: 'start_time', label: 'Start Time', width: 120, sortable: true },
    { key: 'run_time', label: 'Run Time', width: 120, sortable: true },
    { key: 'capacity', label: 'Capacity', width: 120, sortable: true },
    { key: 'notes', label: 'Notes', width: 200, sortable: false }
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">🎟️ Ticketing Grid - Working</h1>
            <p className="text-sm text-gray-600 mt-1">
              {filteredScreenings.length} of {screenings.length} screenings
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 font-medium"
            >
              Upload CSV
            </button>
            <button
              onClick={handleAddScreening}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
            >
              Add Screening
            </button>
            <button
              onClick={validateAndPublishScreenings}
              disabled={selectedForPublish.size === 0 || publishing}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {publishing && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>Publish Selected ({selectedForPublish.size})</span>
            </button>
            
            {/* Download Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium flex items-center space-x-2"
              >
                <span>Download</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showDownloadDropdown && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => exportData('csv')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => exportData('excel')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Excel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search screenings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden bg-white">
        <div className="overflow-auto" style={{ height: 'calc(100vh - 300px)' }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-500">Loading screenings...</div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {tableColumns.map((column) => (
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
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex flex-col items-center">
                      <span className="text-xs mb-1">Select for</span>
                      <span className="text-xs font-bold">Publishing</span>
                      <input
                        type="checkbox"
                        checked={selectedForPublish.size > 0 && selectedForPublish.size === screenings.filter(s => !s.is_published).length}
                        onChange={(e) => handleSelectAllForPublish(e.target.checked)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-1"
                        title="Select all unpublished screenings for bulk publishing"
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredScreenings.map((screening) => (
                  <tr 
                    key={screening.id} 
                    className={`hover:bg-gray-50 ${
                      screening.is_cancelled 
                        ? 'bg-red-50 text-gray-500' 
                        : ''
                    }`}
                  >
                    {tableColumns.map((column) => {
                      const cellValue = screening[column.key as keyof typeof screening];
                      let displayValue: React.ReactNode = cellValue || '--';
                      
                      if (column.key === 'film_title') {
                        displayValue = <div className="font-medium">{screening.film_title}</div>;
                      } else if (column.key === 'run_time') {
                        displayValue = screening.run_time ? `${screening.run_time}min` : '--';
                      } else if (column.key === 'screening_date') {
                        displayValue = formatDate(screening.screening_date);
                      } else if (column.key === 'start_time') {
                        displayValue = formatTime(screening.start_time);
                      }
                      
                      return (
                        <td 
                          key={column.key}
                          className={`px-3 py-2 text-sm text-gray-900 border-r border-gray-100 ${
                            screening.is_cancelled ? 'line-through' : ''
                          }`}
                          style={{ minWidth: `${columnWidths[column.key] || column.width}px` }}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center text-sm font-medium">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEditScreening(screening)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleCancel(screening)}
                          className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 ${
                            screening.is_cancelled
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {screening.is_cancelled ? (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Uncancel</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Cancel</span>
                            </>
                          )}
                        </button>
                        {!screening.is_published && (
                          <button
                            onClick={async () => {
                              const matches = findFilmCardMatches(screening.film_title, 0.85)
                              if (matches.length === 1 || (matches[0]?.matchScore === 1.0)) {
                                try {
                                  await publishScreening(screening, matches[0])
                                  await loadData()
                                } catch (error) {
                                  alert('Error publishing screening')
                                }
                              } else {
                                setUnmatchedTitles([{ screening, matches }])
                                setShowPublishModal(true)
                              }
                            }}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-700 flex items-center space-x-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Publish</span>
                          </button>
                        )}
                        {screening.is_published && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Published
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={selectedForPublish.has(screening.id)}
                        onChange={(e) => handleSelectForPublish(screening.id, e.target.checked)}
                        disabled={screening.is_published}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </td>
                  </tr>
                ))}
                {filteredScreenings.length === 0 && (
                  <tr>
                    <td colSpan={tableColumns.length + 2} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm
                        ? 'No screenings match your search.'
                        : 'No screenings found. Click "Add Screening" to create your first screening.'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Screening Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingScreening ? 'Edit Screening' : 'Add New Screening'}
            </h3>
            
            <div className="space-y-4">
              {/* Film Title - Searchable Auto-suggest */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Film Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={filmSearchTerm}
                  onChange={(e) => setFilmSearchTerm(e.target.value)}
                  onFocus={() => setShowFilmSuggestions(filmSearchTerm.length > 0)}
                  placeholder="Start typing film title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                {showFilmSuggestions && filmSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filmSearchResults.map((film) => (
                      <button
                        key={film.id}
                        type="button"
                        onClick={() => handleFilmSelect(film)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium">{film.film}</div>
                        {film.runtime && (
                          <div className="text-sm text-gray-500">{film.runtime}min</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Screening Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.screening_date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {formData.screening_date && (
                  <div className="mt-1 text-sm text-gray-600">
                    {getDayOfWeek(formData.screening_date)} • {formatDate(formData.screening_date)}
                  </div>
                )}
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({...prev, start_time: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Venue - Searchable Auto-suggest */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={venueSearchTerm}
                  onChange={(e) => setVenueSearchTerm(e.target.value)}
                  onFocus={() => setShowVenueSuggestions(venueSearchTerm.length > 0)}
                  placeholder="Start typing venue short code..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                {showVenueSuggestions && venueSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {venueSearchResults.map((house) => (
                      <button
                        key={house.id}
                        type="button"
                        onClick={() => handleVenueSelect(house)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium">{house.short_code}</div>
                        <div className="text-sm text-gray-500">
                          {house.venue_name} • {house.house_name} • {house.seat_count} seats
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Run Time and Capacity (auto-filled but editable) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Run Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.run_time || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev, 
                      run_time: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={formData.capacity || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev, 
                      capacity: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional notes about this screening..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScreening}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {editingScreening ? 'Update Screening' : 'Add Screening'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Upload Ticketing CSV</h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Upload a CSV file with columns: Title, Date, Start Time, Venue, Run Time, Capacity, Notes
            </p>
            
            <div className="mb-4">
              <input
                type="file"
                accept=".csv"
                id="csv-upload"
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </div>
            
            {uploading && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                <p className="text-sm text-gray-600 mt-2">Processing...</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const fileInput = document.getElementById('csv-upload') as HTMLInputElement
                  if (fileInput?.files?.[0]) {
                    handleCSVUpload({ target: fileInput } as any)
                  } else {
                    alert('Please select a CSV file first')
                  }
                }}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {(showDownloadDropdown || showFilmSuggestions || showVenueSuggestions) && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => {
            setShowDownloadDropdown(false)
            setShowFilmSuggestions(false)
            setShowVenueSuggestions(false)
          }}
        />
      )}

      {/* Unmatched Titles Modal */}
      {showPublishModal && unmatchedTitles.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl overflow-hidden flex flex-col" style={{ width: '80%', maxHeight: '83.333333%' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Title Matching Required</h3>
              <button
                onClick={() => {
                  setShowPublishModal(false)
                  setUnmatchedTitles([])
                }}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              The following titles from your Ticketing Grid don't have exact matches in your Film Cards. 
              Please select the correct match for each title, or skip screenings that shouldn't be published.
            </p>
            
            <div className="flex-1 overflow-y-auto space-y-6">
              {unmatchedTitles.map((item, index) => (
                <div key={item.screening.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        "{item.screening.film_title}"
                      </h4>
                      <p className="text-sm text-gray-500">
                        {item.screening.day_of_week}, {item.screening.screening_date} at {item.screening.start_time} - {item.screening.venue_short_code}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const newUnmatched = unmatchedTitles.filter((_, i) => i !== index)
                        setUnmatchedTitles(newUnmatched)
                        setSelectedForPublish(prev => {
                          const newSet = new Set(prev)
                          newSet.delete(item.screening.id)
                          return newSet
                        })
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Skip This Screening
                    </button>
                  </div>
                  
                  {item.matches.length === 0 ? (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-800">
                        No similar titles found in Film Cards. This title may not exist in your system yet.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Suggested matches (select the correct one):
                      </p>
                      <div className="space-y-2">
                        {item.matches.slice(0, 5).map((match) => (
                          <div
                            key={match.id}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                          >
                            <div className="flex items-center">
                              <span className="font-medium">{match.title}</span>
                              <span className="ml-2 text-sm text-gray-500">
                                ({match.type === 'feature' ? 'Feature' : 'Short'})
                              </span>
                              {match.matchScore && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {Math.round(match.matchScore * 100)}% match
                                </span>
                              )}
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await publishScreening(item.screening, match)
                                  const newUnmatched = unmatchedTitles.filter((_, i) => i !== index)
                                  setUnmatchedTitles(newUnmatched)
                                  setSelectedForPublish(prev => {
                                    const newSet = new Set(prev)
                                    newSet.delete(item.screening.id)
                                    return newSet
                                  })
                                } catch (error) {
                                  alert('Error publishing screening. Please try again.')
                                }
                              }}
                              className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm font-medium"
                            >
                              Use This Match
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600">
                {unmatchedTitles.length} screening{unmatchedTitles.length !== 1 ? 's' : ''} remaining
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPublishModal(false)
                    setUnmatchedTitles([])
                    loadData()
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const originalUnmatchedCount = unmatchedTitles.length
                    const publishedFromModal = selectedForPublish.size - originalUnmatchedCount
                    
                    setShowPublishModal(false)
                    setUnmatchedTitles([])
                    setSelectedForPublish(new Set())
                    loadData()
                    
                    if (originalUnmatchedCount === 0) {
                      alert('All matched screenings have been published!')
                    } else {
                      alert(`Publishing completed! ${publishedFromModal} additional screenings were matched and published.`)
                    }
                  }}
                  disabled={unmatchedTitles.length > 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}