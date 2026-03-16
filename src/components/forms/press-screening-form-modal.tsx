'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { getFestivalYear } from '@/lib/smart-date-parser'
import { PressScreeningCard, VenueCard, TheaterHouse } from '@/types'
import { normalizeDateValue } from '@/lib/date-utils'

interface PressScreeningFormModalProps {
  screening: PressScreeningCard | null
  isOpen: boolean
  onClose: () => void
  onSave: (screening: PressScreeningCard) => void
}

interface FilmOption {
  id: string
  title: string
  type: 'feature' | 'short'
  runtime?: number
}

export function PressScreeningFormModal({ screening, isOpen, onClose, onSave }: PressScreeningFormModalProps) {
  const { user } = useAuth()
  const { currentYear } = useFestivalYear()
  const [formData, setFormData] = useState({
    film_id: '',
    film_type: 'feature' as 'feature' | 'short',
    title: '',
    runtime: '',
    screening_date: '',
    screening_time: '',
    short_code: '',
    film_approved: false,
    locked: false,
    invites_out: false,
    canceled: false,
    staffer: '',
    notes: '',
    rsvp_form_url: '',
    rsvp_responses_url: ''
  })
  const [loading, setLoading] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [films, setFilms] = useState<FilmOption[]>([])
  const [venueShortCodes, setVenueShortCodes] = useState<string[]>([])
  const [size, setSize] = useState({ width: 600, height: 700 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [filmSearch, setFilmSearch] = useState('')
  const [showFilmDropdown, setShowFilmDropdown] = useState(false)
  const [shortCodeSearch, setShortCodeSearch] = useState('')
  const [showShortCodeDropdown, setShowShortCodeDropdown] = useState(false)

  const supabase = createClient()

  // Load films and venue short codes
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load feature films only (as specified for press screenings)
        const { data: featureFilms, error: filmsError } = await supabase
          .from('feature_films')
          .select('id, title, run_time')
          .eq('festival_year', currentYear)
          .order('title')

        if (filmsError) {
          console.error('Error loading feature films:', filmsError)
        }

        // Only feature films for press screenings
        const allFilms: FilmOption[] = (featureFilms || []).map(film => ({
          ...film,
          runtime: film.run_time,
          type: 'feature' as const
        }))

        setFilms(allFilms)

        // Load venue short codes
        const { data: shortCodesData, error: shortCodesError } = await supabase
          .from('theater_houses')
          .select('short_code')
          .not('short_code', 'is', null)
          .order('short_code')

        if (shortCodesError) {
          console.error('Error loading venue short codes:', shortCodesError)
          setVenueShortCodes([])
        } else {
          const shortCodes = [...new Set((shortCodesData || []).map(item => item.short_code).filter(Boolean))]
          console.log('Loaded venue short codes:', shortCodes.length, shortCodes)
          setVenueShortCodes(shortCodes)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    if (isOpen) {
      loadData()
    }
  }, [isOpen, supabase, currentYear])

  // Filter films based on search with better matching
  const filteredFilms = filmSearch
    ? films.filter(film => {
        const searchLower = filmSearch.toLowerCase().trim()
        const titleLower = film.title.toLowerCase().trim()

        return titleLower.includes(searchLower) ||
               titleLower.startsWith(searchLower) ||
               titleLower.replace(/[^\w\s]/g, '').includes(searchLower.replace(/[^\w\s]/g, ''))
      })
    : films.slice(0, 10)

  // Initialize form when screening changes
  useEffect(() => {
    if (screening) {
      setFormData({
        film_id: screening.film_id,
        film_type: screening.film_type,
        title: screening.film_title,
        runtime: screening.run_time?.toString() || '',
        screening_date: screening.screening_date || '',
        screening_time: screening.screening_time || '',
        short_code: screening.short_code || '',
        film_approved: screening.film_approved,
        locked: screening.locked,
        invites_out: screening.invites_out,
        canceled: screening.canceled,
        staffer: screening.staffer || '',
        notes: screening.notes || '',
        rsvp_form_url: screening.rsvp_form_url || '',
        rsvp_responses_url: screening.rsvp_responses_url || ''
      })
      setFilmSearch(screening.film_title)
      setShortCodeSearch(screening.short_code || '')
    } else {
      setFormData({
        film_id: '',
        film_type: 'feature',
        title: '',
        runtime: '',
        screening_date: '',
        screening_time: '',
        short_code: '',
        film_approved: false,
        locked: false,
        invites_out: false,
        canceled: false,
        staffer: '',
        notes: '',
        rsvp_form_url: '',
        rsvp_responses_url: ''
      })
      setFilmSearch('')
      setShortCodeSearch('')
    }
  }, [screening])

  // Handle film selection
  const handleFilmChange = (filmId: string) => {
    const selectedFilm = films.find(f => f.id === filmId)
    if (selectedFilm) {
      setFormData(prev => ({
        ...prev,
        film_id: filmId,
        film_type: selectedFilm.type,
        title: selectedFilm.title,
        runtime: selectedFilm.runtime?.toString() || ''
      }))
      setFilmSearch(selectedFilm.title)
      setShowFilmDropdown(false)
    }
  }

  // Filter short codes based on search
  const filteredShortCodes = shortCodeSearch
    ? venueShortCodes.filter(code => 
        code.toLowerCase().includes(shortCodeSearch.toLowerCase())
      )
    : venueShortCodes.slice(0, 10) // Show first 10 if no search term

  // Handle short code selection
  const handleShortCodeChange = (shortCode: string) => {
    setFormData(prev => ({
      ...prev,
      short_code: shortCode
    }))
    setShortCodeSearch(shortCode)
    setShowShortCodeDropdown(false)
  }

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
    if (isResizing) {
      const newWidth = Math.max(400, resizeStart.width + (e.clientX - resizeStart.x))
      const newHeight = Math.max(500, resizeStart.height + (e.clientY - resizeStart.y))
      setSize({ width: newWidth, height: newHeight })
    }
  }, [isDragging, isResizing, dragStart.x, dragStart.y, resizeStart])

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    })
  }

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, handleMouseMove])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.film-search-container')) {
        setShowFilmDropdown(false)
      }
      if (!target.closest('.short-code-container')) {
        setShowShortCodeDropdown(false)
      }
    }

    if (showFilmDropdown || showShortCodeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilmDropdown, showShortCodeDropdown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.film_id || !formData.title) {
      alert('Please select a film')
      return
    }

    setLoading(true)
    try {
      const festivalYear = await getFestivalYear()
      const screeningData = {
        film_id: formData.film_id,
        film_type: formData.film_type,
        screening_date: normalizeDateValue(formData.screening_date) || null,
        screening_time: formData.screening_time || null,
        short_code: formData.short_code || null,
        film_approved: formData.film_approved,
        locked: formData.locked,
        invites_out: formData.invites_out,
        canceled: formData.canceled,
        staffer: formData.staffer || null,
        notes: formData.notes || null,
        rsvp_form_url: formData.rsvp_form_url || null,
        rsvp_responses_url: formData.rsvp_responses_url || null,
        festival_year: parseInt(festivalYear, 10),
      }

      if (screening) {
        // Update existing screening
        const { data, error } = await supabase
          .from('press_screenings')
          .update(screeningData)
          .eq('id', screening.id)
          .select()
          .single()

        if (error) throw error
        onSave(data)
      } else {
        // Create new screening
        const { data, error } = await supabase
          .from('press_screenings')
          .insert({ ...screeningData, created_by: user?.id })
          .select()
          .single()

        if (error) throw error
        onSave(data)
      }
    } catch (error) {
      console.error('Error saving screening:', error)
      alert('Error saving screening')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyInvite = () => {
    if (formData.rsvp_form_url) {
      navigator.clipboard.writeText(formData.rsvp_form_url)
      alert('RSVP form URL copied to clipboard!')
    }
  }

  const handleViewRSVPs = () => {
    if (formData.rsvp_responses_url) {
      window.open(formData.rsvp_responses_url, '_blank')
    }
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
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Draggable Header */}
        <div 
          className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <h1 className="text-lg font-semibold text-gray-900">
            {screening ? 'Edit Press Screening' : 'Add Press Screening'}
          </h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 space-y-6">
            {/* Film Selection */}
            <div className="relative film-search-container">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Film Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={filmSearch}
                onChange={(e) => {
                  setFilmSearch(e.target.value)
                  setShowFilmDropdown(true)
                  if (!e.target.value) {
                    setFormData(prev => ({
                      ...prev,
                      film_id: '',
                      title: '',
                      runtime: ''
                    }))
                  }
                }}
                onFocus={() => setShowFilmDropdown(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search for a film..."
                required
              />
              {showFilmDropdown && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                  {filteredFilms.length > 0 ? filteredFilms.slice(0, 10).map(film => (
                    <button
                      key={film.id}
                      type="button"
                      onClick={() => handleFilmChange(film.id)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium">{film.title}</div>
                      {film.runtime && (
                        <div className="text-sm text-gray-500">{film.runtime} minutes</div>
                      )}
                    </button>
                  )) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No films found matching "{filmSearch}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Runtime (auto-filled, read-only) */}
            {formData.runtime && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Runtime
                </label>
                <input
                  type="text"
                  value={`${formData.runtime} minutes`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  readOnly
                />
              </div>
            )}

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Screening Date
                </label>
                <input
                  type="date"
                  value={formData.screening_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, screening_date: e.target.value }))}
                  onBlur={(e) => {
                    const normalized = normalizeDateValue(e.target.value)
                    if (normalized !== e.target.value) {
                      setFormData(prev => ({ ...prev, screening_date: normalized }))
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Screening Time
                </label>
                <input
                  type="time"
                  value={formData.screening_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, screening_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Venue Short Code */}
            <div className="relative short-code-container">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue Short Code
              </label>
              <input
                type="text"
                value={shortCodeSearch}
                onChange={(e) => {
                  setShortCodeSearch(e.target.value)
                  setShowShortCodeDropdown(true)
                  setFormData(prev => ({ ...prev, short_code: e.target.value }))
                }}
                onFocus={() => setShowShortCodeDropdown(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Type venue short code (e.g., AMC 1, Music Box A)..."
              />
              {showShortCodeDropdown && filteredShortCodes.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                  {filteredShortCodes.map(code => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleShortCodeChange(code)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Checkboxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Status</label>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="film_approved"
                    checked={formData.film_approved}
                    onChange={(e) => setFormData(prev => ({ ...prev, film_approved: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="film_approved" className="ml-2 text-sm text-gray-700">
                    Film Approved
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="locked"
                    checked={formData.locked}
                    onChange={(e) => setFormData(prev => ({ ...prev, locked: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="locked" className="ml-2 text-sm text-gray-700">
                    Locked
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="invites_out"
                    checked={formData.invites_out}
                    onChange={(e) => setFormData(prev => ({ ...prev, invites_out: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="invites_out" className="ml-2 text-sm text-gray-700">
                    Invites Out
                  </label>
                </div>
              </div>
            </div>

            {/* Staffer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Staffer
              </label>
              <input
                type="text"
                value={formData.staffer}
                onChange={(e) => setFormData(prev => ({ ...prev, staffer: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter staffer name..."
              />
            </div>

            {/* RSVP Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">RSVP Management</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RSVP Form URL (Google Form - Responder View)
                  </label>
                  <input
                    type="url"
                    value={formData.rsvp_form_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, rsvp_form_url: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://forms.gle/..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RSVP Responses URL (Google Form - Backend View)
                  </label>
                  <input
                    type="url"
                    value={formData.rsvp_responses_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, rsvp_responses_url: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://docs.google.com/forms/..."
                  />
                </div>

                {/* RSVP Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleCopyInvite}
                    disabled={!formData.rsvp_form_url}
                    className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Copy Invite
                  </button>
                  <button
                    type="button"
                    onClick={handleViewRSVPs}
                    disabled={!formData.rsvp_responses_url}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    View RSVPs
                  </button>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter notes..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400"
            >
              {loading ? 'Saving...' : (screening ? 'Update Screening' : 'Add Screening')}
            </button>
          </div>
        </form>

        {/* Resize Handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 hover:bg-gray-400"
          onMouseDown={handleResizeStart}
          style={{
            clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)'
          }}
        />
      </div>
    </div>
  )
}