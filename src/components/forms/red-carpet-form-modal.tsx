'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { ChipSelect, ChipItem, ChipSelectSuggestion } from '@/components/ui/chip-select'

interface RedCarpetFormModalProps {
  redCarpet?: any[] | null
  isOpen: boolean
  onClose: () => void
  onSave: (redCarpet: any) => void
}

interface FilmOption {
  id: string
  title: string
  type: 'feature' | 'short' | 'shorts_program' | 'program'
}

interface FilmSubjectPair {
  filmChips: (ChipItem & { filmType?: string })[]
  subjectChips: ChipItem[]
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
  const { currentYear } = useFestivalYear()
  const [formData, setFormData] = useState<RedCarpetFormData>({
    film_subject_pairs: [{ filmChips: [], subjectChips: [] }],
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

  // Data for suggestions
  const [allFilms, setAllFilms] = useState<FilmOption[]>([])

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
        const [featureFilms, shortFilms, shortsPrograms, programs, venues] = await Promise.all([
          supabase.from('feature_films').select('id, title').eq('festival_year', currentYear).order('title'),
          supabase.from('short_films').select('id, title').eq('festival_year', currentYear).order('title'),
          supabase.from('shorts_programs').select('id, program_name').eq('festival_year', currentYear).order('program_name'),
          supabase.from('programs').select('id, title').eq('festival_year', currentYear).order('title'),
          supabase.from('venues').select('*').eq('festival_year', currentYear).order('name'),
        ])

        // Build unified film options
        const films: FilmOption[] = [
          ...(featureFilms.data || []).map(f => ({ id: f.id, title: f.title, type: 'feature' as const })),
          ...(shortFilms.data || []).map(f => ({ id: f.id, title: f.title, type: 'short' as const })),
          ...(shortsPrograms.data || []).map(p => ({ id: p.id, title: p.program_name, type: 'shorts_program' as const })),
          ...(programs.data || []).map(p => ({ id: p.id, title: p.title, type: 'program' as const })),
        ]
        setAllFilms(films)

        // Load theater houses for venues
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
      } catch (error) {
        console.error('Error loading suggestion data:', error)
      }
    }

    if (isOpen) {
      loadSuggestionData()
    }
  }, [isOpen, currentYear])

  // Initialize form data when redCarpet changes (edit mode)
  useEffect(() => {
    const initEditForm = async () => {
      if (redCarpet && redCarpet.length > 0) {
        // Load junction data to reconstruct chips
        const carpetIds = redCarpet.map(c => c.id)

        const [{ data: junctionFilms }, { data: junctionSubjects }] = await Promise.all([
          supabase
            .from('red_carpet_films')
            .select('red_carpet_id, film_id, film_type')
            .in('red_carpet_id', carpetIds),
          supabase
            .from('red_carpet_subjects')
            .select('red_carpet_id, guest_id, guests!inner(id, name)')
            .in('red_carpet_id', carpetIds),
        ])

        // Build pairs from each red carpet record
        const pairs: FilmSubjectPair[] = redCarpet.map(carpet => {
          // Film chips: junction-linked films for this carpet
          const linkedFilms = (junctionFilms || []).filter(jf => jf.red_carpet_id === carpet.id)
          const filmChips: (ChipItem & { filmType?: string })[] = linkedFilms.map(jf => {
            const filmOption = allFilms.find(f => f.id === jf.film_id && f.type === jf.film_type)
            return {
              id: jf.film_id,
              label: filmOption?.title || 'Unknown',
              type: jf.film_type,
              filmType: jf.film_type,
            }
          })

          // Add free-text films from film_program_description
          if (carpet.film_program_description) {
            carpet.film_program_description.split(',').map((t: string) => t.trim()).filter(Boolean).forEach((title: string) => {
              filmChips.push({ label: title })
            })
          }

          // Subject chips: junction-linked guests for this carpet
          const linkedSubjects = (junctionSubjects || []).filter((js: any) => js.red_carpet_id === carpet.id)
          const subjectChips: ChipItem[] = linkedSubjects.map((js: any) => ({
            id: js.guest_id,
            label: js.guests?.name || 'Unknown',
          }))

          // Add free-text subjects from subjects_description
          if (carpet.subjects_description) {
            carpet.subjects_description.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((name: string) => {
              subjectChips.push({ label: name })
            })
          }

          return { filmChips, subjectChips }
        }).filter(pair => pair.filmChips.length > 0 || pair.subjectChips.length > 0)

        const firstRecord = redCarpet[0]

        setFormData({
          film_subject_pairs: pairs.length > 0 ? pairs : [{ filmChips: [], subjectChips: [] }],
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
          film_subject_pairs: [{ filmChips: [], subjectChips: [] }],
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
    }

    if (isOpen) {
      initEditForm()
    }
  }, [redCarpet, isOpen, availableVenues, allFilms])

  // Film search for ChipSelect
  const handleFilmSearch = useCallback(async (query: string): Promise<ChipSelectSuggestion[]> => {
    const lower = query.toLowerCase()
    return allFilms
      .filter(f => f.title.toLowerCase().includes(lower))
      .slice(0, 15)
      .map(f => ({
        id: f.id,
        label: f.title,
        sublabel: f.type === 'feature' ? 'Feature Film' :
                  f.type === 'short' ? 'Short Film' :
                  f.type === 'shorts_program' ? 'Shorts Program' : 'Program',
        type: f.type,
      }))
  }, [allFilms])

  // Subject search for ChipSelect — queries guests table
  const handleSubjectSearch = useCallback(async (query: string): Promise<ChipSelectSuggestion[]> => {
    if (query.length < 1) return []

    try {
      const { data, error } = await supabase
        .from('guests')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .eq('festival_year', currentYear)
        .limit(10)

      if (error) throw error

      return (data || []).map(guest => ({
        id: guest.id,
        label: guest.name,
        sublabel: 'Guest',
      }))
    } catch (error) {
      console.error('Error searching guests:', error)
      return []
    }
  }, [supabase, currentYear])

  // Handle film chips change for a specific pair
  const handleFilmChipsChange = (pairIndex: number, items: ChipItem[]) => {
    const enriched = items.map(item => {
      const filmOption = allFilms.find(f => f.id === item.id)
      return {
        ...item,
        filmType: filmOption?.type || item.type || undefined,
      }
    })
    setFormData(prev => ({
      ...prev,
      film_subject_pairs: prev.film_subject_pairs.map((pair, index) =>
        index === pairIndex ? { ...pair, filmChips: enriched } : pair
      )
    }))
  }

  // Handle subject chips change for a specific pair
  const handleSubjectChipsChange = (pairIndex: number, items: ChipItem[]) => {
    setFormData(prev => ({
      ...prev,
      film_subject_pairs: prev.film_subject_pairs.map((pair, index) =>
        index === pairIndex ? { ...pair, subjectChips: items } : pair
      )
    }))
  }

  // Add new film/subject pair
  const addFilmSubjectPair = () => {
    setFormData(prev => ({
      ...prev,
      film_subject_pairs: [...prev.film_subject_pairs, { filmChips: [], subjectChips: [] }]
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

      if (selectedVenue && selectedVenue.theater_houses && selectedVenue.theater_houses.length > 0) {
        const houses = selectedVenue.theater_houses.map(house => house.house_name)
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

    const dateRegex = /^(\d{1,2})[\\/\-](\d{1,2})[\\/\-](\d{2})$/
    const match = dateValue.match(dateRegex)

    if (match) {
      const [, month, day, year] = match
      const fullYear = `20${year}`
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    return dateValue
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Check that at least one pair has a film/program
    const hasValidPair = formData.film_subject_pairs.some(pair => pair.filmChips.length > 0)
    if (!hasValidPair) {
      newErrors.film_pairs = 'At least one Film/Program is required'
    }

    // Check each pair for film/program when subjects are specified
    formData.film_subject_pairs.forEach((pair, index) => {
      if (pair.subjectChips.length > 0 && pair.filmChips.length === 0) {
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

      // Preserve original created_by when editing
      const originalCreatedBy = redCarpet && redCarpet.length > 0 ? redCarpet[0].created_by : user?.id
      const idsToDelete = redCarpet && redCarpet.length > 0 ? redCarpet.map(carpet => carpet.id) : []

      // Create new records for all pairs first (before deleting old ones)
      for (const pair of formData.film_subject_pairs) {
        if (pair.filmChips.length === 0) continue // Skip empty pairs

        // Separate FK-linked films and free-text films
        const fkFilms = pair.filmChips.filter(chip => chip.id)
        const freeTextFilms = pair.filmChips.filter(chip => !chip.id)

        const redCarpetData = {
          venue_id: formData.venue_id || null,
          house: formData.house || null,
          carpet_date: normalizeDateValue(formData.carpet_date) || null,
          call_time: formData.call_time || null,
          carpet_start_time: formData.carpet_start_time || null,
          film_program_start_time: formData.film_program_start_time || null,
          film_program_description: freeTextFilms.length > 0 ? freeTextFilms.map(c => c.label).join(', ') : null,
          subjects_description: pair.subjectChips.filter(c => !c.id).length > 0
            ? pair.subjectChips.filter(c => !c.id).map(c => c.label).join(', ')
            : null,
          rsvp_form_url: (formData.rsvp_form_url && formData.rsvp_form_url.trim()) || null,
          rsvp_responses_url: (formData.rsvp_responses_url && formData.rsvp_responses_url.trim()) || null,
          run_of_show_url: (formData.run_of_show_url && formData.run_of_show_url.trim()) || null,
          festival_year: currentYear,
          created_by: originalCreatedBy
        }

        // Create red carpet record
        const { data, error } = await supabase
          .from('red_carpets')
          .insert([redCarpetData])
          .select()
          .single()

        if (error) throw error

        // Insert FK-linked films into junction table
        if (fkFilms.length > 0) {
          const filmInserts = fkFilms.map(chip => ({
            red_carpet_id: data.id,
            film_id: chip.id!,
            film_type: chip.type || chip.filmType || 'feature',
            festival_year: currentYear,
          }))
          const { error: filmError } = await supabase
            .from('red_carpet_films')
            .insert(filmInserts)
          if (filmError) console.error('Error inserting red carpet films:', filmError)
        }

        // Insert FK-linked subjects into junction table (only those with guest_id)
        const fkSubjects = pair.subjectChips.filter(chip => chip.id)
        if (fkSubjects.length > 0) {
          const subjectInserts = fkSubjects.map(chip => ({
            red_carpet_id: data.id,
            guest_id: chip.id!,
            festival_year: currentYear,
          }))
          const { error: subjectError } = await supabase
            .from('red_carpet_subjects')
            .insert(subjectInserts)
          if (subjectError) console.error('Error inserting red carpet subjects:', subjectError)
        }
        // Free-text subjects are already stored in subjects_description on the red_carpets row
      }

      // Delete old records only after new ones are successfully created
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('red_carpets')
          .delete()
          .in('id', idsToDelete)
        if (deleteError) console.error('Error cleaning up old red carpet records:', deleteError)
      }

      onSave(null)
      onClose()
    } catch (error) {
      console.error('Error saving red carpet:', error)
      alert('Error saving red carpet. Please try again.')
    } finally {
      setIsSubmitting(false)
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
                      {/* Film/Program ChipSelect */}
                      <div>
                        <ChipSelect
                          items={pair.filmChips}
                          onChange={(items) => handleFilmChipsChange(pairIndex, items)}
                          onSearch={handleFilmSearch}
                          placeholder="Search films or programs..."
                          label="Film / Program"
                          allowFreeText={true}
                          helpText="Search for existing titles or type to add free text."
                        />
                        {errors[`film_${pairIndex}`] && <p className="text-sm text-red-600 mt-1">{errors[`film_${pairIndex}`]}</p>}
                      </div>

                      {/* Subjects ChipSelect */}
                      <div>
                        <ChipSelect
                          items={pair.subjectChips}
                          onChange={(items) => handleSubjectChipsChange(pairIndex, items)}
                          onSearch={handleSubjectSearch}
                          placeholder="Search guests..."
                          label="Subject(s)"
                          allowFreeText={true}
                          helpText="Search for guests or type to add free text."
                        />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Call Time</label>
                <input
                  type="time"
                  value={formData.call_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, call_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carpet Start Time</label>
                <input
                  type="time"
                  value={formData.carpet_start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, carpet_start_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Film/Program Start</label>
                <input
                  type="time"
                  value={formData.film_program_start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, film_program_start_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          .in('id', redCarpet.map((c: any) => c.id))

                        if (error) throw error

                        onSave(null)
                        onClose()
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
