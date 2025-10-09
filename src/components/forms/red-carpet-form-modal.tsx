'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'

interface RedCarpetFormModalProps {
  redCarpet?: any[] | null
  isOpen: boolean
  onClose: () => void
  onSave: (redCarpet: any) => void
}

interface FilmSubjectPair {
  film_program_title: string
  subjects: string
}

interface RedCarpetFormData {
  film_subject_pairs: FilmSubjectPair[]
  venue_id: string
  house: string
  carpet_date: string
  call_time: string
  carpet_start_time: string
  film_program_start_time: string
  rsvp_form_url: string
  rsvp_responses_url: string
  run_of_show_url: string
}

export function RedCarpetFormModal({ redCarpet, isOpen, onClose, onSave }: RedCarpetFormModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState<RedCarpetFormData>({
    film_subject_pairs: [{ film_program_title: '', subjects: '' }],
    venue_id: '',
    house: '',
    carpet_date: '',
    call_time: '',
    carpet_start_time: '',
    film_program_start_time: '',
    rsvp_form_url: '',
    rsvp_responses_url: '',
    run_of_show_url: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // Suggestion states - now handled per pair
  const [availableFilms, setAvailableFilms] = useState<{id: string, title: string, type: 'feature' | 'short'}[]>([])
  const [availablePrograms, setAvailablePrograms] = useState<{id: string, title: string}[]>([])
  const [shortFilmPrograms, setShortFilmPrograms] = useState<string[]>([])
  const [availableGuests, setAvailableGuests] = useState<{id: string, name: string}[]>([])
  
  // Track suggestions for each pair
  const [filmSuggestions, setFilmSuggestions] = useState<Record<number, {suggestions: any[], show: boolean}>>({})
  const [subjectSuggestions, setSubjectSuggestions] = useState<Record<number, {suggestions: any[], show: boolean}>>({})

  // Venues
  const [availableVenues, setAvailableVenues] = useState<{id: string, name: string, theater_houses?: {house_name: string, seat_count: number}[]}[]>([])
  const [selectedVenueHouses, setSelectedVenueHouses] = useState<string[]>([])
  const [showHouseField, setShowHouseField] = useState(false)

  const supabase = createClient()

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }, [isDragging, dragStart.x, dragStart.y])

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove])

  // Load available data for suggestions
  useEffect(() => {
    const loadSuggestionData = async () => {
      try {
        const [featureFilms, shortFilms, programs, guests, venues, shortFilmProgramsData] = await Promise.all([
          supabase.from('feature_films').select('id, title').order('title'),
          supabase.from('short_films').select('id, title').order('title'),
          supabase.from('programs').select('id, title').order('title'),
          supabase.from('guests').select('id, name').order('name'),
          supabase.from('venues').select('*').order('name'),
          // Get unique short film program names
          supabase.from('short_films').select('programs').not('programs', 'is', null)
        ])

        // Process films
        const films = [
          ...(featureFilms.data || []).map(f => ({ ...f, type: 'feature' as const })),
          ...(shortFilms.data || []).map(f => ({ ...f, type: 'short' as const }))
        ]
        setAvailableFilms(films)
        setAvailablePrograms(programs.data || [])
        setAvailableGuests(guests.data || [])
        // Load theater houses for venues separately
        if (venues.data && venues.data.length > 0) {
          const venuesWithHouses = await Promise.all(
            venues.data.map(async (venue) => {
              const { data: houses } = await supabase
                .from('theater_houses')
                .select('house_name, seat_count')
                .eq('venue_id', venue.id)
              
              return { ...venue, theater_houses: houses || [] }
            })
          )
          console.log('Red Carpet: Loaded venues with houses:', venuesWithHouses)
          setAvailableVenues(venuesWithHouses)
        } else {
          console.log('Red Carpet: Loaded venues without houses:', venues.data || [])
          setAvailableVenues(venues.data || [])
        }

        // Extract unique short film program names
        const uniquePrograms = new Set<string>()
        shortFilmProgramsData.data?.forEach(item => {
          if (item.programs) {
            // Split by comma and trim
            const programNames = item.programs.split(',').map((p: string) => p.trim())
            programNames.forEach(name => {
              if (name) uniquePrograms.add(name)
            })
          }
        })
        setShortFilmPrograms(Array.from(uniquePrograms))

      } catch (error) {
        console.error('Error loading suggestion data:', error)
      }
    }
    
    if (isOpen) {
      loadSuggestionData()
    }
  }, [isOpen, supabase])

  // Initialize form data when redCarpet changes
  useEffect(() => {
    if (redCarpet && redCarpet.length > 0) {
      // For editing, convert all records to pairs
      const pairs: FilmSubjectPair[] = redCarpet.map(carpet => ({
        film_program_title: carpet.film_program_display || '',
        subjects: carpet.subjects_display || ''
      })).filter(pair => pair.film_program_title.trim()) // Remove empty pairs

      // Use the first record for shared fields (venue, date, times)
      const firstRecord = redCarpet[0]

      setFormData({
        film_subject_pairs: pairs.length > 0 ? pairs : [{ film_program_title: '', subjects: '' }],
        venue_id: firstRecord.venue_id || '',
        house: firstRecord.house || '',
        carpet_date: firstRecord.carpet_date || '',
        call_time: firstRecord.call_time || '',
        carpet_start_time: firstRecord.carpet_start_time || '',
        film_program_start_time: firstRecord.film_program_start_time || '',
        rsvp_form_url: firstRecord.rsvp_form_url || '',
        rsvp_responses_url: firstRecord.rsvp_responses_url || '',
        run_of_show_url: firstRecord.run_of_show_url || ''
      })

      // Set up house field if venue has houses
      if (firstRecord.venue_id) {
        const selectedVenue = availableVenues.find(v => v.id === firstRecord.venue_id)
        if (selectedVenue && selectedVenue.theater_houses && selectedVenue.theater_houses.length > 0) {
          const houses = selectedVenue.theater_houses.map(house => house.house_name)
          setSelectedVenueHouses(houses)
          setShowHouseField(true)
        }
      }
    } else {
      setFormData({
        film_subject_pairs: [{ film_program_title: '', subjects: '' }],
        venue_id: '',
        house: '',
        carpet_date: '',
        call_time: '',
        carpet_start_time: '',
        film_program_start_time: '',
        rsvp_form_url: '',
        rsvp_responses_url: '',
        run_of_show_url: ''
      })
    }
    setErrors({})
  }, [redCarpet, isOpen, availableVenues])

  // Handle Film/Program input for specific pair
  const handleFilmProgramInput = (pairIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      film_subject_pairs: prev.film_subject_pairs.map((pair, index) => 
        index === pairIndex ? { ...pair, film_program_title: value } : pair
      )
    }))
    
    if (value.length >= 1) {
      const filmSuggs = availableFilms
        .filter(film => film.title.toLowerCase().includes(value.toLowerCase()))
        .map(film => ({ ...film, type: film.type }))
      
      const programSuggs = availablePrograms
        .filter(program => program.title.toLowerCase().includes(value.toLowerCase()))
        .map(program => ({ ...program, type: 'program' as const }))

      const shortProgramSuggs = shortFilmPrograms
        .filter(program => program.toLowerCase().includes(value.toLowerCase()))
        .map(program => ({ id: program, title: program, type: 'short_program' as const }))
      
      const allSuggestions = [...filmSuggs, ...programSuggs, ...shortProgramSuggs]
      setFilmSuggestions(prev => ({
        ...prev,
        [pairIndex]: { suggestions: allSuggestions.slice(0, 8), show: allSuggestions.length > 0 }
      }))
    } else {
      setFilmSuggestions(prev => ({
        ...prev,
        [pairIndex]: { suggestions: [], show: false }
      }))
    }
  }

  // Handle Film/Program suggestion selection
  const handleFilmSuggestionSelect = (pairIndex: number, suggestion: {id: string, title: string, type: 'feature' | 'short' | 'program' | 'short_program'}) => {
    setFormData(prev => ({
      ...prev,
      film_subject_pairs: prev.film_subject_pairs.map((pair, index) => 
        index === pairIndex ? { ...pair, film_program_title: suggestion.title } : pair
      )
    }))
    setFilmSuggestions(prev => ({
      ...prev,
      [pairIndex]: { suggestions: [], show: false }
    }))
  }

  // Handle Subjects input for specific pair
  const handleSubjectsInput = (pairIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      film_subject_pairs: prev.film_subject_pairs.map((pair, index) => 
        index === pairIndex ? { ...pair, subjects: value } : pair
      )
    }))
    
    // Get the last entered term (after last comma)
    const terms = value.split(',').map(t => t.trim())
    const lastTerm = terms[terms.length - 1]
    
    if (lastTerm.length >= 1) {
      const guestSuggs = availableGuests
        .filter(guest => guest.name.toLowerCase().includes(lastTerm.toLowerCase()))
      
      setSubjectSuggestions(prev => ({
        ...prev,
        [pairIndex]: { suggestions: guestSuggs.slice(0, 8), show: guestSuggs.length > 0 }
      }))
    } else {
      setSubjectSuggestions(prev => ({
        ...prev,
        [pairIndex]: { suggestions: [], show: false }
      }))
    }
  }

  // Handle Subjects suggestion selection
  const handleSubjectSuggestionSelect = (pairIndex: number, suggestion: {id: string, name: string}) => {
    const currentPair = formData.film_subject_pairs[pairIndex]
    const terms = currentPair.subjects.split(',').map(t => t.trim())
    terms[terms.length - 1] = suggestion.name
    
    setFormData(prev => ({
      ...prev,
      film_subject_pairs: prev.film_subject_pairs.map((pair, index) => 
        index === pairIndex ? { ...pair, subjects: terms.join(', ') } : pair
      )
    }))
    setSubjectSuggestions(prev => ({
      ...prev,
      [pairIndex]: { suggestions: [], show: false }
    }))
  }

  // Add new film/subject pair
  const addFilmSubjectPair = () => {
    setFormData(prev => ({
      ...prev,
      film_subject_pairs: [...prev.film_subject_pairs, { film_program_title: '', subjects: '' }]
    }))
  }

  // Remove film/subject pair
  const removeFilmSubjectPair = (index: number) => {
    if (formData.film_subject_pairs.length > 1) {
      setFormData(prev => ({
        ...prev,
        film_subject_pairs: prev.film_subject_pairs.filter((_, i) => i !== index)
      }))
    }
  }

  // Handle venue selection and show house field if venue has houses
  const handleVenueChange = (venueId: string) => {
    setFormData(prev => ({ ...prev, venue_id: venueId, house: '' }))
    
    if (venueId) {
      const selectedVenue = availableVenues.find(v => v.id === venueId)
      console.log('Selected venue:', selectedVenue) // Debug log
      
      if (selectedVenue && selectedVenue.theater_houses && selectedVenue.theater_houses.length > 0) {
        // Get the actual house names from the theater_houses relation
        const houses = selectedVenue.theater_houses.map(house => house.house_name)
        console.log('Found theater houses:', houses) // Debug log
        setSelectedVenueHouses(houses)
        setShowHouseField(true)
      } else {
        setSelectedVenueHouses([])
        setShowHouseField(false)
      }
    } else {
      setSelectedVenueHouses([])
      setShowHouseField(false)
    }
  }

  // Handle 2-digit year conversion for date fields
  const normalizeDateValue = (dateValue: string): string => {
    if (!dateValue) return dateValue
    
    // Check if it's in MM/DD/YY or similar format
    const dateRegex = /^(\d{1,2})[\\/\-](\d{1,2})[\\/\-](\d{2})$/
    const match = dateValue.match(dateRegex)
    
    if (match) {
      const [, month, day, year] = match
      const fullYear = `20${year}` // Convert YY to 20YY
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    return dateValue
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Check that at least one pair has a film/program
    const hasValidPair = formData.film_subject_pairs.some(pair => pair.film_program_title.trim())
    if (!hasValidPair) {
      newErrors.film_pairs = 'At least one Film/Program is required'
    }

    // Check each pair for film/program
    formData.film_subject_pairs.forEach((pair, index) => {
      if (pair.subjects.trim() && !pair.film_program_title.trim()) {
        newErrors[`film_${index}`] = 'Film/Program is required when subjects are specified'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // If editing, delete all existing records from this carpet event
      if (redCarpet && redCarpet.length > 0) {
        const idsToDelete = redCarpet.map(carpet => carpet.id)
        const { error: deleteError } = await supabase
          .from('red_carpets')
          .delete()
          .in('id', idsToDelete)

        if (deleteError) throw deleteError
      }

      // Now create new records for all pairs
      const savedRedCarpets = []

      for (const pair of formData.film_subject_pairs) {
        if (!pair.film_program_title.trim()) continue // Skip empty pairs

        const redCarpetData = {
          film_program_display: pair.film_program_title.trim(),
          subjects_display: pair.subjects.trim() || null,
          venue_id: formData.venue_id || null,
          house: formData.house || null,
          carpet_date: normalizeDateValue(formData.carpet_date) || null,
          call_time: formData.call_time || null,
          carpet_start_time: formData.carpet_start_time || null,
          film_program_start_time: formData.film_program_start_time || null,
          rsvp_form_url: (formData.rsvp_form_url && formData.rsvp_form_url.trim()) || null,
          rsvp_responses_url: (formData.rsvp_responses_url && formData.rsvp_responses_url.trim()) || null,
          run_of_show_url: (formData.run_of_show_url && formData.run_of_show_url.trim()) || null,
          created_by: user?.id
        }

        // Create new red carpet record
        const { data, error } = await supabase
          .from('red_carpets')
          .insert([redCarpetData])
          .select()
          .single()

        if (error) {
          console.error('Error inserting red carpet:', error)
          console.error('Data being inserted:', redCarpetData)
          throw error
        }

        // Handle associations for this pair
        await handleAssociations(data.id, pair.film_program_title, pair.subjects)

        // Add venue name for display
        if (data.venue_id) {
          const venue = availableVenues.find(v => v.id === data.venue_id)
          data.venue_name = venue?.name
        }

        savedRedCarpets.push(data)
      }

      // Trigger a refresh instead of trying to update individual records
      onClose()
      window.location.reload() // Force refresh to show all new records
    } catch (error) {
      console.error('Error saving red carpet:', error)
      alert('Error saving red carpet. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle associations (same logic as photo shoots)
  const handleAssociations = async (redCarpetId: string, filmProgramTitles: string, subjectNames: string) => {
    // Clear existing associations if editing
    if (redCarpet) {
      await Promise.all([
        supabase.from('red_carpet_films').delete().eq('red_carpet_id', redCarpetId),
        supabase.from('red_carpet_programs').delete().eq('red_carpet_id', redCarpetId),
        supabase.from('red_carpet_subjects').delete().eq('red_carpet_id', redCarpetId)
      ])
    }

    // Handle Film/Program associations
    if (filmProgramTitles.trim()) {
      const titles = filmProgramTitles.split(',').map(title => title.trim()).filter(title => title)
      
      for (const title of titles) {
        // Try to match with feature films
        let matched = false
        const featureFilm = availableFilms.find(f => f.type === 'feature' && f.title === title)
        if (featureFilm) {
          await supabase.from('red_carpet_films').insert({
            red_carpet_id: redCarpetId,
            film_id: featureFilm.id,
            film_title: title,
            film_type: 'feature'
          })
          matched = true
        }

        // Try to match with short films
        if (!matched) {
          const shortFilm = availableFilms.find(f => f.type === 'short' && f.title === title)
          if (shortFilm) {
            await supabase.from('red_carpet_films').insert({
              red_carpet_id: redCarpetId,
              film_id: shortFilm.id,
              film_title: title,
              film_type: 'short'
            })
            matched = true
          }
        }

        // Try to match with programs
        if (!matched) {
          const program = availablePrograms.find(p => p.title === title)
          if (program) {
            await supabase.from('red_carpet_programs').insert({
              red_carpet_id: redCarpetId,
              program_id: program.id,
              program_title: title
            })
            matched = true
          }
        }

        // Note: Short film programs and free text are preserved in the display field
        // but don't create database associations (by design)
      }
    }

    // Handle Subject associations
    if (subjectNames.trim()) {
      const names = subjectNames.split(',').map(name => name.trim()).filter(name => name)
      
      for (const name of names) {
        // Try to match with guests
        const guest = availableGuests.find(g => g.name === name)
        if (guest) {
          await supabase.from('red_carpet_subjects').insert({
            red_carpet_id: redCarpetId,
            guest_id: guest.id,
            guest_name: name
          })
        }
        // Free text names are preserved in subjects_display but don't create associations
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default',
          maxWidth: '1000px',
          width: '90vw',
          position: 'fixed'
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Draggable Header */}
          <div 
            className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg cursor-grab active:cursor-grabbing flex justify-between items-center"
            onMouseDown={handleMouseDown}
          >
            <h2 className="text-xl font-semibold text-gray-900">
              {redCarpet ? 'Edit Red Carpet' : 'Add New Red Carpet'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Film/Subject Pairs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Films & Subjects <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addFilmSubjectPair}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Another Film/Program
                </button>
              </div>
              
              {errors.film_pairs && <p className="text-sm text-red-600 mb-2">{errors.film_pairs}</p>}
              
              <div className="space-y-4">
                {formData.film_subject_pairs.map((pair, pairIndex) => (
                  <div key={pairIndex} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">
                        Film/Program {pairIndex + 1}
                      </h4>
                      {formData.film_subject_pairs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFilmSubjectPair(pairIndex)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Film/Program Field */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Film / Program
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={pair.film_program_title}
                            onChange={(e) => handleFilmProgramInput(pairIndex, e.target.value)}
                            onFocus={() => {
                              if (filmSuggestions[pairIndex]?.suggestions.length > 0) {
                                setFilmSuggestions(prev => ({
                                  ...prev,
                                  [pairIndex]: { ...prev[pairIndex], show: true }
                                }))
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setFilmSuggestions(prev => ({
                                  ...prev,
                                  [pairIndex]: { ...prev[pairIndex], show: false }
                                }))
                              }, 200)
                            }}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              errors[`film_${pairIndex}`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="Enter film or program title"
                          />
                          
                          {/* Film/Program suggestions */}
                          {filmSuggestions[pairIndex]?.show && filmSuggestions[pairIndex]?.suggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {filmSuggestions[pairIndex].suggestions.map((suggestion, index) => (
                                <div
                                  key={`${suggestion.type}-${suggestion.id}`}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                                  onClick={() => handleFilmSuggestionSelect(pairIndex, suggestion)}
                                >
                                  <span className="font-medium">{suggestion.title}</span>
                                  <span className="text-gray-500 text-xs ml-2">
                                    ({suggestion.type === 'feature' ? 'Feature Film' : 
                                      suggestion.type === 'short' ? 'Short Film' :
                                      suggestion.type === 'program' ? 'Program' : 'Short Film Program'})
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {errors[`film_${pairIndex}`] && <p className="text-sm text-red-600 mt-1">{errors[`film_${pairIndex}`]}</p>}
                      </div>
                      
                      {/* Subjects Field */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subject(s)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={pair.subjects}
                            onChange={(e) => handleSubjectsInput(pairIndex, e.target.value)}
                            onFocus={() => {
                              if (subjectSuggestions[pairIndex]?.suggestions.length > 0) {
                                setSubjectSuggestions(prev => ({
                                  ...prev,
                                  [pairIndex]: { ...prev[pairIndex], show: true }
                                }))
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setSubjectSuggestions(prev => ({
                                  ...prev,
                                  [pairIndex]: { ...prev[pairIndex], show: false }
                                }))
                              }, 200)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter subject names separated by commas"
                          />
                          
                          {/* Subject suggestions */}
                          {subjectSuggestions[pairIndex]?.show && subjectSuggestions[pairIndex]?.suggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {subjectSuggestions[pairIndex].suggestions.map((suggestion, index) => (
                                <div
                                  key={suggestion.id}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                                  onClick={() => handleSubjectSuggestionSelect(pairIndex, suggestion)}
                                >
                                  <span className="font-medium">{suggestion.name}</span>
                                  <span className="text-gray-500 text-xs ml-2">(Guest)</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Separate multiple subjects with commas.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-sm text-gray-500 mt-2">
                Each film/program can have its own subjects. Matched items will be linked to existing records.
              </p>
            </div>

            {/* Venue and House */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue
                </label>
                <select
                  value={formData.venue_id}
                  onChange={(e) => handleVenueChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select venue...</option>
                  {availableVenues.map(venue => (
                    <option key={venue.id} value={venue.id}>{venue.name}</option>
                  ))}
                </select>
              </div>
              
              {/* House field - only shown for movie theaters */}
              {showHouseField && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    House
                  </label>
                  <select
                    value={formData.house}
                    onChange={(e) => setFormData(prev => ({ ...prev, house: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select house...</option>
                    {selectedVenueHouses.map(house => (
                      <option key={house} value={house}>{house}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Date and Times */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.carpet_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, carpet_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Call Time</label>
                <input
                  type="time"
                  value={formData.call_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, call_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carpet Start Time</label>
                <input
                  type="time"
                  value={formData.carpet_start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, carpet_start_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Film/Program Start</label>
                <input
                  type="time"
                  value={formData.film_program_start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, film_program_start_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* RSVP Links and Run of Show */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RSVP Form Link</label>
                <input
                  type="url"
                  value={formData.rsvp_form_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, rsvp_form_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Google Form link for people to fill out"
                />
                <p className="text-sm text-gray-500 mt-1">
                  The form link you share with people to RSVP.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RSVP Responses</label>
                <input
                  type="url"
                  value={formData.rsvp_responses_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, rsvp_responses_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Google Sheets responses link for viewing RSVPs"
                />
                <p className="text-sm text-gray-500 mt-1">
                  The responses/spreadsheet link to view submitted RSVPs.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Run of Show (ROS)</label>
                <input
                  type="url"
                  value={formData.run_of_show_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, run_of_show_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Google Doc link for run of show"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Link to the run of show document.
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between px-6 py-4 bg-gray-50 border-t">
            <div>
              {redCarpet && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this red carpet? This action cannot be undone.')) {
                      try {
                        const { error } = await supabase
                          .from('red_carpets')
                          .delete()
                          .eq('id', redCarpet.id)
                        
                        if (error) throw error
                        
                        // Close modal and refresh the list
                        onClose()
                        window.location.reload() // Temporary - should update parent state
                      } catch (error) {
                        console.error('Error deleting red carpet:', error)
                        alert('Error deleting red carpet. Please try again.')
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  disabled={isSubmitting}
                >
                  Delete Carpet
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (redCarpet ? 'Update Red Carpet' : 'Create Red Carpet')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}