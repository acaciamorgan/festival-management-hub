'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { getFestivalYear } from '@/lib/smart-date-parser'
import { InterviewCard, InterviewStatus, PressCard } from '@/types'
import { ChipSelect, ChipItem, ChipSelectSuggestion } from '@/components/ui/chip-select'

interface InterviewFormModalProps {
  interview: InterviewCard | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

interface FilmOption {
  id: string
  title: string
  type: 'feature' | 'short' | 'program' | 'shorts_program'
  contextInfo?: string
  shorts_program_id?: string
}

export function InterviewFormModal({ interview, isOpen, onClose, onSave }: InterviewFormModalProps) {
  const { user } = useAuth()
  const { currentYear } = useFestivalYear()

  // Selected films as chip items (each will become a separate interview record)
  const [selectedFilms, setSelectedFilms] = useState<(ChipItem & { filmType: string; shorts_program_id?: string })[]>([])

  // Subject chips - guest-linked (with id) and free-text (without id)
  const [subjectChips, setSubjectChips] = useState<ChipItem[]>([])

  // Journalist - either linked to press card or manual text
  const [pressId, setPressId] = useState<string>('')
  const [journalistName, setJournalistName] = useState('')
  const [outlet, setOutlet] = useState('')
  const [email, setEmail] = useState('')
  const [journalistSearch, setJournalistSearch] = useState('')
  const [showJournalistDropdown, setShowJournalistDropdown] = useState(false)

  // Other form fields
  const [status, setStatus] = useState<InterviewStatus>('TBD')
  const [interviewDate, setInterviewDate] = useState('')
  const [interviewTime, setInterviewTime] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [venueId, setVenueId] = useState('')
  const [location, setLocation] = useState('')
  const [showOnSpecialEvents, setShowOnSpecialEvents] = useState(false)
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [size] = useState({ width: 600, height: 700 })

  // Data for dropdowns
  const [allFilms, setAllFilms] = useState<FilmOption[]>([])
  const [pressOptions, setPressOptions] = useState<PressCard[]>([])
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([])

  const supabase = createClient()

  // Load dropdown data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          { data: featureFilms },
          { data: shortsPrograms },
          { data: shortFilms },
          { data: programs },
          { data: press },
          { data: venuesData },
        ] = await Promise.all([
          supabase.from('feature_films').select('id, title').eq('festival_year', currentYear).order('title'),
          supabase.from('shorts_programs').select('id, program_name').eq('festival_year', currentYear).order('program_name'),
          supabase.from('short_films').select('id, title, shorts_program_id, shorts_programs!inner(id, program_name)').eq('festival_year', currentYear).order('title'),
          supabase.from('programs').select('id, title').eq('festival_year', currentYear).order('title'),
          supabase.from('press').select('id, name, media_outlet, email').eq('festival_year', currentYear).order('name'),
          supabase.from('venues').select('id, name').order('name'),
        ])

        const films: FilmOption[] = [
          ...(featureFilms || []).map(f => ({ id: f.id, title: f.title, type: 'feature' as const })),
          ...(shortFilms || []).map(s => ({
            id: s.id,
            title: s.title,
            type: 'short' as const,
            contextInfo: `from ${s.shorts_programs.program_name}`,
            shorts_program_id: s.shorts_program_id,
          })),
          ...(shortsPrograms || []).map(p => ({
            id: p.id,
            title: p.program_name,
            type: 'shorts_program' as const,
            contextInfo: 'entire program',
          })),
          ...(programs || []).map(p => ({ id: p.id, title: p.title, type: 'program' as const })),
        ]

        setAllFilms(films)
        setPressOptions(press || [])
        setVenues(venuesData || [])
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    if (isOpen) loadData()
  }, [isOpen, supabase, currentYear])

  // Initialize form when editing
  useEffect(() => {
    if (interview) {
      // Determine the film for this interview
      const filmTitle = interview.title || ''
      const filmChips: (ChipItem & { filmType: string; shorts_program_id?: string })[] = []

      if (interview.film_id) {
        filmChips.push({ id: interview.film_id, label: filmTitle, filmType: 'feature' })
      } else if (interview.short_film_id) {
        filmChips.push({ id: interview.short_film_id, label: filmTitle, filmType: 'short', shorts_program_id: interview.shorts_program_id || undefined })
      } else if (interview.shorts_program_id) {
        filmChips.push({ id: interview.shorts_program_id, label: filmTitle, filmType: 'shorts_program' })
      } else if (interview.program_id) {
        filmChips.push({ id: interview.program_id, label: filmTitle, filmType: 'program' })
      }
      setSelectedFilms(filmChips)

      // Build subject chips from guest IDs and text names
      const chips: ChipItem[] = []
      const guestIds = interview.subject_guest_ids || []
      const nameText = interview.subject_names || ''
      const names = nameText ? nameText.split(',').map(n => n.trim()).filter(n => n && n !== '—') : []

      // For each name, check if there's a corresponding guest ID
      // Guest IDs are ordered to match the names list
      names.forEach((name, i) => {
        if (i < guestIds.length && guestIds[i]) {
          chips.push({ id: guestIds[i], label: name })
        } else {
          chips.push({ label: name })
        }
      })
      setSubjectChips(chips)

      // Journalist - use resolved data if available, fall back to cached
      setPressId(interview.press_id || '')
      setJournalistName(interview.resolved_journalist_name || interview.journalist_name || '')
      setOutlet(interview.resolved_outlet || interview.outlet || '')
      setEmail(interview.resolved_email || interview.email || '')
      setJournalistSearch(interview.resolved_journalist_name || interview.journalist_name || '')

      setStatus(interview.status)
      setInterviewDate(interview.interview_date || '')
      setInterviewTime(interview.interview_time || '')
      setDurationMinutes(interview.duration_minutes?.toString() || '')
      setVenueId(interview.venue_id || '')
      setLocation(interview.location || '')
      setShowOnSpecialEvents(interview.show_on_special_events || false)
      setNotes(interview.notes || '')
    } else {
      // Reset form for new interview
      setSelectedFilms([])
      setSubjectChips([])
      setPressId('')
      setJournalistName('')
      setOutlet('')
      setEmail('')
      setJournalistSearch('')
      setStatus('TBD')
      setInterviewDate('')
      setInterviewTime('')
      setDurationMinutes('')
      setVenueId('')
      setLocation('')
      setShowOnSpecialEvents(false)
      setNotes('')
    }
  }, [interview])

  // Dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Film search for ChipSelect
  const handleFilmSearch = useCallback(async (query: string): Promise<ChipSelectSuggestion[]> => {
    const lower = query.toLowerCase()
    return allFilms
      .filter(f => f.title.toLowerCase().includes(lower))
      .slice(0, 15)
      .map(f => ({
        id: f.id,
        label: f.title,
        sublabel: f.contextInfo || f.type,
        type: f.type,
      }))
  }, [allFilms])

  // Handle film chip changes
  const handleFilmsChange = useCallback((items: ChipItem[]) => {
    const enriched = items.map(item => {
      // Find the film option to get its type info
      const filmOption = allFilms.find(f => f.id === item.id)
      return {
        ...item,
        filmType: filmOption?.type || item.type || 'feature',
        shorts_program_id: filmOption?.shorts_program_id,
      }
    })
    setSelectedFilms(enriched)
  }, [allFilms])

  // Subject search — queries guest list, with auto-suggestions from selected film's guests
  const handleSubjectSearch = useCallback(async (query: string): Promise<ChipSelectSuggestion[]> => {
    if (query.length < 2) return []

    try {
      // Search guests matching the query
      let dbQuery = supabase
        .from('guests')
        .select('id, name, guest_film_titles:guest_film_titles(film_title)')
        .ilike('name', `%${query}%`)
        .eq('festival_year', currentYear)
        .limit(10)

      const { data, error } = await dbQuery
      if (error) throw error

      return (data || []).map(guest => {
        const films = (guest.guest_film_titles || []).map((f: any) => f.film_title).filter(Boolean)
        return {
          id: guest.id,
          label: guest.name,
          sublabel: films.join(', ') || 'No films assigned',
        }
      })
    } catch (error) {
      console.error('Error searching guests:', error)
      return []
    }
  }, [supabase, currentYear])

  // Auto-suggest subjects when a film is selected
  const loadFilmGuests = useCallback(async (filmId: string, filmType: string) => {
    try {
      let guests: Array<{ id: string; name: string }> = []

      if (filmType === 'feature' || filmType === 'short') {
        const { data } = await supabase
          .from('guest_films')
          .select('guest_id, guests!inner(id, name)')
          .eq('film_id', filmId)

        guests = (data || []).map((gf: any) => ({
          id: gf.guests.id,
          name: gf.guests.name,
        }))
      }

      if (guests.length > 0) {
        // Use functional update to avoid stale closure over subjectChips
        setSubjectChips(prev => {
          const newChips: ChipItem[] = []
          for (const guest of guests) {
            const alreadyAdded = prev.some(c => c.id === guest.id)
            if (!alreadyAdded) {
              newChips.push({ id: guest.id, label: guest.name })
            }
          }
          return newChips.length > 0 ? [...prev, ...newChips] : prev
        })
      }
    } catch (error) {
      console.error('Error loading film guests:', error)
    }
  }, [supabase])

  // When films change (new film added), auto-suggest guests
  useEffect(() => {
    if (selectedFilms.length > 0 && !interview) {
      const latestFilm = selectedFilms[selectedFilms.length - 1]
      if (latestFilm.id) {
        loadFilmGuests(latestFilm.id, latestFilm.filmType)
      }
    }
  }, [selectedFilms.length, loadFilmGuests, interview])

  // Journalist selection
  const handleJournalistSelect = (press: PressCard) => {
    setPressId(press.id)
    setJournalistName(press.name)
    setOutlet(press.media_outlet)
    setEmail(press.email)
    setJournalistSearch(press.name)
    setShowJournalistDropdown(false)
  }

  const handleJournalistNameChange = (value: string) => {
    setJournalistSearch(value)
    setJournalistName(value)
    setPressId('') // Clear link when typing manually
  }

  const filteredPress = pressOptions.filter(p =>
    p.name.toLowerCase().includes(journalistSearch.toLowerCase())
  )

  // Submit handler — creates one record per film (batch)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedFilms.length === 0) {
      alert('Please select at least one film or program')
      return
    }

    setLoading(true)
    try {
      const festivalYear = await getFestivalYear()

      // Build subject data from chips — positionally aligned arrays
      // subject_guest_ids[i] corresponds to subject_names.split(', ')[i]
      // Free-text entries get null in the IDs array to maintain alignment
      const allNames = subjectChips.map(c => c.label)
      const subjectGuestIds = subjectChips.map(c => c.id || null)
      const subjectNames = allNames.join(', ') || null
      const hasAnyGuestIds = subjectGuestIds.some(id => id !== null)

      // Shared fields across all records
      const sharedData = {
        press_id: pressId || null,
        journalist_name: pressId ? null : (journalistName || null), // Only cache if no press link
        outlet: pressId ? null : (outlet || null),
        email: pressId ? null : (email || null),
        subject_names: subjectNames,
        subject_guest_ids: hasAnyGuestIds ? subjectGuestIds : null,
        status,
        interview_date: interviewDate || null,
        interview_time: interviewTime || null,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        venue_id: venueId || null,
        location: location || null,
        show_on_special_events: showOnSpecialEvents,
        notes: notes || null,
        festival_year: parseInt(festivalYear, 10),
        created_by: user?.id,
      }

      if (interview) {
        // Editing: update the single existing record
        const film = selectedFilms[0]
        const filmFields = getFilmFields(film)

        const { error } = await supabase
          .from('interviews')
          .update({ ...sharedData, ...filmFields })
          .eq('id', interview.id)

        if (error) throw error
      } else {
        // Creating: one record per selected film
        const records = selectedFilms.map(film => ({
          ...sharedData,
          ...getFilmFields(film),
        }))

        const { error } = await supabase.from('interviews').insert(records)
        if (error) throw error
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error saving interview:', error)
      const errorMessage = error?.message || 'Unknown error'
      alert(`Error saving interview: ${errorMessage}\n\nPlease check the console for details.`)
    } finally {
      setLoading(false)
    }
  }

  // Map a film chip to the correct FK fields
  function getFilmFields(film: ChipItem & { filmType: string; shorts_program_id?: string }) {
    const fields: Record<string, string | null> = {
      film_id: null,
      short_film_id: null,
      shorts_program_id: null,
      program_id: null,
    }

    switch (film.filmType) {
      case 'feature':
        fields.film_id = film.id || null
        break
      case 'short':
        fields.short_film_id = film.id || null
        fields.shorts_program_id = film.shorts_program_id || null
        break
      case 'shorts_program':
        fields.shorts_program_id = film.id || null
        break
      case 'program':
        fields.program_id = film.id || null
        break
    }

    return fields
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 pointer-events-none">
      <div
        className="bg-white rounded-lg shadow-2xl border border-gray-300 overflow-y-auto pointer-events-auto"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          maxHeight: `${size.height}px`,
          position: 'fixed',
          cursor: isDragging ? 'grabbing' : 'default',
        }}
      >
        {/* Draggable Header */}
        <div
          className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <h1 className="text-lg font-semibold text-gray-900">
            {interview ? 'Edit Interview' : 'Add Interview'}
          </h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
          >
            ×
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Film/Program Selection — chips with autocomplete */}
          <div className="mb-4">
            <ChipSelect
              items={selectedFilms}
              onChange={handleFilmsChange}
              onSearch={handleFilmSearch}
              label={interview ? 'Title' : 'Title(s)'}
              placeholder="Search films and programs..."
              required
              helpText={interview ? undefined : 'Select multiple films to create one interview record per film'}
              disabled={!!interview} // Don't change film when editing
            />
            {!interview && selectedFilms.length > 1 && (
              <p className="mt-1 text-xs text-blue-600 font-medium">
                {selectedFilms.length} separate interview records will be created
              </p>
            )}
          </div>

          {/* Journalist Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Journalist</label>
            <div className="relative">
              <input
                type="text"
                value={journalistSearch}
                onChange={(e) => {
                  handleJournalistNameChange(e.target.value)
                  setShowJournalistDropdown(true)
                }}
                onFocus={() => setShowJournalistDropdown(true)}
                onBlur={() => setTimeout(() => setShowJournalistDropdown(false), 150)}
                placeholder="Search journalists or enter name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {pressId && (
                <div className="mt-1 flex items-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    Linked to press card
                    <button
                      type="button"
                      onClick={() => {
                        setPressId('')
                        setJournalistSearch('')
                        setJournalistName('')
                        setOutlet('')
                        setEmail('')
                      }}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                </div>
              )}
              {showJournalistDropdown && filteredPress.length > 0 && journalistSearch && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredPress.map((press) => (
                    <button
                      key={press.id}
                      type="button"
                      onClick={() => handleJournalistSelect(press)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      <div className="font-medium">{press.name}</div>
                      <div className="text-gray-500 text-xs">{press.media_outlet}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Outlet</label>
              <input
                type="text"
                value={outlet}
                onChange={(e) => setOutlet(e.target.value)}
                readOnly={!!pressId}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${pressId ? 'bg-gray-100 text-gray-600' : ''}`}
              />
              {pressId && <p className="mt-1 text-xs text-gray-500">Auto-filled from press card</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!!pressId}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${pressId ? 'bg-gray-100 text-gray-600' : ''}`}
              />
              {pressId && <p className="mt-1 text-xs text-gray-500">Auto-filled from press card</p>}
            </div>
          </div>

          {/* Subject Selection — chip-based with guest autocomplete */}
          <div className="mb-4">
            <ChipSelect
              items={subjectChips}
              onChange={setSubjectChips}
              onSearch={handleSubjectSearch}
              label="Subject(s)"
              placeholder="Search guests or type a name..."
              allowFreeText
              minSearchLength={2}
              helpText="Select from guest cards or type free-text names. Guests auto-suggested when you select a film."
            />
          </div>

          {/* Status */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as InterviewStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TBD">TBD</option>
              <option value="Pitching">Pitching</option>
              <option value="Subject Pending">Subject Pending</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Film Team">Film Team</option>
              <option value="Complete">Complete</option>
              <option value="Declined">Declined</option>
            </select>
          </div>

          {/* Interview Details */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Interview Details
              {status === 'Complete' && (
                <span className="ml-2 text-xs text-green-600 font-normal">(Historical Record)</span>
              )}
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="text"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  placeholder="MM/DD/YYYY or any date format"
                  readOnly={status === 'Complete'}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${status === 'Complete' ? 'bg-gray-100 text-gray-600' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="text"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  placeholder="e.g. 3:00 PM"
                  readOnly={status === 'Complete'}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${status === 'Complete' ? 'bg-gray-100 text-gray-600' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Length (mins)</label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="30"
                  min="1"
                  readOnly={status === 'Complete'}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${status === 'Complete' ? 'bg-gray-100 text-gray-600' : ''}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Venue (Optional)</label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                disabled={status === 'Complete'}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${status === 'Complete' ? 'bg-gray-100 text-gray-600' : ''}`}
              >
                <option value="">No venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Select a venue for structured locations like Filmmakers Lounge</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location (Text)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Phone, Zoom link, or other details..."
                readOnly={status === 'Complete'}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${status === 'Complete' ? 'bg-gray-100 text-gray-600' : ''}`}
              />
              <p className="mt-1 text-xs text-gray-500">For non-venue locations (phone, Zoom, etc.)</p>
            </div>
          </div>

          {/* Show on Special Events Calendar */}
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showOnSpecialEvents}
                onChange={(e) => setShowOnSpecialEvents(e.target.checked)}
                disabled={status === 'Complete'}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Add to Special Events Calendar</span>
            </label>
            <p className="ml-6 text-xs text-gray-500">
              When checked, this interview will appear on the Special Events calendar and timeline
            </p>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : interview ? 'Update Interview' : selectedFilms.length > 1 ? `Add ${selectedFilms.length} Interviews` : 'Add Interview'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
