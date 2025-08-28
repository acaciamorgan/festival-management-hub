'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { PressRequestFormModal } from '@/components/forms/press-request-form-modal'
import { GenerateRequestsModal } from '@/components/modals/generate-requests-modal'
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
  const { user, permissions } = useAuth()
  const [requests, setRequests] = useState<PressRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<PressRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'requested' | 'fulfilled'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'screener_link' | 'screening_ticket'>('all')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'created_at', direction: 'desc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [filmContacts, setFilmContacts] = useState<FilmContact[]>([])
  const [showGenerateModal, setShowGenerateModal] = useState(false)

  const supabase = createClient()

  // Check if user has edit permissions for press requests
  const canEditPressRequests = permissions?.modulePermissions?.['pressRequests']?.canEdit || permissions?.isAdmin

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('press_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setRequests(data || [])
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

      // Filter for films that are "request_link" type and format the data
      const contactsList: FilmContact[] = []
      
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

      setFilmContacts(contactsList)
    } catch (error) {
      console.error('Error loading film contacts:', error)
    }
  }, [supabase])

  useEffect(() => {
    loadRequests()
    loadFilmContacts()
  }, [loadRequests, loadFilmContacts])

  // Expand requests into individual film rows
  const expandedRequests = useMemo(() => {
    const expanded: (PressRequest & { individual_film_title: string })[] = []
    
    requests.forEach(request => {
      if (request.film_titles) {
        const filmTitles = request.film_titles.split(',').map(t => t.trim())
        filmTitles.forEach(filmTitle => {
          expanded.push({
            ...request,
            individual_film_title: filmTitle,
            // Create unique ID for each film row
            id: `${request.id}-${filmTitle.replace(/\s+/g, '-').toLowerCase()}`
          })
        })
      } else {
        // Handle requests without films (shouldn't happen but just in case)
        expanded.push({
          ...request,
          individual_film_title: ''
        })
      }
    })
    
    return expanded
  }, [requests])

  // Filter and search logic on expanded requests
  const filteredRequests = useMemo(() => {
    return expandedRequests.filter(request => {
      // Search filter
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<typeof request>(
          searchTerm,
          (req) => [
            req.requester_name,
            req.requester_outlet,
            req.requester_email,
            req.individual_film_title
          ]
        )
        if (!searchFilter(request)) return false
      }

      // Status filter
      if (statusFilter !== 'all' && request.status !== statusFilter) return false

      // Type filter
      if (typeFilter !== 'all' && request.request_type !== typeFilter) return false

      return true
    })
  }, [expandedRequests, searchTerm, statusFilter, typeFilter])

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
    const date = new Date(dateString)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
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
    const date = new Date(dateTimeString)
    return `${formatDate(dateTimeString)} ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`
  }

  const updateRequestStatus = async (requestId: string, status: PressRequest['status']) => {
    try {
      const updates: any = { status }
      
      // Add timestamps based on status
      if (status === 'requested') {
        updates.requested_at = new Date().toISOString()
      } else if (status === 'fulfilled') {
        updates.fulfilled_at = new Date().toISOString()
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

  // Count new requests
  const newRequestsCount = requests.filter(r => r.status === 'new').length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">📧 Press Requests</h1>
            <p className="text-sm text-gray-600 mt-1">
              {sortedRequests.length} requests • {newRequestsCount} new
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowGenerateModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 font-medium"
              disabled={newRequestsCount === 0}
            >
              Generate Requests ({newRequestsCount} new)
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
            >
              Add Request
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

          {/* Clear Filters */}
          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setTypeFilter('all')
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
        <div className="overflow-auto" style={{ height: 'calc(100vh - 220px)' }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-500">Loading press requests...</div>
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
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Actions
                  </th>
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
                      {request.individual_film_title}
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
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedRequests.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                        ? 'No press requests match your filters.'
                        : 'No press requests found. Click "Add Request" to create your first press request.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Press Request Form Modal */}
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

      {/* Generate Requests Modal */}
      <GenerateRequestsModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        newRequests={expandedRequests.filter(r => r.status === 'new')}
        filmContacts={filmContacts}
        onMarkRequested={handleMarkMultipleRequested}
      />
    </div>
  )
}