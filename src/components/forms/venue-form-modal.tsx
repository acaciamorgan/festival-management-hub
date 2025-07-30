'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { VenueCard, TheaterHouse, VenueType, FormFieldValue } from '@/types'

interface VenueFormModalProps {
  venue?: VenueCard | null
  isOpen: boolean
  onClose: () => void
  onSave: (venue: VenueCard) => void
}

interface VenueFormData {
  name: string
  address: string
  venue_type: VenueType
  contact_names: string[]
  contact_emails: string[]
  contact_phones: string[]
  houses: TheaterHouse[]
}

export function VenueFormModal({ venue, isOpen, onClose, onSave }: VenueFormModalProps) {
  const [formData, setFormData] = useState<VenueFormData>({
    name: '',
    address: '',
    venue_type: 'Restaurant',
    contact_names: [''],
    contact_emails: [''],
    contact_phones: [''],
    houses: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const supabase = createClient()

  // Phone number formatting function
  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone // Return original if not 10 digits
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

  // Initialize form data when venue changes
  useEffect(() => {
    if (venue) {
      setFormData({
        name: venue.name || '',
        address: venue.address || '',
        venue_type: venue.venue_type || 'Restaurant',
        contact_names: venue.contact_names && venue.contact_names.length > 0 ? venue.contact_names : [''],
        contact_emails: venue.contact_emails && venue.contact_emails.length > 0 ? venue.contact_emails : [''],
        contact_phones: venue.contact_phones && venue.contact_phones.length > 0 ? venue.contact_phones : [''],
        houses: venue.houses || []
      })
    } else {
      setFormData({
        name: '',
        address: '',
        venue_type: 'Restaurant',
        contact_names: [''],
        contact_emails: [''],
        contact_phones: [''],
        houses: []
      })
    }
    setErrors({})
  }, [venue, isOpen])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Venue name is required'
    }


    // Validate theater houses for movie theaters
    if (formData.venue_type === 'Movie Theater') {
      formData.houses.forEach((house, index) => {
        if (!house.house_name.trim()) {
          newErrors[`house_name_${index}`] = 'House name is required'
        }
        if (!house.seat_count || house.seat_count < 1) {
          newErrors[`house_seats_${index}`] = 'Seat count must be at least 1'
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Venue form submitted', formData)
    
    if (!validateForm()) {
      console.log('Validation failed', errors)
      return
    }

    setIsSubmitting(true)

    try {
      // Filter out empty contact fields
      const cleanContactNames = formData.contact_names.filter(name => name.trim())
      const cleanContactEmails = formData.contact_emails.filter(email => email.trim())
      const cleanContactPhones = formData.contact_phones.filter(phone => phone.trim())

      const venueData = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        venue_type: formData.venue_type
      }

      let savedVenue: VenueCard

      if (venue) {
        // Update existing venue
        const { data, error } = await supabase
          .from('venues')
          .update(venueData)
          .eq('id', venue.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating venue:', error)
          throw error
        }
        savedVenue = data
      } else {
        // Create new venue
        console.log('Creating venue with data:', venueData)
        const { data, error } = await supabase
          .from('venues')
          .insert([{
            ...venueData,
            created_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (error) {
          console.error('Error creating venue:', error)
          throw error
        }
        console.log('Venue created successfully:', data)
        savedVenue = data
      }

      // Handle theater houses for movie theaters
      if (formData.venue_type === 'Movie Theater') {
        // Delete existing houses if editing
        if (venue) {
          await supabase
            .from('theater_houses')
            .delete()
            .eq('venue_id', venue.id)
        }

        // Insert new houses
        if (formData.houses.length > 0) {
          const housesToInsert = formData.houses.map(house => ({
            venue_id: savedVenue.id,
            house_name: house.house_name.trim(),
            seat_count: house.seat_count,
            short_code: house.short_code?.trim() || null,
            created_at: new Date().toISOString()
          }))

          console.log('Inserting theater houses:', housesToInsert)
          const { data: housesData, error: housesError } = await supabase
            .from('theater_houses')
            .insert(housesToInsert)
            .select()

          if (housesError) {
            console.error('Error creating theater houses:', housesError)
            throw housesError
          }
          console.log('Theater houses created successfully:', housesData)

          // Add houses to saved venue
          savedVenue.houses = housesData
          savedVenue.houses_display = housesData
            .map(house => `${house.house_name}${house.short_code ? ` - ${house.short_code}` : ''} (${house.seat_count})`)
            .join(', ')
        } else {
          savedVenue.houses = []
          savedVenue.houses_display = 'No houses configured'
        }
      } else {
        savedVenue.houses = []
        savedVenue.houses_display = 'N/A'
      }

      onSave(savedVenue)
      onClose()
    } catch (error) {
      console.error('Error saving venue:', error)
      alert('Error saving venue. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contact_names: [...prev.contact_names, ''],
      contact_emails: [...prev.contact_emails, ''],
      contact_phones: [...prev.contact_phones, '']
    }))
  }

  const removeContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contact_names: prev.contact_names.filter((_, i) => i !== index),
      contact_emails: prev.contact_emails.filter((_, i) => i !== index),
      contact_phones: prev.contact_phones.filter((_, i) => i !== index)
    }))
  }

  const updateContact = (index: number, field: 'names' | 'emails' | 'phones', value: string) => {
    setFormData(prev => {
      const fieldKey = `contact_${field}` as keyof VenueFormData
      const fieldArray = prev[fieldKey] as string[]
      
      // Format phone numbers automatically
      const finalValue = field === 'phones' ? formatPhoneNumber(value) : value
      
      return {
        ...prev,
        [fieldKey]: fieldArray.map((item: string, i: number) => 
          i === index ? finalValue : item
        )
      }
    })
  }

  const addHouse = () => {
    setFormData(prev => ({
      ...prev,
      houses: [...prev.houses, { house_name: '', seat_count: 0, short_code: '' }]
    }))
  }

  const removeHouse = (index: number) => {
    setFormData(prev => ({
      ...prev,
      houses: prev.houses.filter((_, i) => i !== index)
    }))
  }

  const updateHouse = (index: number, field: keyof TheaterHouse, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      houses: prev.houses.map((house, i) => 
        i === index ? { ...house, [field]: value } : house
      )
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-transparent pointer-events-none">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto pointer-events-auto relative"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Draggable Header */}
          <div 
            className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg cursor-grab active:cursor-grabbing flex justify-between items-center"
            onMouseDown={handleMouseDown}
          >
            <h2 className="text-xl font-semibold text-gray-900">
              {venue ? 'Edit Venue' : 'Add New Venue'}
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
              {/* Basic Venue Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Venue Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter venue name"
                  />
                  {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Venue Type
                  </label>
                  <select
                    value={formData.venue_type}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      venue_type: e.target.value as VenueType,
                      houses: e.target.value === 'Movie Theater' ? prev.houses : []
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Restaurant">Restaurant</option>
                    <option value="Movie Theater">Movie Theater</option>
                    <option value="Event Space">Event Space</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.address ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter full address"
                />
                {errors.address && <p className="text-sm text-red-600 mt-1">{errors.address}</p>}
              </div>

              {/* Contact Information */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                  <button
                    type="button"
                    onClick={addContact}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Contact
                  </button>
                </div>

                {formData.contact_names.map((_, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                    <input
                      type="text"
                      value={formData.contact_names[index]}
                      onChange={(e) => updateContact(index, 'names', e.target.value)}
                      placeholder="Contact name"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="email"
                      value={formData.contact_emails[index]}
                      onChange={(e) => updateContact(index, 'emails', e.target.value)}
                      placeholder="Email address"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="tel"
                      value={formData.contact_phones[index]}
                      onChange={(e) => updateContact(index, 'phones', e.target.value)}
                      placeholder="Phone number"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      disabled={formData.contact_names.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* Theater Houses (only for Movie Theater type) */}
              {formData.venue_type === 'Movie Theater' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">Theater Houses</h3>
                    <button
                      type="button"
                      onClick={addHouse}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add House
                    </button>
                  </div>

                  {formData.houses.length === 0 && (
                    <div className="text-sm text-gray-500 mb-3">
                      Add theater houses for this movie theater venue.
                    </div>
                  )}

                  {formData.houses.map((house, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                      <div>
                        <input
                          type="text"
                          value={house.house_name}
                          onChange={(e) => updateHouse(index, 'house_name', e.target.value)}
                          placeholder="House name/number"
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors[`house_name_${index}`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errors[`house_name_${index}`] && (
                          <p className="text-sm text-red-600 mt-1">{errors[`house_name_${index}`]}</p>
                        )}
                      </div>
                      <div>
                        <input
                          type="number"
                          value={house.seat_count || ''}
                          onChange={(e) => updateHouse(index, 'seat_count', parseInt(e.target.value) || 0)}
                          placeholder="Seat count"
                          min="1"
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors[`house_seats_${index}`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errors[`house_seats_${index}`] && (
                          <p className="text-sm text-red-600 mt-1">{errors[`house_seats_${index}`]}</p>
                        )}
                      </div>
                      <div>
                        <input
                          type="text"
                          value={house.short_code || ''}
                          onChange={(e) => updateHouse(index, 'short_code', e.target.value)}
                          placeholder="Short code (e.g., AMC 1)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeHouse(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove House
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between px-6 py-4 bg-gray-50 border-t">
            <div>
              {venue && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete ${venue.name}? This action cannot be undone.`)) {
                      try {
                        const { error } = await supabase
                          .from('venues')
                          .delete()
                          .eq('id', venue.id)
                        
                        if (error) throw error
                        
                        // Remove from parent list and close modal
                        // This would need to be passed from parent component
                        onClose()
                        window.location.reload() // Temporary - should update parent state
                      } catch (error) {
                        console.error('Error deleting venue:', error)
                        alert('Error deleting venue. Please try again.')
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  disabled={isSubmitting}
                >
                  Delete Venue
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
                {isSubmitting ? 'Saving...' : (venue ? 'Update Venue' : 'Create Venue')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}