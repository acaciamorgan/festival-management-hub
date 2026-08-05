'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { InterviewCard, InterviewStatus, PressCard, GuestCard } from '@/types'
import { FilmCardPopup } from '@/components/cards/film-card-popup'
import { PressCardPopup } from '@/components/cards/press-card-popup'
import { GuestCardPopup } from '@/components/cards/guest-card-popup'
import { InterviewFormModal } from '@/components/forms/interview-form-modal'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'
import { matchSubjectsToGuests } from '@/lib/guest-matching'

export default function InterviewManagementPage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const { currentYear } = useFestivalYear()
  const [interviews, setInterviews] = useState<InterviewCard[]>([])
  const [loading, setLoading] = useState(false)

  const canEditInterviews = permissions?.modulePermissions?.['interviewManagement']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'title', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingInterview, setEditingInterview] = useState<InterviewCard | null>(null)
  
  // Toggle states for showing cards
  const [showFilms, setShowFilms] = useState(false)
  const [showGuests, setShowGuests] = useState(false)
  const [showJournalists, setShowJournalists] = useState(false)

  // Guest matching for old records without subject_guest_ids
  const [textMatchedGuests, setTextMatchedGuests] = useState<Map<string, string>>(new Map())
  const [matchingGuests, setMatchingGuests] = useState(false)

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
        .from('interviews_with_films')
        .select('*')
        .eq('festival_year', currentYear)
        .order('title', { ascending: true })

      if (error) throw error

      setInterviews(interviewsData || [])
    } catch (error) {
      console.error('Error loading interviews:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, currentYear])

  useEffect(() => {
    loadInterviews()
  }, [loadInterviews])

  // Filter and search logic
  const filteredInterviews = useMemo(() => {
    return interviews.filter(interview => {
      // Status filter
      if (statusFilter !== 'All' && interview.status !== statusFilter) {
        return false
      }
      
      // Search filter
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<InterviewCard>(
          searchTerm,
          (interview) => [
            interview.title,
            interview.resolved_journalist_name || interview.journalist_name,
            interview.resolved_outlet || interview.outlet,
            interview.resolved_email || interview.email,
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
  }, [interviews, searchTerm, statusFilter])

  // Sort logic with status prioritization
  const sortedInterviews = useMemo(() => {
    return [...filteredInterviews].sort((a, b) => {
      // First, always sort by status priority
      // Priority: Active statuses (TBD, Pitching, Subject Pending, Scheduled) > Film Team > Complete > Declined
      const statusPriority = (status: string) => {
        if (status === 'Declined') return 3
        if (status === 'Complete') return 2
        if (status === 'Film Team') return 1
        return 0 // All active statuses
      }

      const aPriority = statusPriority(a.status)
      const bPriority = statusPriority(b.status)

      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }

      // If same status priority group, apply regular sorting
      if (!sortConfig) return 0

      // Use resolved fields for journalist data when sorting
      const getSortValue = (interview: InterviewCard, key: string) => {
        switch (key) {
          case 'journalist_name': return interview.resolved_journalist_name || interview.journalist_name
          case 'outlet': return interview.resolved_outlet || interview.outlet
          case 'email': return interview.resolved_email || interview.email
          default: return interview[key as keyof InterviewCard]
        }
      }

      const aValue = getSortValue(a, sortConfig.key)
      const bValue = getSortValue(b, sortConfig.key)

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
    if (!confirm(`Are you sure you want to delete the interview for "${interview.title}" with ${interview.resolved_journalist_name || interview.journalist_name}?`)) {
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

  // Film card click handler — supports all reference types
  const handleFilmClick = async (interview: InterviewCard) => {
    if (!showFilms) return

    try {
      let filmData = null

      if (interview.film_id) {
        const { data, error } = await supabase
          .from('feature_films')
          .select('*')
          .eq('id', interview.film_id)
          .eq('festival_year', currentYear)
          .maybeSingle()

        if (!error && data) filmData = data
      } else if (interview.short_film_id) {
        const { data, error } = await supabase
          .from('short_films')
          .select('*')
          .eq('id', interview.short_film_id)
          .eq('festival_year', currentYear)
          .maybeSingle()

        if (!error && data) filmData = data
      } else if (interview.shorts_program_id) {
        const { data, error } = await supabase
          .from('shorts_programs')
          .select('*')
          .eq('id', interview.shorts_program_id)
          .eq('festival_year', currentYear)
          .maybeSingle()

        if (!error && data) filmData = data
      } else if (interview.program_id) {
        const { data, error } = await supabase
          .from('programs')
          .select('*')
          .eq('id', interview.program_id)
          .eq('festival_year', currentYear)
          .maybeSingle()

        if (!error && data) filmData = data
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
        .eq('festival_year', currentYear)
        .maybeSingle()

      if (error) throw error

      setSelectedPress(pressData)
      setShowPressCard(true)
    } catch (error) {
      console.error('Error loading press card:', error)
    }
  }

  // Toggle showing guest links — uses subject_guest_ids when available,
  // falls back to text matching for old records without IDs
  const handleShowGuestsToggle = async () => {
    if (!showGuests && interviews.length > 0) {
      setMatchingGuests(true)

      try {
        // Find interviews that have subject_names but no subject_guest_ids
        const needsMatching = interviews.filter(i =>
          i.subject_names && i.subject_names !== '—' &&
          (!i.subject_guest_ids || i.subject_guest_ids.length === 0 || i.subject_guest_ids.every(id => !id))
        )

        if (needsMatching.length > 0) {
          const allMatches = new Map<string, string>()

          // Group subjects by film for contextual matching
          const subjectsByFilm = new Map<string, string[]>()
          needsMatching.forEach(interview => {
            if (interview.subject_names && interview.title) {
              const names = interview.subject_names.split(', ').map(n => n.trim())
              const existing = subjectsByFilm.get(interview.title) || []
              subjectsByFilm.set(interview.title, [...new Set([...existing, ...names])])
            }
          })

          for (const [filmTitle, subjects] of subjectsByFilm.entries()) {
            const result = await matchSubjectsToGuests(subjects, filmTitle, currentYear)
            result.matches.forEach(match => {
              allMatches.set(match.name, match.guestId)
            })
          }

          // Match remaining subjects without film context
          const allSubjectNames = new Set<string>()
          needsMatching.forEach(i => {
            if (i.subject_names) {
              i.subject_names.split(', ').forEach(n => allSubjectNames.add(n.trim()))
            }
          })
          const unmatched = Array.from(allSubjectNames).filter(n => !allMatches.has(n))

          if (unmatched.length > 0) {
            const globalResult = await matchSubjectsToGuests(unmatched, undefined, currentYear)
            globalResult.matches.forEach(match => {
              allMatches.set(match.name, match.guestId)
            })
          }

          setTextMatchedGuests(allMatches)
        }
      } catch (error) {
        console.error('Error matching guests:', error)
      } finally {
        setMatchingGuests(false)
      }
    } else if (showGuests) {
      setTextMatchedGuests(new Map())
    }

    setShowGuests(!showGuests)
  }

  // Open guest card by ID (preferred) or name fallback
  const openGuestCard = async (guestName: string, guestId?: string) => {
    try {
      let query = supabase.from('guests').select('*').eq('festival_year', currentYear)

      if (guestId) {
        query = query.eq('id', guestId)
      } else {
        query = query.eq('name', guestName)
      }

      const { data: guestData, error } = await query.maybeSingle()

      if (error || !guestData) {
        console.warn('Guest not found in database:', guestId || guestName)
        return
      }

      const formattedGuest = {
        ...guestData,
        films: [],
        films_display: guestData.films_display || '—'
      }

      setSelectedGuest(formattedGuest)
      setShowGuestCard(true)
    } catch (error) {
      console.error('Error fetching guest:', error)
    }
  }

  // Status change handler
  const handleStatusChange = async (interviewId: string, newStatus: InterviewStatus) => {
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

  const renderEditableCell = (interview: InterviewCard, field: string, value: any, inputType: 'text' | 'date' | 'time' = 'text', displayValue?: string) => {
    if (!canEditInterviews) return <span>{displayValue || value || '—'}</span>

    const isEditing = editingCell?.interviewId === interview.id && editingCell?.field === field

    if (isEditing) {
      return (
        <input
          type={inputType}
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
        {displayValue || value || '—'}
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
            onChange={(e) => handleStatusChange(interview.id, e.target.value as InterviewStatus)}
            onBlur={() => setEditingStatus(null)}
            className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none bg-white"
            autoFocus
          >
            <option value="TBD">TBD</option>
            <option value="Pitching">Pitching</option>
            <option value="Subject Pending">Subject Pending</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Film Team">Film Team</option>
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
          interview.status === 'Film Team' ? 'bg-orange-100 text-orange-800' :
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
    return `${hour12}:${(minutes || '00').padStart(2, '0')} ${ampm}`
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
                className="bg-amber-600 text-white px-4 py-2 rounded-md font-medium hover:bg-amber-700"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="TBD">TBD</option>
              <option value="Pitching">Pitching</option>
              <option value="Subject Pending">Subject Pending</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Film Team">Film Team</option>
              <option value="Complete">Complete</option>
              <option value="Declined">Declined</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || statusFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('All')
              }}
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
            onClick={handleShowGuestsToggle}
            disabled={matchingGuests}
            className={`px-3 py-1 text-sm font-medium rounded-md border ${
              showGuests
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            } ${matchingGuests ? 'opacity-50 cursor-wait' : ''}`}
          >
            {matchingGuests ? 'Matching...' : 'Show Guests'}
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
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {[
                    { key: 'title', label: 'Title', width: 200 },
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
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['title'] || 200}px` }}>
                      {showFilms && interview.title && !interview.title.includes(',') ? (
                        <button
                          onClick={() => handleFilmClick(interview)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                        >
                          {interview.title}
                        </button>
                      ) : (
                        <span className="font-medium">{interview.title}</span>
                      )}
                    </td>
                    
                    {/* Journalist — prefer resolved data from press table */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['journalist_name'] || 150}px` }}>
                      {showJournalists && interview.press_id ? (
                        <button
                          onClick={() => handleJournalistClick(interview)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {interview.resolved_journalist_name || interview.journalist_name || '—'}
                        </button>
                      ) : (
                        <span>{interview.resolved_journalist_name || interview.journalist_name || '—'}</span>
                      )}
                    </td>

                    {/* Outlet — prefer resolved from press table */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['outlet'] || 150}px` }}>
                      {interview.resolved_outlet || interview.outlet || '—'}
                    </td>

                    {/* Email — prefer resolved from press table */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['email'] || 200}px` }}>
                      {interview.resolved_email || interview.email || '—'}
                    </td>
                    
                    {/* Subject(s) — uses subject_guest_ids for FK links, text matching for old records */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['subject_names'] || 180}px` }}>
                      {interview.subject_names && interview.subject_names !== '—' ? (
                        <div className="flex flex-wrap gap-1">
                          {interview.subject_names.split(', ').map((name, index) => {
                            const trimmedName = name.trim()
                            const guestIds = interview.subject_guest_ids || []

                            // Check for FK-based guest link (positionally aligned)
                            const hasIdLink = index < guestIds.length && !!guestIds[index]
                            // Fall back to text-matched guest for old records without IDs
                            const textMatchId = !hasIdLink ? textMatchedGuests.get(trimmedName) : undefined
                            const hasGuestLink = showGuests && (hasIdLink || !!textMatchId)
                            const guestIdToUse = hasIdLink ? guestIds[index] : textMatchId

                            return (
                              <span key={index}>
                                {hasGuestLink ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openGuestCard(trimmedName, guestIdToUse)
                                    }}
                                    className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                                    title={`${trimmedName} — Guest card ${hasIdLink ? 'linked' : 'matched'}`}
                                  >
                                    {name}
                                  </button>
                                ) : (
                                  <span
                                    className={showGuests ? "text-gray-600" : "text-gray-900"}
                                    title={showGuests ? `${trimmedName} — Free text` : undefined}
                                  >
                                    {name}
                                  </span>
                                )}
                                {index < interview.subject_names!.split(', ').length - 1 && <span className="text-gray-400">, </span>}
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    
                    {/* Status */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['status'] || 120}px` }}>
                      {renderStatusCell(interview)}
                    </td>
                    
                    {/* Date */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['interview_date'] || 120}px` }}>
                      {renderEditableCell(interview, 'interview_date', interview.interview_date || '', 'date', formatDate(interview.interview_date))}
                    </td>

                    {/* Time */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['interview_time'] || 100}px` }}>
                      {renderEditableCell(interview, 'interview_time', interview.interview_time || '', 'time', formatTime(interview.interview_time))}
                    </td>

                    {/* Location */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['location'] || 150}px` }}>
                      {renderEditableCell(interview, 'location', interview.location || '')}
                    </td>
                    
                    {/* Complete Checkbox */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center" style={{ minWidth: `${columnWidths['complete'] || 90}px` }}>
                      <input
                        type="checkbox"
                        checked={interview.status === 'Complete'}
                        onChange={() => handleCompleteToggle(interview)}
                        disabled={!canEditInterviews}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
                      />
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 py-2 text-sm text-gray-900" style={{ minWidth: `${columnWidths['actions'] || 120}px` }}>
                      <div className="flex space-x-1">
                        {canEditInterviews && (
                          <>
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
                          </>
                        )}
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
                className="bg-amber-600 text-white px-4 py-2 rounded-md font-medium hover:bg-amber-700"
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