'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'

interface Contact {
  id: string
  company: string | null
  contact_name: string
  email: string | null
  phone: string | null
  notes: string | null
  contact_type: string | null
}

interface ContactPair {
  company: string
  contact_name: string
  email: string
  phone: string
  role: string
  notes: string
  isExisting: boolean
  existingContactId?: string
}

interface ProgrammingFilm {
  id: string
  film_title: string
  original_title: string | null
  director: string | null
  country: string | null
  category: string | null
  travel_status: string | null
  travel_notes: string | null
  synopsis_writer: string | null
  synopsis_approved: boolean
  synopsis_notes: string | null
  materials_received: boolean
  materials_notes: string | null
  color_highlight: string | null
  programming_notes: string | null
  priority_level: string | null
  status: string
  contacts: Array<{
    contact: Contact
    role: string | null
  }>
}

interface ProgrammingFilmFormModalProps {
  film: ProgrammingFilm | null
  isOpen: boolean
  onClose: () => void
  onSave: (film: ProgrammingFilm) => void
}

export function ProgrammingFilmFormModal({ film, isOpen, onClose, onSave }: ProgrammingFilmFormModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [existingContacts, setExistingContacts] = useState<Contact[]>([])

  const [formData, setFormData] = useState({
    film_title: '',
    original_title: '',
    director: '',
    country: '',
    category: 'feature',
    travel_status: '',
    travel_notes: '',
    synopsis_writer: '',
    synopsis_approved: false,
    synopsis_notes: '',
    materials_received: false,
    materials_notes: '',
    color_highlight: '',
    programming_notes: '',
    priority_level: 'medium',
    status: 'draft',
    contacts: [
      {
        company: '',
        contact_name: '',
        email: '',
        phone: '',
        role: '',
        notes: '',
        isExisting: false,
        existingContactId: undefined
      }
    ] as ContactPair[]
  })

  const supabase = createClient()

  // Load existing contacts for autocomplete
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .order('contact_name')

        if (error) throw error
        setExistingContacts(data || [])
      } catch (error) {
        console.error('Error loading contacts:', error)
      }
    }

    if (isOpen) {
      loadContacts()
    }
  }, [isOpen, supabase])

  // Set form data when film prop changes
  useEffect(() => {
    if (film) {
      setFormData({
        film_title: film.film_title || '',
        original_title: film.original_title || '',
        director: film.director || '',
        country: film.country || '',
        category: film.category || 'feature',
        travel_status: film.travel_status || '',
        travel_notes: film.travel_notes || '',
        synopsis_writer: film.synopsis_writer || '',
        synopsis_approved: film.synopsis_approved || false,
        synopsis_notes: film.synopsis_notes || '',
        materials_received: film.materials_received || false,
        materials_notes: film.materials_notes || '',
        color_highlight: film.color_highlight || '',
        programming_notes: film.programming_notes || '',
        priority_level: film.priority_level || 'medium',
        status: film.status || 'draft',
        contacts: film.contacts.length > 0 
          ? film.contacts.map(c => ({
              company: c.contact.company || '',
              contact_name: c.contact.contact_name || '',
              email: c.contact.email || '',
              phone: c.contact.phone || '',
              role: c.role || '',
              notes: '',
              isExisting: true,
              existingContactId: c.contact.id
            }))
          : [{
              company: '',
              contact_name: '',
              email: '',
              phone: '',
              role: '',
              notes: '',
              isExisting: false,
              existingContactId: undefined
            }]
      })
    } else {
      setFormData({
        film_title: '',
        original_title: '',
        director: '',
        country: '',
        category: 'feature',
        travel_status: '',
        travel_notes: '',
        synopsis_writer: '',
        synopsis_approved: false,
        synopsis_notes: '',
        materials_received: false,
        materials_notes: '',
        color_highlight: '',
        programming_notes: '',
        priority_level: 'medium',
        status: 'draft',
        contacts: [{
          company: '',
          contact_name: '',
          email: '',
          phone: '',
          role: '',
          notes: '',
          isExisting: false,
          existingContactId: undefined
        }]
      })
    }
  }, [film])

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

  const addContactPair = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, {
        company: '',
        contact_name: '',
        email: '',
        phone: '',
        role: '',
        notes: '',
        isExisting: false,
        existingContactId: undefined
      }]
    }))
  }

  const removeContactPair = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }))
  }

  const updateContactPair = (index: number, field: keyof ContactPair, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }))
  }

  // Handle contact autocomplete selection
  const handleContactSelect = (index: number, selectedContact: Contact) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? {
          ...contact,
          company: selectedContact.company || '',
          contact_name: selectedContact.contact_name,
          email: selectedContact.email || '',
          phone: selectedContact.phone || '',
          isExisting: true,
          existingContactId: selectedContact.id
        } : contact
      )
    }))
  }

  const getFilteredContacts = (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return []
    
    const search = searchTerm.toLowerCase()
    return existingContacts.filter(contact => 
      contact.contact_name.toLowerCase().includes(search) ||
      (contact.company && contact.company.toLowerCase().includes(search)) ||
      (contact.email && contact.email.toLowerCase().includes(search))
    ).slice(0, 5)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.film_title.trim()) {
      alert('Film title is required')
      return
    }

    setLoading(true)

    try {
      let filmId: string

      if (film) {
        // Update existing film
        const { error: filmError } = await supabase
          .from('programming_films')
          .update({
            film_title: formData.film_title.trim(),
            original_title: formData.original_title.trim() || null,
            director: formData.director.trim() || null,
            country: formData.country.trim() || null,
            category: formData.category,
            travel_status: formData.travel_status.trim() || null,
            travel_notes: formData.travel_notes.trim() || null,
            synopsis_writer: formData.synopsis_writer.trim() || null,
            synopsis_approved: formData.synopsis_approved,
            synopsis_notes: formData.synopsis_notes.trim() || null,
            materials_received: formData.materials_received,
            materials_notes: formData.materials_notes.trim() || null,
            color_highlight: formData.color_highlight.trim() || null,
            programming_notes: formData.programming_notes.trim() || null,
            priority_level: formData.priority_level,
            status: formData.status
          })
          .eq('id', film.id)

        if (filmError) throw filmError
        filmId = film.id
      } else {
        // Create new film
        const { data: newFilm, error: filmError } = await supabase
          .from('programming_films')
          .insert({
            film_title: formData.film_title.trim(),
            original_title: formData.original_title.trim() || null,
            director: formData.director.trim() || null,
            country: formData.country.trim() || null,
            category: formData.category,
            travel_status: formData.travel_status.trim() || null,
            travel_notes: formData.travel_notes.trim() || null,
            synopsis_writer: formData.synopsis_writer.trim() || null,
            synopsis_approved: formData.synopsis_approved,
            synopsis_notes: formData.synopsis_notes.trim() || null,
            materials_received: formData.materials_received,
            materials_notes: formData.materials_notes.trim() || null,
            color_highlight: formData.color_highlight.trim() || null,
            programming_notes: formData.programming_notes.trim() || null,
            priority_level: formData.priority_level,
            status: formData.status,
            created_by: user?.id
          })
          .select()
          .single()

        if (filmError) throw filmError
        filmId = newFilm.id
      }

      // Handle contacts
      if (film) {
        // Delete existing film-contact relationships
        await supabase
          .from('programming_film_contacts')
          .delete()
          .eq('programming_film_id', filmId)
      }

      // Process contacts
      for (const contactData of formData.contacts) {
        if (!contactData.contact_name.trim()) continue

        let contactId: string

        if (contactData.isExisting && contactData.existingContactId) {
          // Use existing contact
          contactId = contactData.existingContactId
        } else {
          // Create new contact
          const { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              company: contactData.company.trim() || null,
              contact_name: contactData.contact_name.trim(),
              email: contactData.email.trim() || null,
              phone: contactData.phone.trim() || null,
              notes: contactData.notes.trim() || null,
              created_by: user?.id
            })
            .select()
            .single()

          if (contactError) throw contactError
          contactId = newContact.id
        }

        // Create film-contact relationship
        await supabase
          .from('programming_film_contacts')
          .insert({
            programming_film_id: filmId,
            contact_id: contactId,
            role: contactData.role.trim() || null,
            created_by: user?.id
          })
      }

      // Refresh page to show updated data
      window.location.reload()
      
      onClose()
    } catch (error) {
      console.error('Error saving programming film:', error)
      alert('Error saving film. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed bg-white rounded-lg shadow-2xl border border-gray-300 z-50 max-w-4xl w-[90vw] max-h-[90vh] overflow-hidden"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Draggable Header */}
        <div 
          className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <h1 className="text-lg font-semibold text-gray-900">
            {film ? 'Edit Programming Film' : 'Add Programming Film'}
          </h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Film Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="film_title" className="block text-sm font-medium text-gray-700 mb-1">
                  Film Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="film_title"
                  value={formData.film_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, film_title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="original_title" className="block text-sm font-medium text-gray-700 mb-1">
                  Original Title
                </label>
                <input
                  type="text"
                  id="original_title"
                  value={formData.original_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, original_title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="director" className="block text-sm font-medium text-gray-700 mb-1">
                  Director
                </label>
                <input
                  type="text"
                  id="director"
                  value={formData.director}
                  onChange={(e) => setFormData(prev => ({ ...prev, director: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="feature">Feature</option>
                  <option value="short">Short</option>
                </select>
              </div>

              <div>
                <label htmlFor="priority_level" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority Level
                </label>
                <select
                  id="priority_level"
                  value={formData.priority_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority_level: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Programming Status Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="travel_status" className="block text-sm font-medium text-gray-700 mb-1">
                  Travel Status
                </label>
                <select
                  id="travel_status"
                  value={formData.travel_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, travel_status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Maybe">Maybe</option>
                  <option value="TBD">TBD</option>
                </select>
              </div>

              <div>
                <label htmlFor="synopsis_writer" className="block text-sm font-medium text-gray-700 mb-1">
                  Synopsis Writer
                </label>
                <input
                  type="text"
                  id="synopsis_writer"
                  value={formData.synopsis_writer}
                  onChange={(e) => setFormData(prev => ({ ...prev, synopsis_writer: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.synopsis_approved}
                    onChange={(e) => setFormData(prev => ({ ...prev, synopsis_approved: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Synopsis Approved</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.materials_received}
                    onChange={(e) => setFormData(prev => ({ ...prev, materials_received: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Materials Received</span>
                </label>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="ready_to_publish">Ready to Publish</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            {/* Color Highlighting */}
            <div>
              <label htmlFor="color_highlight" className="block text-sm font-medium text-gray-700 mb-1">
                Row Highlight Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  id="color_highlight"
                  value={formData.color_highlight || '#ffffff'}
                  onChange={(e) => setFormData(prev => ({ ...prev, color_highlight: e.target.value }))}
                  className="w-16 h-10 border border-gray-300 rounded-md"
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color_highlight: '' }))}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Contacts Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Contacts</h3>
                <button
                  type="button"
                  onClick={addContactPair}
                  className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  + Add Contact
                </button>
              </div>

              {formData.contacts.map((contact, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Contact {index + 1}</h4>
                    {formData.contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContactPair(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={contact.contact_name}
                        onChange={(e) => updateContactPair(index, 'contact_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Start typing to search existing contacts..."
                      />
                      
                      {/* Autocomplete dropdown */}
                      {contact.contact_name && contact.contact_name.length >= 2 && (
                        <div className="relative">
                          {getFilteredContacts(contact.contact_name).length > 0 && (
                            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                              {getFilteredContacts(contact.contact_name).map((existingContact) => (
                                <button
                                  key={existingContact.id}
                                  type="button"
                                  onClick={() => handleContactSelect(index, existingContact)}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium">{existingContact.contact_name}</div>
                                  {existingContact.company && (
                                    <div className="text-sm text-gray-500">{existingContact.company}</div>
                                  )}
                                  {existingContact.email && (
                                    <div className="text-sm text-gray-500">{existingContact.email}</div>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company
                      </label>
                      <input
                        type="text"
                        value={contact.company}
                        onChange={(e) => updateContactPair(index, 'company', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={contact.email}
                        onChange={(e) => updateContactPair(index, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => updateContactPair(index, 'phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <input
                        type="text"
                        value={contact.role}
                        onChange={(e) => updateContactPair(index, 'role', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Sales Agent, Producer, Distributor"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="travel_notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Travel Notes
                </label>
                <textarea
                  id="travel_notes"
                  value={formData.travel_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, travel_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="synopsis_notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Synopsis Notes
                </label>
                <textarea
                  id="synopsis_notes"
                  value={formData.synopsis_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, synopsis_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="materials_notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Materials Notes
                </label>
                <textarea
                  id="materials_notes"
                  value={formData.materials_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, materials_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="programming_notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Programming Notes
                </label>
                <textarea
                  id="programming_notes"
                  value={formData.programming_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, programming_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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
                {loading ? 'Saving...' : film ? 'Update Film' : 'Save Film'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}