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
  const [filmSortConfig, setFilmSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'title', direction: 'asc' })
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
      { field: 'film_title', display: 'Film Title' },
      { field: 'contact_name', display: 'Contact Name' },
      { field: 'contact_company', display: 'Company' },
      { field: 'contact_email', display: 'Email' },
      { field: 'phone', display: 'Phone' },
      { field: 'contact_type', display: 'Contact Type' },
      { field: 'mailing_address', display: 'Mailing Address' },
      { field: 'notes', display: 'Notes' },
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
  }, [supabase])

  const loadFilms = useCallback(async () => {
    setLoading(true)
    try {
      // Load all films and all contacts in parallel (only 3 queries total instead of N+1)
      const [featuresResponse, shortsResponse, allContactsResponse] = await Promise.all([
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
          .order('title'),
        supabase
          .from('film_contacts')
          .select('film_id, film_type, name, company, email, contact_type')
      ])

      if (featuresResponse.error || shortsResponse.error || allContactsResponse.error) {
        console.error('Error loading films:', featuresResponse.error || shortsResponse.error || allContactsResponse.error)
        setFilms([])
        setFilteredFilms([])
        return
      }

      // Create a map of film_id + film_type -> contacts for fast lookup
      const contactsMap: { [key: string]: any[] } = {}
      for (const contact of allContactsResponse.data || []) {
        const key = `${contact.film_id}-${contact.film_type}`
        if (!contactsMap[key]) {
          contactsMap[key] = []
        }
        contactsMap[key].push({
          name: contact.name,
          company: contact.company,
          email: contact.email,
          contact_type: contact.contact_type
        })
      }

      const allFilms = []
      
      // Process features - all features will appear even without contacts
      for (const feature of featuresResponse.data || []) {
        const contactKey = `${feature.id}-feature`
        allFilms.push({
          ...feature,
          film_type: 'feature',
          contacts: contactsMap[contactKey] || [], // Empty array if no contacts
          programs: [feature.program_1, feature.program_2, feature.program_3, feature.program_4]
            .filter(Boolean).join(', ')
        })
      }
      
      // Process shorts - all shorts will appear even without contacts
      for (const short of shortsResponse.data || []) {
        const contactKey = `${short.id}-short`
        allFilms.push({
          ...short,
          film_type: 'short',
          contacts: contactsMap[contactKey] || [], // Empty array if no contacts
          programs: [short.program_1, short.program_2, short.program_3]
            .filter(Boolean).join(', '),
          shorts_program_name: short.shorts_programs?.program_name || ''
        })
      }

      console.log(`Loaded ${allFilms.length} films (${featuresResponse.data?.length} features, ${shortsResponse.data?.length} shorts)`)
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

      // Load all film_contacts associations
      const { data: allFilmContacts } = await supabase
        .from('film_contacts')
        .select('film_id, film_type, contact_id, contact_type')
      
      // Load all films to get titles
      const [featuresResponse, shortsResponse] = await Promise.all([
        supabase.from('feature_films').select('id, title'),
        supabase.from('short_films').select('id, title')
      ])
      
      const featureFilmsMap = new Map((featuresResponse.data || []).map(f => [f.id, f]))
      const shortFilmsMap = new Map((shortsResponse.data || []).map(s => [s.id, s]))

      // Process contacts with their film associations
      const contactsWithFilms = (contactsData || []).map(contact => {
        // Find all film associations for this contact by contact_id
        const contactFilmAssociations = (allFilmContacts || []).filter(
          fc => fc.contact_id === contact.id
        )
        
        const associatedFilmsData = []
        const associatedFilms = []
        
        for (const fc of contactFilmAssociations) {
          let film = null
          if (fc.film_type === 'feature') {
            film = featureFilmsMap.get(fc.film_id)
          } else if (fc.film_type === 'short') {
            film = shortFilmsMap.get(fc.film_id)
          }
          
          if (film) {
            associatedFilms.push(film.title)
            associatedFilmsData.push({
              id: film.id,
              title: film.title,
              film_type: fc.film_type,
              contact_type: fc.contact_type
            })
          }
        }
        
        // Remove duplicates and sort
        const uniqueFilms = Array.from(new Set(associatedFilms)).sort()
        const uniqueFilmsData = associatedFilmsData.filter(
          (film, index, self) => index === self.findIndex(f => f.id === film.id)
        ).sort((a, b) => a.title.localeCompare(b.title))

        return {
          ...contact,
          associated_films: uniqueFilms,
          associated_films_data: uniqueFilmsData
        }
      })

      setContacts(contactsWithFilms)
      setFilteredContacts(contactsWithFilms)
    } catch (error) {
      console.error('Error loading contacts:', error)
      setContacts([])
      setFilteredContacts([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

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
    console.log('NEW CSV UPLOAD HANDLER CALLED')
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
        'Film Title': 'film_title',
        'Contact Name': 'contact_name',
        'Company': 'contact_company',
        'Email': 'contact_email',
        'Phone': 'phone',
        'Contact Type': 'contact_type',
        'Mailing Address': 'mailing_address',
        'Notes': 'notes',
        'Contact Role': 'contact_role'
      }

      // Group contacts by email to avoid duplicates
      const contactsByEmail = new Map<string, {
        contactData: any,
        filmAssignments: Array<{filmTitle: string, role: string}>
      }>()
      
      // Process all rows and group by email
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        
        // Skip completely empty rows
        if (!row || row.length === 0 || row.every(cell => !cell || !cell.trim())) {
          continue
        }
        
        const contactRecord: any = {}
        let filmTitle = ''
        let contactRole = ''
        
        headers.forEach((header, index) => {
          const fieldName = fieldMap[header]
          if (fieldName && row[index]) {
            let value = row[index].trim()
            if (fieldName === 'film_title') {
              filmTitle = value
            } else if (fieldName === 'contact_role') {
              contactRole = value
            } else {
              contactRecord[fieldName] = value
            }
          }
        })
        
        // Only process if we have a name and email
        if (contactRecord.contact_name && contactRecord.contact_email) {
          const email = contactRecord.contact_email.toLowerCase()
          
          if (!contactsByEmail.has(email)) {
            // First occurrence of this email - create new contact entry
            contactRecord.created_by = user?.id
            contactsByEmail.set(email, {
              contactData: contactRecord,
              filmAssignments: []
            })
          } else {
            // Update existing contact data with any new non-empty fields
            const existing = contactsByEmail.get(email)!
            Object.keys(contactRecord).forEach(key => {
              if (contactRecord[key] && !existing.contactData[key]) {
                existing.contactData[key] = contactRecord[key]
              }
            })
          }
          
          // Add film assignment if we have both title and role
          if (filmTitle && contactRole) {
            const contactEntry = contactsByEmail.get(email)!
            // Check if this film assignment already exists
            const existingAssignment = contactEntry.filmAssignments.find(
              fa => fa.filmTitle === filmTitle && fa.role === contactRole
            )
            if (!existingAssignment) {
              contactEntry.filmAssignments.push({ filmTitle, role: contactRole })
            }
          }
        }
      }

      if (contactsByEmail.size === 0) {
        setUploadStatus('Error: No valid contact data found in CSV')
        return
      }

      setUploadStatus(`Processing ${contactsByEmail.size} unique contacts...`)

      // Check for existing contacts in database
      const emails = Array.from(contactsByEmail.keys())
      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('id, contact_email, contact_name')
        .in('contact_email', emails)

      const existingEmailMap = new Map(
        (existingContacts || []).map(c => [c.contact_email.toLowerCase(), c])
      )

      // Separate contacts into new and existing
      const newContacts: any[] = []
      const updateContacts: any[] = []
      
      for (const [email, { contactData }] of contactsByEmail) {
        if (existingEmailMap.has(email)) {
          // Update existing contact
          const existing = existingEmailMap.get(email)!
          updateContacts.push({
            id: existing.id,
            ...contactData
          })
        } else {
          // New contact
          newContacts.push(contactData)
        }
      }

      // Insert new contacts
      let insertedContactsData: any[] = []
      if (newContacts.length > 0) {
        const { data, error } = await supabase
          .from('contacts')
          .insert(newContacts)
          .select('id, contact_email, contact_name')
        
        if (error) {
          console.error('Error inserting new contacts:', error)
          setUploadStatus(`Error: ${error.message}`)
          return
        }
        insertedContactsData = data || []
      }

      // Update existing contacts
      for (const contact of updateContacts) {
        const { error } = await supabase
          .from('contacts')
          .update(contact)
          .eq('id', contact.id)
        
        if (error) {
          console.error(`Error updating contact ${contact.contact_email}:`, error)
        }
      }

      // Create a map of all contacts (new and existing) by email
      const allContactsMap = new Map<string, any>()
      
      // Add newly inserted contacts
      insertedContactsData.forEach(c => {
        allContactsMap.set(c.contact_email.toLowerCase(), c)
      })
      
      // Add existing contacts
      existingEmailMap.forEach((contact, email) => {
        allContactsMap.set(email, contact)
      })

      // Process film assignments
      let filmAssignmentCount = 0
      if (Array.from(contactsByEmail.values()).some(c => c.filmAssignments.length > 0)) {
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
        for (const [email, { contactData, filmAssignments }] of contactsByEmail) {
          const contact = allContactsMap.get(email)
          if (!contact) continue

          for (const { filmTitle, role } of filmAssignments) {
            // Find matching film
            const film = allFilms.find(f => f.title.toLowerCase() === filmTitle.toLowerCase())
            if (film) {
              try {
                await supabase.from('film_contacts').upsert({
                  film_id: film.id,
                  film_type: film.film_type,
                  name: contact.contact_name,
                  company: contactData.contact_company,
                  email: contact.contact_email,
                  contact_type: role,
                  contact_id: contact.id
                }, {
                  onConflict: 'film_id,contact_id,contact_type'
                })
                filmAssignmentCount++
              } catch (error) {
                console.error(`Error assigning ${contact.contact_name} to ${filmTitle}:`, error)
              }
            }
          }
        }
      }

      const totalProcessed = newContacts.length + updateContacts.length
      setUploadStatus(
        `Successfully processed ${totalProcessed} contacts ` +
        `(${newContacts.length} new, ${updateContacts.length} updated)` +
        `${filmAssignmentCount > 0 ? ` with ${filmAssignmentCount} film assignments` : ''}!`
      )
      
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
    const filtered = films.filter(film => {
      if (viewMode !== 'by-film') return true
      // Convert plural filmViewMode to singular for matching
      const expectedType = filmViewMode === 'features' ? 'feature' : 'short'
      return film.film_type === expectedType
    })
    
    console.log(`Filtering ${films.length} films for ${filmViewMode}, got ${filtered.length} results`)
    
    // Apply sorting if filmSortConfig is set
    if (filmSortConfig) {
      return filtered.sort((a, b) => {
        let aVal, bVal
        
        // Handle different sortable fields
        if (filmSortConfig.key === 'title') {
          aVal = a.title || ''
          bVal = b.title || ''
        } else if (filmSortConfig.key === 'director') {
          aVal = a.director || ''
          bVal = b.director || ''
        } else if (filmSortConfig.key === 'shorts_program_name') {
          aVal = a.shorts_program_name || ''
          bVal = b.shorts_program_name || ''
        } else {
          aVal = a[filmSortConfig.key] || ''
          bVal = b[filmSortConfig.key] || ''
        }
        
        // Handle null/undefined values
        if (aVal === bVal) return 0
        if (!aVal && bVal) return 1
        if (aVal && !bVal) return -1
        
        // String comparison
        const result = String(aVal).localeCompare(String(bVal))
        return filmSortConfig.direction === 'asc' ? result : -result
      })
    }
    
    return filtered.sort((a, b) => a.title.localeCompare(b.title))
  }, [films, filmViewMode, viewMode, filmSortConfig])

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const handleFilmSort = (key: string) => {
    setFilmSortConfig(current => {
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

  const getFilmSortIcon = (key: string) => {
    if (filmSortConfig?.key !== key) return '↕️'
    return filmSortConfig.direction === 'asc' ? '↑' : '↓'
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
      <div className="flex-1 p-6">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)]">
            
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
                      { key: 'mailing_address', label: 'Mailing Address', width: 200 },
                      { key: 'contact_type', label: 'Type', width: 150 },
                      { key: 'associated_films', label: 'Film Title', width: 300 },
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
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['mailing_address'] || 200}px` }}>
                      {contact.mailing_address}
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
                              <button
                                onClick={() => handleFilmClick(film)}
                                className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
                              >
                                {film.title}
                              </button>
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
                      { key: 'title', label: 'Film Title', width: 300, sortable: true },
                      { key: 'contact_companies', label: 'Company', width: 200, sortable: false },
                      { key: 'contact_names', label: 'Names', width: 200, sortable: false },
                      { key: 'contact_emails', label: 'Emails', width: 250, sortable: false },
                      { key: 'contact_phones', label: 'Phone', width: 150, sortable: false },
                      { key: 'contact_mailing_addresses', label: 'Mailing Address', width: 200, sortable: false }
                    ].map((column) => (
                      <th
                        key={column.key}
                        className={`relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 ${
                          column.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                        }`}
                        style={{ 
                          minWidth: `${columnWidths[column.key] || column.width}px`,
                          width: columnWidths[column.key] || column.width
                        }}
                        onClick={column.sortable ? () => handleFilmSort(column.key) : undefined}
                      >
                        <div className="flex items-center justify-between">
                          <span>{column.label}</span>
                          {column.sortable && (
                            <span className="ml-1 text-gray-400">{getFilmSortIcon(column.key)}</span>
                          )}
                        </div>
                        {/* Resize handle */}
                        <div 
                          className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-blue-500 cursor-col-resize"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const startX = e.clientX;
                            const startWidth = columnWidths[column.key] || column.width;
                            
                            const handleMouseMove = (e: MouseEvent) => {
                              const diff = e.clientX - startX;
                              const newWidth = Math.max(80, startWidth + diff);
                              setColumnWidths(prev => ({ ...prev, [column.key]: newWidth }));
                            };
                            
                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                            };
                            
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                        />
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
                      {/* Company Column */}
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">
                        {film.contacts && film.contacts.length > 0 ? (
                          <div className="space-y-1">
                            {film.contacts.map((contact: any, index: number) => (
                              <div key={index} className="text-xs">
                                {contact.company || <span className="text-gray-400 italic">No company</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No contacts</span>
                        )}
                      </td>
                      {/* Names Column */}
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">
                        {film.contacts && film.contacts.length > 0 ? (
                          <div className="space-y-1">
                            {film.contacts.map((contact: any, index: number) => (
                              <div key={index} className="text-xs">
                                <span className="font-medium">{contact.name}</span>
                                {contact.company && <span className="text-gray-500 block text-xs">({contact.company})</span>}
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 mt-0.5">
                                  {contact.contact_type}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No contacts</span>
                        )}
                      </td>
                      {/* Emails Column */}
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">
                        {film.contacts && film.contacts.length > 0 ? (
                          <div className="text-xs break-all">
                            {film.contacts
                              .filter((contact: any) => contact.email)
                              .map((contact: any) => contact.email)
                              .join(', ')}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No emails</span>
                        )}
                      </td>
                      {/* Phone Column */}
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">
                        {film.contacts && film.contacts.length > 0 ? (
                          <div className="space-y-1">
                            {film.contacts.map((contact: any, index: number) => (
                              <div key={index} className="text-xs">
                                {contact.phone || <span className="text-gray-400 italic">No phone</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No contacts</span>
                        )}
                      </td>
                      {/* Mailing Address Column */}
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {film.contacts && film.contacts.length > 0 ? (
                          <div className="space-y-1">
                            {film.contacts.map((contact: any, index: number) => (
                              <div key={index} className="text-xs">
                                {contact.mailing_address || <span className="text-gray-400 italic">No address</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No contacts</span>
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