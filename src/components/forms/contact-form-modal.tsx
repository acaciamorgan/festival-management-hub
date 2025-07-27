'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ContactCard } from '@/types'

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

  const supabase = createClient()

  useEffect(() => {
    if (contact && isOpen) {
      setFormData({
        contact_name: contact.contact_name || '',
        contact_company: contact.contact_company || '',
        contact_email: contact.contact_email || '',
        phone: contact.phone || '',
        notes: contact.notes || '',
        contact_type: contact.contact_type || '',
        mailing_address: contact.mailing_address || ''
      })
    } else if (isOpen) {
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
  }, [contact, isOpen])

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

  const handleSave = async () => {
    if (!formData.contact_name.trim()) {
      alert('Contact name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const contactData = {
        contact_name: formData.contact_name.trim(),
        contact_company: formData.contact_company.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        phone: formData.phone.trim() || null,
        notes: formData.notes.trim() || null,
        contact_type: formData.contact_type.trim() || null,
        mailing_address: formData.mailing_address.trim() || null
      }

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

          if (existingContacts && existingContacts.length > 0) {
            alert('A contact with this email already exists')
            return
          }
        }

        // Create new contact
        const { error } = await supabase
          .from('contacts')
          .insert([contactData])

        if (error) {
          console.error('Error creating contact:', error)
          alert(`Error creating contact: ${error.message}`)
          return
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
    'Press/Media',
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
                onChange={(e) => handleFieldChange('phone', e.target.value)}
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