'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ContactCard } from '@/types'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { getFestivalYear } from '@/lib/smart-date-parser'

// Film Search Select Component
interface FilmSearchSelectProps {
  films: Film[]
  selectedFilmIds: Set<string>
  onSelectionChange: (selected: Set<string>) => void
}

function FilmSearchSelect({ films, selectedFilmIds, onSelectionChange }: FilmSearchSelectProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredFilms, setFilteredFilms] = useState<Film[]>([])

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = films.filter(film => 
        film.title.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10) // Limit to 10 suggestions
      setFilteredFilms(filtered)
    } else {
      setFilteredFilms([])
    }
  }, [searchTerm, films])

  const handleFilmToggle = (filmId: string) => {
    const newSelected = new Set(selectedFilmIds)
    if (newSelected.has(filmId)) {
      newSelected.delete(filmId)
    } else {
      newSelected.add(filmId)
    }
    onSelectionChange(newSelected)
  }

  const selectedFilms = films.filter(film => selectedFilmIds.has(film.id))

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Type to search films..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {/* Auto-suggestions */}
        {showSuggestions && searchTerm && filteredFilms.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredFilms.map((film) => (
              <button
                key={film.id}
                type="button"
                onClick={() => handleFilmToggle(film.id)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
              >
                <span className="text-sm">{film.title}</span>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    film.film_type === 'feature' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {film.film_type === 'feature' ? 'Feature' : 'Short'}
                  </span>
                  {selectedFilmIds.has(film.id) && (
                    <span className="text-green-600">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Films */}
      {selectedFilms.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">Selected Films:</p>
          <div className="flex flex-wrap gap-2">
            {selectedFilms.map((film) => (
              <span
                key={film.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {film.title}
                <button
                  type="button"
                  onClick={() => handleFilmToggle(film.id)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface ContactFormModalProps {
  contact?: ContactCard | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

interface ContactFormData {
  contact_name: string
  contact_company: string
  contact_email: string
  phone: string
  notes: string
  contact_type: string
  mailing_address: string
}

interface Film {
  id: string
  title: string
  film_type: 'feature' | 'short'
  director?: string
}

export function ContactFormModal({ contact, isOpen, onClose, onSave }: ContactFormModalProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    contact_name: '',
    contact_company: '',
    contact_email: '',
    phone: '',
    notes: '',
    contact_type: '',
    mailing_address: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // Film attachment state
  const [availableFilms, setAvailableFilms] = useState<Film[]>([])
  const [selectedFilmIds, setSelectedFilmIds] = useState<Set<string>>(new Set())
  const [loadingFilms, setLoadingFilms] = useState(false)

  const supabase = createClient()
  const { currentYear } = useFestivalYear()
  const { user } = useAuth()

  // Load available films
  const loadFilms = async () => {
    setLoadingFilms(true)
    try {
      const [featuresResponse, shortsResponse] = await Promise.all([
        supabase.from('feature_films').select('id, title, director').eq('festival_year', currentYear).order('title'),
        supabase.from('short_films').select('id, title, director').eq('festival_year', currentYear).order('title')
      ])

      const allFilms = [
        ...(featuresResponse.data || []).map(f => ({ ...f, film_type: 'feature' as const })),
        ...(shortsResponse.data || []).map(s => ({ ...s, film_type: 'short' as const }))
      ]

      setAvailableFilms(allFilms)
    } catch (error) {
      console.error('Error loading films:', error)
    } finally {
      setLoadingFilms(false)
    }
  }

  // Phone formatting function
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '')
    
    // If it's an international number (starts with + or has more than 10 digits after cleaning)
    if (value.startsWith('+') || cleaned.length > 10) {
      // For international numbers, preserve the + and allow any format
      return value.replace(/[^\d+\-\s\(\)]/g, '')
    }
    
    // For US numbers, apply 123-456-7890 format
    if (cleaned.length <= 10) {
      if (cleaned.length <= 3) {
        return cleaned
      } else if (cleaned.length <= 6) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
      } else {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
      }
    }
    
    // If more than 10 digits but no +, treat as international
    return value.replace(/[^\d+\-\s\(\)]/g, '')
  }

  useEffect(() => {
    if (isOpen) {
      // Load films when modal opens
      loadFilms()

      // Reset form and film selection
      setSelectedFilmIds(new Set())

      if (contact) {
        setFormData({
          contact_name: contact.contact_name || '',
          contact_company: contact.contact_company || '',
          contact_email: contact.contact_email || '',
          phone: contact.phone || '',
          notes: contact.notes || '',
          contact_type: contact.contact_type || '',
          mailing_address: contact.mailing_address || ''
        })

        // Load existing film assignments for this contact
        loadExistingFilmAssignments(contact.id)

      } else {
        setFormData({
          contact_name: '',
          contact_company: '',
          contact_email: '',
          phone: '',
          notes: '',
          contact_type: '',
          mailing_address: ''
        })
      }
    }
  }, [contact, isOpen, currentYear])

  // Load existing film assignments for the contact
  const loadExistingFilmAssignments = async (contactId: string) => {
    try {
      const { data, error } = await supabase
        .from('film_contacts')
        .select('film_id')
        .eq('contact_id', contactId)
        .eq('festival_year', currentYear)

      if (!error && data) {
        const filmIds = new Set(data.map(fc => fc.film_id))
        setSelectedFilmIds(filmIds)
      }
    } catch (error) {
      console.error('Error loading existing film assignments:', error)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

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
  }, [isDragging])

  const handleFieldChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFilmSelection = (filmId: string, checked: boolean) => {
    setSelectedFilmIds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(filmId)
      } else {
        newSet.delete(filmId)
      }
      return newSet
    })
  }

  const handleSave = async () => {
    if (!formData.contact_name.trim()) {
      alert('Contact name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const festivalYear = await getFestivalYear()

      const contactData = {
        contact_name: formData.contact_name.trim(),
        contact_company: formData.contact_company.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        phone: formData.phone.trim() || null,
        notes: formData.notes.trim() || null,
        contact_type: formData.contact_type.trim() || null,
        mailing_address: formData.mailing_address.trim() || null,
        festival_year: parseInt(festivalYear, 10)
      }

      let contactId = contact?.id

      if (contact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', contact.id)

        if (error) {
          console.error('Error updating contact:', error)
          alert(`Error updating contact: ${error.message}`)
          return
        }
      } else {
        // Check if contact already exists by email
        if (contactData.contact_email) {
          const { data: existingContacts } = await supabase
            .from('contacts')
            .select('id')
            .eq('contact_email', contactData.contact_email)
            .eq('festival_year', parseInt(festivalYear, 10))

          if (existingContacts && existingContacts.length > 0) {
            alert('A contact with this email already exists')
            return
          }
        }

        // Create new contact
        const { data, error } = await supabase
          .from('contacts')
          .insert([{ ...contactData, created_by: user?.id }])
          .select('id')

        if (error) {
          console.error('Error creating contact:', error)
          alert(`Error creating contact: ${error.message}`)
          return
        }
        
        contactId = data?.[0]?.id
      }

      // Handle film assignments - delete all existing and insert current selection
      if (contactId) {
        // First, delete all existing film assignments for this contact
        const { error: deleteError } = await supabase
          .from('film_contacts')
          .delete()
          .eq('contact_id', contactId)
          .eq('festival_year', parseInt(festivalYear, 10))

        if (deleteError) {
          console.error('Error deleting existing film assignments:', deleteError)
          alert(`Error updating film assignments: ${deleteError.message}`)
          return
        }

        // Then, insert the currently selected films (if any)
        if (selectedFilmIds.size > 0) {
          const assignments = Array.from(selectedFilmIds).map(filmId => {
            const film = availableFilms.find(f => f.id === filmId)
            return {
              film_id: filmId,
              film_type: film?.film_type || 'feature',
              name: contactData.contact_name,
              company: contactData.contact_company,
              email: contactData.contact_email,
              contact_type: contactData.contact_type || 'Other',
              contact_id: contactId,
              festival_year: parseInt(festivalYear, 10)
            }
          })

          const { error: assignmentError } = await supabase
            .from('film_contacts')
            .insert(assignments)

          if (assignmentError) {
            console.error('Error saving film assignments:', assignmentError)
            alert(`Contact saved but error with film assignments: ${assignmentError.message}`)
          }
        }
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving contact:', error)
      alert('Error saving contact')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const contactTypes = [
    'Distributor/Studio',
    'Production Team',
    'Publicity',
    'Sales Agent',
    'Filmmaker',
    'Producer',
    'Director',
    'Print Traffic',
    'Festival',
    'Other'
  ]

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl pointer-events-auto relative"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        <div 
          className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg cursor-grab active:cursor-grabbing flex justify-between items-center"
          onMouseDown={handleMouseDown}
        >
          <h2 className="text-xl font-semibold text-gray-900">
            {contact ? 'Edit Contact' : 'Add Contact'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => handleFieldChange('contact_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={formData.contact_company}
                onChange={(e) => handleFieldChange('contact_company', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleFieldChange('contact_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', formatPhoneNumber(e.target.value))}
                placeholder="123-456-7890 or +1-234-567-8900"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.contact_type}
                onChange={(e) => handleFieldChange('contact_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type...</option>
                {contactTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mailing Address</label>
              <textarea
                value={formData.mailing_address}
                onChange={(e) => handleFieldChange('mailing_address', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Film Attachment Section */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attach to Films</h3>
            
            {/* Film Search and Selection */}
            {loadingFilms ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading films...</p>
              </div>
            ) : availableFilms.length > 0 ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search and Select Films ({selectedFilmIds.size} selected)
                </label>
                <FilmSearchSelect
                  films={availableFilms}
                  selectedFilmIds={selectedFilmIds}
                  onSelectionChange={setSelectedFilmIds}
                />
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No films available
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting || !formData.contact_name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Contact'}
          </button>
        </div>
      </div>
    </div>
  )
}