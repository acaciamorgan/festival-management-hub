'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'

interface PressRequest {
  id: string
  requester_name: string
  requester_outlet: string
  requester_email: string
  request_type: 'screener_link' | 'screening_ticket'
  film_titles: string
  screening_id: string | null
  screening_type: string | null
  screening_date: string | null
  screening_time: string | null
  venue_short_code: string | null
  status: 'new' | 'requested' | 'fulfilled'
  requested_at: string | null
  fulfilled_at: string | null
  created_at: string
  updated_at: string
  created_by: string
}

interface PressRequestFormModalProps {
  request: PressRequest | null
  isOpen: boolean
  onClose: () => void
  onSave: (request: PressRequest) => void
}

interface PressContact {
  id: string
  name: string
  media_outlet: string
  email: string
}

interface Film {
  id: string
  title: string
  type: 'feature' | 'short' | 'program'
  access_type?: string
}

interface Screening {
  id: string
  film_title: string
  screening_type: 'published' | 'pi_jury' | 'tech_check'
  screening_date: string
  start_time: string
  venue_short_code: string
  run_time: number | null
  capacity: number | null
  notes: string | null
}

export function PressRequestFormModal({
  request,
  isOpen,
  onClose,
  onSave
}: PressRequestFormModalProps) {
  const { user } = useAuth()
  const supabase = createClient()
  
  // Form data
  const [formData, setFormData] = useState({
    requester_name: '',
    requester_outlet: '',
    requester_email: '',
    request_type: 'screener_link' as 'screener_link' | 'screening_ticket',
    status: 'new' as 'new' | 'requested' | 'fulfilled'
  })
  
  // Press contacts for auto-suggest
  const [pressContacts, setPressContacts] = useState<PressContact[]>([])
  const [showPressSuggestions, setShowPressSuggestions] = useState(false)
  const [filteredPressSuggestions, setFilteredPressSuggestions] = useState<PressContact[]>([])
  
  // Film selection
  const [availableFilms, setAvailableFilms] = useState<Film[]>([])
  const [selectedFilms, setSelectedFilms] = useState<Film[]>([])
  const [filmSearchTerm, setFilmSearchTerm] = useState('')
  const [showFilmSuggestions, setShowFilmSuggestions] = useState(false)
  const [filteredFilmSuggestions, setFilteredFilmSuggestions] = useState<Film[]>([])
  
  // Screening selection (for ticket requests)
  const [availableScreenings, setAvailableScreenings] = useState<Screening[]>([])
  const [selectedScreening, setSelectedScreening] = useState<Screening | null>(null)
  const [loadingScreenings, setLoadingScreenings] = useState(false)
  
  // Modal state
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

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
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove])

  // Load data on mount and reset state for new requests
  useEffect(() => {
    console.log('Modal state changed:', { isOpen, request: !!request })
    if (isOpen) {
      console.log('Modal opened, loading data...')
      console.log('About to call loadPressContacts and loadAvailableFilms')
      
      loadPressContacts()
      loadAvailableFilms()
      
      // If this is a new request (no request prop), ensure everything is reset
      if (!request) {
        console.log('New request - resetting all form state')
        setFormData({
          requester_name: '',
          requester_outlet: '',
          requester_email: '',
          request_type: 'screener_link',
          status: 'new'
        })
        setSelectedFilms([])
        setSelectedScreening(null)
        setAvailableScreenings([])
        setFilmSearchTerm('')
        setShowFilmSuggestions(false)
        setFilteredFilmSuggestions([])
        setShowPressSuggestions(false)
        setFilteredPressSuggestions([])
      }
    }
  }, [isOpen, request])

  // Initialize form data when request changes
  useEffect(() => {
    if (request) {
      setFormData({
        requester_name: request.requester_name || '',
        requester_outlet: request.requester_outlet || '',
        requester_email: request.requester_email || '',
        request_type: request.request_type || 'screener_link',
        status: request.status || 'new'
      })
      
      // Set selected screening if this is a ticket request
      if (request.screening_id && request.screening_type) {
        setSelectedScreening({
          id: request.screening_id,
          film_title: request.film_titles.split(',')[0].trim(),
          screening_type: request.screening_type as 'published' | 'pi_jury' | 'tech_check',
          screening_date: request.screening_date || '',
          start_time: request.screening_time || '',
          venue_short_code: request.venue_short_code || '',
          run_time: null,
          capacity: null,
          notes: null
        })
      }
      
      // Parse film titles back to Film objects
      if (request.film_titles) {
        const titles = request.film_titles.split(',').map(t => t.trim())
        const films = titles.map(title => ({
          id: '', // We don't store IDs, so this will be empty
          title,
          type: 'feature' as 'feature'
        }))
        setSelectedFilms(films)
      }
    } else {
      setFormData({
        requester_name: '',
        requester_outlet: '',
        requester_email: '',
        request_type: 'screener_link',
        status: 'new'
      })
      setSelectedFilms([])
      setSelectedScreening(null)
      setAvailableScreenings([])
    }
  }, [request])

  const loadPressContacts = async () => {
    try {
      const { data } = await supabase
        .from('press')
        .select('id, name, media_outlet, email')
        .order('name')

      setPressContacts(data || [])
    } catch (error) {
      console.error('Error loading press contacts:', error)
    }
  }

  const loadScreeningsForFilm = async (filmTitle: string) => {
    if (formData.request_type !== 'screening_ticket') return
    
    setLoadingScreenings(true)
    try {
      const screenings: Screening[] = []
      
      // Only load published screenings for ticket requests
      // Tech checks and P&I screenings don't have tickets available to the public
      const { data: published } = await supabase
        .from('published_screenings')
        .select('*')
        .eq('film_title', filmTitle)
        .order('screening_date', { ascending: true })
        .order('start_time', { ascending: true })
      
      if (published) {
        screenings.push(...published.map(s => ({
          ...s,
          screening_type: 'published' as const
        })))
      }
      
      setAvailableScreenings(screenings)
    } catch (error) {
      console.error('Error loading screenings:', error)
    } finally {
      setLoadingScreenings(false)
    }
  }

  const loadAvailableFilms = async () => {
    console.log('=== STARTING FILM LOAD ===')
    console.log('Supabase client initialized:', !!supabase)
    
    try {
      // First, load films without joins to see if basic queries work
      console.log('Loading films without joins first...')
      
      const { data: features, error: featuresError } = await supabase
        .from('feature_films')
        .select('id, title')
        .order('title')

      console.log('Features basic result:', {
        count: features?.length || 0,
        hasError: !!featuresError,
        error: featuresError
      })

      const { data: shorts, error: shortsError } = await supabase
        .from('short_films')
        .select('id, title')
        .order('title')

      console.log('Shorts basic result:', {
        count: shorts?.length || 0,
        hasError: !!shortsError,
        error: shortsError
      })

      const { data: programs, error: programsError } = await supabase
        .from('programs')
        .select('id, title')
        .order('title')

      console.log('Programs basic result:', {
        count: programs?.length || 0,
        hasError: !!programsError,
        error: programsError
      })

      // Now load screener access data separately
      console.log('Loading screener access data...')
      const { data: screenerAccess, error: accessError } = await supabase
        .from('screener_access')
        .select('film_id, access_type')

      console.log('Screener access result:', {
        count: screenerAccess?.length || 0,
        hasError: !!accessError,
        error: accessError,
        sampleData: screenerAccess?.slice(0, 3)
      })

      // Create a map of film_id to access_type
      const accessMap = new Map()
      if (screenerAccess) {
        screenerAccess.forEach(access => {
          accessMap.set(access.film_id, access.access_type)
        })
      }

      const allFilms: Film[] = [
        ...(features || []).map(f => ({ 
          ...f, 
          type: 'feature' as const,
          access_type: accessMap.get(f.id) || 'no_links'
        })),
        ...(shorts || []).map(s => ({ 
          ...s, 
          type: 'short' as const,
          access_type: accessMap.get(s.id) || 'no_links'
        })),
        ...(programs || []).map(p => ({ 
          ...p, 
          type: 'program' as const,
          access_type: accessMap.get(p.id) || 'no_links'
        }))
      ]

      console.log('=== FILM LOAD COMPLETE ===')
      console.log('Total films loaded:', allFilms.length)
      console.log('Film breakdown:', {
        features: features?.length || 0,
        shorts: shorts?.length || 0,
        programs: programs?.length || 0
      })
      console.log('Access type breakdown:', {
        link_available: allFilms.filter(f => f.access_type === 'link_available').length,
        request_link: allFilms.filter(f => f.access_type === 'request_link').length,
        no_links: allFilms.filter(f => f.access_type === 'no_links').length,
        other: allFilms.filter(f => !['link_available', 'request_link', 'no_links'].includes(f.access_type || '')).length
      })
      
      // Debug specific films
      const alberta = allFilms.find(f => f.title.includes('Alberta Number One'))
      const afterStorm = allFilms.find(f => f.title.includes('After the Storm'))
      console.log('SPECIFIC FILM DEBUG:', {
        alberta: alberta ? { title: alberta.title, access_type: alberta.access_type } : 'NOT FOUND',
        afterStorm: afterStorm ? { title: afterStorm.title, access_type: afterStorm.access_type } : 'NOT FOUND'
      })
      
      setAvailableFilms(allFilms)
    } catch (error) {
      console.error('=== FILM LOAD FAILED ===')
      console.error('Unexpected error loading films:', error)
    }
  }

  // Filter press suggestions based on input
  useEffect(() => {
    if (formData.requester_name && pressContacts.length > 0) {
      const filtered = pressContacts.filter(contact =>
        contact.name.toLowerCase().includes(formData.requester_name.toLowerCase())
      )
      setFilteredPressSuggestions(filtered)
    } else {
      setFilteredPressSuggestions([])
    }
  }, [formData.requester_name, pressContacts])

  // Filter film suggestions based on search and request type
  useEffect(() => {
    console.log('=== FILM FILTERING ===')
    console.log('Filter inputs:', { 
      filmSearchTerm, 
      availableFilmsCount: availableFilms.length, 
      requestType: formData.request_type,
      selectedFilmsCount: selectedFilms.length
    })
    
    if (filmSearchTerm && availableFilms.length > 0) {
      console.log('Applying filters...')
      
      // Basic text and exclusion filtering
      let filtered = availableFilms.filter(film =>
        film.title.toLowerCase().includes(filmSearchTerm.toLowerCase()) &&
        !selectedFilms.some(selected => selected.id === film.id)
      )
      
      console.log('After text + exclusion filtering:', filtered.length)
      
      // Filter based on request type
      if (formData.request_type === 'screener_link') {
        // Only show films with link_available or request_link access (exclude no_links)
        const beforeAccessFilter = filtered.length
        filtered = filtered.filter(film => 
          film.access_type === 'link_available' || film.access_type === 'request_link'
        )
        console.log('Screener link request - filtered out no_links films:', {
          before: beforeAccessFilter,
          after: filtered.length,
          excluded: beforeAccessFilter - filtered.length
        })
      } else if (formData.request_type === 'screening_ticket') {
        console.log('Screening ticket request - showing all films')
      }
      
      setFilteredFilmSuggestions(filtered)
      console.log('=== FILTERING COMPLETE ===')
      console.log('Final filtered suggestions:', filtered.length)
      console.log('Sample filtered films:', filtered.slice(0, 3).map(f => f.title))
    } else {
      console.log('No search term or no films available')
      setFilteredFilmSuggestions([])
    }
  }, [filmSearchTerm, availableFilms, selectedFilms, formData.request_type])

  const handlePressSelection = (contact: PressContact) => {
    setFormData({
      ...formData,
      requester_name: contact.name,
      requester_outlet: contact.media_outlet,
      requester_email: contact.email
    })
    setShowPressSuggestions(false)
  }

  const handleFilmSelection = (film: Film) => {
    setSelectedFilms([...selectedFilms, film])
    setFilmSearchTerm('')
    setShowFilmSuggestions(false)
    
    // Load screenings if this is a ticket request and only one film is selected
    if (formData.request_type === 'screening_ticket' && selectedFilms.length === 0) {
      loadScreeningsForFilm(film.title)
    }
  }

  const removeFilm = (filmId: string) => {
    const newSelectedFilms = selectedFilms.filter(f => f.id !== filmId)
    setSelectedFilms(newSelectedFilms)
    
    // Clear screenings if no films selected or if this was the film we loaded screenings for
    if (newSelectedFilms.length === 0 || formData.request_type === 'screening_ticket') {
      setAvailableScreenings([])
      setSelectedScreening(null)
      
      // If there's still one film selected for ticket requests, load its screenings
      if (formData.request_type === 'screening_ticket' && newSelectedFilms.length === 1) {
        loadScreeningsForFilm(newSelectedFilms[0].title)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedFilms.length === 0) {
      alert('Please select at least one film')
      return
    }
    
    // For ticket requests with multiple films, require screening selection
    if (formData.request_type === 'screening_ticket' && selectedFilms.length > 1) {
      alert('For screening ticket requests, please select only one film at a time')
      return
    }
    
    if (formData.request_type === 'screening_ticket' && !selectedScreening) {
      alert('Please select a screening for the ticket request')
      return
    }
    
    setLoading(true)

    try {
      const requestData = {
        ...formData,
        film_titles: selectedFilms.map(f => f.title).join(', '),
        screening_id: selectedScreening?.id || null,
        screening_type: selectedScreening?.screening_type || null,
        screening_date: selectedScreening?.screening_date || null,
        screening_time: selectedScreening?.start_time || null,
        venue_short_code: selectedScreening?.venue_short_code || null
      }

      if (request) {
        // Update existing request
        const { data, error } = await supabase
          .from('press_requests')
          .update(requestData)
          .eq('id', request.id)
          .select()
          .single()

        if (error) throw error
        onSave(data)
      } else {
        // Create new request
        const { data, error } = await supabase
          .from('press_requests')
          .insert({
            ...requestData,
            created_by: user?.id
          })
          .select()
          .single()

        if (error) throw error
        onSave(data)
      }

      onClose()
    } catch (error) {
      console.error('Error saving press request:', error)
      alert('Error saving request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default',
          maxWidth: '1200px',
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
              {request ? 'Edit Press Request' : 'Add Press Request'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {/* Requester Information */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requester Name *
                </label>
                <input
                  type="text"
                  value={formData.requester_name}
                  onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                  onFocus={() => setShowPressSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPressSuggestions(false), 200)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {showPressSuggestions && filteredPressSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                    {filteredPressSuggestions.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handlePressSelection(contact)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      >
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-gray-500 text-xs">{contact.media_outlet}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outlet *
                </label>
                <input
                  type="text"
                  value={formData.requester_outlet}
                  onChange={(e) => setFormData({ ...formData, requester_outlet: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.requester_email}
                  onChange={(e) => setFormData({ ...formData, requester_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Request Type and Status */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Request Type *
                </label>
                <select
                  value={formData.request_type}
                  onChange={(e) => setFormData({ ...formData, request_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="screener_link">Screener Link</option>
                  <option value="screening_ticket">Screening Ticket</option>
                </select>
              </div>

              {request && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="new">New</option>
                    <option value="requested">Requested</option>
                    <option value="fulfilled">Fulfilled</option>
                  </select>
                </div>
              )}
            </div>

            {/* Screening Selection (for ticket requests) */}
            {formData.request_type === 'screening_ticket' && selectedFilms.length === 1 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Screening *
                </label>
                
                {loadingScreenings ? (
                  <div className="text-sm text-gray-500 py-4">Loading available screenings...</div>
                ) : availableScreenings.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4 border border-gray-200 rounded-md px-3">
                    No screenings found for "{selectedFilms[0]?.title}"
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableScreenings.map((screening) => (
                      <label
                        key={`${screening.screening_type}-${screening.id}`}
                        className="flex items-start space-x-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="selected_screening"
                          checked={selectedScreening?.id === screening.id}
                          onChange={() => setSelectedScreening(screening)}
                          className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(screening.screening_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short', 
                                day: 'numeric'
                              })} at {new Date(`1970-01-01T${screening.start_time}`).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                screening.screening_type === 'published' ? 'bg-green-100 text-green-800' :
                                screening.screening_type === 'pi_jury' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {screening.screening_type === 'published' ? 'Public' :
                                 screening.screening_type === 'pi_jury' ? 'Press & Industry' :
                                 'Tech Check'}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {screening.venue_short_code}
                            {screening.run_time && ` • ${screening.run_time} min`}
                            {screening.capacity && ` • ${screening.capacity} seats`}
                          </div>
                          {screening.notes && (
                            <div className="text-xs text-gray-400 mt-1">{screening.notes}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                
                {formData.request_type === 'screening_ticket' && selectedFilms.length === 1 && !selectedScreening && (
                  <p className="text-sm text-red-600 mt-1">Please select a screening</p>
                )}
              </div>
            )}
            
            {/* Show message for multiple film selection in ticket requests */}
            {formData.request_type === 'screening_ticket' && selectedFilms.length > 1 && (
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  For screening ticket requests, please select only one film at a time to choose a specific screening.
                </p>
              </div>
            )}

            {/* Film Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Films/Programs * (Selected: {selectedFilms.length})
              </label>
              <div className="grid grid-cols-2 gap-4">
                {/* Left: Search and add films */}
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      value={filmSearchTerm}
                      onChange={(e) => {
                        setFilmSearchTerm(e.target.value)
                        setShowFilmSuggestions(true)
                      }}
                      onFocus={() => setShowFilmSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowFilmSuggestions(false), 200)}
                      placeholder="Type to search for films..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {showFilmSuggestions && filteredFilmSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                        {filteredFilmSuggestions.map((film) => (
                          <button
                            key={`${film.type}-${film.id}`}
                            type="button"
                            onClick={() => handleFilmSelection(film)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100"
                          >
                            <div className="font-medium">{film.title}</div>
                            <div className="text-gray-500 text-xs capitalize flex justify-between">
                              <span>{film.type}</span>
                              {formData.request_type === 'screener_link' && film.access_type && (
                                <span className="text-xs text-blue-600">
                                  {film.access_type === 'link_available' ? 'Link Available' : 'Request Link'}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Selected films as tags */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedFilms.map((film) => (
                      <span
                        key={`${film.type}-${film.id}`}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {film.title}
                        <button
                          type="button"
                          onClick={() => removeFilm(film.id)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right: List of selected films */}
                <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Films</h3>
                  {selectedFilms.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No films selected</p>
                  ) : (
                    <ul className="space-y-1 max-h-48 overflow-y-auto">
                      {selectedFilms.map((film, index) => (
                        <li key={`${film.type}-${film.id}`} className="text-sm text-gray-700">
                          {index + 1}. {film.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {selectedFilms.length === 0 && (
                <p className="text-sm text-red-600 mt-1">Please select at least one film</p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end px-6 py-4 bg-gray-50 border-t space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading || selectedFilms.length === 0}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}