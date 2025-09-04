'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { InterviewCard, InterviewStatus, PressCard, GuestCard } from '@/types'
import { normalizeDateValue } from '@/lib/date-utils'

interface InterviewFormModalProps {
  interview: InterviewCard | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

interface FilmOption {
  id: string
  title: string
  type: 'feature' | 'short' | 'program'
}

export function InterviewFormModal({ interview, isOpen, onClose, onSave }: InterviewFormModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    film_id: '',
    shorts_program_id: '',
    program_id: '',
    film_title: '',
    press_id: '',
    journalist_name: '',
    outlet: '',
    email: '',
    subject_names: '',
    subject_guest_ids: [] as string[],
    status: 'TBD' as InterviewStatus,
    interview_date: '',
    interview_time: '',
    location: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ width: 600, height: 700 })
  
  // Data for dropdowns
  const [films, setFilms] = useState<FilmOption[]>([])
  const [pressOptions, setPressOptions] = useState<PressCard[]>([])
  const [guestOptions, setGuestOptions] = useState<GuestCard[]>([])
  
  // Search states
  const [filmSearch, setFilmSearch] = useState('')
  const [journalistSearch, setJournalistSearch] = useState('')
  const [subjectSearch, setSubjectSearch] = useState('')
  const [showFilmDropdown, setShowFilmDropdown] = useState(false)
  const [showJournalistDropdown, setShowJournalistDropdown] = useState(false)
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false)
  
  // Multiple films selection
  const [selectedFilms, setSelectedFilms] = useState<string[]>([])

  const supabase = createClient()

  // Load dropdown data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load feature films
        const { data: featureFilms, error: featureError } = await supabase
          .from('feature_films')
          .select('id, title')
          .order('title')

        // Load shorts programs
        const { data: shortsPrograms, error: shortsError } = await supabase
          .from('shorts_programs')
          .select('id, program_name')
          .order('program_name')

        // Load programs
        const { data: programs, error: programsError } = await supabase
          .from('programs')
          .select('id, title')
          .order('title')

        // Load press cards
        const { data: press, error: pressError } = await supabase
          .from('press')
          .select('id, name, media_outlet, email')
          .order('name')

        // Load guest cards
        const { data: guests, error: guestsError } = await supabase
          .from('guests')
          .select('id, name')
          .order('name')

        // Combine all films/programs
        const allFilms: FilmOption[] = [
          ...(featureFilms || []).map(film => ({ 
            id: film.id, 
            title: film.title, 
            type: 'feature' as const 
          })),
          ...(shortsPrograms || []).map(program => ({ 
            id: program.id, 
            title: program.program_name, 
            type: 'short' as const
          })),
          ...(programs || []).map(program => ({ 
            id: program.id, 
            title: program.title, 
            type: 'program' as const
          }))
        ]

        setFilms(allFilms)
        setPressOptions(press || [])
        setGuestOptions(guests || [])
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    if (isOpen) {
      loadData()
    }
  }, [isOpen, supabase])

  // Initialize form data when interview changes
  useEffect(() => {
    if (interview) {
      setFormData({
        film_id: interview.film_id || '',
        shorts_program_id: interview.shorts_program_id || '',
        program_id: interview.program_id || '',
        film_title: interview.film_title || '',
        press_id: interview.press_id || '',
        journalist_name: interview.journalist_name || '',
        outlet: interview.outlet || '',
        email: interview.email || '',
        subject_names: interview.subject_names || '',
        subject_guest_ids: interview.subject_guest_ids || [],
        status: interview.status,
        interview_date: interview.interview_date || '',
        interview_time: interview.interview_time || '',
        location: interview.location || '',
        notes: interview.notes || ''
      })
      setFilmSearch(interview.film_title || '')
      setJournalistSearch(interview.journalist_name || '')
      setSubjectSearch(interview.subject_names || '')
      // Initialize selectedFilms from comma-separated film_title
      const titles = interview.film_title ? interview.film_title.split(',').map(t => t.trim()).filter(t => t) : []
      setSelectedFilms(titles)
    } else {
      setFormData({
        film_id: '',
        shorts_program_id: '',
        program_id: '',
        film_title: '',
        press_id: '',
        journalist_name: '',
        outlet: '',
        email: '',
        subject_names: '',
        subject_guest_ids: [],
        status: 'TBD',
        interview_date: '',
        interview_time: '',
        location: '',
        notes: ''
      })
      setFilmSearch('')
      setJournalistSearch('')
      setSubjectSearch('')
      setSelectedFilms([])
    }
  }, [interview])

  // Mouse event handlers for dragging
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
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

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

  // Film selection handlers
  const handleFilmSelect = (film: FilmOption) => {
    // Add to selected films if not already there
    if (!selectedFilms.includes(film.title)) {
      const newFilms = [...selectedFilms, film.title]
      setSelectedFilms(newFilms)
      
      // Update form data with comma-separated titles
      setFormData(prev => ({
        ...prev,
        // Clear individual IDs when multiple films selected
        film_id: newFilms.length > 1 ? '' : (film.type === 'feature' ? film.id : ''),
        shorts_program_id: newFilms.length > 1 ? '' : (film.type === 'short' ? film.id : ''),
        program_id: newFilms.length > 1 ? '' : (film.type === 'program' ? film.id : ''),
        film_title: newFilms.join(', ')
      }))
    }
    setFilmSearch('')
    setShowFilmDropdown(false)
  }
  
  // Remove film from selection
  const handleRemoveFilm = (title: string) => {
    const newFilms = selectedFilms.filter(t => t !== title)
    setSelectedFilms(newFilms)
    
    setFormData(prev => ({
      ...prev,
      film_id: '',
      shorts_program_id: '',
      program_id: '',
      film_title: newFilms.join(', ')
    }))
  }

  // Journalist selection handlers
  const handleJournalistSelect = (press: PressCard) => {
    setFormData(prev => ({
      ...prev,
      press_id: press.id,
      journalist_name: press.name,
      outlet: press.media_outlet,
      email: press.email
    }))
    setJournalistSearch(press.name)
    setShowJournalistDropdown(false)
  }

  // Subject selection handlers
  const handleSubjectSelect = (guest: GuestCard) => {
    setFormData(prev => ({
      ...prev,
      subject_names: guest.name,
      subject_guest_ids: [guest.id]
    }))
    setSubjectSearch(guest.name)
    setShowSubjectDropdown(false)
  }

  // Clear linked press data when typing manually
  const handleJournalistNameChange = (value: string) => {
    setJournalistSearch(value)
    setFormData(prev => ({
      ...prev,
      journalist_name: value,
      press_id: '' // Clear link when typing manually
    }))
  }

  // Handle form input changes
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.film_title) {
      alert('Please select a film or program')
      return
    }

    setLoading(true)
    try {
      const interviewData = {
        film_id: formData.film_id || null,
        shorts_program_id: formData.shorts_program_id || null,
        program_id: formData.program_id || null,
        film_title: formData.film_title,
        press_id: formData.press_id || null,
        journalist_name: formData.journalist_name || null,
        outlet: formData.outlet || null,
        email: formData.email || null,
        subject_names: formData.subject_names || null,
        subject_guest_ids: formData.subject_guest_ids.length > 0 ? formData.subject_guest_ids : null,
        status: formData.status,
        interview_date: normalizeDateValue(formData.interview_date) || null,
        interview_time: formData.interview_time || null,
        location: formData.location || null,
        notes: formData.notes || null,
        created_by: user?.id
      }

      if (interview) {
        // Update existing interview
        const { error } = await supabase
          .from('interviews')
          .update(interviewData)
          .eq('id', interview.id)

        if (error) throw error
      } else {
        // Create new interview
        const { error } = await supabase
          .from('interviews')
          .insert(interviewData)

        if (error) throw error
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving interview:', error)
      alert('Error saving interview')
    } finally {
      setLoading(false)
    }
  }

  // Filter functions for dropdowns
  const filteredFilms = films.filter(film =>
    film.title.toLowerCase().includes(filmSearch.toLowerCase())
  )

  const filteredPress = pressOptions.filter(press =>
    press.name.toLowerCase().includes(journalistSearch.toLowerCase())
  )

  const filteredGuests = guestOptions.filter(guest =>
    guest.name.toLowerCase().includes(subjectSearch.toLowerCase())
  )

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
          cursor: isDragging ? 'grabbing' : 'default'
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
          {/* Film/Program Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title(s) <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">Select multiple films if needed</span>
            </label>
            
            {/* Selected Films Display */}
            {selectedFilms.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedFilms.map((title) => (
                  <span 
                    key={title}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {title}
                    <button
                      type="button"
                      onClick={() => handleRemoveFilm(title)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            <div className="relative">
              <input
                type="text"
                value={filmSearch}
                onChange={(e) => {
                  setFilmSearch(e.target.value)
                  setShowFilmDropdown(true)
                }}
                onFocus={() => setShowFilmDropdown(true)}
                placeholder="Search films and programs to add..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={selectedFilms.length === 0}
              />
              {showFilmDropdown && filteredFilms.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredFilms.map((film) => (
                    <button
                      key={`${film.type}-${film.id}`}
                      type="button"
                      onClick={() => handleFilmSelect(film)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      <span className="font-medium">{film.title}</span>
                      <span className="text-gray-500 ml-2">({film.type})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Journalist Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Journalist
            </label>
            <div className="relative">
              <input
                type="text"
                value={journalistSearch}
                onChange={(e) => handleJournalistNameChange(e.target.value)}
                onFocus={() => setShowJournalistDropdown(true)}
                placeholder="Search journalists or enter name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
            {/* Outlet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Outlet
              </label>
              <input
                type="text"
                value={formData.outlet}
                onChange={(e) => handleInputChange('outlet', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Subject Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject(s)
            </label>
            <div className="relative">
              <input
                type="text"
                value={subjectSearch}
                onChange={(e) => {
                  setSubjectSearch(e.target.value)
                  setFormData(prev => ({ ...prev, subject_names: e.target.value }))
                  setShowSubjectDropdown(true)
                }}
                onFocus={() => setShowSubjectDropdown(true)}
                placeholder="Search guests or enter names..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showSubjectDropdown && filteredGuests.length > 0 && subjectSearch && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredGuests.map((guest) => (
                    <button
                      key={guest.id}
                      type="button"
                      onClick={() => handleSubjectSelect(guest)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      {guest.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TBD">TBD</option>
              <option value="Pitching">Pitching</option>
              <option value="Subject Pending">Subject Pending</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Complete">Complete</option>
              <option value="Declined">Declined</option>
            </select>
          </div>

          {/* Scheduled Details - only show when status is Scheduled */}
          {formData.status === 'Scheduled' && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Interview Details</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.interview_date}
                    onChange={(e) => handleInputChange('interview_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={formData.interview_time}
                    onChange={(e) => handleInputChange('interview_time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Phone, Zoom link, or physical location..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
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
              {loading ? 'Saving...' : interview ? 'Update Interview' : 'Add Interview'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}