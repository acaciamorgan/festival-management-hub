'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { ProgrammingFilmFormModal } from '@/components/forms/programming-film-form-modal'

interface Contact {
  id: string
  company: string | null
  contact_name: string
  email: string | null
  phone: string | null
  notes: string | null
  contact_type: string | null
}

interface ProgrammingFilm {
  id: string
  film: string // matches CSV "Film"
  original_title: string | null // matches CSV "Original Title"
  director: string | null // matches CSV "Director"
  country: string | null // matches CSV "Country"
  category: string | null // matches CSV "Category"
  runtime: number | null // new field for minutes
  
  // Programming workflow fields (matches CSV)
  travel: string | null // matches CSV "Travel"
  synopsis: string | null // matches CSV "Synopsis" (writer name)
  written: boolean // matches CSV "Written" (X = true)
  approved: string | null // matches CSV "Approved" (Logline, X, etc.)
  content_consideration: string | null // matches CSV "Content Consideration"
  
  // Program assignments (matches CSV)
  program: string | null // matches CSV "Program"
  program_2: string | null // matches CSV "Program 2"
  program_3: string | null // matches CSV "Program 3"
  
  // Materials and submission tracking
  contacted_for_materials: boolean // matches CSV "Contacted for materials"
  form_submitted: boolean // matches CSV "Form Submitted"
  uploaded_materials: boolean // matches CSV "Uploaded Materials"
  accessibility_screening: boolean // matches CSV "Accessibility Screening?"
  premiere_status: string | null // matches CSV "Premiere Status"
  cards_made: boolean // matches CSV "Cards made"
  
  // Visual and metadata
  color_highlight: string | null
  programming_notes: string | null
  priority_level: string | null
  status: string
  published_to_titles: boolean
  contacts: Array<{
    contact: Contact
    role: string | null
  }>
  created_at: string
  updated_at: string
  created_by: string
}

interface ProgrammingFilmFormData {
  film: string
  original_title: string
  director: string
  country: string
  category: string
  runtime: number | null
  travel: string
  synopsis: string
  written: boolean
  approved: string
  content_consideration: string
  program: string
  program_2: string
  program_3: string
  contacted_for_materials: boolean
  form_submitted: boolean
  uploaded_materials: boolean
  accessibility_screening: boolean
  premiere_status: string
  cards_made: boolean
  programming_notes: string
  priority_level: string
  status: string
  contacts: Array<{
    company: string
    contact_name: string
    email: string
    phone: string
    role: string
    notes: string
  }>
}

export default function ProgrammingPipelinePage() {
  const { user } = useAuth()
  const [programmingFilms, setProgrammingFilms] = useState<ProgrammingFilm[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedFilm, setSelectedFilm] = useState<ProgrammingFilm | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'ready_to_publish'>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'feature' | 'short'>('all')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'updated_at', direction: 'desc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

  const supabase = createClient()

  const loadProgrammingFilms = useCallback(async () => {
    setLoading(true)
    try {
      const { data: filmsData, error } = await supabase
        .from('programming_films')
        .select(`
          *,
          programming_film_contacts(
            role,
            notes,
            contact:contacts(*)
          )
        `)
        .order('updated_at', { ascending: false })

      if (error) throw error

      const filmsWithContacts = (filmsData || []).map(film => ({
        ...film,
        contacts: film.programming_film_contacts || []
      }))

      setProgrammingFilms(filmsWithContacts)
    } catch (error) {
      console.error('Error loading programming films:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadProgrammingFilms()
  }, [loadProgrammingFilms])

  // Filter and search logic
  const filteredFilms = useMemo(() => {
    return programmingFilms.filter(film => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const searchableText = [
          film.film_title,
          film.original_title,
          film.director,
          film.country,
          film.synopsis_writer,
          ...film.contacts.map(c => c.contact.company),
          ...film.contacts.map(c => c.contact.contact_name)
        ].filter(Boolean).join(' ').toLowerCase()
        
        if (!searchableText.includes(searchLower)) return false
      }

      // Status filter
      if (statusFilter !== 'all' && film.status !== statusFilter) return false

      // Category filter  
      if (categoryFilter !== 'all' && film.category !== categoryFilter) return false

      return true
    })
  }, [programmingFilms, searchTerm, statusFilter, categoryFilter])

  // Sort logic
  const sortedFilms = useMemo(() => {
    if (!sortConfig) return filteredFilms

    return [...filteredFilms].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof ProgrammingFilm]
      const bValue = b[sortConfig.key as keyof ProgrammingFilm]
      
      if (aValue === null) return 1
      if (bValue === null) return -1
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredFilms, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const handleResize = (key: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [key]: width }))
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—'
    const parts = dateString.split('-')
    if (parts.length !== 3) return dateString
    const year = parts[0].slice(-2)
    const month = parts[1]
    const day = parts[2]
    return `${month}/${day}/${year}`
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'draft': 'bg-gray-100 text-gray-800',
      'ready_to_publish': 'bg-yellow-100 text-yellow-800',
      'published': 'bg-green-100 text-green-800'
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const exportToExcel = () => {
    // Create CSV content that Excel can open
    const headers = [
      'Film Title',
      'Original Title',
      'Director',
      'Country',
      'Category',
      'Travel Status',
      'Travel Notes',
      'Synopsis Writer',
      'Synopsis Approved',
      'Synopsis Notes',
      'Materials Received',
      'Materials Notes',
      'Contact Companies',
      'Contact Names',
      'Contact Emails',
      'Contact Roles',
      'Programming Notes',
      'Priority Level',
      'Status',
      'Last Updated'
    ]

    const csvData = sortedFilms.map(film => {
      const contactCompanies = film.contacts.map(c => c.contact.company || '').join('; ')
      const contactNames = film.contacts.map(c => c.contact.contact_name).join('; ')
      const contactEmails = film.contacts.map(c => c.contact.email || '').join('; ')
      const contactRoles = film.contacts.map(c => c.role || '').join('; ')
      
      return [
        film.film_title,
        film.original_title || '',
        film.director || '',
        film.country || '',
        film.category || '',
        film.travel_status || '',
        film.travel_notes || '',
        film.synopsis_writer || '',
        film.synopsis_approved ? 'Yes' : 'No',
        film.synopsis_notes || '',
        film.materials_received ? 'Yes' : 'No',
        film.materials_notes || '',
        contactCompanies,
        contactNames,
        contactEmails,
        contactRoles,
        film.programming_notes || '',
        film.priority_level || '',
        film.status || '',
        formatDate(film.updated_at)
      ]
    })

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        row.map(cell => {
          // Escape cells that contain commas, quotes, or newlines
          const cellStr = String(cell || '')
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(',')
      )
    ].join('\n')

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `programming-pipeline-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">🎬 Programming Pipeline</h1>
            <p className="text-sm text-gray-600 mt-1">
              {sortedFilms.length} of {programmingFilms.length} films
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
            >
              Add Film
            </button>
            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium"
            >
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search films, directors, contacts, companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'ready_to_publish')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="ready_to_publish">Ready to Publish</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | 'feature' | 'short')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="feature">Features</option>
              <option value="short">Shorts</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setCategoryFilter('all')
              }}
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden bg-white">
        <div className="overflow-auto" style={{ height: 'calc(100vh - 220px)', overflowX: 'auto', overflowY: 'auto' }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-500">Loading programming films...</div>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {[
                    { key: 'film', label: 'Film', width: 200, sortable: true, sticky: true },
                    { key: 'director', label: 'Director', width: 140, sortable: true },
                    { key: 'country', label: 'Country', width: 120, sortable: true },
                    { key: 'runtime', label: 'Runtime', width: 80, sortable: true },
                    { key: 'travel', label: 'Travel', width: 120, sortable: true, editable: true },
                    { key: 'synopsis', label: 'Synopsis', width: 120, sortable: true, editable: true },
                    { key: 'written', label: 'Written', width: 80, sortable: true },
                    { key: 'approved', label: 'Approved', width: 100, sortable: true, editable: true },
                    { key: 'content_consideration', label: 'Content', width: 140, sortable: false },
                    { key: 'program', label: 'Program', width: 150, sortable: true },
                    { key: 'premiere_status', label: 'Premiere Status', width: 120, sortable: true },
                    { key: 'contacts', label: 'Contacts', width: 200, sortable: false },
                    { key: 'status', label: 'Status', width: 100, sortable: true }
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
                      {/* Resize handle */}
                      <div
                        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          
                          const startX = e.pageX
                          const startWidth = columnWidths[column.key] || column.width || 150

                          const handleMouseMove = (e: MouseEvent) => {
                            e.preventDefault()
                            const newWidth = Math.max(100, startWidth + (e.pageX - startX))
                            handleResize(column.key, newWidth)
                          }

                          const handleMouseUp = (e: MouseEvent) => {
                            e.preventDefault()
                            document.removeEventListener('mousemove', handleMouseMove)
                            document.removeEventListener('mouseup', handleMouseUp)
                          }

                          document.addEventListener('mousemove', handleMouseMove)
                          document.addEventListener('mouseup', handleMouseUp)
                        }}
                      />
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedFilms.map((film) => (
                  <tr 
                    key={film.id} 
                    className="hover:bg-gray-50"
                    style={{ 
                      backgroundColor: film.color_highlight || 'transparent'
                    }}
                  >
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 sticky left-0 bg-white z-10" style={{ minWidth: `${columnWidths['film_title'] || 200}px`, maxWidth: `${columnWidths['film_title'] || 200}px` }}>
                      <div>
                        <div className="font-medium">{film.film_title}</div>
                        {film.original_title && film.original_title !== film.film_title && (
                          <div className="text-xs text-gray-500 italic">{film.original_title}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['director'] || 150}px` }}>
                      {film.director || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['country'] || 120}px` }}>
                      {film.country || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['category'] || 100}px` }}>
                      {film.category || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['travel_status'] || 100}px` }}>
                      {film.travel_status || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['synopsis_writer'] || 120}px` }}>
                      {film.synopsis_writer || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center" style={{ minWidth: `${columnWidths['synopsis_approved'] || 120}px` }}>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        film.synopsis_approved 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {film.synopsis_approved ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center" style={{ minWidth: `${columnWidths['materials_received'] || 100}px` }}>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        film.materials_received 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {film.materials_received ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contacts'] || 250}px` }}>
                      {film.contacts.length > 0 ? (
                        <div className="space-y-1">
                          {film.contacts.slice(0, 2).map((contact, index) => (
                            <div key={index} className="text-xs">
                              <span className="font-medium">{contact.contact.company || contact.contact.contact_name}</span>
                              {contact.role && <span className="text-gray-500"> ({contact.role})</span>}
                            </div>
                          ))}
                          {film.contacts.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{film.contacts.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['status'] || 120}px` }}>
                      {getStatusBadge(film.status)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-center">
                      <button
                        onClick={() => setSelectedFilm(film)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {sortedFilms.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                        ? 'No films match your filters.'
                        : 'No films found. Click "Add Film" to create your first programming entry.'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Programming Film Form Modal */}
      <ProgrammingFilmFormModal
        film={selectedFilm}
        isOpen={showAddModal || !!selectedFilm}
        onClose={() => {
          setShowAddModal(false)
          setSelectedFilm(null)
        }}
        onSave={(savedFilm) => {
          if (selectedFilm) {
            // Update existing film in the list
            setProgrammingFilms(prev => prev.map(film => 
              film.id === savedFilm.id ? savedFilm : film
            ))
          } else {
            // Add new film to the list
            setProgrammingFilms(prev => [savedFilm, ...prev])
          }
        }}
      />
    </div>
  )
}