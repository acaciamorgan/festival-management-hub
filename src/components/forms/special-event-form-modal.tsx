'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { getFestivalYear } from '@/lib/smart-date-parser'
import { SpecialEventCard, EventType, OpenPressType } from '@/types'

interface SpecialEventFormModalProps {
  event?: SpecialEventCard | null
  isOpen: boolean
  onClose: () => void
  onSave: (event: SpecialEventCard) => void
}

interface SpecialEventFormData {
  title: string
  event_type: EventType | ''
  event_date: string
  access_time: string
  start_time: string
  end_time: string
  venue_id: string
  venue_contact_name: string
  venue_contact_phone: string
  location_details: string
  films_programs_display: string
  guests_display: string
  lead_staff: string
  lead_volunteer: string
  number_of_vols: string
  invited_tags: string
  number_expected: string
  beverages: string
  bartender: string
  food: string
  caterer: string
  photography: string
  open_press: OpenPressType
  rsvp_responder_link: string
  rsvp_response_link: string
  actual_attendance: string
  notes: string
}

export function SpecialEventFormModal({ event, isOpen, onClose, onSave }: SpecialEventFormModalProps) {
  const { user } = useAuth()
  const { currentYear } = useFestivalYear()
  const [formData, setFormData] = useState<SpecialEventFormData>({
    title: '',
    event_type: '',
    event_date: '',
    access_time: '',
    start_time: '',
    end_time: '',
    venue_id: '',
    venue_contact_name: '',
    venue_contact_phone: '',
    location_details: '',
    films_programs_display: '',
    guests_display: '',
    lead_staff: '',
    lead_volunteer: '',
    number_of_vols: '',
    invited_tags: '',
    number_expected: '',
    beverages: '',
    bartender: '',
    food: '',
    caterer: '',
    photography: '',
    open_press: 'No',
    rsvp_responder_link: '',
    rsvp_response_link: '',
    actual_attendance: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // Suggestion states
  const [availableFilms, setAvailableFilms] = useState<{id: string, title: string, type: 'feature' | 'short'}[]>([])
  const [availablePrograms, setAvailablePrograms] = useState<{id: string, title: string}[]>([])
  const [availableGuests, setAvailableGuests] = useState<{id: string, name: string}[]>([])
  const [availableVenues, setAvailableVenues] = useState<{id: string, name: string, address: string, contact_names?: string[], contact_phones?: string[]}[]>([])
  const [existingInvitedTags, setExistingInvitedTags] = useState<string[]>([])
  
  // Film/Program suggestions
  const [showFilmSuggestions, setShowFilmSuggestions] = useState(false)
  const [filteredFilmSuggestions, setFilteredFilmSuggestions] = useState<{id: string, title: string, type: 'feature' | 'short' | 'program'}[]>([])
  
  // Guest suggestions
  const [showGuestSuggestions, setShowGuestSuggestions] = useState(false)
  const [filteredGuestSuggestions, setFilteredGuestSuggestions] = useState<{id: string, name: string}[]>([])
  
  // Invited tags suggestions
  const [showInvitedSuggestions, setShowInvitedSuggestions] = useState(false)
  const [filteredInvitedSuggestions, setFilteredInvitedSuggestions] = useState<string[]>([])

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

  // Load suggestion data
  useEffect(() => {
    const loadSuggestionData = async () => {
      try {
        const [featureFilms, shortFilms, programs, guests, venues, existingEvents] = await Promise.all([
          supabase.from('feature_films').select('id, title').eq('festival_year', currentYear).order('title'),
          supabase.from('short_films').select('id, title').eq('festival_year', currentYear).order('title'),
          supabase.from('programs').select('id, title').eq('festival_year', currentYear).order('title'),
          supabase.from('guests').select('id, name').eq('festival_year', currentYear).order('name'),
          supabase.from('venues').select('id, name, address, contact_names, contact_phones').order('name'),
          supabase.from('special_events').select('invited_tags').eq('festival_year', currentYear).not('invited_tags', 'is', null)
        ])

        // Process films
        const films = [
          ...(featureFilms.data || []).map(f => ({ ...f, type: 'feature' as const })),
          ...(shortFilms.data || []).map(f => ({ ...f, type: 'short' as const }))
        ]
        setAvailableFilms(films)
        setAvailablePrograms(programs.data || [])
        setAvailableGuests(guests.data || [])
        setAvailableVenues(venues.data || [])

        // Extract unique invited tags
        const tags = new Set<string>()
        existingEvents.data?.forEach(event => {
          if (event.invited_tags) {
            event.invited_tags.split(',').forEach((tag: string) => {
              const trimmed = tag?.trim?.()
              if (trimmed) tags.add(trimmed)
            })
          }
        })
        setExistingInvitedTags(Array.from(tags))

      } catch (error) {
        console.error('Error loading suggestion data:', error)
      }
    }
    
    if (isOpen) {
      loadSuggestionData()
    }
  }, [isOpen, supabase, currentYear])

  // Initialize form data when event changes
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        event_type: event.event_type || '',
        event_date: event.event_date || '',
        access_time: event.access_time || '',
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        venue_id: event.venue_id || '',
        venue_contact_name: event.venue_contact_name || '',
        venue_contact_phone: event.venue_contact_phone || '',
        location_details: event.location_details || '',
        films_programs_display: event.films_programs_display_combined || '',
        guests_display: event.guests_display_combined || '',
        lead_staff: event.lead_staff || '',
        lead_volunteer: event.lead_volunteer || '',
        number_of_vols: event.number_of_vols || '',
        invited_tags: event.invited_tags || '',
        number_expected: event.number_expected || '',
        beverages: event.beverages || '',
        bartender: event.bartender || '',
        food: event.food || '',
        caterer: event.caterer || '',
        photography: event.photography || '',
        open_press: event.open_press || 'No',
        rsvp_responder_link: event.rsvp_responder_link || '',
        rsvp_response_link: event.rsvp_response_link || '',
        actual_attendance: event.actual_attendance || '',
        notes: event.notes || ''
      })
    } else {
      setFormData({
        title: '',
        event_type: '',
        event_date: '',
        access_time: '',
        start_time: '',
        end_time: '',
        venue_id: '',
        location_details: '',
        films_programs_display: '',
        guests_display: '',
        lead_staff: '',
        invited_tags: '',
        number_expected: '',
        beverages: '',
        bartender: '',
        food: '',
        caterer: '',
        photography: '',
        open_press: 'No',
        rsvp_responder_link: '',
        rsvp_response_link: '',
        actual_attendance: '',
        notes: ''
      })
    }
    setErrors({})
  }, [event, isOpen])

  // Handle Films/Programs autocomplete
  const handleFilmProgramInput = (value: string) => {
    setFormData(prev => ({ ...prev, films_programs_display: value }))
    
    const terms = value.split(',').map(t => t?.trim?.() || '')
    const lastTerm = terms[terms.length - 1]
    
    if (lastTerm.length >= 1) {
      const filmSuggestions = availableFilms
        .filter(film => film.title.toLowerCase().includes(lastTerm.toLowerCase()))
        .map(film => ({ ...film, type: film.type }))
      
      const programSuggestions = availablePrograms
        .filter(program => program.title.toLowerCase().includes(lastTerm.toLowerCase()))
        .map(program => ({ ...program, type: 'program' as const }))
      
      const allSuggestions = [...filmSuggestions, ...programSuggestions]
      setFilteredFilmSuggestions(allSuggestions.slice(0, 8))
      setShowFilmSuggestions(allSuggestions.length > 0)
    } else {
      setShowFilmSuggestions(false)
    }
  }

  // Handle Films/Programs suggestion selection
  const handleFilmSuggestionSelect = (suggestion: {id: string, title: string, type: 'feature' | 'short' | 'program'}) => {
    const terms = (formData.films_programs_display || '').split(',').map(t => t?.trim?.() || '')
    terms[terms.length - 1] = suggestion.title
    setFormData(prev => ({ ...prev, films_programs_display: terms.filter(t => t).join(', ') }))
    setShowFilmSuggestions(false)
  }

  // Handle Guests autocomplete
  const handleGuestsInput = (value: string) => {
    setFormData(prev => ({ ...prev, guests_display: value }))
    
    const terms = value.split(',').map(t => t?.trim?.() || '')
    const lastTerm = terms[terms.length - 1]
    
    if (lastTerm.length >= 1) {
      const guestSuggestions = availableGuests
        .filter(guest => guest.name.toLowerCase().includes(lastTerm.toLowerCase()))
      
      setFilteredGuestSuggestions(guestSuggestions.slice(0, 8))
      setShowGuestSuggestions(guestSuggestions.length > 0)
    } else {
      setShowGuestSuggestions(false)
    }
  }

  // Handle Guests suggestion selection
  const handleGuestSuggestionSelect = (suggestion: {id: string, name: string}) => {
    const terms = (formData.guests_display || '').split(',').map(t => t?.trim?.() || '')
    terms[terms.length - 1] = suggestion.name
    setFormData(prev => ({ ...prev, guests_display: terms.filter(t => t).join(', ') }))
    setShowGuestSuggestions(false)
  }

  // Handle Invited tags autocomplete (smart tagging)
  const handleInvitedTagsInput = (value: string) => {
    setFormData(prev => ({ ...prev, invited_tags: value }))
    
    const terms = value.split(',').map(t => t?.trim?.() || '')
    const lastTerm = terms[terms.length - 1]
    
    if (lastTerm.length >= 1) {
      const suggestions = existingInvitedTags
        .filter(tag => tag.toLowerCase().includes(lastTerm.toLowerCase()))
        .filter(tag => !terms.slice(0, -1).includes(tag)) // Don't suggest already used tags
      
      setFilteredInvitedSuggestions(suggestions.slice(0, 8))
      setShowInvitedSuggestions(suggestions.length > 0)
    } else {
      setShowInvitedSuggestions(false)
    }
  }

  // Handle Invited tags suggestion selection
  const handleInvitedTagSuggestionSelect = (tag: string) => {
    const terms = (formData.invited_tags || '').split(',').map(t => t?.trim?.() || '')
    terms[terms.length - 1] = tag
    setFormData(prev => ({ ...prev, invited_tags: terms.filter(t => t).join(', ') }))
    setShowInvitedSuggestions(false)
  }

  // Handle venue selection and auto-populate address and contacts
  const handleVenueChange = (venueId: string) => {
    setFormData(prev => ({ ...prev, venue_id: venueId }))
    
    if (venueId) {
      const selectedVenue = availableVenues.find(v => v.id === venueId)
      if (selectedVenue) {
        setFormData(prev => ({ 
          ...prev, 
          location_details: prev.location_details || selectedVenue.address || '',
          venue_contact_name: selectedVenue.contact_names?.[0] || prev.venue_contact_name || '',
          venue_contact_phone: selectedVenue.contact_phones?.[0] || prev.venue_contact_phone || ''
        }))
      }
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title?.trim?.()) {
      newErrors.title = 'Event name is required'
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
      const festivalYear = await getFestivalYear()
      const now = new Date()
      const nowStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0')

      // Prepare the event data (excluding venue contact fields which are derived)
      const eventData: any = {
        title: formData.title?.trim?.() || '',
        event_type: formData.event_type || null,
        event_date: formData.event_date || null,
        access_time: formData.access_time || null,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        venue_id: formData.venue_id || null,
        venue_contact_name: formData.venue_contact_name?.trim?.() || null,
        venue_contact_phone: formData.venue_contact_phone?.trim?.() || null,
        location_details: formData.location_details?.trim?.() || null,
        lead_staff: formData.lead_staff?.trim?.() || null,
        lead_volunteer: formData.lead_volunteer?.trim?.() || null,
        number_of_vols: formData.number_of_vols?.trim?.() || null,
        invited_tags: formData.invited_tags?.trim?.() || null,
        number_expected: formData.number_expected?.trim?.() || null,
        beverages: formData.beverages?.trim?.() || null,
        bartender: formData.bartender?.trim?.() || null,
        food: formData.food?.trim?.() || null,
        caterer: formData.caterer?.trim?.() || null,
        photography: formData.photography?.trim?.() || null,
        open_press: formData.open_press,
        rsvp_responder_link: formData.rsvp_responder_link?.trim?.() || null,
        rsvp_response_link: formData.rsvp_response_link?.trim?.() || null,
        actual_attendance: formData.actual_attendance?.trim?.() || null,
        notes: formData.notes?.trim?.() || null,
        festival_year: parseInt(festivalYear, 10),
        updated_at: nowStr
      }

      // Get venue info for caching
      if (eventData.venue_id) {
        const selectedVenue = availableVenues.find(v => v.id === eventData.venue_id)
        if (selectedVenue) {
          eventData.venue_name = selectedVenue.name
          eventData.venue_address = selectedVenue.address
        }
      }

      let savedEvent: any

      if (event) {
        // Update existing event
        const { data, error } = await supabase
          .from('special_events')
          .update(eventData)
          .eq('id', event.id)
          .select()
          .single()

        if (error) throw error
        savedEvent = data
      } else {
        // Create new event
        const { data, error } = await supabase
          .from('special_events')
          .insert([{
            ...eventData,
            created_at: nowStr,
            created_by: user?.id
          }])
          .select()
          .single()

        if (error) throw error
        savedEvent = data
      }

      // Handle junction table associations
      const { unmatchedFilms, unmatchedGuests } = await handleAssociations(savedEvent.id, formData.films_programs_display, formData.guests_display, festivalYear)

      // Save only unmatched items to description fields
      if (unmatchedFilms.length > 0 || unmatchedGuests.length > 0) {
        await supabase
          .from('special_events')
          .update({
            film_program_description: unmatchedFilms.length > 0 ? unmatchedFilms.join(', ') : null,
            guests_description: unmatchedGuests.length > 0 ? unmatchedGuests.join(', ') : null
          })
          .eq('id', savedEvent.id)
      }

      onSave(savedEvent)
    } catch (error: any) {
      console.error('Error saving special event:', error)
      const errorMessage = error?.message || error?.error_description || 'Error saving event. Please try again.'
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAssociations = async (eventId: string, filmProgramTitles: string, guestNames: string, festivalYear: string) => {
    const unmatchedFilms: string[] = []
    const unmatchedGuests: string[] = []

    // Clear existing junction table entries for this event
    await Promise.all([
      supabase.from('special_event_films').delete().eq('special_event_id', eventId),
      supabase.from('special_event_guests').delete().eq('special_event_id', eventId)
    ])

    // Process film/program titles using greedy longest-match (handles commas in titles)
    if (filmProgramTitles?.trim()) {
      // Build combined list sorted longest-first for greedy matching
      const allKnownFilms = [
        ...availableFilms.map(f => ({ id: f.id, title: f.title, type: f.type as string })),
        ...availablePrograms.map(p => ({ id: p.id, title: p.title, type: 'program' }))
      ].sort((a, b) => b.title.length - a.title.length)

      const matchedFilms: { id: string, title: string, type: string }[] = []
      let remainingText = filmProgramTitles.trim()

      for (const film of allKnownFilms) {
        const escaped = film.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escaped, 'i')
        if (regex.test(remainingText)) {
          matchedFilms.push(film)
          remainingText = remainingText
            .replace(regex, '')
            .replace(/^\s*[,|]+\s*|\s*[,|]+\s*$/g, '')
            .replace(/\s*[,|]+\s*/g, ',')
            .trim()
        }
      }

      // Insert matched films into junction table
      for (const film of matchedFilms) {
        await supabase.from('special_event_films').insert({
          special_event_id: eventId,
          film_id: film.id,
          film_type: film.type,
          festival_year: parseInt(festivalYear, 10)
        })
      }

      // Any remaining comma-separated tokens are unmatched (free-text)
      const tokens = remainingText.split(',').map(t => t.trim()).filter(t => t)
      unmatchedFilms.push(...tokens)
    }

    // Process guest names
    if (guestNames?.trim()) {
      const names = guestNames.split(',').map(n => n.trim()).filter(n => n)

      for (const name of names) {
        const nameLower = name.toLowerCase()
        const guest = availableGuests.find(g => g.name.toLowerCase() === nameLower)

        if (guest) {
          await supabase.from('special_event_guests').insert({
            special_event_id: eventId,
            guest_id: guest.id,
            festival_year: parseInt(festivalYear, 10)
          })
        } else {
          unmatchedGuests.push(name)
        }
      }
    }

    return { unmatchedFilms, unmatchedGuests }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default',
          maxWidth: '1200px',
          width: '95vw',
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
              {event ? 'Edit Special Event' : 'Add New Special Event'}
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
            {/* Row 1: Event Name (Required) and Event Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter event name"
                />
                {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_type: e.target.value as EventType }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select type...</option>
                  <option value="Reception">Reception</option>
                  <option value="Mixer">Mixer</option>
                  <option value="Party">Party</option>
                  <option value="Awards">Awards</option>
                  <option value="Other">Other</option>
                  <option value="Media Filing">Media Filing</option>
                </select>
              </div>
            </div>

            {/* Row 2: Films/Programs Associated */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Films/Programs Associated</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.films_programs_display}
                  onChange={(e) => handleFilmProgramInput(e.target.value)}
                  onFocus={() => {
                    if (filteredFilmSuggestions.length > 0) {
                      setShowFilmSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowFilmSuggestions(false), 200)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter film or program titles separated by commas"
                />
                
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
                            suggestion.type === 'short' ? 'Short Film' : 'Program'})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Separate multiple films/programs with commas. Matched items will be linked to existing records.
              </p>
            </div>

            {/* Row 3: Guests Associated */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guests Associated</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.guests_display}
                  onChange={(e) => handleGuestsInput(e.target.value)}
                  onFocus={() => {
                    if (filteredGuestSuggestions.length > 0) {
                      setShowGuestSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowGuestSuggestions(false), 200)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter guest names separated by commas"
                />
                
                {showGuestSuggestions && filteredGuestSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredGuestSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                        onClick={() => handleGuestSuggestionSelect(suggestion)}
                      >
                        <span className="font-medium">{suggestion.name}</span>
                        <span className="text-gray-500 text-xs ml-2">(Guest)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Separate multiple guests with commas. Matched names will be linked to Guest Cards.
              </p>
            </div>

            {/* Row 4: Date and Times */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access Time</label>
                <input
                  type="time"
                  value={formData.access_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, access_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Staff setup time</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Guest arrival</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Row 5: Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room/Details</label>
                <input
                  type="text"
                  value={formData.location_details}
                  onChange={(e) => setFormData(prev => ({ ...prev, location_details: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Room, floor, or additional details"
                />
              </div>
            </div>

            {/* Row 5.5: Venue Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Contact Name</label>
                <input
                  type="text"
                  value={formData.venue_contact_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue_contact_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contact person at venue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Contact Phone</label>
                <input
                  type="text"
                  value={formData.venue_contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue_contact_phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contact phone number"
                />
              </div>
            </div>

            {/* Row 6: Staff and Volunteers */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Staff</label>
                <input
                  type="text"
                  value={formData.lead_staff}
                  onChange={(e) => setFormData(prev => ({ ...prev, lead_staff: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Staff member name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Volunteer</label>
                <input
                  type="text"
                  value={formData.lead_volunteer}
                  onChange={(e) => setFormData(prev => ({ ...prev, lead_volunteer: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Volunteer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Vols</label>
                <input
                  type="text"
                  value={formData.number_of_vols}
                  onChange={(e) => setFormData(prev => ({ ...prev, number_of_vols: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invited</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.invited_tags}
                    onChange={(e) => handleInvitedTagsInput(e.target.value)}
                    onFocus={() => {
                      if (filteredInvitedSuggestions.length > 0) {
                        setShowInvitedSuggestions(true)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowInvitedSuggestions(false), 200)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Filmmakers, Sponsors, VIPs..."
                  />
                  
                  {showInvitedSuggestions && filteredInvitedSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredInvitedSuggestions.map((tag, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                          onClick={() => handleInvitedTagSuggestionSelect(tag)}
                        >
                          {tag}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Smart tags, separate with commas</p>
              </div>
            </div>

            {/* Row 7: Number Expected */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number Expected</label>
                <input
                  type="text"
                  value={formData.number_expected}
                  onChange={(e) => setFormData(prev => ({ ...prev, number_expected: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 50-75"
                />
              </div>
            </div>

            {/* Row 8: F&B */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beverages</label>
                <input
                  type="text"
                  value={formData.beverages}
                  onChange={(e) => setFormData(prev => ({ ...prev, beverages: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Wine, beer, cocktails..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bartender</label>
                <input
                  type="text"
                  value={formData.bartender}
                  onChange={(e) => setFormData(prev => ({ ...prev, bartender: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Bartender name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Food</label>
                <input
                  type="text"
                  value={formData.food}
                  onChange={(e) => setFormData(prev => ({ ...prev, food: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Appetizers, dinner..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caterer</label>
                <input
                  type="text"
                  value={formData.caterer}
                  onChange={(e) => setFormData(prev => ({ ...prev, caterer: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Catering company"
                />
              </div>
            </div>

            {/* Row 8: Photography and Press */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photography</label>
                <input
                  type="text"
                  value={formData.photography}
                  onChange={(e) => setFormData(prev => ({ ...prev, photography: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Photography details or photographer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Open Press</label>
                <div className="flex space-x-4">
                  {(['Yes', 'No', 'Limited'] as OpenPressType[]).map((option) => (
                    <label key={option} className="flex items-center">
                      <input
                        type="radio"
                        name="open_press"
                        value={option}
                        checked={formData.open_press === option}
                        onChange={(e) => setFormData(prev => ({ ...prev, open_press: e.target.value as OpenPressType }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-900">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 9: RSVP Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RSVP Responder Link</label>
                <input
                  type="url"
                  value={formData.rsvp_responder_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, rsvp_responder_link: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://forms.google.com/..."
                />
                <p className="text-xs text-gray-500 mt-1">Link to share for RSVPs</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RSVP Response Link</label>
                <input
                  type="url"
                  value={formData.rsvp_response_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, rsvp_response_link: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://docs.google.com/..."
                />
                <p className="text-xs text-gray-500 mt-1">Link to view responses</p>
              </div>
            </div>

            {/* Row 10: Post-Event and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actual Attendance</label>
                <input
                  type="text"
                  value={formData.actual_attendance}
                  onChange={(e) => setFormData(prev => ({ ...prev, actual_attendance: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Post-event attendance count"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes or special requirements"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between px-6 py-4 bg-gray-50 border-t">
            <div>
              {event && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                      try {
                        const { error } = await supabase
                          .from('special_events')
                          .delete()
                          .eq('id', event.id)
                        
                        if (error) throw error
                        
                        onClose()
                        window.location.reload()
                      } catch (error) {
                        console.error('Error deleting event:', error)
                        alert('Error deleting event. Please try again.')
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  disabled={isSubmitting}
                >
                  Delete Event
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
                {isSubmitting ? 'Saving...' : (event ? 'Update Event' : 'Create Event')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}