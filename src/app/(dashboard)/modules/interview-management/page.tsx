'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { InterviewCard, FilmCard, PressCard, GuestCard, ProgramCard } from '@/types'
import { FilmCardPopup } from '@/components/cards/film-card-popup'
import { PressCardPopup } from '@/components/cards/press-card-popup'
import { GuestCardPopup } from '@/components/cards/guest-card-popup'
import { InterviewFormModal } from '@/components/forms/interview-form-modal'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'

export default function InterviewManagementPage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const [interviews, setInterviews] = useState<InterviewCard[]>([])
  const [loading, setLoading] = useState(false)

  const canEditInterviews = permissions?.modulePermissions?.['interviewManagement']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'film_title', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingInterview, setEditingInterview] = useState<InterviewCard | null>(null)
  
  // Toggle states for showing cards
  const [showFilms, setShowFilms] = useState(false)
  const [showGuests, setShowGuests] = useState(false)
  const [showJournalists, setShowJournalists] = useState(false)
  
  // Card popup states
  const [selectedFilm, setSelectedFilm] = useState<any>(null)
  const [selectedPress, setSelectedPress] = useState<PressCard | null>(null)
  const [selectedGuest, setSelectedGuest] = useState<GuestCard | null>(null)
  const [showFilmCard, setShowFilmCard] = useState(false)
  const [showPressCard, setShowPressCard] = useState(false)
  const [showGuestCard, setShowGuestCard] = useState(false)

  // Inline editing states
  const [editingCell, setEditingCell] = useState<{interviewId: string, field: string} | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editingStatus, setEditingStatus] = useState<string | null>(null)

  const supabase = createClient()

  const loadInterviews = useCallback(async () => {
    setLoading(true)
    try {
      const { data: interviewsData, error } = await supabase
        .from('interviews')
        .select('*')
        .order('film_title', { ascending: true })

      if (error) throw error

      setInterviews(interviewsData || [])
    } catch (error) {
      console.error('Error loading interviews:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadInterviews()
  }, [loadInterviews])

  // Filter and search logic
  const filteredInterviews = useMemo(() => {
    return interviews.filter(interview => {
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<InterviewCard>(
          searchTerm,
          (interview) => [
            interview.film_title,
            interview.journalist_name,
            interview.outlet,
            interview.email,
            interview.subject_names,
            interview.status,
            interview.location,
            interview.notes
          ]
        )
        if (!searchFilter(interview)) return false
      }
      return true
    })
  }, [interviews, searchTerm])

  // Sort logic
  const sortedInterviews = useMemo(() => {
    if (!sortConfig) return filteredInterviews

    return [...filteredInterviews].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof InterviewCard]
      const bValue = b[sortConfig.key as keyof InterviewCard]
      
      if (aValue === null && bValue === null) return 0
      if (aValue === null) return 1
      if (bValue === null) return -1
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredInterviews, sortConfig])

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

  const handleAddInterview = () => {
    setEditingInterview(null)
    setShowAddModal(true)
  }

  const handleEditInterview = (interview: InterviewCard) => {
    setEditingInterview(interview)
    setShowAddModal(true)
  }

  const handleDeleteInterview = async (interview: InterviewCard) => {
    if (!confirm(`Are you sure you want to delete the interview for "${interview.film_title}" with ${interview.journalist_name}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('interviews')
        .delete()
        .eq('id', interview.id)

      if (error) throw error

      setInterviews(prev => prev.filter(i => i.id !== interview.id))
    } catch (error) {
      console.error('Error deleting interview:', error)
      alert('Error deleting interview')
    }
  }

  // Film card click handler
  const handleFilmClick = async (interview: InterviewCard) => {
    if (!showFilms) return
    
    // Don't open film card if multiple films (comma-separated)
    if (interview.film_title && interview.film_title.includes(',')) {
      return // Multiple films - can't open single film card
    }

    try {
      let filmData = null
      
      if (interview.film_id) {
        const { data, error } = await supabase
          .from('feature_films')
          .select('*')
          .eq('id', interview.film_id)
          .single()
          
        if (!error && data) {
          filmData = data
        }
      }
      
      if (interview.shorts_program_id) {
        const { data, error } = await supabase
          .from('shorts_programs')
          .select('*')
          .eq('id', interview.shorts_program_id)
          .single()
          
        if (!error && data) {
          filmData = data
        }
      }

      if (filmData) {
        setSelectedFilm(filmData)
        setShowFilmCard(true)
      }
    } catch (error) {
      console.error('Error loading film:', error)
    }
  }

  // Press card click handler
  const handleJournalistClick = async (interview: InterviewCard) => {
    if (!showJournalists || !interview.press_id) return

    try {
      const { data: pressData, error } = await supabase
        .from('press')
        .select('*')
        .eq('id', interview.press_id)
        .single()

      if (error) throw error

      setSelectedPress(pressData)
      setShowPressCard(true)
    } catch (error) {
      console.error('Error loading press card:', error)
    }
  }

  // Guest card click handler
  const handleSubjectClick = async (interview: InterviewCard) => {
    if (!showGuests || !interview.subject_guest_ids?.length) return

    // For now, show the first guest if multiple
    const guestId = interview.subject_guest_ids[0]

    try {
      const { data: guestData, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .single()

      if (error) throw error

      setSelectedGuest(guestData)
      setShowGuestCard(true)
    } catch (error) {
      console.error('Error loading guest card:', error)
    }
  }

  // Status change handler
  const handleStatusChange = async (interviewId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('interviews')
        .update({ status: newStatus })
        .eq('id', interviewId)

      if (error) throw error

      setInterviews(prev => prev.map(i => 
        i.id === interviewId 
          ? { ...i, status: newStatus } 
          : i
      ))
      
      setEditingStatus(null) // Close the dropdown
    } catch (error) {
      console.error('Error updating interview status:', error)
    }
  }

  // Complete status toggle
  const handleCompleteToggle = async (interview: InterviewCard) => {
    const newStatus = interview.status === 'Complete' ? 'Scheduled' : 'Complete'
    await handleStatusChange(interview.id, newStatus)
  }

  // Cell editing handlers
  const handleCellEdit = (interviewId: string, field: string, currentValue: any) => {
    setEditingCell({ interviewId, field })
    setEditValue(String(currentValue || ''))
  }

  const handleCellSave = async () => {
    if (!editingCell) return

    try {
      const { error } = await supabase
        .from('interviews')
        .update({ [editingCell.field]: editValue })
        .eq('id', editingCell.interviewId)

      if (error) throw error

      setInterviews(prev => prev.map(interview => 
        interview.id === editingCell.interviewId 
          ? { ...interview, [editingCell.field]: editValue } 
          : interview
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

  const renderEditableCell = (interview: InterviewCard, field: string, value: any) => {
    const isEditing = editingCell?.interviewId === interview.id && editingCell?.field === field

    if (isEditing) {
      return (
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
      )
    }

    return (
      <div
        className="cursor-text hover:bg-blue-50 px-1 py-1 rounded"
        onClick={() => handleCellEdit(interview.id, field, value)}
        title="Click to edit"
      >
        {value || '—'}
      </div>
    )
  }

  const renderStatusCell = (interview: InterviewCard) => {
    const isEditing = editingStatus === interview.id

    if (isEditing) {
      return (
        <div className="relative">
          <select
            value={interview.status}
            onChange={(e) => handleStatusChange(interview.id, e.target.value)}
            onBlur={() => setEditingStatus(null)}
            className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none bg-white"
            autoFocus
          >
            <option value="TBD">TBD</option>
            <option value="Pitching">Pitching</option>
            <option value="Subject Pending">Subject Pending</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Complete">Complete</option>
            <option value="Declined">Declined</option>
          </select>
        </div>
      )
    }

    return (
      <div
        className="cursor-pointer hover:bg-blue-50 px-1 py-1 rounded"
        onClick={() => setEditingStatus(interview.id)}
        title="Click to edit status"
      >
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          interview.status === 'Complete' ? 'bg-green-100 text-green-800' :
          interview.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
          interview.status === 'Declined' ? 'bg-red-100 text-red-800' :
          interview.status === 'Pitching' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {interview.status}
        </span>
      </div>
    )
  }

  // Format date/time for display - NO TIMEZONE CONVERSION
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—'
    
    // Parse date string directly without timezone conversion
    const parts = dateString.split('-')
    if (parts.length !== 3) return dateString
    
    const year = parseInt(parts[0])
    const month = parseInt(parts[1])
    const day = parseInt(parts[2])
    
    // Calculate day of week manually without Date object
    // Zeller's congruence algorithm for day of week
    let q = day
    let m = month
    let y = year
    
    if (month < 3) {
      m = month + 12
      y = year - 1
    }
    
    const h = (q + Math.floor((13 * (m + 1)) / 5) + y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)) % 7
    const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const dayName = dayNames[h]
    
    return `${dayName}, ${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`
  }

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '—'
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${ampm}`
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading interviews...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🎤</span>
            <h1 className="text-2xl font-semibold text-gray-900">Interview Management</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {canEditInterviews && (
              <button
                onClick={handleAddInterview}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Add Interview
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4 mb-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search interviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Clear Filters */}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>

        {/* Toggle Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilms(!showFilms)}
            className={`px-3 py-1 text-sm font-medium rounded-md border ${
              showFilms 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Show Films
          </button>
          <button
            onClick={() => setShowGuests(!showGuests)}
            className={`px-3 py-1 text-sm font-medium rounded-md border ${
              showGuests 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Show Guests
          </button>
          <button
            onClick={() => setShowJournalists(!showJournalists)}
            className={`px-3 py-1 text-sm font-medium rounded-md border ${
              showJournalists 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Show Journalists
          </button>
        </div>
      </div>

      {/* Interviews Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { key: 'film_title', label: 'Title', width: 200 },
                    { key: 'journalist_name', label: 'Journalist', width: 150 },
                    { key: 'outlet', label: 'Outlet', width: 150 },
                    { key: 'email', label: 'Email', width: 200 },
                    { key: 'subject_names', label: 'Subject(s)', width: 180 },
                    { key: 'status', label: 'Status', width: 120 },
                    { key: 'interview_date', label: 'Date', width: 120 },
                    { key: 'interview_time', label: 'Time', width: 100 },
                    { key: 'location', label: 'Location', width: 150 },
                    { key: 'complete', label: 'Complete', width: 90 },
                    { key: 'actions', label: 'Actions', width: 120 }
                  ].map((column) => (
                    <th
                      key={column.key}
                      className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      style={{ minWidth: `${columnWidths[column.key] || column.width}px` }}
                      onClick={() => column.key !== 'actions' && column.key !== 'complete' && handleSort(column.key)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{column.label}</span>
                        {column.key !== 'actions' && column.key !== 'complete' && (
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
                {sortedInterviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-gray-50">
                    {/* Title */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['film_title'] || 200}px` }}>
                      {showFilms && interview.film_title && !interview.film_title.includes(',') ? (
                        <button
                          onClick={() => handleFilmClick(interview)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                        >
                          {interview.film_title}
                        </button>
                      ) : (
                        <span className="font-medium">{interview.film_title}</span>
                      )}
                    </td>
                    
                    {/* Journalist */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['journalist_name'] || 150}px` }}>
                      {showJournalists && interview.press_id ? (
                        <button
                          onClick={() => handleJournalistClick(interview)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {interview.journalist_name || '—'}
                        </button>
                      ) : (
                        <span>{interview.journalist_name || '—'}</span>
                      )}
                    </td>
                    
                    {/* Outlet */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['outlet'] || 150}px` }}>
                      {interview.outlet || '—'}
                    </td>
                    
                    {/* Email */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['email'] || 200}px` }}>
                      {interview.email || '—'}
                    </td>
                    
                    {/* Subject(s) */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['subject_names'] || 180}px` }}>
                      {showGuests && interview.subject_guest_ids?.length ? (
                        <button
                          onClick={() => handleSubjectClick(interview)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {interview.subject_names || '—'}
                        </button>
                      ) : (
                        <span>{interview.subject_names || '—'}</span>
                      )}
                    </td>
                    
                    {/* Status */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['status'] || 120}px` }}>
                      {renderStatusCell(interview)}
                    </td>
                    
                    {/* Date - only show if status is Scheduled */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['interview_date'] || 120}px` }}>
                      {interview.status === 'Scheduled' ? formatDate(interview.interview_date) : '—'}
                    </td>
                    
                    {/* Time - only show if status is Scheduled */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['interview_time'] || 100}px` }}>
                      {interview.status === 'Scheduled' ? formatTime(interview.interview_time) : '—'}
                    </td>
                    
                    {/* Location - only show if status is Scheduled */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['location'] || 150}px` }}>
                      {interview.status === 'Scheduled' ? (interview.location || '—') : '—'}
                    </td>
                    
                    {/* Complete Checkbox */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center" style={{ minWidth: `${columnWidths['complete'] || 90}px` }}>
                      <input
                        type="checkbox"
                        checked={interview.status === 'Complete'}
                        onChange={() => handleCompleteToggle(interview)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 py-2 text-sm text-gray-900" style={{ minWidth: `${columnWidths['actions'] || 120}px` }}>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEditInterview(interview)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteInterview(interview)}
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
          </div>
        </div>

        {sortedInterviews.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">🎤</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first interview'}
            </p>
            {canEditInterviews && (
              <button
                onClick={handleAddInterview}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Add Interview
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card Popups */}
      {showFilmCard && selectedFilm && (
        <FilmCardPopup
          film={selectedFilm}
          onClose={() => {
            setShowFilmCard(false)
            setSelectedFilm(null)
          }}
        />
      )}

      {showPressCard && selectedPress && (
        <PressCardPopup
          press={selectedPress}
          onClose={() => {
            setShowPressCard(false)
            setSelectedPress(null)
          }}
        />
      )}

      {showGuestCard && selectedGuest && (
        <GuestCardPopup
          guest={selectedGuest}
          onClose={() => {
            setShowGuestCard(false)
            setSelectedGuest(null)
          }}
        />
      )}

      {/* Interview Form Modal */}
      <InterviewFormModal
        interview={editingInterview}
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditingInterview(null)
        }}
        onSave={() => {
          setShowAddModal(false)
          setEditingInterview(null)
          loadInterviews()
        }}
      />
    </div>
  )
}