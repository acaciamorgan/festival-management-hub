'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'

interface Contact {
  id: string
  contact_company: string | null
  contact_name: string
  contact_email: string | null
  phone: string | null
  notes: string | null
  contact_type: string | null
  created_at: string
  updated_at: string
  created_by: string
  // Add mailing address field
  mailing_address: string | null
}

export default function ContactsPage() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingCell, setEditingCell] = useState<{contactId: string, field: string} | null>(null)
  const [editValue, setEditValue] = useState('')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'contact_name', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

  const supabase = createClient()

  const loadContacts = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('contact_name')

      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  // Format phone number for display
  const formatPhoneNumber = (phone: string | null): string => {
    if (!phone) return '—'
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '')
    
    // If it's a 10-digit US number, format as 123-456-7890
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    
    // If it's 11 digits and starts with 1 (US with country code), format as 1-123-456-7890
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    
    // For international numbers, return as-is (they could have various formats)
    return phone
  }


  // Handle inline editing
  const handleCellEdit = (contactId: string, field: string, currentValue: any) => {
    setEditingCell({ contactId, field })
    setEditValue(String(currentValue || ''))
  }

  const handleCellSave = async () => {
    if (!editingCell) return

    try {
      const { error } = await supabase
        .from('contacts')
        .update({ [editingCell.field]: editValue })
        .eq('id', editingCell.contactId)

      if (error) throw error

      // Update local state
      setContacts(prev => prev.map(contact => 
        contact.id === editingCell.contactId 
          ? { ...contact, [editingCell.field]: editValue } 
          : contact
      ))

      setEditingCell(null)
      setEditValue('')
    } catch (error) {
      console.error('Error updating field:', error)
    }
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setEditValue('')
  }

  // Render cell with inline editing support
  const renderCell = (contact: Contact, field: string, value: any, isEditable: boolean = false) => {
    const isEditing = editingCell?.contactId === contact.id && editingCell?.field === field

    if (isEditing && isEditable) {
      return (
        <div className="flex items-center space-x-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave()
              if (e.key === 'Escape') handleCellCancel()
            }}
            onBlur={handleCellSave}
            className="w-full px-1 py-0 text-sm border border-blue-500 rounded focus:outline-none"
            autoFocus
          />
        </div>
      )
    }

    return (
      <div
        className={`px-1 py-1 rounded ${
          isEditable ? 'cursor-text hover:bg-blue-50' : 'cursor-default'
        }`}
        onClick={(e) => {
          if (isEditable) {
            handleCellEdit(contact.id, field, value)
          }
        }}
        title={isEditable ? "Click to edit" : undefined}
      >
        {field === 'phone' ? formatPhoneNumber(value) : (value || '—')}
      </div>
    )
  }

  // Filter and search logic
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<Contact>(
          searchTerm,
          (contact) => [
            contact.contact_name,
            contact.contact_company,
            contact.contact_email,
            contact.phone,
            contact.mailing_address
          ]
        )
        if (!searchFilter(contact)) return false
      }

      return true
    })
  }, [contacts, searchTerm])

  // Sort logic
  const sortedContacts = useMemo(() => {
    if (!sortConfig) return filteredContacts

    return [...filteredContacts].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Contact]
      const bValue = b[sortConfig.key as keyof Contact]
      
      if (aValue === null) return 1
      if (bValue === null) return -1
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredContacts, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">👥 Contacts Database</h1>
            <p className="text-sm text-gray-600 mt-1">
              {sortedContacts.length} of {contacts.length} contacts
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search contacts, companies, emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Clear Filters */}
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
          >
            Clear Search
          </button>
        )}
      </div>


      {/* Data Grid */}
      <div className="flex-1 overflow-hidden bg-white">
        <div className="overflow-auto" style={{ height: 'calc(100vh - 250px)', overflowX: 'auto', overflowY: 'auto' }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-500">Loading contacts...</div>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {[
                    { key: 'contact_name', label: 'Name', width: 200, sortable: true, sticky: true, editable: true },
                    { key: 'contact_company', label: 'Company', width: 200, sortable: true, editable: true },
                    { key: 'contact_email', label: 'Email', width: 250, sortable: true, editable: true },
                    { key: 'phone', label: 'Phone', width: 150, sortable: true, editable: true },
                    { key: 'mailing_address', label: 'Mailing Address', width: 300, sortable: true, editable: true }
                  ].map((column) => (
                    <th
                      key={column.key}
                      className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 relative ${
                        column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                      } ${
                        column.sticky ? 'sticky left-0 bg-gray-50 z-10' : ''
                      }`}
                      style={{ 
                        width: columnWidths[column.key] || column.width,
                        minWidth: column.sticky ? `${column.width}px` : '100px',
                        maxWidth: column.sticky ? `${columnWidths[column.key] || column.width}px` : 'none'
                      }}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{column.label}</span>
                        {column.sortable && (
                          <span className="ml-2">
                            {sortConfig?.key === column.key ? (
                              sortConfig.direction === 'asc' ? '↑' : '↓'
                            ) : '↕️'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedContacts.map((contact) => (
                  <tr 
                    key={contact.id} 
                    className="hover:bg-gray-50"
                  >
                    {/* Name (sticky) */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 sticky left-0 bg-white z-10" style={{ minWidth: `${columnWidths['contact_name'] || 200}px`, maxWidth: `${columnWidths['contact_name'] || 200}px` }}>
                      {renderCell(contact, 'contact_name', contact.contact_name, true)}
                    </td>
                    
                    {/* Company */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contact_company'] || 200}px` }}>
                      {renderCell(contact, 'contact_company', contact.contact_company, true)}
                    </td>
                    
                    {/* Email */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contact_email'] || 250}px` }}>
                      {renderCell(contact, 'contact_email', contact.contact_email, true)}
                    </td>
                    
                    {/* Phone */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['phone'] || 150}px` }}>
                      {renderCell(contact, 'phone', contact.phone, true)}
                    </td>
                    
                    {/* Mailing Address */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['mailing_address'] || 300}px` }}>
                      {renderCell(contact, 'mailing_address', contact.mailing_address, true)}
                    </td>
                  </tr>
                ))}
                {sortedContacts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm
                        ? 'No contacts match your search.'
                        : 'No contacts found. Contacts will appear here when you add them through the Programming Pipeline.'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  )
}