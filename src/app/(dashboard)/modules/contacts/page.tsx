'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { ContactCard } from '@/types'
import { ContactFormModal } from '@/components/forms/contact-form-modal'
import { FilmCardPopup } from '@/components/cards/film-card-popup'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'
import * as XLSX from 'xlsx-js-style'

type ViewMode = 'by-contact' | 'by-film'
type FilmViewMode = 'features' | 'shorts'

export default function ContactsPage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const [viewMode, setViewMode] = useState<ViewMode>('by-contact')
  const [filmViewMode, setFilmViewMode] = useState<FilmViewMode>('features')
  
  // Contact-related state
  const [contacts, setContacts] = useState<ContactCard[]>([])
  const [filteredContacts, setFilteredContacts] = useState<ContactCard[]>([])
  
  // Film-related state
  const [films, setFilms] = useState<any[]>([])
  const [filteredFilms, setFilteredFilms] = useState<any[]>([])
  
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContactType, setSelectedContactType] = useState('')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'last_name', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactCard | null>(null)
  const [selectedFilm, setSelectedFilm] = useState<any>(null)
  const [showFilmCard, setShowFilmCard] = useState(false)
  const [existingFilms, setExistingFilms] = useState<Set<string>>(new Set())
  
  // Film assignment modal state
  const [showFilmAssignmentModal, setShowFilmAssignmentModal] = useState(false)
  const [assigningContact, setAssigningContact] = useState<ContactCard | null>(null)
  const [availableFilms, setAvailableFilms] = useState<any[]>([])
  const [selectedFilmIds, setSelectedFilmIds] = useState<Set<string>>(new Set())
  const [contactRole, setContactRole] = useState('')

  const supabase = createClient()

  // Utility function to extract last name for sorting
  const getLastName = (fullName: string) => {
    if (!fullName) return ''
    const parts = fullName.trim().split(' ')
    return parts[parts.length - 1].toLowerCase()
  }

  // Check if user has edit permissions for contacts
  const canEditContacts = permissions?.modulePermissions?.['contactsManagement']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false

  // Export template function for Contacts
  const exportContactsTemplate = () => {
    // Define headers with proper display names
    const headerMapping = [
      { field: 'contact_name', display: 'Contact Name' },
      { field: 'contact_company', display: 'Company' },
      { field: 'contact_email', display: 'Email' },
      { field: 'phone', display: 'Phone' },
      { field: 'contact_type', display: 'Contact Type' },
      { field: 'mailing_address', display: 'Mailing Address' },
      { field: 'notes', display: 'Notes' },
      { field: 'film_assignments', display: 'Film Assignments' },
      { field: 'contact_role', display: 'Contact Role' }
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
    
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts Template')
    XLSX.writeFile(wb, 'contacts_import_template.xlsx')
  }

  // Load existing films and programs only when Show Films toggle is activated
  useEffect(() => {
    const loadExistingFilms = async () => {
      if (!showFilmsMode) {
        setExistingFilms(new Set())
        return
      }

      try {
        const [featureFilms, shortFilms, programs] = await Promise.all([
          supabase.from('feature_films').select('title'),
          supabase.from('short_films').select('title'),
          supabase.from('programs').select('title')
        ])

        const allTitles = new Set<string>()
        
        if (featureFilms.data) {
          featureFilms.data.forEach(film => allTitles.add(film.title))
        }
        if (shortFilms.data) {
          shortFilms.data.forEach(film => allTitles.add(film.title))
        }
        if (programs.data) {
          programs.data.forEach(program => allTitles.add(program.title))
        }

        setExistingFilms(allTitles)
      } catch (error) {
        console.error('Error loading film/program titles:', error)
      }
    }

    loadExistingFilms()
  }, [showFilmsMode, supabase])

  const loadFilms = useCallback(async () => {
    setLoading(true)
    try {
      // Load features and shorts with their contacts
      const [featuresResponse, shortsResponse] = await Promise.all([
        supabase
          .from('feature_films')
          .select('id, title, director, countries, program_1, program_2, program_3, program_4')
          .order('title'),
        supabase
          .from('short_films')
          .select(`
            id, title, director, countries, program_1, program_2, program_3,
            shorts_programs(id, program_name, program_number)
          `)
          .order('title')
      ])

      if (featuresResponse.error || shortsResponse.error) {
        console.error('Error loading films:', featuresResponse.error || shortsResponse.error)
        setFilms([])
        setFilteredFilms([])
        return
      }

      // Load contacts for each film
      const allFilms = []
      
      // Process features
      for (const feature of featuresResponse.data || []) {
        const { data: filmContacts } = await supabase
          .from('film_contacts')
          .select('name, company, email, contact_type')
          .eq('film_id', feature.id)
          .eq('film_type', 'feature')

        allFilms.push({
          ...feature,
          film_type: 'feature',
          contacts: filmContacts || [],
          programs: [feature.program_1, feature.program_2, feature.program_3, feature.program_4]
            .filter(Boolean).join(', ')
        })
      }
      
      // Process shorts
      for (const short of shortsResponse.data || []) {
        const { data: filmContacts } = await supabase
          .from('film_contacts')
          .select('name, company, email, contact_type')
          .eq('film_id', short.id)
          .eq('film_type', 'short')

        allFilms.push({
          ...short,
          film_type: 'short',
          contacts: filmContacts || [],
          programs: [short.program_1, short.program_2, short.program_3]
            .filter(Boolean).join(', '),
          shorts_program_name: short.shorts_programs?.program_name || ''
        })
      }

      setFilms(allFilms)
      setFilteredFilms(allFilms)
    } catch (error) {
      console.error('Error loading films:', error)
      setFilms([])
      setFilteredFilms([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const loadContacts = useCallback(async () => {
    setLoading(true)
    try {
      // Load contacts with associated film count
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .order('contact_name')

      if (contactsError) {
        console.error('Error loading contacts:', contactsError)
        setContacts([])
        setFilteredContacts([])
        return
      }

      // Always load film associations for the new contact view
      let contactsWithFilms
        contactsWithFilms = await Promise.all(
        (contactsData || []).map(async (contact) => {
          // Get film contacts that match this contact's name
          const { data: filmContacts } = await supabase
            .from('film_contacts')
            .select('film_id, film_type, name')
            .eq('name', contact.contact_name)
          
          if (!filmContacts || filmContacts.length === 0) {
            return {
              ...contact,
              associated_films: [],
              associated_films_data: []
            }
          }

          // Get actual film data from both tables
          const associatedFilms = []
          const associatedFilmsData = []
          
          for (const fc of filmContacts) {
            try {
              if (fc.film_type === 'feature') {
                const { data: featureFilm } = await supabase
                  .from('feature_films')
                  .select('id, title, director, countries, program_1, program_2, program_3, program_4, genre_1, genre_2, genre_3, genre_4')
                  .eq('id', fc.film_id)
                  .single()
                
                if (featureFilm) {
                  associatedFilms.push(featureFilm.title)
                  associatedFilmsData.push({
                    id: featureFilm.id,
                    title: featureFilm.title,
                    film_type: 'feature' as const,
                    director: featureFilm.director,
                    countries: featureFilm.countries,
                    programs: [featureFilm.program_1, featureFilm.program_2, featureFilm.program_3, featureFilm.program_4]
                      .filter(Boolean).join(', ')
                  })
                }
              } else if (fc.film_type === 'short') {
                const { data: shortFilm } = await supabase
                  .from('short_films')
                  .select('id, title, director, countries, program_1, program_2, program_3, genre_1, genre_2, genre_3')
                  .eq('id', fc.film_id)
                  .single()
                
                if (shortFilm) {
                  associatedFilms.push(shortFilm.title)
                  associatedFilmsData.push({
                    id: shortFilm.id,
                    title: shortFilm.title,
                    film_type: 'short' as const,
                    director: shortFilm.director,
                    countries: shortFilm.countries,
                    programs: [shortFilm.program_1, shortFilm.program_2, shortFilm.program_3]
                      .filter(Boolean).join(', ')
                  })
                }
              }
            } catch (error) {
              console.error('Error loading film title:', error)
            }
          }

          return {
            ...contact,
            associated_films: associatedFilms,
            associated_films_data: associatedFilmsData
          }
        })
        )
      } else {
        // When toggle is off, just load basic contact data with empty film arrays
        contactsWithFilms = (contactsData || []).map(contact => ({
          ...contact,
          associated_films: [],
          associated_films_data: []
        }))
      }

      setContacts(contactsWithFilms)
      setFilteredContacts(contactsWithFilms)
    } catch (error) {
      console.error('Error loading contacts:', error)
      setContacts([])
      setFilteredContacts([])
    } finally {
      setLoading(false)
    }
  }, [supabase, showFilmsMode])

  useEffect(() => {
    if (viewMode === 'by-contact') {
      loadContacts()
    } else {
      loadFilms()
    }
  }, [loadContacts, loadFilms, viewMode])

  // CSV parsing function
  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = []
    let currentRow: string[] = []
    let currentField = ''
    let inQuotes = false
    let i = 0

    while (i < text.length) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"'
          i += 2
          continue
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        currentRow.push(currentField.trim())
        currentField = ''
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        // Row separator
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField.trim())
          if (currentRow.some(field => field.length > 0)) {
            rows.push(currentRow)
          }
          currentRow = []
          currentField = ''
        }
      } else {
        currentField += char
      }
      i++
    }

    // Handle last row
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim())
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow)
      }
    }

    return rows
  }

  // CSV upload handler
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadStatus('Processing CSV...')

    try {
      const text = await file.text()
      const rows = parseCSV(text)
      
      if (rows.length === 0) {
        setUploadStatus('Error: CSV file is empty')
        return
      }

      const headers = rows[0]
      
      // Field mapping for Contacts CSV
      const fieldMap: Record<string, string> = {
        'Contact Name': 'contact_name',
        'Company': 'contact_company',
        'Email': 'contact_email',
        'Phone': 'phone',
        'Contact Type': 'contact_type',
        'Mailing Address': 'mailing_address',
        'Notes': 'notes',
        'Film Assignments': 'film_assignments', // Format: "Film Title 1|Role, Film Title 2|Role"
        'Contact Role': 'contact_role' // Default role for all assignments if Film Assignments doesn't specify
      }

      // Process data rows
      const contactData = []
      const filmAssignments: Array<{contact: any, assignments: string, defaultRole?: string}> = []
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        const contactRecord: any = {}
        let filmAssignmentsText = ''
        let defaultRole = ''
        
        headers.forEach((header, index) => {
          const fieldName = fieldMap[header]
          if (fieldName && row[index]) {
            let value = row[index].trim()
            if (fieldName === 'film_assignments') {
              filmAssignmentsText = value
            } else if (fieldName === 'contact_role') {
              defaultRole = value
            } else {
              contactRecord[fieldName] = value
            }
          }
        })
        
        // Only add if we have required fields
        if (contactRecord.contact_name) {
          // Add user ID for created_by
          contactRecord.created_by = user?.id
          contactData.push(contactRecord)
          
          // Store film assignments for processing after contact creation
          if (filmAssignmentsText) {
            filmAssignments.push({
              contact: contactRecord,
              assignments: filmAssignmentsText,
              defaultRole
            })
          }
        }
      }

      if (contactData.length === 0) {
        setUploadStatus('Error: No valid contact data found in CSV')
        return
      }

      setUploadStatus(`Uploading ${contactData.length} contacts...`)

      // Insert contacts into database
      const { data: insertedContacts, error } = await supabase
        .from('contacts')
        .insert(contactData)
        .select('id, contact_name')

      if (error) {
        console.error('Upload error:', error)
        setUploadStatus(`Error: ${error.message}`)
        return
      }

      let filmAssignmentCount = 0

      // Process film assignments if any
      if (filmAssignments.length > 0) {
        setUploadStatus(`Processing film assignments...`)
        
        // Load all films to match titles
        const [featuresResponse, shortsResponse] = await Promise.all([
          supabase.from('feature_films').select('id, title').order('title'),
          supabase.from('short_films').select('id, title').order('title')
        ])

        const allFilms = [
          ...(featuresResponse.data || []).map(f => ({ ...f, film_type: 'feature' })),
          ...(shortsResponse.data || []).map(s => ({ ...s, film_type: 'short' }))
        ]

        // Process each contact's film assignments
        for (const { contact, assignments, defaultRole } of filmAssignments) {
          // Find the inserted contact ID
          const insertedContact = insertedContacts?.find(c => c.contact_name === contact.contact_name)
          if (!insertedContact) continue

          // Parse assignments: "Film Title 1|Role, Film Title 2|Role"
          const assignmentList = assignments.split(',').map(a => a.trim())
          
          for (const assignment of assignmentList) {
            let filmTitle: string
            let role: string

            if (assignment.includes('|')) {
              [filmTitle, role] = assignment.split('|').map(s => s.trim())
            } else {
              filmTitle = assignment.trim()
              role = defaultRole || contact.contact_type || 'Other'
            }

            // Find matching film
            const film = allFilms.find(f => f.title.toLowerCase() === filmTitle.toLowerCase())
            if (film) {
              try {
                await supabase.from('film_contacts').upsert({
                  film_id: film.id,
                  film_type: film.film_type,
                  name: contact.contact_name,
                  company: contact.contact_company,
                  email: contact.contact_email,
                  contact_type: role,
                  contact_id: insertedContact.id
                }, {
                  onConflict: 'film_id,name,contact_type'
                })
                filmAssignmentCount++
              } catch (error) {
                console.error(`Error assigning ${contact.contact_name} to ${filmTitle}:`, error)
              }
            }
          }
        }
      }

      setUploadStatus(`Successfully uploaded ${contactData.length} contacts${filmAssignmentCount > 0 ? ` with ${filmAssignmentCount} film assignments` : ''}!`)
      
      // Reload the contacts
      if (viewMode === 'by-contact') {
        loadContacts()
      } else {
        loadFilms()
      }

    } catch (error) {
      console.error('CSV processing error:', error)
      setUploadStatus('Error: Failed to process CSV file')
    } finally {
      setUploading(false)
      // Clear the file input
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleFilmClick = (filmData: any) => {
    setSelectedFilm(filmData)
    setShowFilmCard(true)
  }

  // Filter and search
  useEffect(() => {
    let filtered = contacts

    // Search filter with accent-insensitive search
    if (searchTerm) {
      const searchFilter = createAccentInsensitiveFilter<ContactCard>(
        searchTerm,
        (contact) => [
          contact.contact_name,
          contact.contact_company,
          contact.contact_email,
          contact.contact_type
        ]
      )
      filtered = filtered.filter(searchFilter)
    }

    // Contact type filter
    if (selectedContactType) {
      filtered = filtered.filter(contact => contact.contact_type === selectedContactType)
    }

    setFilteredContacts(filtered)
  }, [contacts, searchTerm, selectedContactType])

  // Sort contacts with special handling for last name
  const sortedContacts = useMemo(() => {
    if (!sortConfig) return filteredContacts

    return [...filteredContacts].sort((a, b) => {
      let aVal: any, bVal: any

      // Special handling for last name sorting
      if (sortConfig.key === 'last_name') {
        aVal = getLastName(a.contact_name || '')
        bVal = getLastName(b.contact_name || '')
      } else {
        aVal = a[sortConfig.key as keyof ContactCard]
        bVal = b[sortConfig.key as keyof ContactCard]
      }

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const result = aVal.localeCompare(bVal)
        return sortConfig.direction === 'asc' ? result : -result
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredContacts, sortConfig])

  // Sort and filter films based on film view mode
  const sortedFilms = useMemo(() => {
    const filtered = films.filter(film => 
      viewMode === 'by-film' ? film.film_type === filmViewMode : true
    )
    
    return filtered.sort((a, b) => a.title.localeCompare(b.title))
  }, [films, filmViewMode, viewMode])

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return '↕️'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const handleAddContact = () => {
    setEditingContact(null)
    setShowAddModal(true)
  }

  const handleEditContact = (contact: ContactCard) => {
    setEditingContact(contact)
    setShowAddModal(true)
  }

  const handleDeleteContact = async (contact: ContactCard) => {
    if (!confirm(`Are you sure you want to delete contact "${contact.contact_name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contact.id)

      if (error) {
        console.error('Error deleting contact:', error)
        alert('Error deleting contact')
      } else {
        loadContacts()
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
      alert('Error deleting contact')
    }
  }

  const contactTypes = Array.from(new Set(
    contacts.map(c => c.contact_type).filter(Boolean)
  )).sort()

  // Film assignment functions
  const handleAssignFilms = async (contact: ContactCard) => {
    setAssigningContact(contact)
    setContactRole('')
    setSelectedFilmIds(new Set())
    
    // Load all available films
    try {
      const [featuresResponse, shortsResponse] = await Promise.all([
        supabase.from('feature_films').select('id, title, director').order('title'),
        supabase.from('short_films').select('id, title, director').order('title')
      ])

      const allFilms = [
        ...(featuresResponse.data || []).map(f => ({ ...f, film_type: 'feature' })),
        ...(shortsResponse.data || []).map(s => ({ ...s, film_type: 'short' }))
      ]

      setAvailableFilms(allFilms)
      setShowFilmAssignmentModal(true)
    } catch (error) {
      console.error('Error loading films for assignment:', error)
    }
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

  const handleSaveFilmAssignments = async () => {
    if (!assigningContact || selectedFilmIds.size === 0 || !contactRole) {
      alert('Please select films and specify a contact role')
      return
    }

    try {
      // Create film_contacts entries for each selected film
      const assignments = Array.from(selectedFilmIds).map(filmId => {
        const film = availableFilms.find(f => f.id === filmId)
        return {
          film_id: filmId,
          film_type: film?.film_type || 'feature',
          name: assigningContact.contact_name,
          company: assigningContact.contact_company,
          email: assigningContact.contact_email,
          contact_type: contactRole,
          contact_id: assigningContact.id
        }
      })

      const { error } = await supabase
        .from('film_contacts')
        .upsert(assignments, {
          onConflict: 'film_id,name,contact_type',
          ignoreDuplicates: false
        })

      if (error) {
        console.error('Error saving film assignments:', error)
        alert('Error saving film assignments')
      } else {
        setShowFilmAssignmentModal(false)
        if (viewMode === 'by-contact') {
          loadContacts()
        } else {
          loadFilms()
        }
      }
    } catch (error) {
      console.error('Error saving film assignments:', error)
      alert('Error saving film assignments')
    }
  }


  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contacts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📇</span>
            <h1 className="text-2xl font-semibold text-gray-900">Contacts Management</h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-4">
          <button
            onClick={() => setViewMode('by-contact')}
            className={`px-4 py-2 rounded-t-lg font-medium ${
              viewMode === 'by-contact'
                ? 'bg-white border-t border-l border-r border-gray-300 text-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            By Contact
          </button>
          <button
            onClick={() => setViewMode('by-film')}
            className={`px-4 py-2 rounded-t-lg font-medium ${
              viewMode === 'by-film'
                ? 'bg-white border-t border-l border-r border-gray-300 text-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            By Film
          </button>
        </div>

        {/* Film sub-tabs (only show when in by-film mode) */}
        {viewMode === 'by-film' && (
          <div className="flex space-x-1 mb-4">
            <button
              onClick={() => setFilmViewMode('features')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filmViewMode === 'features'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Features
            </button>
            <button
              onClick={() => setFilmViewMode('shorts')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filmViewMode === 'shorts'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Shorts
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div></div>
          
          <div className="flex items-center space-x-4">
            {canEditContacts && (
              <>
                <button
                  onClick={exportContactsTemplate}
                  className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
                >
                  📄 Create Contacts Template
                </button>
                <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer transition-colors font-medium">
                  {uploading ? 'Uploading...' : '📂 Upload CSV'}
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </>
            )}
            <button
              onClick={() => setShowFilmsMode(!showFilmsMode)}
              className={`px-4 py-2 rounded-md transition-colors font-medium ${
                showFilmsMode 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              🎬 {showFilmsMode ? 'Hide Films' : 'Show Films'}
            </button>
            {canEditContacts && (
              <button
                onClick={handleAddContact}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Add Contact
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upload Status */}
      {uploadStatus && (
        <div className="px-6">
          <div className={`mt-3 p-3 rounded-md ${
            uploadStatus.includes('Error') 
              ? 'bg-red-100 text-red-700 border border-red-200'
              : uploadStatus.includes('Successfully')
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {uploadStatus}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Contact Type Filter */}
          <div>
            <select
              value={selectedContactType}
              onChange={(e) => setSelectedContactType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {contactTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('')
              setSelectedContactType('')
            }}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            
            {/* BY CONTACT VIEW */}
            {viewMode === 'by-contact' && (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      { key: 'last_name', label: 'Name (by Last)', width: 200 },
                      { key: 'contact_company', label: 'Company', width: 200 },
                      { key: 'contact_email', label: 'Email', width: 250 },
                      { key: 'phone', label: 'Phone', width: 150 },
                      { key: 'contact_type', label: 'Type', width: 150 },
                      { key: 'associated_films', label: 'Associated Films', width: 300 },
                      { key: 'actions', label: 'Actions', width: 160 }
                    ].map((column) => (
                    <th
                      key={column.key}
                      className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      style={{ minWidth: `${columnWidths[column.key] || column.width}px` }}
                      onClick={() => column.key !== 'actions' && handleSort(column.key)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{column.label}</span>
                        {column.key !== 'actions' && (
                          <span className="text-gray-400 ml-1">
                            {getSortIcon(column.key)}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contact_name'] || 200}px` }}>
                      <span className="font-medium">{contact.contact_name}</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contact_company'] || 200}px` }}>
                      {contact.contact_company}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contact_email'] || 250}px` }}>
                      {contact.contact_email && (
                        <a href={`mailto:${contact.contact_email}`} className="text-blue-600 hover:text-blue-800">
                          {contact.contact_email}
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['phone'] || 150}px` }}>
                      {contact.phone}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contact_type'] || 150}px` }}>
                      {contact.contact_type && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {contact.contact_type}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['associated_films'] || 300}px` }}>
                      {contact.associated_films_data && contact.associated_films_data.length > 0 ? (
                        <div className="max-w-xs">
                          {contact.associated_films_data.map((film, index) => (
                            <span key={film.id}>
                              {showFilmsMode ? (
                                <button
                                  onClick={() => handleFilmClick(film)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
                                >
                                  {film.title}
                                </button>
                              ) : (
                                <span className="text-gray-900 text-xs">{film.title}</span>
                              )}
                              {index < contact.associated_films_data!.length - 1 && (
                                <span className="text-gray-400">, </span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No associated films</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900" style={{ minWidth: `${columnWidths['actions'] || 160}px` }}>
                      <div className="flex space-x-1 flex-wrap gap-1">
                        <button
                          onClick={() => handleEditContact(contact)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleAssignFilms(contact)}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          Assign Films
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact)}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            )}

            {/* BY FILM VIEW */}
            {viewMode === 'by-film' && (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      { key: 'title', label: 'Film Title', width: 300 },
                      { key: 'director', label: 'Director', width: 200 },
                      { key: 'film_type', label: 'Type', width: 80 },
                      { key: 'programs', label: 'Programs', width: 200 },
                      ...(filmViewMode === 'shorts' ? [{ key: 'shorts_program_name', label: 'Shorts Program', width: 200 }] : []),
                      { key: 'contacts', label: 'Contacts', width: 400 }
                    ].map((column) => (
                      <th
                        key={column.key}
                        className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50"
                        style={{ minWidth: `${column.width}px` }}
                      >
                        <span>{column.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedFilms.map((film) => (
                    <tr key={film.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">
                        <button
                          onClick={() => handleFilmClick(film)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {film.title}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">
                        {film.director}
                      </td>
                      <td className="px-3 py-2 text-sm border-r border-gray-100">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          film.film_type === 'feature' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {film.film_type === 'feature' ? 'Feature' : 'Short'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">
                        {film.programs}
                      </td>
                      {filmViewMode === 'shorts' && (
                        <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">
                          {film.shorts_program_name}
                        </td>
                      )}
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {film.contacts && film.contacts.length > 0 ? (
                          <div className="max-w-sm">
                            {film.contacts.map((contact: any, index: number) => (
                              <div key={index} className="text-xs mb-1">
                                <span className="font-medium">{contact.name}</span>
                                {contact.company && <span className="text-gray-500"> ({contact.company})</span>}
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                  {contact.contact_type}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No contacts assigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

          </div>
        </div>

        {/* Empty state messages */}
        {viewMode === 'by-contact' && sortedContacts.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">📇</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || selectedContactType ? 'Try adjusting your filters' : 'Get started by adding your first contact'}
            </p>
            {canEditContacts && (
              <button
                onClick={handleAddContact}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Add Contact
              </button>
            )}
          </div>
        )}

        {viewMode === 'by-film' && sortedFilms.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">🎬</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No {filmViewMode} found</h3>
            <p className="text-gray-500 mb-4">
              No {filmViewMode} have been uploaded yet
            </p>
          </div>
        )}
      </div>

      {/* Contact Form Modal */}
      <ContactFormModal
        contact={editingContact}
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditingContact(null)
        }}
        onSave={() => {
          setShowAddModal(false)
          setEditingContact(null)
          loadContacts()
        }}
      />

      {/* Film Card Popup */}
      {showFilmCard && selectedFilm && (
        <FilmCardPopup
          film={selectedFilm}
          onClose={() => {
            setShowFilmCard(false)
            setSelectedFilm(null)
          }}
        />
      )}

      {/* Film Assignment Modal */}
      {showFilmAssignmentModal && assigningContact && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Assign Films to {assigningContact.contact_name}
                </h3>

                {/* Contact Role Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Role *
                  </label>
                  <select
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select role...</option>
                    <option value="Distributor/Studio">Distributor/Studio</option>
                    <option value="Production Team">Production Team</option>
                    <option value="Publicity">Publicity</option>
                    <option value="Sales Agent">Sales Agent</option>
                    <option value="Filmmaker">Filmmaker</option>
                    <option value="Producer">Producer</option>
                    <option value="Director">Director</option>
                    <option value="Press/Media">Press/Media</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Film Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Films ({selectedFilmIds.size} selected)
                  </label>
                  <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                    {availableFilms.map((film) => (
                      <label key={film.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFilmIds.has(film.id)}
                          onChange={(e) => handleFilmSelection(film.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">{film.title}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              film.film_type === 'feature' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {film.film_type === 'feature' ? 'Feature' : 'Short'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{film.director}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSaveFilmAssignments}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Assign Films
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilmAssignmentModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}