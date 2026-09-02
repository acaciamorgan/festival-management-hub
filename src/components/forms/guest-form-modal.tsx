'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { GuestCard, GuestType, ConfirmationStatus } from '@/types'
import { detectChangedFields, logFieldChanges, logNewRecord } from '@/lib/field-changes'
import { useModalDrag } from '@/hooks/use-modal-drag'

interface GuestFormModalProps {
  guest?: GuestCard | null
  isOpen: boolean
  onClose: () => void
  onSave: (guest: GuestCard) => void
}

interface GuestFormData {
  name: string
  pronouns: string
  country: string
  guest_type: GuestType
  confirmed: boolean
  confirmation_status: ConfirmationStatus | ''
  role: string
  
  // Contact
  contact_name: string
  contact_email: string
  
  // Travel
  arranging_travel: string
  
  // Arrival
  arrival_date: string
  arrival_airline: string
  arrival_flight_number: string
  arrival_takeoff_time: string
  arrival_origin: string
  arrival_destination: string
  arrival_landing_time: string
  
  // Departure
  departure_date: string
  departure_takeoff_time: string
  departure_airline: string
  departure_flight_number: string
  departure_origin: string
  departure_destination: string
  departure_landing_time: string
  
  // Hotel
  hotel_name: string
  hotel_address: string
  hotel_confirmation_number: string
  
  // Contact Info
  contact_info: string

  // Management
  checked_in: boolean
  notes: string

  // Jury
  jury_name: string

  // Films (as string for form input)
  film_titles: string
}

export function GuestFormModal({ guest, isOpen, onClose, onSave }: GuestFormModalProps) {
  const { user } = useAuth()
  const { currentYear } = useFestivalYear()
  const [formData, setFormData] = useState<GuestFormData>({
    name: '',
    pronouns: '',
    country: '',
    guest_type: 'Features',
    confirmed: false,
    confirmation_status: '',
    role: '',
    contact_name: '',
    contact_email: '',
    arranging_travel: '',
    arrival_date: '',
    arrival_takeoff_time: '',
    arrival_landing_time: '',
    arrival_airline: '',
    arrival_flight_number: '',
    arrival_origin: '',
    arrival_destination: '',
    departure_date: '',
    departure_takeoff_time: '',
    departure_landing_time: '',
    departure_airline: '',
    departure_flight_number: '',
    departure_origin: '',
    departure_destination: '',
    hotel_name: '',
    hotel_address: '',
    hotel_confirmation_number: '',
    contact_info: '',
    checked_in: false,
    notes: '',
    jury_name: '',
    film_titles: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const originalGuestRef = useRef<Record<string, unknown> | null>(null)
  const { handleMouseDown: dragMouseDown, modalStyle, isMobile, isDragging } = useModalDrag({ initialPosition: { x: 0, y: 0 } })
  const [availableFilms, setAvailableFilms] = useState<{id: string, title: string, type: 'feature' | 'short'}[]>([])
  const [availablePrograms, setAvailablePrograms] = useState<{id: string, title: string}[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<{id: string, title: string, type: 'film' | 'program'}[]>([])
  const [juryNameSuggestions, setJuryNameSuggestions] = useState<string[]>([])
  const [showJurySuggestions, setShowJurySuggestions] = useState(false)
  const [allJuryNames, setAllJuryNames] = useState<string[]>([])
  const [duplicateConflict, setDuplicateConflict] = useState<{ id: string, guest_type: string } | null>(null)

  const supabase = createClient()

  // Load available films and programs
  useEffect(() => {
    const loadFilmsAndPrograms = async () => {
      try {
        const [featureFilms, shortFilms, programs] = await Promise.all([
          supabase.from('feature_films').select('id, title').eq('festival_year', currentYear).order('title'),
          supabase.from('short_films').select('id, title').eq('festival_year', currentYear).order('title'),
          supabase.from('programs').select('id, title').eq('festival_year', currentYear).order('title')
        ])
        
        const allFilms = [
          ...(featureFilms.data || []).map(f => ({ ...f, type: 'feature' as const })),
          ...(shortFilms.data || []).map(f => ({ ...f, type: 'short' as const }))
        ]

        setAvailableFilms(allFilms)
        setAvailablePrograms(programs.data || [])

        // Load existing jury names for autocomplete
        const { data: juryGuests } = await supabase
          .from('guests')
          .select('jury_name')
          .eq('festival_year', currentYear)
          .not('jury_name', 'is', null)
        const uniqueNames = [...new Set((juryGuests || []).map((g: any) => g.jury_name).filter(Boolean))] as string[]
        setAllJuryNames(uniqueNames.sort())
      } catch (error) {
        console.error('Error loading films and programs:', error)
      }
    }
    
    if (isOpen) {
      loadFilmsAndPrograms()
    }
  }, [isOpen, supabase, currentYear])


  // Initialize form data when guest changes
  useEffect(() => {
    if (guest) {
      originalGuestRef.current = { ...guest }
      setFormData({
        name: guest.name || '',
        pronouns: guest.pronouns || '',
        country: guest.country || '',
        guest_type: guest.guest_type || 'Features',
        confirmed: guest.confirmed || false,
        confirmation_status: guest.confirmation_status || '',
        role: guest.role || '',
        contact_name: guest.contact_name || '',
        contact_email: guest.contact_email || '',
        arranging_travel: guest.arranging_travel || '',
        arrival_date: guest.arrival_date || '',
        arrival_takeoff_time: guest.inbound_departure_time || '',
        arrival_landing_time: guest.inbound_arrival_time || '',
        arrival_airline: guest.arrival_airline || '',
        arrival_flight_number: guest.arrival_flight_number || '',
        arrival_origin: guest.arrival_origin_airport || '',
        arrival_destination: guest.arrival_airport || '',
        departure_date: guest.departure_date || '',
        departure_takeoff_time: guest.outbound_departure_time || '',
        departure_landing_time: guest.outbound_arrival_time || '',
        departure_airline: guest.departure_airline || '',
        departure_flight_number: guest.departure_flight_number || '',
        departure_origin: guest.departure_airport || '',
        departure_destination: guest.destination_airport || '',
        hotel_name: guest.hotel_name || '',
        hotel_address: guest.hotel_address || '',
        hotel_confirmation_number: guest.hotel_confirmation_number || '',
        contact_info: guest.contact_info || '',
        checked_in: guest.checked_in || false,
        notes: guest.notes || '',
        jury_name: guest.jury_name || '',
        film_titles: guest.films_display || ''
      })
    } else {
      setFormData({
        name: '',
        pronouns: '',
        country: '',
        guest_type: 'Features',
        confirmed: false,
        confirmation_status: '',
        role: '',
        contact_name: '',
        contact_email: '',
        arranging_travel: '',
        arrival_date: '',
        arrival_takeoff_time: '',
        arrival_landing_time: '',
        arrival_airline: '',
        arrival_flight_number: '',
        arrival_origin: '',
        arrival_destination: '',
        departure_date: '',
        departure_takeoff_time: '',
        departure_landing_time: '',
        departure_airline: '',
        departure_flight_number: '',
        departure_origin: '',
        departure_destination: '',
        hotel_name: '',
        hotel_address: '',
        hotel_confirmation_number: '',
        contact_info: '',
        checked_in: false,
        notes: '',
        jury_name: '',
        film_titles: ''
      })
    }
    setErrors({})
  }, [guest, isOpen])

  // Handle autocomplete filtering
  const handleFilmProgramInput = (value: string) => {
    setFormData(prev => ({ ...prev, film_titles: value }))
    
    // Get the last entered term (after last comma)
    const terms = value.split(',').map(t => t.trim())
    const lastTerm = terms[terms.length - 1]
    
    if (lastTerm.length >= 1) {
      const filmSuggestions = availableFilms
        .filter(film => film.title.toLowerCase().includes(lastTerm.toLowerCase()))
        .map(film => ({ ...film, type: 'film' as const }))
      
      const programSuggestions = availablePrograms
        .filter(program => program.title.toLowerCase().includes(lastTerm.toLowerCase()))
        .map(program => ({ ...program, type: 'program' as const }))
      
      const allSuggestions = [...filmSuggestions, ...programSuggestions]
      setFilteredSuggestions(allSuggestions.slice(0, 8)) // Limit to 8 suggestions
      setShowSuggestions(allSuggestions.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: {id: string, title: string, type: 'film' | 'program'}) => {
    const terms = formData.film_titles.split(',').map(t => t.trim())
    terms[terms.length - 1] = suggestion.title
    setFormData(prev => ({ ...prev, film_titles: terms.join(', ') }))
    setShowSuggestions(false)
  }

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
    
    // Check if it's just YY format at the end
    const yearOnlyRegex = /^(\d{4})-(\d{2})-(\d{2})$|^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    if (yearOnlyRegex.test(dateValue)) {
      return dateValue // Already properly formatted
    }
    
    return dateValue
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Guest name is required'
    }

    if (!formData.guest_type) {
      newErrors.guest_type = 'Guest type is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // If editing an existing guest, skip duplicate check entirely
    if (guest) {
      await performSave(null)
      return
    }

    setIsSubmitting(true)

    try {
      // Check for existing guest by name (case-insensitive) within current festival year
      const { data: existingGuests, error: checkError } = await supabase
        .from('guests')
        .select('id, guest_type')
        .ilike('name', formData.name.trim())
        .eq('festival_year', currentYear)

      if (checkError) throw checkError

      const existingGuest = existingGuests && existingGuests.length > 0 ? existingGuests[0] : null

      if (existingGuest) {
        // Show duplicate conflict dialog instead of browser confirm
        setDuplicateConflict({ id: existingGuest.id, guest_type: existingGuest.guest_type || 'Unknown' })
        setIsSubmitting(false)
        return
      }

      // No duplicate — insert new
      await performSave(null)
    } catch (error) {
      console.error('Error checking for duplicates:', error)
      alert('Error saving guest. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleDuplicateChoice = async (choice: 'update' | 'add_new') => {
    const conflictId = duplicateConflict?.id || null
    setDuplicateConflict(null)
    await performSave(choice === 'update' ? conflictId : null)
  }

  const performSave = async (updateExistingId: string | null) => {
    setIsSubmitting(true)

    try {
      const now = new Date()
      const nowStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0')

      const guestData = {
        name: formData.name.trim(),
        pronouns: formData.pronouns.trim() || null,
        country: formData.country.trim() || null,
        guest_type: formData.guest_type,
        confirmed: formData.confirmation_status === 'Confirmed',
        confirmation_status: formData.confirmation_status || null,
        role: formData.role.trim() || null,
        contact_name: formData.contact_name.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        arranging_travel: formData.arranging_travel,
        arrival_date: normalizeDateValue(formData.arrival_date) || null,
        inbound_departure_time: formData.arrival_takeoff_time || null,
        inbound_arrival_time: formData.arrival_landing_time || null,
        arrival_airline: formData.arrival_airline.trim() || null,
        arrival_flight_number: formData.arrival_flight_number.trim() || null,
        arrival_origin_airport: formData.arrival_origin.trim() || null,
        arrival_airport: formData.arrival_destination.trim() || null,
        departure_date: normalizeDateValue(formData.departure_date) || null,
        outbound_departure_time: formData.departure_takeoff_time || null,
        outbound_arrival_time: formData.departure_landing_time || null,
        departure_airline: formData.departure_airline.trim() || null,
        departure_flight_number: formData.departure_flight_number.trim() || null,
        departure_airport: formData.departure_origin.trim() || null,
        destination_airport: formData.departure_destination.trim() || null,
        hotel_name: formData.hotel_name.trim() || null,
        hotel_address: formData.hotel_address.trim() || null,
        hotel_confirmation_number: formData.hotel_confirmation_number.trim() || null,
        contact_info: formData.contact_info.trim() || null,
        checked_in: formData.checked_in,
        notes: formData.notes.trim() || null,
        jury_name: formData.guest_type === 'Jury' ? (formData.jury_name.trim() || null) : null,
        festival_year: currentYear,
        updated_at: nowStr
      }

      let savedGuest: GuestCard
      const isEditing = !!guest

      if (isEditing) {
        // Update existing guest (editing mode — clicked into a card)
        const { data, error } = await supabase
          .from('guests')
          .update(guestData)
          .eq('id', guest!.id)
          .select()
          .single()

        if (error) throw error
        savedGuest = data

        // Log field-level changes for highlighting
        if (originalGuestRef.current) {
          const trackedFields = Object.keys(guestData).filter(f => f !== 'updated_at' && f !== 'festival_year')
          const changed = detectChangedFields(originalGuestRef.current, guestData, trackedFields)
          await logFieldChanges('guests', guest!.id, changed, currentYear)
        }
      } else if (updateExistingId) {
        // Update existing guest found by name (user chose "Update Existing")
        const { data, error } = await supabase
          .from('guests')
          .update({ ...guestData, updated_at: nowStr })
          .eq('id', updateExistingId)
          .select()
          .single()

        if (error) throw error
        savedGuest = data

        // Log field-level changes for highlighting
        const trackedFields = Object.keys(guestData).filter(f => f !== 'updated_at' && f !== 'festival_year')
        const changed = detectChangedFields({ id: updateExistingId }, guestData, trackedFields)
        await logFieldChanges('guests', updateExistingId, changed, currentYear)
      } else {
        // Create new guest
        const { data, error } = await supabase
          .from('guests')
          .insert([{
            ...guestData,
            created_at: nowStr,
            created_by: user?.id
          }])
          .select()
          .single()

        if (error) throw error
        savedGuest = data

        // Highlight all fields of the new record
        const trackedFields = Object.keys(guestData).filter(f => !['festival_year', 'created_at', 'created_by'].includes(f))
        await logNewRecord('guests', data, trackedFields, currentYear)
      }

      // Handle film and program associations
      // Delete existing associations if editing or updating existing guest
      if (isEditing || updateExistingId) {
        await supabase.from('guest_films').delete().eq('guest_id', savedGuest.id).eq('festival_year', currentYear)
      }

      if (formData.film_titles.trim()) {
        // Greedy longest-match algorithm: sort known titles by length desc,
        // find each as regex in remaining input text, remove and repeat.
        // This correctly handles film titles containing commas.
        const allKnownFilms = [
          ...availableFilms.map(f => ({ id: f.id, title: f.title, type: f.type as string })),
          ...availablePrograms.map(p => ({ id: p.id, title: p.title, type: 'program' as string }))
        ].sort((a, b) => b.title.length - a.title.length)

        let remainingText = formData.film_titles.trim()
        const matchedFilms: { id: string, title: string, type: string }[] = []

        for (const known of allKnownFilms) {
          const escaped = known.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(escaped, 'i')
          if (regex.test(remainingText)) {
            matchedFilms.push(known)
            remainingText = remainingText
              .replace(regex, '')
              .replace(/^\s*[,|]+\s*|\s*[,|]+\s*$/g, '')
              .replace(/\s*[,|]+\s*/g, ',')
              .trim()
          }
        }

        // Build films_display from matched titles + any unmatched free text for backward compat
        const unmatchedTokens = remainingText
          ? remainingText.split(',').map(t => t.trim()).filter(t => t)
          : []
        const allTitlesForDisplay = [
          ...matchedFilms.map(f => f.title),
          ...unmatchedTokens
        ]
        const filmsDisplayValue = allTitlesForDisplay.join(', ') || formData.film_titles.trim()

        // Update films_display on the guest record for backward compatibility
        await supabase
          .from('guests')
          .update({ films_display: filmsDisplayValue })
          .eq('id', savedGuest.id)

        // Insert matched film associations into guest_films with film_type
        if (matchedFilms.length > 0) {
          const associations = matchedFilms.map(film => ({
            guest_id: savedGuest.id,
            film_id: film.id,
            film_type: film.type,
            festival_year: currentYear
          }))

          const { data: guestFilmsData, error: guestFilmsError } = await supabase
            .from('guest_films')
            .insert(associations)
            .select()

          if (guestFilmsError) {
            console.error('Error saving film associations:', guestFilmsError)
            savedGuest.films = []
          } else {
            savedGuest.films = guestFilmsData || []
          }
        } else {
          savedGuest.films = []
        }
      } else {
        // No titles — clear films_display and leave guest_films empty
        await supabase
          .from('guests')
          .update({ films_display: '—' })
          .eq('id', savedGuest.id)
        savedGuest.films = []
      }

      onSave(savedGuest)
      onClose()
    } catch (error) {
      console.error('Error saving guest:', error)
      alert('Error saving guest. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
    {duplicateConflict && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={() => setDuplicateConflict(null)} />
        <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Duplicate Guest Found</h3>
          <p className="text-sm text-gray-600 mb-4">
            A guest named <span className="font-medium">&ldquo;{formData.name.trim()}&rdquo;</span> already exists as <span className="font-medium">{duplicateConflict.guest_type}</span>.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleDuplicateChoice('update')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Update Existing
            </button>
            <button
              onClick={() => handleDuplicateChoice('add_new')}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium"
            >
              Add As Duplicate
            </button>
            <button
              onClick={() => setDuplicateConflict(null)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div
        className="bg-white rounded-lg shadow-xl w-full overflow-y-auto pointer-events-auto relative"
        style={{
          ...modalStyle,
          ...(isMobile
            ? { width: '95vw', maxWidth: '95vw', maxHeight: '90vh' }
            : { maxWidth: '72rem', maxHeight: '90vh', margin: '0 1rem' }),
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Draggable Header */}
          <div
            className={`bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg flex justify-between items-center ${isMobile ? '' : 'cursor-grab active:cursor-grabbing'}`}
            onMouseDown={dragMouseDown}
          >
            <h2 className="text-xl font-semibold text-gray-900">
              {guest ? 'Edit Guest' : 'Add New Guest'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
          <div className="p-6">

            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Guest Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter guest name"
                    />
                    {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pronouns
                    </label>
                    <input
                      type="text"
                      value={formData.pronouns}
                      onChange={(e) => setFormData(prev => ({ ...prev, pronouns: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. he/him, she/her, they/them"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Guest Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.guest_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, guest_type: e.target.value as GuestType }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Features">Features</option>
                      <option value="Shorts">Shorts</option>
                      <option value="Industry">Industry</option>
                      <option value="CineYouth">CineYouth</option>
                      <option value="Jury">Jury</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {formData.guest_type === 'Jury' && (
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Jury Name
                      </label>
                      <input
                        type="text"
                        value={formData.jury_name}
                        onChange={(e) => {
                          const val = e.target.value
                          setFormData(prev => ({ ...prev, jury_name: val }))
                          if (val.trim()) {
                            const filtered = allJuryNames.filter(n => n.toLowerCase().includes(val.toLowerCase()))
                            setJuryNameSuggestions(filtered)
                            setShowJurySuggestions(filtered.length > 0)
                          } else {
                            setShowJurySuggestions(false)
                          }
                        }}
                        onFocus={() => {
                          if (formData.jury_name.trim()) {
                            const filtered = allJuryNames.filter(n => n.toLowerCase().includes(formData.jury_name.toLowerCase()))
                            setJuryNameSuggestions(filtered)
                            setShowJurySuggestions(filtered.length > 0)
                          } else if (allJuryNames.length > 0) {
                            setJuryNameSuggestions(allJuryNames)
                            setShowJurySuggestions(true)
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowJurySuggestions(false), 200)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. International, Shorts, CineYouth"
                      />
                      {showJurySuggestions && juryNameSuggestions.length > 0 && (
                        <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                          {juryNameSuggestions.map((name) => (
                            <li
                              key={name}
                              className="px-3 py-2 text-sm text-gray-900 hover:bg-blue-50 cursor-pointer"
                              onMouseDown={() => {
                                setFormData(prev => ({ ...prev, jury_name: name }))
                                setShowJurySuggestions(false)
                              }}
                            >
                              {name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Country of citizenship"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <input
                      type="text"
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Director, Actor, Producer, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmation Status
                    </label>
                    <select
                      value={formData.confirmation_status}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmation_status: e.target.value as ConfirmationStatus | '' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">— Select —</option>
                      <option value="Tentative">Tentative</option>
                      <option value="Arrangements Pending">Arrangements Pending</option>
                      <option value="Confirmed">Confirmed</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="checked_in"
                      checked={formData.checked_in}
                      onChange={(e) => setFormData(prev => ({ ...prev, checked_in: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="checked_in" className="ml-2 block text-sm text-gray-900">
                      Checked In
                    </label>
                  </div>
                </div>
              </div>

              {/* Film Associations */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Film and/or Program Associations</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Film(s) / Program(s)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.film_titles}
                      onChange={(e) => handleFilmProgramInput(e.target.value)}
                      onFocus={() => {
                        if (filteredSuggestions.length > 0) {
                          setShowSuggestions(true)
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow selection
                        setTimeout(() => setShowSuggestions(false), 200)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter film or program titles separated by commas"
                    />
                    
                    {/* Autocomplete suggestions */}
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredSuggestions.map((suggestion, index) => (
                          <div
                            key={`${suggestion.type}-${suggestion.id}`}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                            onClick={() => handleSuggestionSelect(suggestion)}
                          >
                            <span className="font-medium">{suggestion.title}</span>
                            <span className="text-gray-500 text-xs ml-2">
                              ({suggestion.type === 'film' ? 'Film' : 'Program'})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Separate multiple films/programs with commas. Matched items will be linked to existing Film or Program Cards.
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.contact_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Contact person name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="contact@email.com"
                    />
                  </div>
                </div>
              </div>

              {/* Travel Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Travel Information</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Arranging Travel
                  </label>
                  <input
                    type="text"
                    value={formData.arranging_travel}
                    onChange={(e) => setFormData(prev => ({ ...prev, arranging_travel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Festival, Studio, Local, etc."
                  />
                </div>

                {/* Arrival Information */}
                <div className="bg-green-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900 mb-3">✈️ Arrival Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={formData.arrival_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, arrival_date: e.target.value }))}
                        onBlur={(e) => {
                          const normalized = normalizeDateValue(e.target.value)
                          if (normalized !== e.target.value) {
                            setFormData(prev => ({ ...prev, arrival_date: normalized }))
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Takeoff Time</label>
                      <input
                        type="time"
                        value={formData.arrival_takeoff_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, arrival_takeoff_time: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Landing Time</label>
                      <input
                        type="time"
                        value={formData.arrival_landing_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, arrival_landing_time: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Airline</label>
                      <input
                        type="text"
                        value={formData.arrival_airline}
                        onChange={(e) => setFormData(prev => ({ ...prev, arrival_airline: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Airline name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Flight Number</label>
                      <input
                        type="text"
                        value={formData.arrival_flight_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, arrival_flight_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Flight number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
                      <input
                        type="text"
                        value={formData.arrival_origin}
                        onChange={(e) => setFormData(prev => ({ ...prev, arrival_origin: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Origin airport"
                      />
                    </div>
                    <div className="md:col-span-2 lg:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                      <input
                        type="text"
                        value={formData.arrival_destination}
                        onChange={(e) => setFormData(prev => ({ ...prev, arrival_destination: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Destination airport"
                      />
                    </div>
                  </div>
                </div>

                {/* Departure Information */}
                <div className="bg-orange-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900 mb-3">🛫 Departure Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={formData.departure_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, departure_date: e.target.value }))}
                        onBlur={(e) => {
                          const normalized = normalizeDateValue(e.target.value)
                          if (normalized !== e.target.value) {
                            setFormData(prev => ({ ...prev, departure_date: normalized }))
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Takeoff Time</label>
                      <input
                        type="time"
                        value={formData.departure_takeoff_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, departure_takeoff_time: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Landing Time</label>
                      <input
                        type="time"
                        value={formData.departure_landing_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, departure_landing_time: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Airline</label>
                      <input
                        type="text"
                        value={formData.departure_airline}
                        onChange={(e) => setFormData(prev => ({ ...prev, departure_airline: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Airline name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Flight Number</label>
                      <input
                        type="text"
                        value={formData.departure_flight_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, departure_flight_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Flight number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
                      <input
                        type="text"
                        value={formData.departure_origin}
                        onChange={(e) => setFormData(prev => ({ ...prev, departure_origin: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Origin airport"
                      />
                    </div>
                    <div className="md:col-span-2 lg:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                      <input
                        type="text"
                        value={formData.departure_destination}
                        onChange={(e) => setFormData(prev => ({ ...prev, departure_destination: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Destination airport"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hotel Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">🏨 Hotel Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hotel Name
                    </label>
                    <input
                      type="text"
                      value={formData.hotel_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, hotel_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Hotel name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmation Number
                    </label>
                    <input
                      type="text"
                      value={formData.hotel_confirmation_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, hotel_confirmation_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Confirmation number"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hotel Address
                    </label>
                    <textarea
                      value={formData.hotel_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, hotel_address: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Hotel address"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Info</h3>
                <div>
                  <textarea
                    value={formData.contact_info}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_info: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Contact details, phone numbers, agent info, etc."
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                <div>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional notes about this guest..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between px-6 py-4 bg-gray-50 border-t">
            <div>
              {guest && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`Are you sure you want to cancel ${guest.name}? This action cannot be undone.`)) {
                      try {
                        const { error } = await supabase
                          .from('guests')
                          .delete()
                          .eq('id', guest.id)
                        
                        if (error) throw error
                        
                        onSave(null)
                        onClose()
                      } catch (error) {
                        console.error('Error deleting guest:', error)
                        alert('Error deleting guest. Please try again.')
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  disabled={isSubmitting}
                >
                  Cancel Guest
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
                {isSubmitting ? 'Saving...' : (guest ? 'Update Guest' : 'Create Guest')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}