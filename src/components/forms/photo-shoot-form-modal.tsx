'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { getFestivalYear } from '@/lib/smart-date-parser'

interface PhotoShootFormModalProps {
  photoShoot?: any | null
  isOpen: boolean
  onClose: () => void
  onSave: (photoShoot: any) => void
}

interface PhotoShootFormData {
  film_program_titles: string
  subjects: string
  venue_id: string
  house: string
  shoot_date: string
  call_time: string
  shoot_time: string
  film_program_start_time: string
  photographer: string
  videographer: string
  intro_qa: string
  // special_event: string  // Removed - to be implemented later
  selects_received: boolean
  sent_to_pr: boolean
}

export function PhotoShootFormModal({ photoShoot, isOpen, onClose, onSave }: PhotoShootFormModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState<PhotoShootFormData>({
    film_program_titles: '',
    subjects: '',
    venue_id: '',
    house: '',
    shoot_date: '',
    call_time: '',
    shoot_time: '',
    film_program_start_time: '',
    photographer: '',
    videographer: '',
    intro_qa: '',
    // special_event: '',  // Removed - to be implemented later
    selects_received: false,
    sent_to_pr: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // Suggestion states for Film/Program field
  const [availableFilms, setAvailableFilms] = useState<{id: string, title: string, type: 'feature' | 'short'}[]>([])
  const [availablePrograms, setAvailablePrograms] = useState<{id: string, title: string}[]>([])
  const [shortFilmPrograms, setShortFilmPrograms] = useState<string[]>([])
  const [showFilmSuggestions, setShowFilmSuggestions] = useState(false)
  const [filteredFilmSuggestions, setFilteredFilmSuggestions] = useState<{id: string, title: string, type: 'feature' | 'short' | 'program' | 'short_program'}[]>([])

  // Suggestion states for Subjects field
  const [availableGuests, setAvailableGuests] = useState<{id: string, name: string}[]>([])
  const [showSubjectSuggestions, setShowSubjectSuggestions] = useState(false)
  const [filteredSubjectSuggestions, setFilteredSubjectSuggestions] = useState<{id: string, name: string}[]>([])

  // Venues
  const [availableVenues, setAvailableVenues] = useState<{id: string, name: string, theater_houses?: {house_name: string, seat_count: number}[]}[]>([])
  const [selectedVenueHouses, setSelectedVenueHouses] = useState<string[]>([])
  const [showHouseField, setShowHouseField] = useState(false)

  // Special Events - removed, to be implemented later

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
          setAvailableVenues(venuesWithHouses)
        } else {
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

  // Initialize form data when photoShoot changes
  useEffect(() => {
    if (photoShoot) {
      setFormData({
        film_program_titles: photoShoot.film_program_display || '',
        subjects: photoShoot.subjects_display || '',
        venue_id: photoShoot.venue_id || '',
        house: photoShoot.house || '',
        shoot_date: photoShoot.shoot_date || '',
        call_time: photoShoot.call_time || '',
        shoot_time: photoShoot.shoot_time || '',
        film_program_start_time: photoShoot.film_program_start_time || '',
        photographer: photoShoot.photographer || '',
        videographer: photoShoot.videographer || '',
        intro_qa: photoShoot.intro_qa || '',
        // special_event: photoShoot.special_event || '',  // Removed - to be implemented later
        selects_received: photoShoot.selects_received || false,
        sent_to_pr: photoShoot.sent_to_pr || false
      })
      
      // Set up house field if venue has houses
      if (photoShoot.venue_id) {
        const selectedVenue = availableVenues.find(v => v.id === photoShoot.venue_id)
        if (selectedVenue && selectedVenue.theater_houses && selectedVenue.theater_houses.length > 0) {
          const houses = selectedVenue.theater_houses.map(house => house.house_name)
          setSelectedVenueHouses(houses)
          setShowHouseField(true)
        }
      }
    } else {
      setFormData({
        film_program_titles: '',
        subjects: '',
        venue_id: '',
        house: '',
        shoot_date: '',
        call_time: '',
        shoot_time: '',
        film_program_start_time: '',
        photographer: '',
        videographer: '',
        intro_qa: '',
        // special_event: '',  // Removed - to be implemented later
        selects_received: false,
        sent_to_pr: false
      })
    }
    setErrors({})
  }, [photoShoot, isOpen, availableVenues])

  // Handle Film/Program autocomplete filtering
  const handleFilmProgramInput = (value: string) => {
    setFormData(prev => ({ ...prev, film_program_titles: value }))
    
    // Get the last entered term (after last comma)
    const terms = value.split(',').map(t => t.trim())
    const lastTerm = terms[terms.length - 1]
    
    if (lastTerm.length >= 1) {
      const filmSuggestions = availableFilms
        .filter(film => film.title.toLowerCase().includes(lastTerm.toLowerCase()))
        .map(film => ({ ...film, type: film.type }))
      
      const programSuggestions = availablePrograms
        .filter(program => program.title.toLowerCase().includes(lastTerm.toLowerCase()))
        .map(program => ({ ...program, type: 'program' as const }))

      const shortProgramSuggestions = shortFilmPrograms
        .filter(program => program.toLowerCase().includes(lastTerm.toLowerCase()))
        .map(program => ({ id: program, title: program, type: 'short_program' as const }))
      
      const allSuggestions = [...filmSuggestions, ...programSuggestions, ...shortProgramSuggestions]
      setFilteredFilmSuggestions(allSuggestions.slice(0, 8)) // Limit to 8 suggestions
      setShowFilmSuggestions(allSuggestions.length > 0)
    } else {
      setShowFilmSuggestions(false)
    }
  }

  // Handle Film/Program suggestion selection
  const handleFilmSuggestionSelect = (suggestion: {id: string, title: string, type: 'feature' | 'short' | 'program' | 'short_program'}) => {
    const terms = formData.film_program_titles.split(',').map(t => t.trim())
    terms[terms.length - 1] = suggestion.title
    setFormData(prev => ({ ...prev, film_program_titles: terms.join(', ') }))
    setShowFilmSuggestions(false)
  }

  // Handle Subjects autocomplete filtering
  const handleSubjectsInput = (value: string) => {
    setFormData(prev => ({ ...prev, subjects: value }))
    
    // Get the last entered term (after last comma)
    const terms = value.split(',').map(t => t.trim())
    const lastTerm = terms[terms.length - 1]
    
    if (lastTerm.length >= 1) {
      const guestSuggestions = availableGuests
        .filter(guest => guest.name.toLowerCase().includes(lastTerm.toLowerCase()))
      
      setFilteredSubjectSuggestions(guestSuggestions.slice(0, 8)) // Limit to 8 suggestions
      setShowSubjectSuggestions(guestSuggestions.length > 0)
    } else {
      setShowSubjectSuggestions(false)
    }
  }

  // Handle Subjects suggestion selection
  const handleSubjectSuggestionSelect = (suggestion: {id: string, name: string}) => {
    const terms = formData.subjects.split(',').map(t => t.trim())
    terms[terms.length - 1] = suggestion.name
    setFormData(prev => ({ ...prev, subjects: terms.join(', ') }))
    setShowSubjectSuggestions(false)
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

  // Special Event functions removed - to be implemented later

  // Handle 2-digit year conversion for date fields
  const normalizeDateValue = (dateValue: string): string => {
    if (!dateValue) return dateValue
    
    // Check if it's in MM/DD/YY or similar format
    const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/
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

    if (!formData.film_program_titles.trim()) {
      newErrors.film_program_titles = 'Film/Program is required'
    }

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
      // Get current festival year
      const festivalYear = await getFestivalYear()

      // Prepare the main photo shoot data
      const photoShootData = {
        film_program_description: formData.film_program_titles.trim(),
        subjects_description: formData.subjects.trim() || null,
        venue_id: formData.venue_id || null,
        house: formData.house || null,
        shoot_date: normalizeDateValue(formData.shoot_date) || null,
        call_time: formData.call_time || null,
        shoot_time: formData.shoot_time || null,
        film_program_start_time: formData.film_program_start_time || null,
        photographer: formData.photographer.trim() || null,
        videographer: formData.videographer.trim() || null,
        intro_qa: formData.intro_qa || null,
        // special_event: formData.special_event.trim() || null,  // Removed - to be implemented later
        selects_received: formData.selects_received,
        sent_to_pr: formData.sent_to_pr,
        updated_at: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0') + ':' + String(new Date().getSeconds()).padStart(2, '0'),
        festival_year: parseInt(festivalYear, 10)
      }

      console.log('Photo Shoot: Attempting to save data:', photoShootData)

      let savedPhotoShoot: any

      if (photoShoot) {
        // Update existing photo shoot
        const { data, error } = await supabase
          .from('photo_shoots')
          .update(photoShootData)
          .eq('id', photoShoot.id)
          .select()
          .single()

        if (error) {
          console.error('Photo Shoot: Error updating photo shoot:', error)
          throw error
        }
        console.log('Photo Shoot: Updated successfully:', data)
        savedPhotoShoot = data
      } else {
        // Create new photo shoot
        console.log('Photo Shoot: Creating new photo shoot:', {
          ...photoShootData,
          created_at: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0') + ':' + String(new Date().getSeconds()).padStart(2, '0'),
          created_by: user?.id
        })
        
        const { data, error } = await supabase
          .from('photo_shoots')
          .insert([{
            ...photoShootData,
            created_at: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0') + ':' + String(new Date().getSeconds()).padStart(2, '0'),
            created_by: user?.id
          }])
          .select()
          .single()

        if (error) {
          console.error('Photo Shoot: Error creating photo shoot:', error)
          throw error
        }
        console.log('Photo Shoot: Created successfully:', data)
        savedPhotoShoot = data
      }

      // THE KEY FIX: Handle associations properly
      await handleAssociations(savedPhotoShoot.id, formData.film_program_titles, formData.subjects, festivalYear)

      // Special Event linking removed - to be implemented later

      // Add venue name for display
      if (savedPhotoShoot.venue_id) {
        const venue = availableVenues.find(v => v.id === savedPhotoShoot.venue_id)
        savedPhotoShoot.venue_name = venue?.name
      }

      onSave(savedPhotoShoot)
      onClose()
    } catch (error) {
      console.error('Error saving photo shoot:', error)
      alert('Error saving photo shoot. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // THE CORE FIX: Proper association handling
  const handleAssociations = async (photoShootId: string, filmProgramTitles: string, subjectNames: string, festivalYear: string) => {
    // Clear existing associations if editing
    if (photoShoot) {
      await Promise.all([
        supabase.from('photo_shoot_films').delete().eq('photo_shoot_id', photoShootId),
        supabase.from('photo_shoot_subjects').delete().eq('photo_shoot_id', photoShootId)
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
          await supabase.from('photo_shoot_films').insert({
            photo_shoot_id: photoShootId,
            film_id: featureFilm.id,
            film_title: title,
            film_type: 'feature',
            festival_year: parseInt(festivalYear, 10)
          })
          matched = true
        }

        // Try to match with short films
        if (!matched) {
          const shortFilm = availableFilms.find(f => f.type === 'short' && f.title === title)
          if (shortFilm) {
            await supabase.from('photo_shoot_films').insert({
              photo_shoot_id: photoShootId,
              film_id: shortFilm.id,
              film_title: title,
              film_type: 'short',
              festival_year: parseInt(festivalYear, 10)
            })
            matched = true
          }
        }

        // Try to match with programs
        if (!matched) {
          const program = availablePrograms.find(p => p.title === title)
          if (program) {
            await supabase.from('photo_shoot_films').insert({
              photo_shoot_id: photoShootId,
              film_id: program.id,
              film_title: title,
              film_type: 'program',
              festival_year: parseInt(festivalYear, 10)
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
          await supabase.from('photo_shoot_subjects').insert({
            photo_shoot_id: photoShootId,
            guest_id: guest.id,
            guest_name: name,
            festival_year: parseInt(festivalYear, 10)
          })
        }
        // Free text names are preserved in subjects_display but don't create associations
      }
    }
  }

  // Special Event linking function removed - to be implemented later

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
              {photoShoot ? 'Edit Photo Shoot' : 'Add New Photo Shoot'}
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
            {/* Film/Program Field - REQUIRED */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Film / Program <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.film_program_titles}
                  onChange={(e) => handleFilmProgramInput(e.target.value)}
                  onFocus={() => {
                    if (filteredFilmSuggestions.length > 0) {
                      setShowFilmSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowFilmSuggestions(false), 200)
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.film_program_titles ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter film or program titles separated by commas"
                />
                
                {/* Film/Program suggestions */}
                {showFilmSuggestions && filteredFilmSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredFilmSuggestions.map((suggestion, index) => (
                      <div
                        key={`${suggestion.type}-${suggestion.id}`}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                        onClick={() => handleFilmSuggestionSelect(suggestion)}
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
              {errors.film_program_titles && <p className="text-sm text-red-600 mt-1">{errors.film_program_titles}</p>}
              <p className="text-sm text-gray-500 mt-1">
                Separate multiple films/programs with commas. Matched items will be linked to existing records.
              </p>
            </div>

            {/* Subjects Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject(s)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.subjects}
                  onChange={(e) => handleSubjectsInput(e.target.value)}
                  onFocus={() => {
                    if (filteredSubjectSuggestions.length > 0) {
                      setShowSubjectSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSubjectSuggestions(false), 200)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter subject names separated by commas"
                />
                
                {/* Subject suggestions */}
                {showSubjectSuggestions && filteredSubjectSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredSubjectSuggestions.map((suggestion, index) => (
                      <div
                        key={suggestion.id}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                        onClick={() => handleSubjectSuggestionSelect(suggestion)}
                      >
                        <span className="font-medium">{suggestion.name}</span>
                        <span className="text-gray-500 text-xs ml-2">(Guest)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Separate multiple subjects with commas. Matched names will be linked to Guest Cards.
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
                  value={formData.shoot_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, shoot_date: e.target.value }))}
                  onBlur={(e) => {
                    const normalized = normalizeDateValue(e.target.value)
                    if (normalized !== e.target.value) {
                      setFormData(prev => ({ ...prev, shoot_date: normalized }))
                    }
                  }}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Shoot Time</label>
                <input
                  type="time"
                  value={formData.shoot_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, shoot_time: e.target.value }))}
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

            {/* People and Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photographer</label>
                <input
                  type="text"
                  value={formData.photographer}
                  onChange={(e) => setFormData(prev => ({ ...prev, photographer: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Photographer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Videographer</label>
                <input
                  type="text"
                  value={formData.videographer}
                  onChange={(e) => setFormData(prev => ({ ...prev, videographer: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Videographer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.intro_qa}
                  onChange={(e) => setFormData(prev => ({ ...prev, intro_qa: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="Intro">Intro</option>
                  <option value="Q&A">Q&A</option>
                  <option value="Red Carpet">Red Carpet</option>
                  <option value="Event">Event</option>
                </select>
              </div>
            </div>

            {/* Special Event Field removed - to be implemented later */}

            {/* Checkboxes */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="selects_received"
                  checked={formData.selects_received}
                  onChange={(e) => setFormData(prev => ({ ...prev, selects_received: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="selects_received" className="ml-2 block text-sm text-gray-900">
                  Selects Received
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sent_to_pr"
                  checked={formData.sent_to_pr}
                  onChange={(e) => setFormData(prev => ({ ...prev, sent_to_pr: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="sent_to_pr" className="ml-2 block text-sm text-gray-900">
                  Sent to PR
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between px-6 py-4 bg-gray-50 border-t">
            <div>
              {photoShoot && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this photo shoot? This action cannot be undone.')) {
                      try {
                        const { error } = await supabase
                          .from('photo_shoots')
                          .delete()
                          .eq('id', photoShoot.id)
                        
                        if (error) throw error
                        
                        // Close modal and refresh the list
                        onClose()
                        window.location.reload() // Temporary - should update parent state
                      } catch (error) {
                        console.error('Error deleting photo shoot:', error)
                        alert('Error deleting photo shoot. Please try again.')
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  disabled={isSubmitting}
                >
                  Delete Shoot
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
                {isSubmitting ? 'Saving...' : (photoShoot ? 'Update Photo Shoot' : 'Create Photo Shoot')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}