'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { SpecialEventCard, EventType, OpenPressType } from '@/types'
import { ChipSelect, ChipItem, ChipSelectSuggestion } from '@/components/ui/chip-select'

interface SpecialEventFormModalProps {
  event?: SpecialEventCard | null
  isOpen: boolean
  onClose: () => void
  onSave: (event: SpecialEventCard) => void
}

interface FilmOption {
  id: string
  title: string
  type: 'feature' | 'short' | 'shorts_program' | 'program'
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
  filmChips: (ChipItem & { filmType?: string })[]
  guestChips: ChipItem[]
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
  confirmed: boolean
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
    filmChips: [],
    guestChips: [],
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
    confirmed: false,
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

  // Data for suggestions
  const [allFilms, setAllFilms] = useState<FilmOption[]>([])
  const [availableVenues, setAvailableVenues] = useState<{id: string, name: string, address: string, contact_names?: string[], contact_phones?: string[]}[]>([])
  const [existingInvitedTags, setExistingInvitedTags] = useState<string[]>([])

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
        const [featureFilms, shortFilms, shortsPrograms, programs, venues, existingEvents] = await Promise.all([
          supabase.from('feature_films').select('id, title').eq('festival_year', currentYear).order('title'),
          supabase.from('short_films').select('id, title').eq('festival_year', currentYear).order('title'),
          supabase.from('shorts_programs').select('id, program_name').eq('festival_year', currentYear).order('program_name'),
          supabase.from('programs').select('id, title').eq('festival_year', currentYear).order('title'),
          supabase.from('venues').select('id, name, address, contact_names, contact_phones').eq('festival_year', currentYear).order('name'),
          supabase.from('special_events').select('invited_tags').eq('festival_year', currentYear).not('invited_tags', 'is', null)
        ])

        // Build unified film options
        const films: FilmOption[] = [
          ...(featureFilms.data || []).map(f => ({ id: f.id, title: f.title, type: 'feature' as const })),
          ...(shortFilms.data || []).map(f => ({ id: f.id, title: f.title, type: 'short' as const })),
          ...(shortsPrograms.data || []).map(p => ({ id: p.id, title: p.program_name, type: 'shorts_program' as const })),
          ...(programs.data || []).map(p => ({ id: p.id, title: p.title, type: 'program' as const })),
        ]
        setAllFilms(films)
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

  // Initialize form data when event changes (edit mode)
  useEffect(() => {
    const initEditForm = async () => {
      if (event) {
        // Load junction data to reconstruct chips
        const [{ data: junctionFilms }, { data: junctionGuests }, { data: baseEvent }] = await Promise.all([
          supabase
            .from('special_event_films')
            .select('film_id, film_type')
            .eq('special_event_id', event.id),
          supabase
            .from('special_event_guests')
            .select('guest_id, guests!inner(id, name)')
            .eq('special_event_id', event.id),
          supabase
            .from('special_events')
            .select('film_program_description, guests_description')
            .eq('id', event.id)
            .maybeSingle(),
        ])

        // Build film chips from junction data
        const filmChips: (ChipItem & { filmType?: string })[] = (junctionFilms || []).map(jf => {
          const filmOption = allFilms.find(f => f.id === jf.film_id && f.type === jf.film_type)
          return {
            id: jf.film_id,
            label: filmOption?.title || 'Unknown',
            type: jf.film_type,
            filmType: jf.film_type,
          }
        })

        // Add free-text films from film_program_description
        if (baseEvent?.film_program_description) {
          baseEvent.film_program_description.split(',').map((t: string) => t.trim()).filter(Boolean).forEach((title: string) => {
            filmChips.push({ label: title })
          })
        }

        // Build guest chips from junction data
        const guestChips: ChipItem[] = (junctionGuests || []).map((jg: any) => ({
          id: jg.guest_id,
          label: jg.guests?.name || 'Unknown',
        }))

        // Add free-text guests from guests_description
        if (baseEvent?.guests_description) {
          baseEvent.guests_description.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((name: string) => {
            guestChips.push({ label: name })
          })
        }

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
          filmChips,
          guestChips,
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
          confirmed: event.confirmed ?? false,
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
          venue_contact_name: '',
          venue_contact_phone: '',
          location_details: '',
          filmChips: [],
          guestChips: [],
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
          confirmed: false,
          open_press: 'No',
          rsvp_responder_link: '',
          rsvp_response_link: '',
          actual_attendance: '',
          notes: ''
        })
      }
      setErrors({})
    }

    if (isOpen) {
      initEditForm()
    }
  }, [event, isOpen, allFilms, supabase])

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

  // Guest search for ChipSelect — queries guests table
  const handleGuestSearch = useCallback(async (query: string): Promise<ChipSelectSuggestion[]> => {
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

  // Handle film chips change
  const handleFilmChipsChange = (items: ChipItem[]) => {
    const enriched = items.map(item => {
      const filmOption = allFilms.find(f => f.id === item.id)
      return {
        ...item,
        filmType: filmOption?.type || item.type || undefined,
      }
    })
    setFormData(prev => ({ ...prev, filmChips: enriched }))
  }

  // Handle guest chips change
  const handleGuestChipsChange = (items: ChipItem[]) => {
    setFormData(prev => ({ ...prev, guestChips: items }))
  }

  // Jury tagging
  const [availableJuries, setAvailableJuries] = useState<string[]>([])

  useEffect(() => {
    const loadJuries = async () => {
      const { data } = await supabase
        .from('guests')
        .select('jury_name')
        .eq('festival_year', currentYear)
        .eq('guest_type', 'Jury')
        .not('jury_name', 'is', null)
      const names = [...new Set((data || []).map((g: any) => g.jury_name).filter(Boolean))] as string[]
      setAvailableJuries(names.sort())
    }
    if (isOpen) loadJuries()
  }, [isOpen, supabase, currentYear])

  const handleTagJury = async (juryName: string) => {
    const { data } = await supabase
      .from('guests')
      .select('id, name')
      .eq('festival_year', currentYear)
      .eq('guest_type', 'Jury')
      .eq('jury_name', juryName)
    if (!data) return
    const existingIds = new Set(formData.guestChips.filter(c => c.id).map(c => c.id))
    const newChips = data
      .filter(g => !existingIds.has(g.id))
      .map(g => ({ id: g.id, label: g.name }))
    setFormData(prev => ({ ...prev, guestChips: [...prev.guestChips, ...newChips] }))
  }

  // Handle Invited tags autocomplete (smart tagging — kept as-is, not relational)
  const handleInvitedTagsInput = (value: string) => {
    setFormData(prev => ({ ...prev, invited_tags: value }))

    const terms = value.split(',').map(t => t?.trim?.() || '')
    const lastTerm = terms[terms.length - 1]

    if (lastTerm.length >= 1) {
      const suggestions = existingInvitedTags
        .filter(tag => tag.toLowerCase().includes(lastTerm.toLowerCase()))
        .filter(tag => !terms.slice(0, -1).includes(tag))

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
      const now = new Date()
      const nowStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0')

      // Separate FK-linked and free-text items
      const fkFilms = formData.filmChips.filter(chip => chip.id)
      const freeTextFilms = formData.filmChips.filter(chip => !chip.id)
      const fkGuests = formData.guestChips.filter(chip => chip.id)
      const freeTextGuests = formData.guestChips.filter(chip => !chip.id)

      // Prepare the event data
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
        film_program_description: freeTextFilms.length > 0 ? freeTextFilms.map(c => c.label).join(', ') : null,
        guests_description: freeTextGuests.length > 0 ? freeTextGuests.map(c => c.label).join(', ') : null,
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
        confirmed: formData.confirmed,
        open_press: formData.open_press,
        rsvp_responder_link: formData.rsvp_responder_link?.trim?.() || null,
        rsvp_response_link: formData.rsvp_response_link?.trim?.() || null,
        actual_attendance: formData.actual_attendance?.trim?.() || null,
        notes: formData.notes?.trim?.() || null,
        festival_year: currentYear,
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

        // Clear existing junction table entries
        await Promise.all([
          supabase.from('special_event_films').delete().eq('special_event_id', event.id),
          supabase.from('special_event_guests').delete().eq('special_event_id', event.id)
        ])
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

      // Insert FK-linked films into junction table
      if (fkFilms.length > 0) {
        const filmInserts = fkFilms.map(chip => ({
          special_event_id: savedEvent.id,
          film_id: chip.id!,
          film_type: chip.type || chip.filmType || 'feature',
          festival_year: currentYear,
        }))
        const { error: filmError } = await supabase
          .from('special_event_films')
          .insert(filmInserts)
        if (filmError) console.error('Error inserting special event films:', filmError)
      }

      // Insert FK-linked guests into junction table
      if (fkGuests.length > 0) {
        const guestInserts = fkGuests.map(chip => ({
          special_event_id: savedEvent.id,
          guest_id: chip.id!,
          festival_year: currentYear,
        }))
        const { error: guestError } = await supabase
          .from('special_event_guests')
          .insert(guestInserts)
        if (guestError) console.error('Error inserting special event guests:', guestError)
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
                  className={`w-full px-3 py-2 border rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

            {/* Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="confirmed"
                checked={formData.confirmed}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmed: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="confirmed" className="ml-2 text-sm font-medium text-gray-700">
                Confirmed
              </label>
              <span className="ml-2 text-xs text-gray-500">(Unconfirmed events appear as tentative)</span>
            </div>

            {/* Row 2: Films/Programs ChipSelect */}
            <div>
              <ChipSelect
                items={formData.filmChips}
                onChange={handleFilmChipsChange}
                onSearch={handleFilmSearch}
                placeholder="Search films or programs..."
                label="Films/Programs Associated"
                allowFreeText={true}
                helpText="Search for existing titles or type to add free text."
              />
            </div>

            {/* Row 3: Guests ChipSelect */}
            <div>
              <div className="flex items-end gap-2 mb-1">
                <ChipSelect
                  items={formData.guestChips}
                  onChange={handleGuestChipsChange}
                  onSearch={handleGuestSearch}
                  placeholder="Search guests..."
                  label="Guests Associated"
                  allowFreeText={true}
                  helpText="Search for guests or type to add free text."
                />
                {availableJuries.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleTagJury(e.target.value)
                        e.target.value = ''
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 whitespace-nowrap"
                    defaultValue=""
                  >
                    <option value="" disabled>Tag Jury...</option>
                    {availableJuries.map(name => (
                      <option key={name} value={name}>{name} Jury</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Row 4: Date and Times */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access Time</label>
                <input
                  type="time"
                  value={formData.access_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, access_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Staff setup time</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Guest arrival</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contact person at venue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Contact Phone</label>
                <input
                  type="text"
                  value={formData.venue_contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue_contact_phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Staff member name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Volunteer</label>
                <input
                  type="text"
                  value={formData.lead_volunteer}
                  onChange={(e) => setFormData(prev => ({ ...prev, lead_volunteer: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Volunteer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Vols</label>
                <input
                  type="text"
                  value={formData.number_of_vols}
                  onChange={(e) => setFormData(prev => ({ ...prev, number_of_vols: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Wine, beer, cocktails..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bartender</label>
                <input
                  type="text"
                  value={formData.bartender}
                  onChange={(e) => setFormData(prev => ({ ...prev, bartender: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Bartender name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Food</label>
                <input
                  type="text"
                  value={formData.food}
                  onChange={(e) => setFormData(prev => ({ ...prev, food: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Appetizers, dinner..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caterer</label>
                <input
                  type="text"
                  value={formData.caterer}
                  onChange={(e) => setFormData(prev => ({ ...prev, caterer: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Post-event attendance count"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

                        onSave(null)
                        onClose()
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
