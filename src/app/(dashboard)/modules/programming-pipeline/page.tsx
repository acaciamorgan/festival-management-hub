'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { ColorPalette } from '@/components/ColorPalette'
import { ProgrammingFilmFormModal } from '@/components/forms/programming-film-form-modal'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'
import { StickyNote } from '@/components/StickyNote'
import { getStickyNotesForModule, createStickyNote, updateStickyNote, deleteStickyNote } from '@/lib/sticky-notes-client'
import { StickyNote as StickyNoteType } from '@/types'
import * as XLSX from 'xlsx-js-style'

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
  created_at: string
  updated_at: string
  created_by: string
}

export default function ProgrammingPipelinePage() {
  const { user, permissions } = useAuth()
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
  
  // Sticky notes state
  const [stickyNotes, setStickyNotes] = useState<StickyNoteType[]>([])
  const [draggingStickyNote, setDraggingStickyNote] = useState<string | null>(null)
  const [showStickyNoteCreator, setShowStickyNoteCreator] = useState(false)
  const [stickyNoteCreatorPosition, setStickyNoteCreatorPosition] = useState({ x: 0, y: 0 })
  
  // Cell navigation state
  const [selectedCell, setSelectedCell] = useState<{filmId: string, field: string} | null>(null)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{filmId: string, field: string} | null>(null)
  const [clipboard, setClipboard] = useState<{value: any, type: string} | null>(null)
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, filmId: string, field: string} | null>(null)
  
  // Column resizing state
  const [isResizing, setIsResizing] = useState(false)
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartWidth, setResizeStartWidth] = useState(0)
  
  // CSV upload state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadStep, setUploadStep] = useState<'films' | 'schedule'>('films')
  const [uploading, setUploading] = useState(false)
  
  // Download dropdown state
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false)
  
  

  const supabase = createClient()

  // Check if user has edit permissions for programming pipeline
  const canEditProgrammingPipeline = permissions?.modulePermissions?.['programmingPipeline']?.canEdit || permissions?.isAdmin

  // Export template function for Films Grid
  const exportFilmsGridTemplate = () => {
    // Define headers with proper display names (20 columns total)
    const headerMapping = [
      { field: 'film', display: 'Film' },
      { field: 'original_title', display: 'Original Title' },
      { field: 'director', display: 'Director' },
      { field: 'country', display: 'Country' },
      { field: 'category', display: 'Category' },
      { field: 'runtime', display: 'Runtime' },
      { field: 'travel', display: 'Travel' },
      { field: 'synopsis', display: 'Synopsis Written By' },
      { field: 'written', display: 'Written' },
      { field: 'approved', display: 'Synopsis Approved' },
      { field: 'content_consideration', display: 'Content Consideration' },
      { field: 'programs', display: 'Programs' },
      { field: 'contacted_for_materials', display: 'Contacted for Materials' },
      { field: 'form_submitted', display: 'Form Submitted' },
      { field: 'uploaded_materials', display: 'Uploaded Materials' },
      { field: 'materials_received', display: 'Materials Received' },
      { field: 'accessibility_screening', display: 'Accessibility Screening' },
      { field: 'premiere_status', display: 'Premiere Status' },
      { field: 'cards_made', display: 'Cards Made' }
    ]
    
    const headers = headerMapping.map(h => h.display)
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers])
    
    // Style headers - bold with light grey background
    const headerStyle = { 
      font: { bold: true, sz: 12, name: 'Arial' }, 
      fill: { patternType: "solid", fgColor: { rgb: "E8E8E8" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } }
      }
    }
    
    // Apply styles and set column widths based on header length
    const cols: any[] = []
    headers.forEach((header, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: index })
      if (!ws[cellRef]) ws[cellRef] = {}
      ws[cellRef].s = headerStyle
      
      // Calculate column width based on header length (min 15, max 30)
      cols.push({ wch: Math.min(Math.max(header.length + 2, 15), 30) })
    })
    
    ws['!cols'] = cols
    
    // Freeze the header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    
    XLSX.utils.book_append_sheet(wb, ws, 'Films Grid Template')
    XLSX.writeFile(wb, 'films_grid_import_template.xlsx')
  }

  const loadProgrammingFilms = useCallback(async () => {
    setLoading(true)
    try {
      const { data: filmsData, error } = await supabase
        .from('programming_films')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error

      setProgrammingFilms(filmsData || [])
    } catch (error) {
      console.error('Error loading programming films:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadProgrammingFilms()
    loadStickyNotes()
  }, [loadProgrammingFilms])
  
  // Load sticky notes for this module
  // CSV Upload Functions
  const normalizeTitle = (title: string): string => {
    // Remove anything in parentheses and trim
    return title.replace(/\([^)]*\)/g, '').trim()
  }

  const parseCSV = (csvText: string): Record<string, string>[] => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []
    
    // Parse headers - handle quoted headers properly
    const headerLine = lines[0]
    const headers = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < headerLine.length; i++) {
      const char = headerLine[i]
      if (char === '"' && (i === 0 || headerLine[i-1] === ',')) {
        inQuotes = true
      } else if (char === '"' && inQuotes && (i === headerLine.length - 1 || headerLine[i+1] === ',')) {
        inQuotes = false
      } else if (char === ',' && !inQuotes) {
        headers.push(current.trim().replace(/^"|"$/g, ''))
        current = ''
      } else if (char !== '"' || inQuotes) {
        current += char
      }
    }
    headers.push(current.trim().replace(/^"|"$/g, ''))
    
    console.log('CSV Headers found:', headers)
    
    // Parse rows with proper quote handling
    const rows = lines.slice(1).map((line, lineIndex) => {
      const values = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"' && (i === 0 || line[i-1] === ',')) {
          inQuotes = true
        } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
          inQuotes = false
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''))
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''))
      
      // Map values to headers by name, not position
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      
      return row
    }).filter(row => Object.values(row).some(value => value.trim())) // Remove empty rows
    
    console.log('Parsed', rows.length, 'data rows')
    return rows
  }

  const handleFilmsCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    try {
      const csvText = await file.text()
      const rows = parseCSV(csvText)
      
      console.log('Processing Films CSV:', rows.length, 'rows')
      
      for (const row of rows) {
        if (!row.Film) continue
        
        const filmData = {
          film: row.Film,
          original_title: row['Original Title'] || null,
          director: row.Director || null,
          country: row.Country || null,
          category: row.Category || null,
          travel: row.Travel || null,
          synopsis: row.Synopsis || null,
          written: row.Written === 'X',
          approved: row.Approved || null,
          content_consideration: row['Content Consideration'] || null,
          programs: [row.Program, row['Program 2'], row['Program 3']].filter(Boolean),
          contacted_for_materials: row['Contacted for materials'] === 'Yes',
          form_submitted: row['Form Submitted'] === 'Yes',
          uploaded_materials: row['Uploaded Materials'] === 'Yes',
          materials_received: row['Materials Received'] === 'Yes',
          accessibility_screening: row['Accessibility Screening?'] === 'Yes',
          premiere_status: row['Premiere Status'] || null,
          cards_made: row['Cards made'] === 'x' || row['Cards made'] === 'X',
          status: 'draft'
        }
        
        // Check if film already exists
        const { data: existingFilm } = await supabase
          .from('programming_films')
          .select('id')
          .eq('film', row.Film)
          .single()
        
        let error
        if (existingFilm) {
          // Update existing film
          const { error: updateError } = await supabase
            .from('programming_films')
            .update(filmData)
            .eq('id', existingFilm.id)
          error = updateError
        } else {
          // Insert new film
          const { error: insertError } = await supabase
            .from('programming_films')
            .insert(filmData)
          error = insertError
        }
        
        if (error) {
          console.error('Error upserting film:', row.Film, error)
        }
      }
      
      await loadProgrammingFilms()
      setUploadStep('schedule')
      alert(`Successfully imported ${rows.length} films! Now upload the Schedule CSV.`)
      
    } catch (error) {
      console.error('Error processing Films CSV:', error)
      alert('Error processing Films CSV. Please check the format.')
    } finally {
      setUploading(false)
    }
  }

  const handleScheduleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    try {
      const csvText = await file.text()
      const rows = parseCSV(csvText)
      
      console.log('Processing Schedule CSV:', rows.length, 'rows')
      
      for (const row of rows) {
        if (!row.Title) continue
        
        const normalizedTitle = normalizeTitle(row.Title)
        
        // Find matching film by normalized title
        const matchingFilm = programmingFilms.find(film => 
          normalizeTitle(film.film) === normalizedTitle
        )
        
        if (!matchingFilm) {
          console.warn('No matching film found for:', row.Title)
          continue
        }
        
        // Update film's runtime if available
        if (row['Running Time']) {
          await supabase
            .from('programming_films')
            .update({ runtime: parseInt(row['Running Time']) })
            .eq('id', matchingFilm.id)
        }
        
        // Insert screening
        const screeningData = {
          programming_film_id: matchingFilm.id,
          day: row.Day,
          date: row.Date,
          location: row.Location,
          start_time: row['Start Time'],
          running_time: parseInt(row['Running Time']) || null,
          capacity: parseInt(row.Capacity) || null,
          notes: row.Notes || null
        }
        
        const { error } = await supabase
          .from('programming_film_public_screenings')
          .insert(screeningData)
        
        if (error) {
          console.error('Error inserting screening:', row.Title, error)
        }
      }
      
      await loadProgrammingFilms()
      setShowUploadModal(false)
      setUploadStep('films')
      alert(`Successfully imported ${rows.length} screenings!`)
      
    } catch (error) {
      console.error('Error processing Schedule CSV:', error)
      alert('Error processing Schedule CSV. Please check the format.')
    } finally {
      setUploading(false)
    }
  }

  const loadStickyNotes = useCallback(async () => {
    try {
      const notes = await getStickyNotesForModule('programming-pipeline')
      setStickyNotes(notes)
    } catch (error) {
      console.error('Error loading sticky notes:', error)
    }
  }, [])

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
  
  // Sticky notes handlers
  const handleCreateStickyNote = async (x: number, y: number) => {
    if (!user) return
    
    try {
      const newNote = await createStickyNote({
        x_position: x,
        y_position: y,
        width: 200,
        height: 150,
        color: 'yellow',
        content: '',
        module_id: 'programming-pipeline',
        created_by: user.id
      })
      setStickyNotes(prev => [...prev, newNote])
    } catch (error) {
      console.error('Error creating sticky note:', error)
    }
  }
  
  const handleUpdateStickyNote = async (note: StickyNoteType) => {
    try {
      const updatedNote = await updateStickyNote(note.id, {
        x_position: note.x_position,
        y_position: note.y_position,
        width: note.width,
        height: note.height,
        content: note.content,
        color: note.color
      })
      setStickyNotes(prev => prev.map(n => n.id === note.id ? updatedNote : n))
    } catch (error) {
      console.error('Error updating sticky note:', error)
    }
  }
  
  const handleDeleteStickyNote = async (noteId: string) => {
    try {
      await deleteStickyNote(noteId)
      setStickyNotes(prev => prev.filter(n => n.id !== noteId))
    } catch (error) {
      console.error('Error deleting sticky note:', error)
    }
  }
  
  const handleStickyNoteDragStart = (noteId: string) => {
    setDraggingStickyNote(noteId)
  }
  
  const handleStickyNoteDragEnd = () => {
    setDraggingStickyNote(null)
  }
  
  // Handle sticky note creation tool
  const handleGridDoubleClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      handleCreateStickyNote(x, y)
    }
  }
  
  // Excel-like navigation
  const editableFields = ['travel', 'synopsis', 'content_consideration', 'premiere_status']
  const allFields = ['film', 'original_title', 'director', 'country', 'category', 'runtime', 'travel', 'synopsis', 'written', 'approved', 'content_consideration', 'programs', 'contacted_for_materials', 'form_submitted', 'uploaded_materials', 'materials_received', 'accessibility_screening', 'premiere_status', 'cards_made']
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedCell || editingCell) return
    
    // Use filteredFilms instead of sortedFilms to avoid initialization order issues
    const films = programmingFilms.filter(film => {
      // Search filter with accent-insensitive search
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<ProgrammingFilm>(
          searchTerm,
          (film) => [
            film.film,
            film.original_title,
            film.director,
            film.country,
            film.synopsis
          ]
        )
        if (!searchFilter(film)) return false
      }

      // Category filter  
      if (categoryFilter !== 'all' && film.category !== categoryFilter) return false

      return true
    })
    
    const currentFilmIndex = films.findIndex(f => f.id === selectedCell.filmId)
    const currentFieldIndex = allFields.findIndex(f => f === selectedCell.field)
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        if (currentFilmIndex > 0) {
          setSelectedCell({
            filmId: films[currentFilmIndex - 1].id,
            field: selectedCell.field
          })
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (currentFilmIndex < films.length - 1) {
          setSelectedCell({
            filmId: films[currentFilmIndex + 1].id,
            field: selectedCell.field
          })
        }
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (currentFieldIndex > 0) {
          setSelectedCell({
            filmId: selectedCell.filmId,
            field: allFields[currentFieldIndex - 1]
          })
        }
        break
      case 'ArrowRight':
      case 'Tab':
        e.preventDefault()
        if (currentFieldIndex < allFields.length - 1) {
          setSelectedCell({
            filmId: selectedCell.filmId,
            field: allFields[currentFieldIndex + 1]
          })
        } else if (currentFilmIndex < films.length - 1) {
          // Move to first field of next row
          setSelectedCell({
            filmId: films[currentFilmIndex + 1].id,
            field: allFields[0]
          })
        }
        break
      case 'F2':
        e.preventDefault()
        if (editableFields.includes(selectedCell.field)) {
          const film = films.find(f => f.id === selectedCell.filmId)
          if (film) {
            handleCellEdit(selectedCell.filmId, selectedCell.field, film[selectedCell.field as keyof ProgrammingFilm])
          }
        }
        break
      case 'Enter':
        e.preventDefault()
        if (editableFields.includes(selectedCell.field)) {
          const film = films.find(f => f.id === selectedCell.filmId)
          if (film) {
            handleCellEdit(selectedCell.filmId, selectedCell.field, film[selectedCell.field as keyof ProgrammingFilm])
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        setSelectedCell(null)
        break
      case 'c':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          handleCopy()
        }
        break
      case 'v':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          handlePaste()
        }
        break
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        handleDelete()
        break
    }
  }, [selectedCell, editingCell, programmingFilms, searchTerm, categoryFilter, editableFields, allFields])
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  
  const handleCellClick = (filmId: string, field: string, e?: React.MouseEvent) => {
    if (e?.ctrlKey || e?.metaKey) {
      // Ctrl+Click for multi-select
      const cellKey = `${filmId}-${field}`
      setSelectedCells(prev => {
        const newSet = new Set(prev)
        if (newSet.has(cellKey)) {
          newSet.delete(cellKey)
        } else {
          newSet.add(cellKey)
        }
        return newSet
      })
    } else if (e?.shiftKey && selectedCell) {
      // Shift+Click for range selection
      const startFilmIndex = programmingFilms.findIndex(f => f.id === selectedCell.filmId)
      const endFilmIndex = programmingFilms.findIndex(f => f.id === filmId)
      const startFieldIndex = allFields.findIndex(f => f === selectedCell.field)
      const endFieldIndex = allFields.findIndex(f => f === field)
      
      const minFilmIndex = Math.min(startFilmIndex, endFilmIndex)
      const maxFilmIndex = Math.max(startFilmIndex, endFilmIndex)
      const minFieldIndex = Math.min(startFieldIndex, endFieldIndex)
      const maxFieldIndex = Math.max(startFieldIndex, endFieldIndex)
      
      const newSelection = new Set<string>()
      for (let filmIdx = minFilmIndex; filmIdx <= maxFilmIndex; filmIdx++) {
        for (let fieldIdx = minFieldIndex; fieldIdx <= maxFieldIndex; fieldIdx++) {
          newSelection.add(`${programmingFilms[filmIdx].id}-${allFields[fieldIdx]}`)
        }
      }
      setSelectedCells(newSelection)
    } else {
      // Regular click - clear multi-selection and set single selection
      setSelectedCells(new Set())
      setSelectedCell({ filmId, field })
    }
  }
  
  const handleCellMouseDown = (filmId: string, field: string, e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left mouse button
    if (selectedColor) return // Don't interfere with color highlighting
    
    setIsSelecting(true)
    setSelectionStart({ filmId, field })
    setSelectedCells(new Set([`${filmId}-${field}`]))
    setSelectedCell({ filmId, field })
  }
  
  const handleCellMouseEnter = (filmId: string, field: string) => {
    if (!isSelecting || !selectionStart) return
    
    // Calculate selection rectangle
    const startFilmIndex = programmingFilms.findIndex(f => f.id === selectionStart.filmId)
    const endFilmIndex = programmingFilms.findIndex(f => f.id === filmId)
    const startFieldIndex = allFields.findIndex(f => f === selectionStart.field)
    const endFieldIndex = allFields.findIndex(f => f === field)
    
    const minFilmIndex = Math.min(startFilmIndex, endFilmIndex)
    const maxFilmIndex = Math.max(startFilmIndex, endFilmIndex)
    const minFieldIndex = Math.min(startFieldIndex, endFieldIndex)
    const maxFieldIndex = Math.max(startFieldIndex, endFieldIndex)
    
    const newSelection = new Set<string>()
    for (let filmIdx = minFilmIndex; filmIdx <= maxFilmIndex; filmIdx++) {
      for (let fieldIdx = minFieldIndex; fieldIdx <= maxFieldIndex; fieldIdx++) {
        newSelection.add(`${programmingFilms[filmIdx].id}-${allFields[fieldIdx]}`)
      }
    }
    setSelectedCells(newSelection)
  }
  
  const handleMouseUpGlobal = useCallback(() => {
    if (isSelecting) {
      setIsSelecting(false)
      setSelectionStart(null)
    }
  }, [isSelecting])
  
  useEffect(() => {
    if (isSelecting) {
      document.addEventListener('mouseup', handleMouseUpGlobal)
      return () => document.removeEventListener('mouseup', handleMouseUpGlobal)
    }
  }, [isSelecting, handleMouseUpGlobal])
  
  // Copy/Paste functionality
  const handleCopy = () => {
    if (selectedCell) {
      const film = programmingFilms.find(f => f.id === selectedCell.filmId)
      if (film) {
        const value = film[selectedCell.field as keyof ProgrammingFilm]
        setClipboard({ value, type: selectedCell.field })
        
        // Also copy to system clipboard if it's a string
        if (typeof value === 'string') {
          navigator.clipboard?.writeText(value).catch(() => {
            // Fallback for browsers without clipboard API
            console.log('Copied to internal clipboard:', value)
          })
        }
      }
    } else if (selectedCells.size > 0) {
      // Multi-cell copy - copy as tab-separated values
      const values: string[] = []
      selectedCells.forEach(cellKey => {
        const [filmId, field] = cellKey.split('-')
        const film = programmingFilms.find(f => f.id === filmId)
        if (film) {
          const value = film[field as keyof ProgrammingFilm]
          values.push(String(value || ''))
        }
      })
      const copyText = values.join('\t')
      setClipboard({ value: copyText, type: 'multi' })
      navigator.clipboard?.writeText(copyText).catch(() => {
        console.log('Copied multiple cells to internal clipboard')
      })
    }
  }
  
  const handlePaste = async () => {
    if (!selectedCell || !editableFields.includes(selectedCell.field)) return
    
    let valueToApply: string = ''
    
    // Try to get from system clipboard first
    try {
      const clipboardText = await navigator.clipboard.readText()
      valueToApply = clipboardText
    } catch {
      // Fall back to internal clipboard
      if (clipboard && typeof clipboard.value === 'string') {
        valueToApply = clipboard.value
      } else {
        return
      }
    }
    
    // Apply the value
    try {
      const { error } = await supabase
        .from('programming_films')
        .update({ [selectedCell.field]: valueToApply })
        .eq('id', selectedCell.filmId)

      if (error) throw error

      // Update local state
      setProgrammingFilms(prev => prev.map(film => 
        film.id === selectedCell.filmId 
          ? { ...film, [selectedCell.field]: valueToApply } 
          : film
      ))
      
    } catch (error) {
      console.error('Error pasting value:', error)
    }
  }
  
  const handleDelete = async () => {
    const cellsToDelete: Array<{filmId: string, field: string}> = []
    
    if (selectedCell && editableFields.includes(selectedCell.field)) {
      cellsToDelete.push(selectedCell)
    }
    
    selectedCells.forEach(cellKey => {
      const [filmId, field] = cellKey.split('-')
      if (editableFields.includes(field)) {
        cellsToDelete.push({ filmId, field })
      }
    })
    
    // Group by film ID to minimize database calls
    const updatesByFilm: Record<string, Record<string, any>> = {}
    
    cellsToDelete.forEach(({ filmId, field }) => {
      if (!updatesByFilm[filmId]) {
        updatesByFilm[filmId] = {}
      }
      updatesByFilm[filmId][field] = null
    })
    
    // Apply updates
    try {
      const updatePromises = Object.entries(updatesByFilm).map(([filmId, updates]) => 
        supabase
          .from('programming_films')
          .update(updates)
          .eq('id', filmId)
      )
      
      await Promise.all(updatePromises)
      
      // Update local state
      setProgrammingFilms(prev => prev.map(film => {
        const updates = updatesByFilm[film.id]
        if (updates) {
          return { ...film, ...updates }
        }
        return film
      }))
      
    } catch (error) {
      console.error('Error deleting cell values:', error)
    }
  }
  
  // Context menu handlers
  const handleRightClick = (e: React.MouseEvent, filmId: string, field: string) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      filmId,
      field
    })
    // Also select the cell
    setSelectedCell({ filmId, field })
  }
  
  const closeContextMenu = () => {
    setContextMenu(null)
  }
  
  const handleContextMenuAction = (action: string) => {
    if (!contextMenu) return
    
    switch (action) {
      case 'copy':
        handleCopy()
        break
      case 'paste':
        handlePaste()
        break
      case 'delete':
        handleDelete()
        break
      case 'edit':
        if (editableFields.includes(contextMenu.field)) {
          const film = programmingFilms.find(f => f.id === contextMenu.filmId)
          if (film) {
            handleCellEdit(contextMenu.filmId, contextMenu.field, film[contextMenu.field as keyof ProgrammingFilm])
          }
        }
        break
    }
    closeContextMenu()
  }
  
  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        closeContextMenu()
      }
    }
    
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])
  
  // Close download dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDownloadDropdown) {
        const target = event.target as Element
        if (!target.closest('.relative')) {
          setShowDownloadDropdown(false)
        }
      }
    }
    
    if (showDownloadDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showDownloadDropdown])
  
  // Column resizing handlers
  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizingColumn(columnKey)
    setResizeStartX(e.clientX)
    setResizeStartWidth(columnWidths[columnKey] || 0)
  }
  
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizingColumn) return
    
    const deltaX = e.clientX - resizeStartX
    const newWidth = Math.max(100, resizeStartWidth + deltaX) // Minimum 100px width
    
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }))
  }, [isResizing, resizingColumn, resizeStartX, resizeStartWidth])
  
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
    setResizingColumn(null)
    setResizeStartX(0)
    setResizeStartWidth(0)
  }, [])
  
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

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
            film.synopsis
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
      'Original Title', 'Director', 'Country', 'Category', 'Program', 'Program 2', 'Program 3',
      'Contacted for materials', 'Form Submitted', 'Uploaded Materials',
      'Accessibility Screening?', 'Premiere Status', 'Cards made'
    ]

    const csvData = sortedFilms.map(film => {
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
        film.category || '',
        film.programs && film.programs[0] || '',
        film.programs && film.programs[1] || '',
        film.programs && film.programs[2] || '',
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

  const exportToExcel = () => {
    // Prepare data for Excel export
    const headers = [
      'Travel', 'Synopsis', 'Written', 'Approved', 'Content Consideration', 'Film',
      'Original Title', 'Director', 'Country', 'Category', 'Program', 'Program 2', 'Program 3',
      'Contacted for materials', 'Form Submitted', 'Uploaded Materials',
      'Accessibility Screening?', 'Premiere Status', 'Cards made'
    ]

    const excelData = sortedFilms.map(film => {
      return {
        'Travel': film.travel || '',
        'Synopsis': film.synopsis || '',
        'Written': film.written ? 'X' : '',
        'Approved': film.approved || '',
        'Content Consideration': film.content_consideration || '',
        'Film': film.film,
        'Original Title': film.original_title || '',
        'Director': film.director || '',
        'Country': film.country || '',
        'Category': film.category || '',
        'Program': film.programs && film.programs[0] || '',
        'Program 2': film.programs && film.programs[1] || '',
        'Program 3': film.programs && film.programs[2] || '',
        'Contacted for materials': film.contacted_for_materials ? 'Yes' : 'No',
        'Form Submitted': film.form_submitted ? 'Yes' : 'No',
        'Uploaded Materials': film.uploaded_materials ? 'Yes' : 'No',
        'Accessibility Screening?': film.accessibility_screening ? 'Yes' : 'No',
        'Premiere Status': film.premiere_status || '',
        'Cards made': film.cards_made ? 'Yes' : 'No'
      }
    })

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Films Grid')

    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `programming-pipeline-${new Date().toISOString().split('T')[0]}.xlsx`)
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
        } ${selectedColor ? 'cursor-crosshair' : ''} ${
          selectedCell?.filmId === film.id && selectedCell?.field === field ? 'ring-2 ring-blue-500 bg-blue-50' : 
          selectedCells.has(`${film.id}-${field}`) ? 'bg-blue-100 ring-1 ring-blue-300' : ''
        }`}
        style={{ 
          backgroundColor: selectedCell?.filmId === film.id && selectedCell?.field === field ? undefined :
                          selectedCells.has(`${film.id}-${field}`) ? undefined :
                          (cellHighlight || 'transparent')
        }}
        onClick={(e) => {
          if (selectedColor) {
            e.preventDefault()
            handleCellHighlight(film.id, field)
          } else {
            handleCellClick(film.id, field, e)
            if (isEditable && selectedCell?.filmId === film.id && selectedCell?.field === field && !e.ctrlKey && !e.shiftKey) {
              // Double-click behavior - start editing if already selected
              handleCellEdit(film.id, field, value)
            }
          }
        }}
        onMouseDown={(e) => {
          if (selectedColor) {
            handleMouseDown(e, film.id, field)
          } else {
            handleCellMouseDown(film.id, field, e)
          }
        }}
        onMouseEnter={() => {
          if (selectedColor) {
            handleMouseEnter(film.id, field)
          } else {
            handleCellMouseEnter(film.id, field)
          }
        }}
        onContextMenu={(e) => handleRightClick(e, film.id, field)}
        title={isEditable ? "Click to edit" : undefined}
      >
        {value || '—'}
      </div>
    )
  }

  // Render checkbox cell with highlighting and notes
  const renderCheckboxCell = (film: ProgrammingFilm, field: string, checked: boolean, onChange: (checked: boolean) => void) => {
    const cellHighlight = film.cell_highlights?.[field]
    const hasNote = field === 'programming_notes' ? !!film.programming_notes : false
    
    return (
      <div 
        className={`relative px-1 py-1 rounded text-center ${selectedColor ? 'cursor-crosshair' : ''} ${
          selectedCell?.filmId === film.id && selectedCell?.field === field ? 'ring-2 ring-blue-500 bg-blue-50' : 
          selectedCells.has(`${film.id}-${field}`) ? 'bg-blue-100 ring-1 ring-blue-300' : ''
        }`}
        style={{ 
          backgroundColor: selectedCell?.filmId === film.id && selectedCell?.field === field ? undefined :
                          selectedCells.has(`${film.id}-${field}`) ? undefined :
                          (cellHighlight || 'transparent')
        }}
        onClick={(e) => {
          if (selectedColor) {
            e.preventDefault()
            handleCellHighlight(film.id, field)
          } else {
            handleCellClick(film.id, field, e)
          }
        }}
        onMouseDown={(e) => {
          if (selectedColor) {
            handleMouseDown(e, film.id, field)
          } else {
            handleCellMouseDown(film.id, field, e)
          }
        }}
        onMouseEnter={() => {
          if (selectedColor) {
            handleMouseEnter(film.id, field)
          } else {
            handleCellMouseEnter(film.id, field)
          }
        }}
        onContextMenu={(e) => handleRightClick(e, film.id, field)}
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
            {canEditProgrammingPipeline && (
              <button
                onClick={exportFilmsGridTemplate}
                className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
              >
                📄 Create Films Grid Template
              </button>
            )}
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 font-medium"
            >
              Upload CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
            >
              Add Film
            </button>
            
            {/* Download Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium flex items-center space-x-2"
              >
                <span>Download</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showDownloadDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showDownloadDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  <button
                    onClick={() => {
                      exportToCSV()
                      setShowDownloadDropdown(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-md flex items-center space-x-2"
                  >
                    <span>📄</span>
                    <span>Download CSV</span>
                  </button>
                  <button
                    onClick={() => {
                      exportToExcel()
                      setShowDownloadDropdown(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-md flex items-center space-x-2"
                  >
                    <span>📊</span>
                    <span>Download Excel</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search films, directors, countries..."
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
      <div className="px-6 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <ColorPalette 
          selectedColor={selectedColor}
          onColorSelect={setSelectedColor}
        />
        
        {/* Sticky Note Creator Tool */}
        <button
          onClick={() => {
            const gridContainer = document.querySelector('.overflow-auto')
            if (gridContainer) {
              handleCreateStickyNote(100, 100)
            }
          }}
          className="bg-yellow-400 hover:bg-yellow-500 text-yellow-800 px-3 py-2 rounded-lg shadow-sm font-medium flex items-center space-x-2 border border-yellow-600"
          title="Add Sticky Note"
        >
          <span className="text-lg">📝</span>
          <span className="text-sm">Add Note</span>
        </button>
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden bg-white relative">
        <div 
          className="overflow-auto relative focus:outline-none" 
          style={{ height: 'calc(100vh - 300px)', overflowX: 'auto', overflowY: 'auto' }} 
          onMouseUp={handleMouseUp}
          onDoubleClick={handleGridDoubleClick}
          onContextMenu={(e) => e.preventDefault()}
          tabIndex={0}
        >
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
                    { key: 'cards_made', label: 'Cards Made', width: 100, sortable: true }
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
                        className="absolute right-0 top-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-300 opacity-0 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => handleResizeStart(e, column.key)}
                        title="Drag to resize column"
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
                    <td 
                      className={`px-3 py-2 text-sm text-gray-900 border-r border-gray-100 sticky left-0 bg-white z-10 cursor-pointer ${
                        selectedCell?.filmId === film.id && selectedCell?.field === 'film' ? 'ring-2 ring-blue-500 bg-blue-50' : 
                        selectedCells.has(`${film.id}-film`) ? 'bg-blue-100 ring-1 ring-blue-300' : ''
                      }`} 
                      style={{ minWidth: `${columnWidths['film'] || 200}px`, maxWidth: `${columnWidths['film'] || 200}px` }}
                      onClick={(e) => handleCellClick(film.id, 'film', e)}
                      onMouseDown={(e) => handleCellMouseDown(film.id, 'film', e)}
                      onMouseEnter={() => handleCellMouseEnter(film.id, 'film')}
                      onContextMenu={(e) => handleRightClick(e, film.id, 'film')}
                    >
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
          
          {/* Sticky Notes */}
          {stickyNotes.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              onUpdate={handleUpdateStickyNote}
              onDelete={handleDeleteStickyNote}
              isDragging={draggingStickyNote === note.id}
              onDragStart={handleStickyNoteDragStart}
              onDragEnd={handleStickyNoteDragEnd}
            />
          ))}
        </div>
      </div>

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Upload CSV Files - Step {uploadStep === 'films' ? '1' : '2'} of 2
            </h3>
            
            {uploadStep === 'films' ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  First, upload the <strong>Films CSV</strong> containing film information (title, director, category, etc.)
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Films CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFilmsCSVUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Now upload the <strong>Schedule CSV</strong> containing screening times and locations.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleScheduleCSVUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                </div>
              </div>
            )}
            
            {uploading && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600 mt-2">Processing...</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadStep('films')
                }}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
      
      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[120px]"
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleContextMenuAction('copy')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <span>📋</span>
            <span>Copy</span>
          </button>
          
          {editableFields.includes(contextMenu.field) && (
            <>
              <button
                onClick={() => handleContextMenuAction('paste')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!clipboard}
              >
                <span>📄</span>
                <span>Paste</span>
              </button>
              
              <button
                onClick={() => handleContextMenuAction('delete')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <span>🗑️</span>
                <span>Clear</span>
              </button>
              
              <hr className="my-1 border-gray-200" />
              
              <button
                onClick={() => handleContextMenuAction('edit')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <span>✏️</span>
                <span>Edit</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}