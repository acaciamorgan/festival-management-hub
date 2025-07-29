'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'

// Interface for published screenings
interface PublishedScreening {
  id: string
  ticketing_screening_id: string
  film_card_id: string
  film_title: string
  screening_date: string
  day_of_week: string
  start_time: string
  run_time: number | null
  venue_short_code: string
  capacity: number | null
  notes: string | null
  is_cancelled: boolean
  published_by: string
  created_at: string
  updated_at: string
}

// Interface for P&I/Jury screenings
interface PIJuryScreening {
  id: string
  film_title: string
  screening_type: 'P&I' | 'Jury'
  screening_date: string
  day_of_week: string
  start_time: string
  run_time: number | null
  venue_short_code: string
  capacity: number | null
  notes: string | null
  is_cancelled: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// Interface for Tech Check screenings
interface TechCheckScreening {
  id: string
  film_title: string
  screening_date: string
  day_of_week: string
  start_time: string
  run_time: number | null
  venue_short_code: string
  tech_contact: string | null
  notes: string | null
  is_cancelled: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// Interface for screening form data
interface ScreeningFormData {
  film_title: string
  screening_date: string
  start_time: string
  run_time: number | null
  venue_short_code: string
  capacity: number | null
  notes: string
  screening_type?: 'P&I' | 'Jury'
  tech_contact?: string
}

type ViewMode = 'ticketing' | 'pi-jury' | 'tech-checks'

export default function TicketingPage() {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('ticketing')
  
  // Data states
  const [publishedScreenings, setPublishedScreenings] = useState<PublishedScreening[]>([])
  const [piJuryScreenings, setPiJuryScreenings] = useState<PIJuryScreening[]>([])
  const [techCheckScreenings, setTechCheckScreenings] = useState<TechCheckScreening[]>([])
  
  // UI states
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingScreening, setEditingScreening] = useState<any>(null)
  
  // Form state
  const [formData, setFormData] = useState<ScreeningFormData>({
    film_title: '',
    screening_date: '',
    start_time: '',
    run_time: null,
    venue_short_code: '',
    capacity: null,
    notes: ''
  })
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

  const supabase = createClient()

  // Helper functions
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    return `${month}. ${day}`
  }

  const getDayOfWeek = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  const formatTime = (timeString: string): string => {
    const time = new Date(`2000-01-01 ${timeString}`)
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    })
  }

  // Load data functions
  const loadPublishedScreenings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('published_screenings')
        .select('*')
        .order('screening_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error
      setPublishedScreenings(data || [])
    } catch (error) {
      console.error('Error loading published screenings:', error)
    }
  }, [supabase])

  const loadPIJuryScreenings = useCallback(async () => {
    try {
      // TODO: Create pi_jury_screenings table
      const { data, error } = await supabase
        .from('pi_jury_screenings')
        .select('*')
        .order('screening_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error && error.code !== 'PGRST116') throw error // Ignore table not found for now
      setPiJuryScreenings(data || [])
    } catch (error) {
      console.error('Error loading P&I/Jury screenings:', error)
      setPiJuryScreenings([]) // Set empty array if table doesn't exist yet
    }
  }, [supabase])

  const loadTechCheckScreenings = useCallback(async () => {
    try {
      // TODO: Create tech_check_screenings table
      const { data, error } = await supabase
        .from('tech_check_screenings')
        .select('*')
        .order('screening_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error && error.code !== 'PGRST116') throw error // Ignore table not found for now
      setTechCheckScreenings(data || [])
    } catch (error) {
      console.error('Error loading tech check screenings:', error)
      setTechCheckScreenings([]) // Set empty array if table doesn't exist yet
    }
  }, [supabase])

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadPublishedScreenings(),
        loadPIJuryScreenings(),
        loadTechCheckScreenings()
      ])
    } finally {
      setLoading(false)
    }
  }, [loadPublishedScreenings, loadPIJuryScreenings, loadTechCheckScreenings])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Form handlers
  const resetForm = () => {
    setFormData({
      film_title: '',
      screening_date: '',
      start_time: '',
      run_time: null,
      venue_short_code: '',
      capacity: null,
      notes: ''
    })
    setEditingScreening(null)
  }

  const handleAddScreening = () => {
    resetForm()
    setShowAddModal(true)
  }

  const handleEditScreening = (screening: any) => {
    setFormData({
      film_title: screening.film_title,
      screening_date: screening.screening_date,
      start_time: screening.start_time,
      run_time: screening.run_time,
      venue_short_code: screening.venue_short_code,
      capacity: screening.capacity,
      notes: screening.notes || '',
      screening_type: screening.screening_type,
      tech_contact: screening.tech_contact
    })
    setEditingScreening(screening)
    setShowEditModal(true)
  }

  const handleCancelScreening = async (screening: any) => {
    try {
      let tableName = ''
      if (viewMode === 'ticketing') tableName = 'published_screenings'
      else if (viewMode === 'pi-jury') tableName = 'pi_jury_screenings'
      else if (viewMode === 'tech-checks') tableName = 'tech_check_screenings'

      const { error } = await supabase
        .from(tableName)
        .update({ is_cancelled: !screening.is_cancelled })
        .eq('id', screening.id)

      if (error) throw error

      await loadData()
      setShowEditModal(false)
    } catch (error) {
      console.error('Error cancelling screening:', error)
      alert('Error updating screening. Please try again.')
    }
  }

  const handleSaveScreening = async () => {
    if (!user || !formData.film_title || !formData.screening_date || !formData.start_time || !formData.venue_short_code) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const screeningData = {
        film_title: formData.film_title,
        screening_date: formData.screening_date,
        day_of_week: getDayOfWeek(formData.screening_date),
        start_time: formData.start_time,
        run_time: formData.run_time,
        venue_short_code: formData.venue_short_code,
        capacity: formData.capacity,
        notes: formData.notes || null,
        created_by: user.id,
        ...(viewMode === 'pi-jury' && { screening_type: formData.screening_type }),
        ...(viewMode === 'tech-checks' && { tech_contact: formData.tech_contact })
      }

      let tableName = ''
      if (viewMode === 'ticketing') tableName = 'published_screenings'
      else if (viewMode === 'pi-jury') tableName = 'pi_jury_screenings'
      else if (viewMode === 'tech-checks') tableName = 'tech_check_screenings'

      let error
      if (editingScreening) {
        // Update existing screening
        const { error: updateError } = await supabase
          .from(tableName)
          .update(screeningData)
          .eq('id', editingScreening.id)
        error = updateError
      } else {
        // Create new screening
        const { error: insertError } = await supabase
          .from(tableName)
          .insert([screeningData])
        error = insertError
      }

      if (error) throw error

      await loadData()
      setShowAddModal(false)
      setShowEditModal(false)
      resetForm()
    } catch (error) {
      console.error('Error saving screening:', error)
      alert('Error saving screening. Please try again.')
    }
  }

  // Get current data based on view mode
  const getCurrentData = () => {
    switch (viewMode) {
      case 'ticketing': return publishedScreenings
      case 'pi-jury': return piJuryScreenings
      case 'tech-checks': return techCheckScreenings
      default: return []
    }
  }

  // Filter data based on search term
  const filteredData = useMemo(() => {
    const currentData = getCurrentData()
    if (!searchTerm) return currentData

    return currentData.filter(screening =>
      screening.film_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screening.venue_short_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screening.day_of_week.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screening.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm, publishedScreenings, piJuryScreenings, techCheckScreenings, viewMode])

  // Table column configurations
  const getTableColumns = () => {
    const baseColumns = [
      { key: 'film_title', label: 'Title', width: 200, sortable: true },
      { key: 'day_of_week', label: 'Day', width: 120, sortable: true },
      { key: 'screening_date', label: 'Date', width: 120, sortable: true },
      { key: 'venue_short_code', label: 'Venue', width: 120, sortable: true },
      { key: 'start_time', label: 'Start Time', width: 120, sortable: true },
      { key: 'run_time', label: 'Run Time', width: 120, sortable: true },
      { key: 'capacity', label: 'Capacity', width: 120, sortable: true },
      { key: 'notes', label: 'Notes', width: 180, sortable: false }
    ]

    if (viewMode === 'pi-jury') {
      baseColumns.splice(1, 0, { key: 'screening_type', label: 'Type', width: 80, sortable: true })
    }

    if (viewMode === 'tech-checks') {
      baseColumns.splice(-1, 0, { key: 'tech_contact', label: 'Tech Contact', width: 150, sortable: false })
    }

    return baseColumns
  }

  const handleSort = (columnKey: string) => {
    setSortConfig(prev => {
      if (prev?.key === columnKey) {
        return {
          key: columnKey,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return { key: columnKey, direction: 'asc' }
    })
  }

  const handleResize = (columnKey: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: width
    }))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">🎟️ Ticketing</h1>
            <p className="text-sm text-gray-600 mt-1">
              {filteredData.length} of {getCurrentData().length} screenings
            </p>
          </div>
          <button
            onClick={handleAddScreening}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
          >
            Add Screening
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="mt-4">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setViewMode('ticketing')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'ticketing'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ticketing
            </button>
            <button
              onClick={() => setViewMode('pi-jury')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'pi-jury'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              P&I / Jury
            </button>
            <button
              onClick={() => setViewMode('tech-checks')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'tech-checks'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tech Checks
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search screenings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-auto bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-500">Loading screenings...</div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {getTableColumns().map((column) => (
                  <th
                    key={column.key}
                    className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 relative ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    style={{ 
                      width: columnWidths[column.key] || column.width,
                      minWidth: '100px'
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
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 hover:opacity-100 transition-opacity"
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
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((screening) => (
                <tr 
                  key={screening.id} 
                  className={`hover:bg-gray-50 ${
                    screening.is_cancelled 
                      ? 'bg-red-50 text-gray-500' 
                      : ''
                  }`}
                >
                  {getTableColumns().map((column) => {
                    const cellValue = screening[column.key as keyof typeof screening];
                    let displayValue: React.ReactNode = cellValue || '--';
                    
                    if (column.key === 'film_title') {
                      displayValue = <div className="font-medium">{screening.film_title}</div>;
                    } else if (column.key === 'screening_date') {
                      displayValue = formatDate(screening.screening_date);
                    } else if (column.key === 'start_time') {
                      displayValue = formatTime(screening.start_time);
                    } else if (column.key === 'run_time') {
                      displayValue = screening.run_time ? `${screening.run_time}min` : '--';
                    }
                    
                    return (
                      <td 
                        key={column.key}
                        className={`px-3 py-2 text-sm text-gray-900 border-r border-gray-100 ${
                          screening.is_cancelled ? 'line-through' : ''
                        }`}
                        style={{ minWidth: `${columnWidths[column.key] || column.width}px` }}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center text-sm font-medium">
                    <button
                      onClick={() => handleEditScreening(screening)}
                      className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={getTableColumns().length + 1} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm
                      ? 'No screenings match your search.'
                      : `No ${viewMode === 'ticketing' ? 'published' : viewMode === 'pi-jury' ? 'P&I/Jury' : 'tech check'} screenings found. Click "Add Screening" to create your first screening.`
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Screening Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-gray-300 shadow-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add New Screening</h3>
            
            <div className="space-y-4">
              {/* Film Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Film Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.film_title}
                  onChange={(e) => setFormData(prev => ({...prev, film_title: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Screening Type for P&I/Jury */}
              {viewMode === 'pi-jury' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Screening Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.screening_type || ''}
                    onChange={(e) => setFormData(prev => ({...prev, screening_type: e.target.value as 'P&I' | 'Jury'}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="P&I">P&I</option>
                    <option value="Jury">Jury</option>
                  </select>
                </div>
              )}

              {/* Tech Contact for Tech Checks */}
              {viewMode === 'tech-checks' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tech Contact
                  </label>
                  <input
                    type="text"
                    value={formData.tech_contact || ''}
                    onChange={(e) => setFormData(prev => ({...prev, tech_contact: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Screening Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.screening_date}
                  onChange={(e) => setFormData(prev => ({...prev, screening_date: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({...prev, start_time: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Venue */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.venue_short_code}
                  onChange={(e) => setFormData(prev => ({...prev, venue_short_code: e.target.value}))}
                  placeholder="Venue short code..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Run Time and Capacity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Run Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.run_time || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev, 
                      run_time: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {viewMode !== 'tech-checks' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity
                    </label>
                    <input
                      type="number"
                      value={formData.capacity || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev, 
                        capacity: e.target.value ? parseInt(e.target.value) : null
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional notes about this screening..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScreening}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add Screening
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Screening Modal */}
      {showEditModal && editingScreening && (
        <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-gray-300 shadow-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Screening</h3>
            
            <div className="space-y-4">
              {/* Film Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Film Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.film_title}
                  onChange={(e) => setFormData(prev => ({...prev, film_title: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Screening Type for P&I/Jury */}
              {viewMode === 'pi-jury' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Screening Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.screening_type || ''}
                    onChange={(e) => setFormData(prev => ({...prev, screening_type: e.target.value as 'P&I' | 'Jury'}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="P&I">P&I</option>
                    <option value="Jury">Jury</option>
                  </select>
                </div>
              )}

              {/* Tech Contact for Tech Checks */}
              {viewMode === 'tech-checks' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tech Contact
                  </label>
                  <input
                    type="text"
                    value={formData.tech_contact || ''}
                    onChange={(e) => setFormData(prev => ({...prev, tech_contact: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Screening Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.screening_date}
                  onChange={(e) => setFormData(prev => ({...prev, screening_date: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({...prev, start_time: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Venue */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.venue_short_code}
                  onChange={(e) => setFormData(prev => ({...prev, venue_short_code: e.target.value}))}
                  placeholder="Venue short code..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Run Time and Capacity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Run Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.run_time || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev, 
                      run_time: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {viewMode !== 'tech-checks' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity
                    </label>
                    <input
                      type="number"
                      value={formData.capacity || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev, 
                        capacity: e.target.value ? parseInt(e.target.value) : null
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional notes about this screening..."
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => handleCancelScreening(editingScreening)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  editingScreening.is_cancelled
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {editingScreening.is_cancelled ? 'Uncancel Screening' : 'Cancel Screening'}
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveScreening}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Update Screening
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}