'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { ColorPalette } from '@/components/ColorPalette'
import { ProgrammingFilmFormModal } from '@/components/forms/programming-film-form-modal'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'

interface Contact {
  id: string
  contact_company: string | null
  contact_name: string
  contact_email: string | null
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
  
  // Program assignments - stored as array like other modules
  programs: string[] // array of program names, up to 5
  
  // Materials and submission tracking
  contacted_for_materials: boolean // matches CSV "Contacted for materials"
  form_submitted: boolean // matches CSV "Form Submitted"
  uploaded_materials: boolean // matches CSV "Uploaded Materials"
  materials_received: boolean // matches CSV "Materials Received"
  accessibility_screening: boolean // matches CSV "Accessibility Screening?"
  premiere_status: string | null // matches CSV "Premiere Status"
  cards_made: boolean // matches CSV "Cards made"
  
  // Visual and metadata
  color_highlight: string | null
  cell_highlights: Record<string, string> | null // Individual cell highlighting
  programming_notes: string | null
  status: string // only draft status - no publishing
  contacts: Array<{
    contact: Contact
    role: string | null
  }>
  created_at: string
  updated_at: string
  created_by: string
}

export default function ProgrammingPipelinePage() {
  const { user } = useAuth()
  const [programmingFilms, setProgrammingFilms] = useState<ProgrammingFilm[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedFilm, setSelectedFilm] = useState<ProgrammingFilm | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'feature' | 'short'>('all')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'updated_at', direction: 'desc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  
  // Color palette state
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<{filmId: string, field: string} | null>(null)
  const [editValue, setEditValue] = useState('')
  const [highlightedCells, setHighlightedCells] = useState<Record<string, Record<string, string>>>({})
  const [notesState, setNotesState] = useState<Record<string, Record<string, string>>>({})
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [currentNote, setCurrentNote] = useState<{filmId: string, field: string, note: string}>({filmId: '', field: '', note: ''})
  const [noteModalPosition, setNoteModalPosition] = useState({ x: 100, y: 100 })
  const [isNoteDragging, setIsNoteDragging] = useState(false)
  const [noteDragStart, setNoteDragStart] = useState({ x: 0, y: 0 })

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

  // Simplified cell highlighting
  const [isDragging, setIsDragging] = useState(false)
  const [draggedCells, setDraggedCells] = useState<Set<string>>(new Set())
  
  const handleCellHighlight = async (filmId: string, fieldName: string) => {
    if (!selectedColor) return

    try {
      const film = programmingFilms.find(f => f.id === filmId)
      const currentHighlights = film?.cell_highlights || {}
      
      const updatedHighlights = {
        ...currentHighlights,
        [fieldName]: selectedColor
      }

      const { error } = await supabase
        .from('programming_films')
        .update({ cell_highlights: updatedHighlights })
        .eq('id', filmId)

      if (error) throw error

      setProgrammingFilms(prev => prev.map(film => 
        film.id === filmId 
          ? { ...film, cell_highlights: updatedHighlights } 
          : film
      ))
      
    } catch (error) {
      console.error('Error updating cell highlight:', error)
    }
  }

  // Handle notes
  const handleNoteClick = (e: React.MouseEvent, filmId: string, fieldName: string) => {
    e.stopPropagation()
    const film = programmingFilms.find(f => f.id === filmId)
    const existingNote = film?.programming_notes || ''
    setCurrentNote({filmId, field: fieldName, note: existingNote})
    setShowNoteModal(true)
  }

  const saveNote = async () => {
    try {
      const { error } = await supabase
        .from('programming_films')
        .update({ programming_notes: currentNote.note || null })
        .eq('id', currentNote.filmId)

      if (error) throw error

      setProgrammingFilms(prev => prev.map(film => 
        film.id === currentNote.filmId 
          ? { ...film, programming_notes: currentNote.note || null } 
          : film
      ))
      
      setShowNoteModal(false)
      setCurrentNote({filmId: '', field: '', note: ''})
    } catch (error) {
      console.error('Error saving note:', error)
    }
  }

  // Note modal drag handlers
  const handleNoteModalMouseDown = (e: React.MouseEvent) => {
    setIsNoteDragging(true)
    setNoteDragStart({
      x: e.clientX - noteModalPosition.x,
      y: e.clientY - noteModalPosition.y
    })
  }

  const handleNoteModalMouseMove = useCallback((e: MouseEvent) => {
    if (isNoteDragging) {
      setNoteModalPosition({
        x: e.clientX - noteDragStart.x,
        y: e.clientY - noteDragStart.y
      })
    }
  }, [isNoteDragging, noteDragStart.x, noteDragStart.y])

  const handleNoteModalMouseUp = () => {
    setIsNoteDragging(false)
  }

  useEffect(() => {
    if (isNoteDragging) {
      document.addEventListener('mousemove', handleNoteModalMouseMove)
      document.addEventListener('mouseup', handleNoteModalMouseUp)
    }
    
    return () => {
      document.removeEventListener('mousemove', handleNoteModalMouseMove)
      document.removeEventListener('mouseup', handleNoteModalMouseUp)
    }
  }, [isNoteDragging, handleNoteModalMouseMove])

  // Simplified drag highlighting
  const handleMouseDown = (e: React.MouseEvent, filmId: string, fieldName: string) => {
    if (selectedColor) {
      e.preventDefault()
      setIsDragging(true)
      const cellKey = `${filmId}-${fieldName}`
      setDraggedCells(new Set([cellKey]))
      handleCellHighlight(filmId, fieldName)
    }
  }

  const handleMouseEnter = (filmId: string, fieldName: string) => {
    if (isDragging && selectedColor) {
      const cellKey = `${filmId}-${fieldName}`
      setDraggedCells(prev => new Set(prev).add(cellKey))
      handleCellHighlight(filmId, fieldName)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDraggedCells(new Set())
  }

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => handleMouseUp()
      document.addEventListener('mouseup', handleGlobalMouseUp)
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging])

  // Handle inline editing
  const handleCellEdit = (filmId: string, field: string, currentValue: any) => {
    setEditingCell({ filmId, field })
    setEditValue(String(currentValue || ''))
  }

  const handleCellSave = async () => {
    if (!editingCell) return

    try {
      const { error } = await supabase
        .from('programming_films')
        .update({ [editingCell.field]: editValue })
        .eq('id', editingCell.filmId)

      if (error) throw error

      // Update local state
      setProgrammingFilms(prev => prev.map(film => 
        film.id === editingCell.filmId 
          ? { ...film, [editingCell.field]: editValue } 
          : film
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

  // Filter and search logic
  const filteredFilms = useMemo(() => {
    return programmingFilms.filter(film => {
      // Search filter with accent-insensitive search
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<ProgrammingFilm>(
          searchTerm,
          (film) => [
            film.film,
            film.original_title,
            film.director,
            film.country,
            film.synopsis,
            ...film.contacts.map(c => c.contact.contact_company),
            ...film.contacts.map(c => c.contact.contact_name)
          ]
        )
        if (!searchFilter(film)) return false
      }

      // Category filter  
      if (categoryFilter !== 'all' && film.category !== categoryFilter) return false

      return true
    })
  }, [programmingFilms, searchTerm, categoryFilter])

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
    const date = new Date(dateString)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
    return `${month}/${day}/${year}`
  }

  const getStatusBadge = () => {
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
        DRAFT
      </span>
    )
  }

  const exportToCSV = () => {
    // CSV export functionality (same as before)
    const headers = [
      'Travel', 'Synopsis', 'Written', 'Approved', 'Content Consideration', 'Film',
      'Original Title', 'Director', 'Country', 'Contact Company', 'Contact Name', 
      'Contact email', 'Category', 'Program', 'Program 2', 'Program 3',
      'Contacted for materials', 'Form Submitted', 'Uploaded Materials',
      'Accessibility Screening?', 'Premiere Status', 'Cards made'
    ]

    const csvData = sortedFilms.map(film => {
      const contactCompanies = film.contacts.map(c => c.contact.contact_company || '').join('; ')
      const contactNames = film.contacts.map(c => c.contact.contact_name).join('; ')
      const contactEmails = film.contacts.map(c => c.contact.contact_email || '').join('; ')
      
      return [
        film.travel || '',
        film.synopsis || '',
        film.written ? 'X' : '',
        film.approved || '',
        film.content_consideration || '',
        film.film,
        film.original_title || '',
        film.director || '',
        film.country || '',
        contactCompanies,
        contactNames,
        contactEmails,
        film.category || '',
        film.program || '',
        film.program_2 || '',
        film.program_3 || '',
        film.contacted_for_materials ? 'Yes' : 'No',
        film.form_submitted ? 'Yes' : 'No', 
        film.uploaded_materials ? 'Yes' : 'No',
        film.accessibility_screening ? 'Yes' : 'No',
        film.premiere_status || '',
        film.cards_made ? 'Yes' : 'No'
      ]
    })

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        row.map(cell => {
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

  // Render cell with highlighting and notes support
  const renderCell = (film: ProgrammingFilm, field: string, value: any, isEditable: boolean = false) => {
    const cellHighlight = film.cell_highlights?.[field]
    const hasNote = field === 'programming_notes' ? !!film.programming_notes : false
    const isEditing = editingCell?.filmId === film.id && editingCell?.field === field

    if (isEditing && isEditable) {
      return (
        <div 
          className="relative flex items-center space-x-1"
          style={{ backgroundColor: cellHighlight || 'transparent' }}
        >
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
        className={`relative px-1 py-1 rounded ${
          isEditable ? 'cursor-text hover:bg-blue-50' : 'cursor-default'
        } ${selectedColor ? 'cursor-crosshair' : ''}`}
        style={{ backgroundColor: cellHighlight || 'transparent' }}
        onClick={(e) => {
          if (selectedColor) {
            e.preventDefault()
            handleCellHighlight(film.id, field)
          } else if (isEditable) {
            handleCellEdit(film.id, field, value)
          }
        }}
        onMouseDown={(e) => selectedColor ? handleMouseDown(e, film.id, field) : undefined}
        onMouseEnter={() => selectedColor ? handleMouseEnter(film.id, field) : undefined}
        title={isEditable ? "Click to edit" : undefined}
      >
        {value || '—'}
        
        {/* Note indicator */}
        <div
          className="absolute top-0 right-0 w-3 h-3 bg-yellow-400 rounded-full cursor-pointer hover:bg-yellow-500 flex items-center justify-center text-xs font-bold text-yellow-800"
          onClick={(e) => handleNoteClick(e, film.id, field)}
          title="Add/Edit Note"
        >
          {hasNote ? '!' : '+'}
        </div>
      </div>
    )
  }

  // Render checkbox cell with highlighting and notes
  const renderCheckboxCell = (film: ProgrammingFilm, field: string, checked: boolean, onChange: (checked: boolean) => void) => {
    const cellHighlight = film.cell_highlights?.[field]
    const hasNote = field === 'programming_notes' ? !!film.programming_notes : false
    
    return (
      <div 
        className={`relative px-1 py-1 rounded text-center ${selectedColor ? 'cursor-crosshair' : ''}`}
        style={{ backgroundColor: cellHighlight || 'transparent' }}
        onClick={(e) => {
          if (selectedColor) {
            e.preventDefault()
            handleCellHighlight(film.id, field)
          }
        }}
        onMouseDown={(e) => selectedColor ? handleMouseDown(e, film.id, field) : undefined}
        onMouseEnter={() => selectedColor ? handleMouseEnter(film.id, field) : undefined}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            e.stopPropagation()
            onChange(e.target.checked)
          }}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        
        {/* Note indicator */}
        <div
          className="absolute top-0 right-0 w-3 h-3 bg-yellow-400 rounded-full cursor-pointer hover:bg-yellow-500 flex items-center justify-center text-xs font-bold text-yellow-800"
          onClick={(e) => handleNoteClick(e, film.id, field)}
          title="Add/Edit Note"
        >
          {hasNote ? '!' : '+'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">🎬 Programming Pipeline - Films Grid</h1>
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
              onClick={exportToCSV}
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
          {(searchTerm || categoryFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setCategoryFilter('all')
              }}
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Color Palette Toolbar */}
      <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
        <ColorPalette 
          selectedColor={selectedColor}
          onColorSelect={setSelectedColor}
        />
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden bg-white">
        <div className="overflow-auto" style={{ height: 'calc(100vh - 300px)', overflowX: 'auto', overflowY: 'auto' }} onMouseUp={handleMouseUp}>
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
                    { key: 'original_title', label: 'Original Title', width: 180, sortable: true },
                    { key: 'director', label: 'Director', width: 140, sortable: true },
                    { key: 'country', label: 'Country', width: 120, sortable: true },
                    { key: 'category', label: 'Category', width: 100, sortable: true },
                    { key: 'runtime', label: 'Runtime', width: 80, sortable: true },
                    { key: 'travel', label: 'Travel', width: 120, sortable: true, editable: true },
                    { key: 'synopsis', label: 'Synopsis Written By', width: 150, sortable: true, editable: true },
                    { key: 'written', label: 'Written', width: 80, sortable: true },
                    { key: 'approved', label: 'Synopsis Approved', width: 120, sortable: true },
                    { key: 'content_consideration', label: 'Content Consideration', width: 160, sortable: false, editable: true },
                    { key: 'programs', label: 'Programs', width: 180, sortable: true },
                    { key: 'contacted_for_materials', label: 'Contacted for Materials', width: 160, sortable: true },
                    { key: 'form_submitted', label: 'Form Submitted', width: 120, sortable: true },
                    { key: 'uploaded_materials', label: 'Uploaded Materials', width: 140, sortable: true },
                    { key: 'materials_received', label: 'Materials Received', width: 140, sortable: true },
                    { key: 'accessibility_screening', label: 'Accessibility Screening', width: 160, sortable: true },
                    { key: 'premiere_status', label: 'Premiere Status', width: 140, sortable: true, editable: true },
                    { key: 'cards_made', label: 'Cards Made', width: 100, sortable: true },
                    { key: 'contacts', label: 'Contacts', width: 200, sortable: false }
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
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedFilms.map((film) => (
                  <tr 
                    key={film.id} 
                    className={`hover:bg-gray-50 ${selectedColor ? 'cursor-pointer' : ''}`}
                    style={{ 
                      backgroundColor: film.color_highlight || 'transparent'
                    }}
                    onClick={(e) => {
                      // Only handle row click if not clicking on a cell
                      if (e.target === e.currentTarget && selectedColor) {
                        // handleRowClick(film.id) - removed row highlighting
                      }
                    }}
                  >
                    {/* Film Title (sticky) */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 sticky left-0 bg-white z-10" style={{ minWidth: `${columnWidths['film'] || 200}px`, maxWidth: `${columnWidths['film'] || 200}px` }}>
                      <div className="font-medium">{film.film}</div>
                    </td>
                    
                    {/* Original Title */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['original_title'] || 180}px` }}>
                      {renderCell(film, 'original_title', film.original_title)}
                    </td>
                    
                    {/* Director */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['director'] || 140}px` }}>
                      {renderCell(film, 'director', film.director)}
                    </td>
                    
                    {/* Country */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['country'] || 120}px` }}>
                      {renderCell(film, 'country', film.country)}
                    </td>
                    
                    {/* Category */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['category'] || 100}px` }}>
                      {renderCell(film, 'category', film.category)}
                    </td>
                    
                    {/* Runtime */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['runtime'] || 80}px` }}>
                      {renderCell(film, 'runtime', film.runtime ? `${film.runtime}min` : null)}
                    </td>
                    
                    {/* Travel (editable) */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['travel'] || 120}px` }}>
                      {renderCell(film, 'travel', film.travel, true)}
                    </td>
                    
                    {/* Synopsis Written By (editable) */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['synopsis'] || 150}px` }}>
                      {renderCell(film, 'synopsis', film.synopsis, true)}
                    </td>
                    
                    {/* Written */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['written'] || 80}px` }}>
                      {renderCheckboxCell(film, 'written', film.written, async (checked) => {
                        try {
                          await supabase
                            .from('programming_films')
                            .update({ written: checked })
                            .eq('id', film.id)
                          
                          setProgrammingFilms(prev => prev.map(f => 
                            f.id === film.id ? { ...f, written: checked } : f
                          ))
                        } catch (error) {
                          console.error('Error updating written status:', error)
                        }
                      })}
                    </td>
                    
                    {/* Synopsis Approved */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['approved'] || 120}px` }}>
                      {renderCheckboxCell(film, 'approved', !!film.approved, async (checked) => {
                        try {
                          await supabase
                            .from('programming_films')
                            .update({ approved: checked ? 'X' : null })
                            .eq('id', film.id)
                          
                          setProgrammingFilms(prev => prev.map(f => 
                            f.id === film.id ? { ...f, approved: checked ? 'X' : null } : f
                          ))
                        } catch (error) {
                          console.error('Error updating approved status:', error)
                        }
                      })}
                    </td>
                    
                    {/* Content Consideration (editable) */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['content_consideration'] || 160}px` }}>
                      {renderCell(film, 'content_consideration', film.content_consideration, true)}
                    </td>
                    
                    {/* Programs */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['programs'] || 180}px` }}>
                      {renderCell(film, 'programs', 
                        film.programs && film.programs.length > 0 ? (
                          <div>
                            {film.programs.map((program, index) => (
                              <div key={index} className="text-sm">
                                {program}
                              </div>
                            ))}
                          </div>
                        ) : null
                      )}
                    </td>
                    
                    {/* Contacted for Materials */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contacted_for_materials'] || 160}px` }}>
                      {renderCheckboxCell(film, 'contacted_for_materials', film.contacted_for_materials, async (checked) => {
                        try {
                          await supabase
                            .from('programming_films')
                            .update({ contacted_for_materials: checked })
                            .eq('id', film.id)
                          
                          setProgrammingFilms(prev => prev.map(f => 
                            f.id === film.id ? { ...f, contacted_for_materials: checked } : f
                          ))
                        } catch (error) {
                          console.error('Error updating contacted_for_materials:', error)
                        }
                      })}
                    </td>
                    
                    {/* Form Submitted */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['form_submitted'] || 120}px` }}>
                      {renderCheckboxCell(film, 'form_submitted', film.form_submitted, async (checked) => {
                        try {
                          await supabase
                            .from('programming_films')
                            .update({ form_submitted: checked })
                            .eq('id', film.id)
                          
                          setProgrammingFilms(prev => prev.map(f => 
                            f.id === film.id ? { ...f, form_submitted: checked } : f
                          ))
                        } catch (error) {
                          console.error('Error updating form_submitted:', error)
                        }
                      })}
                    </td>
                    
                    {/* Uploaded Materials */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['uploaded_materials'] || 140}px` }}>
                      {renderCheckboxCell(film, 'uploaded_materials', film.uploaded_materials, async (checked) => {
                        try {
                          await supabase
                            .from('programming_films')
                            .update({ uploaded_materials: checked })
                            .eq('id', film.id)
                          
                          setProgrammingFilms(prev => prev.map(f => 
                            f.id === film.id ? { ...f, uploaded_materials: checked } : f
                          ))
                        } catch (error) {
                          console.error('Error updating uploaded_materials:', error)
                        }
                      })}
                    </td>
                    
                    {/* Materials Received */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['materials_received'] || 140}px` }}>
                      {renderCheckboxCell(film, 'materials_received', film.materials_received, async (checked) => {
                        try {
                          await supabase
                            .from('programming_films')
                            .update({ materials_received: checked })
                            .eq('id', film.id)
                          
                          setProgrammingFilms(prev => prev.map(f => 
                            f.id === film.id ? { ...f, materials_received: checked } : f
                          ))
                        } catch (error) {
                          console.error('Error updating materials_received:', error)
                        }
                      })}
                    </td>
                    
                    {/* Accessibility Screening */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['accessibility_screening'] || 160}px` }}>
                      {renderCheckboxCell(film, 'accessibility_screening', film.accessibility_screening, async (checked) => {
                        try {
                          await supabase
                            .from('programming_films')
                            .update({ accessibility_screening: checked })
                            .eq('id', film.id)
                          
                          setProgrammingFilms(prev => prev.map(f => 
                            f.id === film.id ? { ...f, accessibility_screening: checked } : f
                          ))
                        } catch (error) {
                          console.error('Error updating accessibility_screening:', error)
                        }
                      })}
                    </td>
                    
                    {/* Premiere Status (editable) */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['premiere_status'] || 140}px` }}>
                      {renderCell(film, 'premiere_status', film.premiere_status, true)}
                    </td>
                    
                    {/* Cards Made */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['cards_made'] || 100}px` }}>
                      {renderCheckboxCell(film, 'cards_made', film.cards_made, async (checked) => {
                        try {
                          await supabase
                            .from('programming_films')
                            .update({ cards_made: checked })
                            .eq('id', film.id)
                          
                          setProgrammingFilms(prev => prev.map(f => 
                            f.id === film.id ? { ...f, cards_made: checked } : f
                          ))
                        } catch (error) {
                          console.error('Error updating cards_made:', error)
                        }
                      })}
                    </td>
                    
                    {/* Contacts */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contacts'] || 200}px` }}>
                      {renderCell(film, 'contacts', 
                        film.contacts.length > 0 ? (
                          <div className="space-y-1">
                            {film.contacts.slice(0, 2).map((contact, index) => (
                              <div key={index} className="text-xs">
                                <div className="font-medium">{contact.contact.contact_name}</div>
                                {contact.contact.contact_company && (
                                  <div className="text-gray-500">{contact.contact.contact_company}</div>
                                )}
                                {contact.contact.contact_email && (
                                  <div className="text-gray-500">{contact.contact.contact_email}</div>
                                )}
                                {contact.role && <div className="text-gray-400">({contact.role})</div>}
                              </div>
                            ))}
                            {film.contacts.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{film.contacts.length - 2} more
                              </div>
                            )}
                          </div>
                        ) : null
                      )}
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 py-2 text-sm text-gray-900 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFilm(film)
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {sortedFilms.length === 0 && (
                  <tr>
                    <td colSpan={21} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || categoryFilter !== 'all'
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

      {/* Note Modal */}
      {showNoteModal && (
        <>
          <div className="fixed inset-0 bg-transparent z-40" onClick={() => {
            setShowNoteModal(false)
            setCurrentNote({filmId: '', field: '', note: ''})
          }} />
          
          <div 
            className="fixed bg-white rounded-lg shadow-2xl border border-gray-300 z-50 w-96 overflow-hidden"
            style={{ 
              left: `${noteModalPosition.x}px`, 
              top: `${noteModalPosition.y}px`,
              cursor: isNoteDragging ? 'grabbing' : 'default'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Draggable Header */}
            <div 
              className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing"
              onMouseDown={handleNoteModalMouseDown}
            >
              <h1 className="text-lg font-semibold text-gray-900">Add/Edit Note</h1>
              <button
                onClick={() => {
                  setShowNoteModal(false)
                  setCurrentNote({filmId: '', field: '', note: ''})
                }}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <textarea
                value={currentNote.note}
                onChange={(e) => setCurrentNote(prev => ({ ...prev, note: e.target.value }))}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Enter your note here..."
                autoFocus
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowNoteModal(false)
                    setCurrentNote({filmId: '', field: '', note: ''})
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNote}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}