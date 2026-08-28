'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { PressScreeningCard } from '@/types'
import { PressScreeningFormModal } from '@/components/forms/press-screening-form-modal'
import { FilmCardPopup } from '@/components/cards/film-card-popup'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'

export default function PressScreeningsPage() {
  const { user } = useAuth()
  const { currentYear } = useFestivalYear()
  const { permissions } = usePermissions()
  const [pressScreenings, setPressScreenings] = useState<PressScreeningCard[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'screening_date', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingScreening, setEditingScreening] = useState<PressScreeningCard | null>(null)
  const [selectedFilm, setSelectedFilm] = useState<any>(null)
  const [showFilmCard, setShowFilmCard] = useState(false)
  const [editingCell, setEditingCell] = useState<{screeningId: string, field: string} | null>(null)
  const [editValue, setEditValue] = useState('')
  const [venueShortCodes, setVenueShortCodes] = useState<string[]>([])
  const [showShortCodeSuggestions, setShowShortCodeSuggestions] = useState(false)

  const supabase = createClient()

  const canEditPressScreenings = permissions?.modulePermissions?.['pressScreenings']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false

  const loadVenueShortCodes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('theater_houses')
        .select('short_code')
        .eq('festival_year', currentYear)
        .not('short_code', 'is', null)
        .order('short_code')

      if (error) throw error
      
      const shortCodes = [...new Set((data || []).map(item => item.short_code).filter(Boolean))]
      setVenueShortCodes(shortCodes)
    } catch (error) {
      console.error('Error loading venue short codes:', error)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, currentYear])

  const loadPressScreenings = useCallback(async () => {
    setLoading(true)
    try {
      const { data: screeningsData, error } = await supabase
        .from('press_screenings_with_films')
        .select('*')
        .eq('festival_year', currentYear)
        .order('screening_date', { ascending: true })

      if (error) throw error

      setPressScreenings(screeningsData || [])
    } catch (error) {
      console.error('Error loading press screenings:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, currentYear])

  useEffect(() => {
    loadPressScreenings()
    loadVenueShortCodes()
  }, [loadPressScreenings, loadVenueShortCodes])

  // Filter and search logic
  const filteredScreenings = useMemo(() => {
    return pressScreenings.filter(screening => {
      // Search filter with accent-insensitive search
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<PressScreeningCard>(
          searchTerm,
          (screening) => [
            screening.film_title,
            screening.venue_name,
            screening.house,
            screening.staffer,
            screening.notes
          ]
        )
        if (!searchFilter(screening)) return false
      }

      return true
    })
  }, [pressScreenings, searchTerm])

  // Sort logic
  const sortedScreenings = useMemo(() => {
    if (!sortConfig) return filteredScreenings

    return [...filteredScreenings].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof PressScreeningCard]
      const bValue = b[sortConfig.key as keyof PressScreeningCard]

      if (aValue === null && bValue === null) return 0
      if (aValue === null) return 1
      if (bValue === null) return -1

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1

      // If equal and sorting by date, sub-sort by time
      if (aValue === bValue && sortConfig.key === 'screening_date') {
        const aTime = a.screening_time || ''
        const bTime = b.screening_time || ''
        if (aTime < bTime) return sortConfig.direction === 'asc' ? -1 : 1
        if (aTime > bTime) return sortConfig.direction === 'asc' ? 1 : -1
      }

      return 0
    })
  }, [filteredScreenings, sortConfig])

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

  const handleAddScreening = () => {
    setEditingScreening(null)
    setShowAddModal(true)
  }

  const handleEditScreening = (screening: PressScreeningCard) => {
    setEditingScreening(screening)
    setShowAddModal(true)
  }

  const handleDeleteScreening = async (screening: PressScreeningCard) => {
    if (!confirm(`Are you sure you want to delete the screening for "${screening.film_title}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('press_screenings')
        .delete()
        .eq('id', screening.id)

      if (error) {
        console.error('Error deleting screening:', error)
        alert('Error deleting screening')
      } else {
        loadPressScreenings()
      }
    } catch (error) {
      console.error('Error deleting screening:', error)
      alert('Error deleting screening')
    }
  }

  const handleFilmClick = async (screening: PressScreeningCard) => {
    try {
      // Determine if it's a feature or short film and fetch accordingly
      let filmData = null
      
      if (screening.film_type === 'feature') {
        const { data: featureData } = await supabase
          .from('feature_films')
          .select('*')
          .eq('id', screening.film_id)
          .eq('festival_year', currentYear)
          .maybeSingle()

        if (featureData) {
          filmData = {
            id: featureData.id,
            title: featureData.title,
            original_language_title: featureData.original_language_title,
            director: featureData.director,
            countries: featureData.countries,
            programs: [featureData.program_1, featureData.program_2, featureData.program_3, featureData.program_4]
              .filter(Boolean).join(', '),
            premiere_status: featureData.premiere_status
          }
        }
      } else if (screening.film_type === 'short') {
        const { data: shortData } = await supabase
          .from('short_films')
          .select('*')
          .eq('id', screening.film_id)
          .eq('festival_year', currentYear)
          .maybeSingle()
        
        if (shortData) {
          filmData = {
            id: shortData.id,
            title: shortData.title,
            original_language_title: shortData.original_language_title,
            director: shortData.director,
            countries: shortData.countries,
            programs: [shortData.program_1, shortData.program_2, shortData.program_3]
              .filter(Boolean).join(', '),
            premiere_status: shortData.premiere_status
          }
        }
      }

      if (filmData) {
        setSelectedFilm(filmData)
        setShowFilmCard(true)
      }
    } catch (error) {
      console.error('Error loading film data:', error)
    }
  }

  // Handle inline editing
  const handleCellEdit = (screeningId: string, field: string, currentValue: any) => {
    setEditingCell({ screeningId, field })
    setEditValue(String(currentValue || ''))
  }

  const handleCellSave = async () => {
    if (!editingCell) return

    try {
      const { error } = await supabase
        .from('press_screenings')
        .update({ [editingCell.field]: editValue })
        .eq('id', editingCell.screeningId)

      if (error) throw error

      // Update local state
      setPressScreenings(prev => prev.map(screening => 
        screening.id === editingCell.screeningId 
          ? { ...screening, [editingCell.field]: editValue } 
          : screening
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

  const handleCheckboxChange = async (screeningId: string, field: string, checked: boolean) => {
    try {
      const { error } = await supabase
        .from('press_screenings')
        .update({ [field]: checked })
        .eq('id', screeningId)

      if (error) throw error

      setPressScreenings(prev => prev.map(screening => 
        screening.id === screeningId 
          ? { ...screening, [field]: checked } 
          : screening
      ))
    } catch (error) {
      console.error('Error updating checkbox:', error)
    }
  }

  const handleCancelToggle = async (screening: PressScreeningCard) => {
    const newCanceledState = !screening.canceled
    const confirmMessage = newCanceledState 
      ? `Are you sure you want to cancel the screening for "${screening.film_title}"?`
      : `Are you sure you want to uncancel the screening for "${screening.film_title}"?`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const { error } = await supabase
        .from('press_screenings')
        .update({ canceled: newCanceledState })
        .eq('id', screening.id)

      if (error) throw error

      setPressScreenings(prev => prev.map(s => 
        s.id === screening.id 
          ? { ...s, canceled: newCanceledState } 
          : s
      ))
    } catch (error) {
      console.error('Error updating canceled status:', error)
      alert('Error updating screening status')
    }
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—'
    
    // Parse YYYY-MM-DD format with string manipulation only
    const parts = dateString.split('-')
    if (parts.length !== 3) return dateString // Return as-is if not expected format
    
    const year = parseInt(parts[0])
    const month = parseInt(parts[1]) - 1 // Month for day calculation (0-based)
    const day = parseInt(parts[2])
    
    // Calculate day of week using string-based math (no Date object)
    // Zeller's congruence algorithm for day of week calculation
    let q = day
    let m = month + 1
    let k = year % 100
    let j = Math.floor(year / 100)
    
    if (m < 3) {
      m += 12
      if (k === 0) {
        k = 99
        j--
      } else {
        k--
      }
    }
    
    const h = (q + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
    const dayIndex = (h + 6) % 7 // Convert to Sunday=0 format
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[dayIndex]
    
    const monthStr = parts[1]
    const dayStr = parts[2]
    
    return `${dayName}, ${monthStr}/${dayStr}`
  }

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '—'
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    return `${hour12}:${(minutes || '00').padStart(2, '0')} ${ampm}`
  }

  const renderEditableCell = (screening: PressScreeningCard, field: string, value: any) => {
    const isEditing = editingCell?.screeningId === screening.id && editingCell?.field === field

    if (isEditing) {
      // Special handling for short_code field with autocomplete
      if (field === 'short_code') {
        const filteredSuggestions = venueShortCodes.filter(code => 
          code.toLowerCase().includes(editValue.toLowerCase())
        )

        return (
          <div className="relative">
            <input
              type="text"
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value)
                setShowShortCodeSuggestions(e.target.value.length > 0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCellSave()
                  setShowShortCodeSuggestions(false)
                }
                if (e.key === 'Escape') {
                  handleCellCancel()
                  setShowShortCodeSuggestions(false)
                }
              }}
              onBlur={() => {
                // Delay to allow click on suggestion
                setTimeout(() => {
                  handleCellSave()
                  setShowShortCodeSuggestions(false)
                }, 150)
              }}
              onFocus={() => setShowShortCodeSuggestions(editValue.length > 0)}
              className="w-full px-1 py-0 text-sm border border-blue-500 rounded focus:outline-none"
              autoFocus
              placeholder="Type venue short code..."
            />
            {showShortCodeSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredSuggestions.slice(0, 10).map((code) => (
                  <div
                    key={code}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={async () => {
                      setEditValue(code)
                      setShowShortCodeSuggestions(false)
                      // Save directly with the selected value
                      if (editingCell) {
                        try {
                          const { error } = await supabase
                            .from('press_screenings')
                            .update({ [editingCell.field]: code })
                            .eq('id', editingCell.screeningId)
                          if (!error) {
                            setPressScreenings(prev => prev.map(s =>
                              s.id === editingCell.screeningId ? { ...s, [editingCell.field]: code } : s
                            ))
                          }
                        } catch (err) {
                          console.error('Error saving cell:', err)
                        }
                        setEditingCell(null)
                      }
                    }}
                  >
                    {code}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      // Default input for other fields
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
        onClick={() => handleCellEdit(screening.id, field, value)}
        title="Click to edit"
      >
        {value || '—'}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading press screenings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🎬</span>
            <h1 className="text-2xl font-semibold text-gray-900">Press Screenings</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canEditPressScreenings && (
              <button
                onClick={handleAddScreening}
                className="bg-amber-600 text-white px-4 py-2 rounded-md font-medium hover:bg-amber-700"
              >
                Add Screening
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search screenings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      </div>

      {/* Screenings Table */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {[
                    { key: 'film_title', label: 'Title', width: 200 },
                    { key: 'screening_date', label: 'Date', width: 180 },
                    { key: 'screening_time', label: 'Time', width: 100 },
                    { key: 'short_code', label: 'Venue Short Code', width: 150 },
                    { key: 'run_time', label: 'Runtime', width: 100 },
                    { key: 'rsvps', label: 'RSVPs', width: 120 },
                    { key: 'film_approved', label: 'Film Approved', width: 120 },
                    { key: 'locked', label: 'Locked', width: 100 },
                    { key: 'invites_out', label: 'Invites Out', width: 120 },
                    { key: 'staffer', label: 'Staffer', width: 150 },
                    { key: 'notes', label: 'Notes', width: 200 },
                    ...(canEditPressScreenings ? [{ key: 'actions', label: 'Actions', width: 160 }] : [])
                  ].map((column) => (
                    <th
                      key={column.key}
                      className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      style={{ minWidth: `${columnWidths[column.key] || column.width}px` }}
                      onClick={() => column.key !== 'actions' && column.key !== 'rsvps' && handleSort(column.key)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{column.label}</span>
                        {column.key !== 'actions' && column.key !== 'rsvps' && (
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
                {sortedScreenings.map((screening) => (
                  <tr 
                    key={screening.id} 
                    className={`hover:bg-gray-50 ${screening.canceled ? 'bg-red-100' : ''}`}
                    style={{
                      textDecoration: screening.canceled ? 'line-through' : 'none'
                    }}
                  >
                    {/* Title */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['film_title'] || 200}px` }}>
                      <button
                        onClick={() => handleFilmClick(screening)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                      >
                        {screening.film_title}
                      </button>
                    </td>
                    
                    {/* Date */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['screening_date'] || 180}px` }}>
                      {formatDate(screening.screening_date)}
                    </td>
                    
                    {/* Time */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['screening_time'] || 100}px` }}>
                      {formatTime(screening.screening_time)}
                    </td>
                    
                    {/* Venue Short Code */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['short_code'] || 150}px` }}>
                      {renderEditableCell(screening, 'short_code', screening.short_code)}
                    </td>
                    
                    {/* Runtime */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['run_time'] || 100}px` }}>
                      {screening.run_time ? `${screening.run_time}min` : '—'}
                    </td>
                    
                    {/* RSVPs */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['rsvps'] || 120}px` }}>
                      <div className="flex space-x-1">
                        {screening.rsvp_form_url && (
                          <button
                            onClick={() => navigator.clipboard.writeText(screening.rsvp_form_url!)}
                            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                            title="Copy Invite Form"
                          >
                            Copy
                          </button>
                        )}
                        {screening.rsvp_responses_url && (
                          <button
                            onClick={() => window.open(screening.rsvp_responses_url!, '_blank')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                            title="View RSVPs"
                          >
                            View
                          </button>
                        )}
                        {!screening.rsvp_form_url && !screening.rsvp_responses_url && '—'}
                      </div>
                    </td>
                    
                    {/* Film Approved */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center" style={{ minWidth: `${columnWidths['film_approved'] || 120}px` }}>
                      <input
                        type="checkbox"
                        checked={screening.film_approved ?? false}
                        onChange={(e) => handleCheckboxChange(screening.id, 'film_approved', e.target.checked)}
                        disabled={!canEditPressScreenings}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </td>
                    
                    {/* Locked */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center" style={{ minWidth: `${columnWidths['locked'] || 100}px` }}>
                      <input
                        type="checkbox"
                        checked={screening.locked ?? false}
                        onChange={(e) => handleCheckboxChange(screening.id, 'locked', e.target.checked)}
                        disabled={!canEditPressScreenings}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </td>
                    
                    {/* Invites Out */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center" style={{ minWidth: `${columnWidths['invites_out'] || 120}px` }}>
                      <input
                        type="checkbox"
                        checked={screening.invites_out ?? false}
                        onChange={(e) => handleCheckboxChange(screening.id, 'invites_out', e.target.checked)}
                        disabled={!canEditPressScreenings}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </td>
                    
                    {/* Staffer */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['staffer'] || 150}px` }}>
                      {renderEditableCell(screening, 'staffer', screening.staffer)}
                    </td>
                    
                    {/* Notes */}
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['notes'] || 200}px` }}>
                      {renderEditableCell(screening, 'notes', screening.notes)}
                    </td>
                    
                    {/* Actions */}
                    {canEditPressScreenings && (
                      <td className="px-3 py-2 text-sm text-gray-900" style={{ minWidth: `${columnWidths['actions'] || 160}px` }}>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEditScreening(screening)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleCancelToggle(screening)}
                            className={`${
                              screening.canceled 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-orange-600 hover:bg-orange-700'
                            } text-white px-2 py-1 rounded text-xs font-medium`}
                          >
                            {screening.canceled ? 'Uncancel' : 'Cancel'}
                          </button>
                          <button
                            onClick={() => handleDeleteScreening(screening)}
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {sortedScreenings.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">🎬</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No press screenings found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first press screening'}
            </p>
            {canEditPressScreenings && (
              <button
                onClick={handleAddScreening}
                className="bg-amber-600 text-white px-4 py-2 rounded-md font-medium hover:bg-amber-700"
              >
                Add Screening
              </button>
            )}
          </div>
        )}
      </div>

      {/* Press Screening Form Modal */}
      <PressScreeningFormModal
        screening={editingScreening}
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditingScreening(null)
        }}
        onSave={() => {
          setShowAddModal(false)
          setEditingScreening(null)
          loadPressScreenings()
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
    </div>
  )
}