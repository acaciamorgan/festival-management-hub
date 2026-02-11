'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { PressRequestFormModal } from '@/components/forms/press-request-form-modal'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'

interface PressRequest {
  id: string
  requester_name: string
  requester_outlet: string
  requester_email: string
  request_type: 'screener_link' | 'screening_ticket'
  film_titles: string
  screening_id: string | null
  screening_type: string | null
  screening_date: string | null
  screening_time: string | null
  venue_short_code: string | null
  status: 'new' | 'requested' | 'fulfilled'
  requested_at: string | null
  fulfilled_at: string | null
  created_at: string
  updated_at: string
  created_by: string
}

interface FilmContact {
  film_title: string
  contact_name: string
  contact_email: string
  contact_company: string
}

export default function PressRequestsPage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const [requests, setRequests] = useState<PressRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<PressRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'requested' | 'fulfilled'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'screener_link' | 'screening_ticket'>('all')
  const [accessTypeFilter, setAccessTypeFilter] = useState<'all' | 'tbd' | 'cinesend' | 'link_available' | 'request_link' | 'no_links'>('all')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'created_at', direction: 'desc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [filmContacts, setFilmContacts] = useState<FilmContact[]>([])
  const [screenerAccessMap, setScreenerAccessMap] = useState<Record<string, { access_type: string, link_url: string | null, link_password: string | null }>>({})

  const supabase = createClient()

  // Check if user has edit permissions for press requests
  const canEditPressRequests = permissions?.modulePermissions?.['pressRequests']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('press_requests_with_films')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('DEBUG: Loaded requests from database:', data?.map(r => ({ id: r.id, film: r.film_titles })))
      setRequests(data || [])

      // Load screener access data for all unique film titles
      const uniqueTitles = [...new Set((data || []).map(r => r.film_titles))]

      // Load feature films and their IDs
      const { data: features } = await supabase
        .from('feature_films')
        .select('id, title')
        .in('title', uniqueTitles)

      // Load shorts programs and their IDs
      const { data: shortsPrograms } = await supabase
        .from('shorts_programs')
        .select('id, program_name')
        .in('program_name', uniqueTitles)

      // Get all film IDs (features + programs)
      const filmIds = [
        ...(features?.map(f => f.id) || []),
        ...(shortsPrograms?.map(p => p.id) || [])
      ]

      // Load screener access data for all these films
      const { data: screenerAccess, error: screenerError } = await supabase
        .from('screener_access')
        .select('film_id, access_type, link_url, link_password')
        .in('film_id', filmIds)

      if (screenerError) {
        console.error('Error loading screener access:', screenerError)
      }

      console.log('DEBUG: Features:', features)
      console.log('DEBUG: Shorts programs:', shortsPrograms)
      console.log('DEBUG: Screener access data:', screenerAccess)

      // Create a map of film title to screener access data
      const accessMap: Record<string, { access_type: string, link_url: string | null, link_password: string | null }> = {}

      // Map feature films
      features?.forEach(film => {
        const access = screenerAccess?.find(sa => sa.film_id === film.id)
        if (access?.access_type) {
          accessMap[film.title] = {
            access_type: access.access_type,
            link_url: access.link_url || null,
            link_password: access.link_password || null
          }
        }
      })

      // Map shorts programs
      shortsPrograms?.forEach(program => {
        const access = screenerAccess?.find(sa => sa.film_id === program.id)
        if (access?.access_type) {
          accessMap[program.program_name] = {
            access_type: access.access_type,
            link_url: access.link_url || null,
            link_password: access.link_password || null
          }
        }
      })

      console.log('DEBUG: Screener access map:', accessMap)
      setScreenerAccessMap(accessMap)

    } catch (error) {
      console.error('Error loading press requests:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const loadFilmContacts = useCallback(async () => {
    try {
      // Load feature films with contacts that need request links
      const { data: features } = await supabase
        .from('feature_films')
        .select(`
          title,
          film_contacts (
            name,
            email,
            company,
            contact_type
          ),
          screener_access (
            access_type
          )
        `)

      // Load shorts programs with contacts
      const { data: shortsPrograms } = await supabase
        .from('shorts_programs')
        .select('*')
        .order('program_number')

      // Filter for films that are "request_link" type and format the data
      const contactsList: FilmContact[] = []
      
      // Process features
      features?.forEach(film => {
        if (film.screener_access?.[0]?.access_type === 'request_link' && film.film_contacts) {
          film.film_contacts.forEach((contact: any) => {
            if (contact.contact_type === 'Screening Link') {
              contactsList.push({
                film_title: film.title,
                contact_name: contact.name,
                contact_email: contact.email,
                contact_company: contact.company
              })
            }
          })
        }
      })

      // Process shorts programs
      if (shortsPrograms && shortsPrograms.length > 0) {
        for (const program of shortsPrograms) {
          // Check if this program has screener data marked for request_link
          const { data: screenerData } = await supabase
            .from('screener_access')
            .select('access_type')
            .eq('film_id', program.id)
            .single()

          if (screenerData?.access_type === 'request_link') {
            // Get contacts from the first short in this program
            const { data: firstShort } = await supabase
              .from('short_films')
              .select('id')
              .eq('shorts_program_id', program.id)
              .limit(1)
              .single()
            
            if (firstShort) {
              const { data: contacts } = await supabase
                .from('film_contacts')
                .select('name, email, company, contact_type')
                .eq('film_id', firstShort.id)
                .eq('film_type', 'short')
                .eq('contact_type', 'Screening Link')
              
              contacts?.forEach(contact => {
                contactsList.push({
                  film_title: program.program_name,
                  contact_name: contact.name,
                  contact_email: contact.email,
                  contact_company: contact.company
                })
              })
            }
          }
        }
      }

      setFilmContacts(contactsList)
    } catch (error) {
      console.error('Error loading film contacts:', error)
    }
  }, [supabase])

  useEffect(() => {
    loadRequests()
    loadFilmContacts()
  }, [loadRequests, loadFilmContacts])

  // No expansion needed - each request is now individual per film

  // Filter and search logic on requests
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      // Search filter
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<typeof request>(
          searchTerm,
          (req) => [
            req.requester_name,
            req.requester_outlet,
            req.requester_email,
            req.film_titles
          ]
        )
        if (!searchFilter(request)) return false
      }

      // Status filter
      if (statusFilter !== 'all' && request.status !== statusFilter) return false

      // Type filter
      if (typeFilter !== 'all' && request.request_type !== typeFilter) return false

      // Access Type filter
      if (accessTypeFilter !== 'all') {
        const filmAccessData = screenerAccessMap[request.film_titles]
        if (!filmAccessData || filmAccessData.access_type !== accessTypeFilter) return false
      }

      return true
    })
  }, [requests, searchTerm, statusFilter, typeFilter, accessTypeFilter, screenerAccessMap])

  // Sort logic
  const sortedRequests = useMemo(() => {
    if (!sortConfig) return filteredRequests

    return [...filteredRequests].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof PressRequest]
      const bValue = b[sortConfig.key as keyof PressRequest]
      
      if (aValue === null) return 1
      if (bValue === null) return -1
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredRequests, sortConfig])

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
    
    // Parse YYYY-MM-DD format with string manipulation only
    const parts = dateString.split('-')
    if (parts.length !== 3) return dateString // Return as-is if not expected format
    
    const year = parts[0].slice(-2) // Get last 2 digits
    const month = parts[1]
    const day = parts[2]
    
    return `${month}/${day}/${year}`
  }

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '—'
    
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    
    return `${hour12}:${minutes} ${ampm}`
  }

  const formatDateTime = (dateTimeString: string | null): string => {
    if (!dateTimeString) return '—'
    
    // Split datetime string (format: YYYY-MM-DD HH:mm:ss or YYYY-MM-DDTHH:mm:ss)
    const datePart = dateTimeString.split('T')[0] || dateTimeString.split(' ')[0]
    const timePart = dateTimeString.includes('T') ? 
      dateTimeString.split('T')[1]?.split('.')[0] : 
      dateTimeString.split(' ')[1]?.split('.')[0]
    
    const formattedDate = formatDate(datePart)
    
    if (!timePart) return formattedDate
    
    // Parse time without Date object
    const [hours, minutes] = timePart.split(':')
    const hour24 = parseInt(hours, 10)
    const min = parseInt(minutes, 10)
    
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    const minStr = min.toString().padStart(2, '0')
    
    return `${formattedDate} ${hour12}:${minStr} ${ampm}`
  }

  const updateRequestStatus = async (requestId: string, status: PressRequest['status']) => {
    try {
      const updates: any = { status }
      
      // Add timestamps based on status using string manipulation only
      const now = new Date()
      const timestamp = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0') + ' ' + 
        String(now.getHours()).padStart(2, '0') + ':' + 
        String(now.getMinutes()).padStart(2, '0') + ':' + 
        String(now.getSeconds()).padStart(2, '0')
      
      if (status === 'requested') {
        updates.requested_at = timestamp
      } else if (status === 'fulfilled') {
        updates.fulfilled_at = timestamp
      }

      const { error } = await supabase
        .from('press_requests')
        .update(updates)
        .eq('id', requestId)

      if (error) throw error

      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, ...updates }
          : req
      ))
    } catch (error) {
      console.error('Error updating request status:', error)
      alert('Error updating status. Please try again.')
    }
  }

  const handleMarkMultipleRequested = (requestIds: string[]) => {
    requestIds.forEach(id => {
      updateRequestStatus(id, 'requested')
    })
  }

  const deleteRequest = async (requestId: string) => {
    console.log('DEBUG: Delete function called with ID:', requestId)
    console.log('DEBUG: Current requests before delete:', requests.map(r => ({ id: r.id, film: r.film_titles })))
    
    if (!confirm('Are you sure you want to delete this request?')) {
      return
    }

    try {
      // Since requests are now individual per film, we can delete directly
      console.log('DEBUG: About to delete request with ID:', requestId)
      const { error } = await supabase
        .from('press_requests')
        .delete()
        .eq('id', requestId)

      if (error) {
        console.error('DEBUG: Database delete error:', error)
        throw error
      }

      console.log('DEBUG: Database delete successful, updating local state')
      // Update local state - remove only this specific request
      setRequests(prev => {
        const filtered = prev.filter(req => req.id !== requestId)
        console.log('DEBUG: Filtered requests:', filtered.map(r => ({ id: r.id, film: r.film_titles })))
        return filtered
      })
    } catch (error) {
      console.error('Error deleting request:', error)
      alert('Error deleting request. Please try again.')
    }
  }

  const getStatusBadgeClass = (status: PressRequest['status']) => {
    switch (status) {
      case 'new':
        return 'bg-yellow-100 text-yellow-800'
      case 'requested':
        return 'bg-blue-100 text-blue-800'
      case 'fulfilled':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeBadgeClass = (type: PressRequest['request_type']) => {
    switch (type) {
      case 'screener_link':
        return 'bg-purple-100 text-purple-800'
      case 'screening_ticket':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Generate Daily Requests Report
  const generateDailyReport = async () => {
    try {
      // Filter requests for screener_link type only, excluding fulfilled
      const screenerRequests = requests.filter(
        r => r.request_type === 'screener_link' && r.status !== 'fulfilled'
      )

      console.log('DEBUG: Screener requests found:', screenerRequests.length, screenerRequests)
      
      if (screenerRequests.length === 0) {
        alert('No screener link requests to report')
        return
      }

      // Load films with request_link access type - separate queries to avoid nested join issues
      const { data: features, error: featuresError } = await supabase
        .from('feature_films')
        .select('id, title')
      
      if (featuresError) {
        console.log('DEBUG: Features query error:', featuresError)
      }
      
      // Load all screener access data
      const { data: screenerAccessData, error: screenerError } = await supabase
        .from('screener_access')
        .select('film_id, access_type')
        
      if (screenerError) {
        console.log('DEBUG: Screener access query error:', screenerError)
      }
      
      // Load all film contacts
      const { data: filmContactsData, error: contactsError } = await supabase
        .from('film_contacts')
        .select('film_id, film_type, name, email, company, contact_type')
        .eq('film_type', 'feature')
        
      if (contactsError) {
        console.log('DEBUG: Film contacts query error:', contactsError)
      }

      const { data: shortsPrograms } = await supabase
        .from('shorts_programs')
        .select('id, program_name')

      console.log('DEBUG: Features data:', features)
      console.log('DEBUG: Shorts programs data:', shortsPrograms)
      
      // Filter for request_link films only
      const requestLinkFilms: any[] = []
      
      // Add features with request_link
      features?.forEach(film => {
        // Find screener access for this film
        const screenerAccess = screenerAccessData?.find(sa => sa.film_id === film.id)
        console.log('DEBUG: Checking film:', film.title, 'screener_access:', screenerAccess)
        
        if (screenerAccess?.access_type === 'request_link') {
          console.log('DEBUG: Added request_link film:', film.title)
          
          // Find contacts for this film
          const contacts = filmContactsData?.filter(fc => fc.film_id === film.id) || []
          
          requestLinkFilms.push({
            id: film.id,
            title: film.title,
            contacts: contacts,
            isProgram: false
          })
        }
      })

      // Check shorts programs for request_link
      if (shortsPrograms) {
        // Load all short films to get contacts
        const { data: shortFilms } = await supabase
          .from('short_films')
          .select('id, shorts_program_id')
          
        // Load contacts for shorts
        const { data: shortContactsData } = await supabase
          .from('film_contacts')
          .select('film_id, film_type, name, email, company, contact_type')
          .eq('film_type', 'short')
        
        for (const program of shortsPrograms) {
          // Find screener access for this program
          const screenerAccess = screenerAccessData?.find(sa => sa.film_id === program.id)
          
          if (screenerAccess?.access_type === 'request_link') {
            // Get contacts from first short in program
            const firstShort = shortFilms?.find(sf => sf.shorts_program_id === program.id)
            
            let contacts: any[] = []
            if (firstShort) {
              contacts = shortContactsData?.filter(fc => fc.film_id === firstShort.id) || []
            }

            requestLinkFilms.push({
              id: program.id,
              title: program.program_name,
              contacts,
              isProgram: true
            })
          }
        }
      }

      console.log('DEBUG: Request link films found:', requestLinkFilms)
      
      // Group requests by film
      const filmRequestsMap = new Map<string, any[]>()
      
      screenerRequests.forEach(request => {
        const filmTitle = request.film_titles
        if (!filmRequestsMap.has(filmTitle)) {
          filmRequestsMap.set(filmTitle, [])
        }
        filmRequestsMap.get(filmTitle)!.push(request)
      })
      
      console.log('DEBUG: Film requests map:', Array.from(filmRequestsMap.entries()))
      

      // Create Word document
      const doc = new Document({
        sections: [{
          children: []
        }]
      })

      const filmEntries: any[] = []
      
      // Process each film that has requests
      filmRequestsMap.forEach((filmRequests, filmTitle) => {
        // Find matching film data
        const filmData = requestLinkFilms.find(f => 
          f.title.toLowerCase() === filmTitle.toLowerCase()
        )
        
        if (!filmData) {
          console.log('DEBUG: Film not found in request_link films:', filmTitle)
          return // Skip if not a request_link film
        }
        
        console.log('DEBUG: Processing film:', filmTitle, 'with', filmRequests.length, 'requests')

        // Sort requests: requested first, then new
        const sortedRequests = filmRequests.sort((a, b) => {
          if (a.status === 'requested' && b.status !== 'requested') return -1
          if (a.status !== 'requested' && b.status === 'requested') return 1
          return 0
        })

        // Format contacts
        const contactsText = filmData.contacts.length > 0
          ? filmData.contacts.map((c: any) => `${c.name} - ${c.email}`).join(', ')
          : 'No contacts found'

        filmEntries.push({
          title: filmTitle,
          contacts: contactsText,
          requests: sortedRequests
        })
      })

      // Sort films alphabetically
      filmEntries.sort((a, b) => a.title.localeCompare(b.title))

      // Build document content
      const children: Paragraph[] = []
      
      filmEntries.forEach((entry, index) => {
        // Film title (18pt)
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: entry.title,
                bold: true,
                size: 36 // size is in half-points, so 36 = 18pt
              })
            ]
          })
        )

        // Contacts line (12pt)
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Contacts: ',
                bold: true,
                size: 24 // 12pt
              }),
              new TextRun({
                text: entry.contacts,
                size: 24
              })
            ]
          })
        )

        // Requests header (12pt)
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Requests:',
                bold: true,
                size: 24
              })
            ]
          })
        )

        // Each request (12pt)
        entry.requests.forEach((request: PressRequest) => {
          const statusText = request.status === 'requested' ? ' (REQUESTED)' : ''
          const isNew = request.status === 'new'

          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${request.requester_name} / ${request.requester_outlet} / ${request.requester_email} / ${request.film_titles}${statusText}`,
                  size: 24,
                  highlight: isNew ? 'yellow' : undefined
                })
              ]
            })
          )
        })

        // Add 4 line breaks between films (except after last)
        if (index < filmEntries.length - 1) {
          for (let i = 0; i < 4; i++) {
            children.push(new Paragraph({ children: [] }))
          }
        }
      })

      // Create document with all content
      const finalDoc = new Document({
        sections: [{
          children
        }]
      })

      // Generate and save the document
      const blob = await Packer.toBlob(finalDoc)
      const date = new Date().toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
      }).replace(/\//g, '-')
      saveAs(blob, `Daily_Requests_Report_${date}.docx`)

    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error generating report. Please try again.')
    }
  }

  // Count new requests
  const newRequestsCount = requests.filter(r => r.status === 'new').length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">📧 Screener Requests</h1>
            <p className="text-sm text-gray-600 mt-1">
              {sortedRequests.length} requests • {newRequestsCount} new
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={generateDailyReport}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 font-medium"
            >
              Daily Requests Report
            </button>
            {canEditPressRequests && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                Add Request
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, outlet, email, or film titles..."
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
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="new">New</option>
              <option value="requested">Requested</option>
              <option value="fulfilled">Fulfilled</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="screener_link">Screener Link</option>
              <option value="screening_ticket">Screening Ticket</option>
            </select>
          </div>

          {/* Access Type Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Access Type:</label>
            <select
              value={accessTypeFilter}
              onChange={(e) => setAccessTypeFilter(e.target.value as typeof accessTypeFilter)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="tbd">TBD</option>
              <option value="cinesend">Cinesend</option>
              <option value="link_available">Link Available</option>
              <option value="request_link">Request Link</option>
              <option value="no_links">No Links</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || accessTypeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setTypeFilter('all')
                setAccessTypeFilter('all')
              }}
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Data Grid */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-500">Loading screener requests...</div>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {[
                    { key: 'status', label: 'Status', width: 100, sortable: true },
                    { key: 'request_type', label: 'Type', width: 120, sortable: true },
                    { key: 'requester_name', label: 'Requester', width: 150, sortable: true },
                    { key: 'requester_outlet', label: 'Outlet', width: 150, sortable: true },
                    { key: 'requester_email', label: 'Email', width: 200, sortable: true },
                    { key: 'film_titles', label: 'Film/Program', width: 300, sortable: false },
                    { key: 'access_type', label: 'Access Type', width: 120, sortable: false },
                    { key: 'screening_date', label: 'Screening', width: 120, sortable: true },
                    { key: 'created_at', label: 'Requested', width: 120, sortable: true },
                    { key: 'requested_at', label: 'Email Sent', width: 120, sortable: true }
                  ].map((column) => (
                    <th
                      key={column.key}
                      className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 relative ${
                        column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                      }`}
                      style={{ 
                        width: columnWidths[column.key] || column.width,
                        minWidth: `${column.width}px`
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
                  {canEditPressRequests && (
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm border-r border-gray-100" style={{ minWidth: `${columnWidths['status'] || 100}px` }}>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(request.status)}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm border-r border-gray-100" style={{ minWidth: `${columnWidths['request_type'] || 120}px` }}>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeClass(request.request_type)}`}>
                        {request.request_type === 'screener_link' ? 'Screener' : 'Ticket'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['requester_name'] || 150}px` }}>
                      {request.requester_name}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['requester_outlet'] || 150}px` }}>
                      {request.requester_outlet}
                    </td>
                    <td className="px-3 py-2 text-sm border-r border-gray-100" style={{ minWidth: `${columnWidths['requester_email'] || 200}px` }}>
                      <a href={`mailto:${request.requester_email}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {request.requester_email}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['film_titles'] || 300}px` }}>
                      {request.film_titles}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['access_type'] || 120}px` }}>
                      {(() => {
                        const accessData = screenerAccessMap[request.film_titles]
                        if (!accessData) return <span className="text-gray-400">—</span>

                        const badgeConfig = {
                          'request_link': { text: 'Request Link', className: 'bg-yellow-100 text-yellow-800' },
                          'link_available': { text: 'Link Available', className: 'bg-green-100 text-green-800' },
                          'cinesend': { text: 'Cinesend', className: 'bg-blue-100 text-blue-800' }
                        }

                        const config = badgeConfig[accessData.access_type as keyof typeof badgeConfig]
                        if (!config) return <span className="text-gray-400">—</span>

                        const handleCopyLink = async () => {
                          if (!accessData.link_url) {
                            alert('No link available to copy')
                            return
                          }
                          const copyText = `Link: ${accessData.link_url}\nPassword: ${accessData.link_password || 'N/A'}`
                          try {
                            await navigator.clipboard.writeText(copyText)
                            alert('Link and password copied to clipboard!')
                          } catch (err) {
                            console.error('Failed to copy:', err)
                            alert('Failed to copy to clipboard')
                          }
                        }

                        return (
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
                              {config.text}
                            </span>
                            {accessData.access_type === 'link_available' && accessData.link_url && (
                              <button
                                onClick={handleCopyLink}
                                className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700"
                                title="Copy link and password"
                              >
                                Copy
                              </button>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['screening_date'] || 120}px` }}>
                      {request.screening_date && request.request_type === 'screening_ticket' ? (
                        <div>
                          <div>{formatDate(request.screening_date)}</div>
                          <div className="text-xs text-gray-500">{formatTime(request.screening_time)}</div>
                          {request.venue_short_code && (
                            <div className="text-xs text-blue-600">{request.venue_short_code}</div>
                          )}
                          {request.screening_type && (
                            <div className={`text-xs inline-flex px-1 py-0.5 rounded ${
                              request.screening_type === 'published' ? 'bg-green-100 text-green-700' :
                              request.screening_type === 'pi_jury' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {request.screening_type === 'published' ? 'Public' :
                               request.screening_type === 'pi_jury' ? 'P&I' :
                               'Tech'}
                            </div>
                          )}
                        </div>
                      ) : request.request_type === 'screening_ticket' ? (
                        <span className="text-gray-400 italic">No screening selected</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['created_at'] || 120}px` }}>
                      {formatDateTime(request.created_at)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['requested_at'] || 120}px` }}>
                      {formatDateTime(request.requested_at)}
                    </td>
                    {canEditPressRequests && (
                      <td className="px-3 py-2 text-sm text-gray-900 text-center">
                        <div className="flex justify-center space-x-2">
                          {request.status === 'new' && (
                            <>
                              <button
                                onClick={() => updateRequestStatus(request.id, 'requested')}
                                className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                              >
                                Requested
                              </button>
                              <button
                                onClick={() => updateRequestStatus(request.id, 'fulfilled')}
                                className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                              >
                                Fulfilled
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRequest(request.id)}
                            className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {sortedRequests.length === 0 && (
                  <tr>
                    <td colSpan={canEditPressRequests ? 10 : 9} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || accessTypeFilter !== 'all'
                        ? 'No screener requests match your filters.'
                        : 'No screener requests found. Click "Add Request" to create your first screener request.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          </div>
        </div>
      </div>

      {/* Screener Request Form Modal */}
      <PressRequestFormModal
        request={selectedRequest}
        isOpen={showAddModal || !!selectedRequest}
        onClose={() => {
          setShowAddModal(false)
          setSelectedRequest(null)
        }}
        onSave={(savedRequest) => {
          if (selectedRequest) {
            // Update existing request in the list
            setRequests(prev => prev.map(req => 
              req.id === savedRequest.id ? savedRequest : req
            ))
          } else {
            // Add new request to the list
            setRequests(prev => [savedRequest, ...prev])
          }
        }}
      />

    </div>
  )
}