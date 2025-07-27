'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { PhotoShootFormModal } from '@/components/forms/photo-shoot-form-modal'
import { FilmCardPopup } from '@/components/cards/film-card-popup'
import { GuestCardPopup } from '@/components/cards/guest-card-popup'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'

interface PhotoShoot {
  id: string
  film_program_display: string // Complete display string including free text
  subjects_display: string // Complete display string including free text
  venue_id: string | null
  venue_name: string | null
  house: string | null
  shoot_date: string | null
  call_time: string | null
  shoot_time: string | null
  film_program_start_time: string | null
  photographer: string | null
  videographer: string | null
  intro_qa: string | null
  selects_received: boolean
  sent_to_pr: boolean
  created_at: string
  updated_at: string
  created_by: string
}

interface PhotoShootFormData {
  film_program_titles: string
  subjects: string
  venue_id: string
  shoot_date: string
  call_time: string
  shoot_time: string
  film_program_start_time: string
  photographer: string
  videographer: string
  intro_qa: string
  selects_received: boolean
  sent_to_pr: boolean
}

export default function PhotoShootsPage() {
  const { user } = useAuth()
  const [photoShoots, setPhotoShoots] = useState<PhotoShoot[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedShoot, setSelectedShoot] = useState<PhotoShoot | null>(null)
  const [selectsFilter, setSelectsFilter] = useState<'all' | 'pending' | 'received'>('all')
  const [prFilter, setPrFilter] = useState<'all' | 'pending' | 'sent'>('all')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'shoot_date', direction: 'desc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [showFilmCard, setShowFilmCard] = useState<any>(null)
  const [showGuestCard, setShowGuestCard] = useState<any>(null)
  const [existingFilms, setExistingFilms] = useState<Set<string>>(new Set())
  const [existingGuests, setExistingGuests] = useState<Set<string>>(new Set())

  const supabase = createClient()

  const loadPhotoShoots = useCallback(async () => {
    setLoading(true)
    try {
      const { data: shootsData, error } = await supabase
        .from('photo_shoots')
        .select(`
          *,
          venues(name)
        `)
        .order('shoot_date', { ascending: false })

      if (error) throw error

      const shootsWithVenues = (shootsData || []).map(shoot => ({
        ...shoot,
        venue_name: shoot.venues?.name || null
      }))

      setPhotoShoots(shootsWithVenues)
      
      // Check which films/programs and guests exist in database
      await checkExistingItems(shootsWithVenues)
    } catch (error) {
      console.error('Error loading photo shoots:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const checkExistingItems = async (shoots: PhotoShoot[]) => {
    const allFilmTitles = new Set<string>()
    const allGuestNames = new Set<string>()
    
    // Collect all unique titles and names
    shoots.forEach(shoot => {
      if (shoot.film_program_display) {
        shoot.film_program_display.split(',').forEach(title => {
          allFilmTitles.add(title.trim())
        })
      }
      if (shoot.subjects_display) {
        shoot.subjects_display.split(',').forEach(name => {
          allGuestNames.add(name.trim())
        })
      }
    })
    
    // For now, assume all items exist and make them clickable
    // We'll check existence when clicked instead of preloading
    setExistingFilms(allFilmTitles)
    setExistingGuests(allGuestNames)
  }

  useEffect(() => {
    loadPhotoShoots()
  }, [loadPhotoShoots])

  // Filter and search logic
  const filteredPhotoShoots = useMemo(() => {
    return photoShoots.filter(shoot => {
      // Search filter with accent-insensitive search
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<PhotoShoot>(
          searchTerm,
          (shoot) => [
            shoot.film_program_display,
            shoot.subjects_display,
            shoot.photographer,
            shoot.videographer,
            shoot.venue_name
          ]
        )
        if (!searchFilter(shoot)) return false
      }

      // Selects filter
      if (selectsFilter === 'pending' && shoot.selects_received) return false
      if (selectsFilter === 'received' && !shoot.selects_received) return false

      // PR filter  
      if (prFilter === 'pending' && shoot.sent_to_pr) return false
      if (prFilter === 'sent' && !shoot.sent_to_pr) return false

      return true
    })
  }, [photoShoots, searchTerm, selectsFilter, prFilter])

  // Sort logic
  const sortedPhotoShoots = useMemo(() => {
    if (!sortConfig) return filteredPhotoShoots

    return [...filteredPhotoShoots].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof PhotoShoot]
      const bValue = b[sortConfig.key as keyof PhotoShoot]
      
      if (aValue === null) return 1
      if (bValue === null) return -1
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredPhotoShoots, sortConfig])

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
    
    // Convert 24-hour format to 12-hour AM/PM format
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    
    return `${hour12}:${minutes} ${ampm}`
  }

  const toggleCheckbox = async (shootId: string, field: 'selects_received' | 'sent_to_pr', currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('photo_shoots')
        .update({ [field]: !currentValue })
        .eq('id', shootId)

      if (error) throw error

      setPhotoShoots(prev => prev.map(shoot => 
        shoot.id === shootId 
          ? { ...shoot, [field]: !currentValue } 
          : shoot
      ))
    } catch (error) {
      console.error(`Error updating ${field}:`, error)
      alert(`Error updating ${field}. Please try again.`)
    }
  }

  const checkIfFilmExists = async (filmTitle: string): Promise<boolean> => {
    try {
      // Check feature films
      const { data: featureData } = await supabase
        .from('feature_films')
        .select('id')
        .eq('title', filmTitle)
        .single()
      
      if (featureData) return true
      
      // Check short films
      const { data: shortData } = await supabase
        .from('short_films')
        .select('id')
        .eq('title', filmTitle)
        .single()
      
      if (shortData) return true
      
      // Check programs
      const { data: programData } = await supabase
        .from('programs')
        .select('id')
        .eq('title', filmTitle)
        .single()
      
      return !!programData
    } catch {
      return false
    }
  }

  const openFilmCard = async (filmTitle: string) => {
    try {
      // Try to find the film in feature_films first
      let { data: filmData, error } = await supabase
        .from('feature_films')
        .select('*')
        .eq('title', filmTitle)
        .single()

      if (error) {
        // If not found in feature films, try short films
        const { data: shortFilmData, error: shortError } = await supabase
          .from('short_films')
          .select('*')
          .eq('title', filmTitle)
          .single()

        if (shortError) {
          // If not found in films, try programs
          const { data: programData, error: programError } = await supabase
            .from('programs')
            .select('*')
            .eq('title', filmTitle)
            .single()

          if (programError) {
            console.warn('Title not found in database:', filmTitle)
            alert(`"${filmTitle}" not found in database`)
            return
          }
          
          // Found a program - set it as filmData to display
          filmData = programData
        } else {
          filmData = shortFilmData
        }
      }

      if (filmData) {
        setShowFilmCard(filmData)
      }
    } catch (error) {
      console.error('Error fetching title:', error)
      alert('Error loading details')
    }
  }

  const checkIfGuestExists = async (guestName: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('guests')
        .select('id')
        .eq('name', guestName)
        .single()
      
      return !!data
    } catch {
      return false
    }
  }

  const openGuestCard = async (guestName: string) => {
    try {
      const { data: guestData, error } = await supabase
        .from('guests')
        .select(`
          *,
          guest_films:guest_films(film_title),
          guest_programs:guest_programs(program_title)
        `)
        .eq('name', guestName)
        .single()

      if (error) {
        console.warn('Guest not found in database:', guestName)
        alert(`Guest "${guestName}" not found in database`)
        return
      }

      // Format the guest data for the popup
      const formattedGuest = {
        ...guestData,
        films: guestData.guest_films || [],
        films_display: [
          ...(guestData.guest_films || []).map((f: any) => f.film_title),
          ...(guestData.guest_programs || []).map((p: any) => p.program_title)
        ].join(', ') || '—'
      }

      setShowGuestCard(formattedGuest)
    } catch (error) {
      console.error('Error fetching guest:', error)
      alert('Error loading guest details')
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">📸 Photo Shoots</h1>
            <p className="text-sm text-gray-600 mt-1">
              {sortedPhotoShoots.length} of {photoShoots.length} photo shoots
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
            >
              Add Shoot
            </button>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                  // TODO: Implement CSV import
                  console.log('CSV import not yet implemented')
                }}
              />
              <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium">
                Import CSV
              </button>
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
            placeholder="Search titles, subjects, photographers, videographers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Selects Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Selects:</label>
            <select
              value={selectsFilter}
              onChange={(e) => setSelectsFilter(e.target.value as 'all' | 'pending' | 'received')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
            </select>
          </div>

          {/* PR Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">PR Status:</label>
            <select
              value={prFilter}
              onChange={(e) => setPrFilter(e.target.value as 'all' | 'pending' | 'sent')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || selectsFilter !== 'all' || prFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectsFilter('all')
                setPrFilter('all')
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
        <div className="overflow-auto" style={{ height: 'calc(100vh - 220px)', overflowX: 'auto', overflowY: 'auto' }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-500">Loading photo shoots...</div>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {[
                    { key: 'film_program_display', label: 'Film / Program', width: 200, sortable: true },
                    { key: 'subjects_display', label: 'Subject(s)', width: 200, sortable: false },
                    { key: 'venue_name', label: 'Venue', width: 150, sortable: true },
                    { key: 'shoot_date', label: 'Date', width: 100, sortable: true },
                    { key: 'call_time', label: 'Call Time', width: 100, sortable: true },
                    { key: 'shoot_time', label: 'Shoot Time', width: 100, sortable: true },
                    { key: 'film_program_start_time', label: 'Film/Program Start', width: 120, sortable: true },
                    { key: 'photographer', label: 'Photographer', width: 120, sortable: true },
                    { key: 'videographer', label: 'Videographer', width: 120, sortable: true },
                    { key: 'intro_qa', label: 'Type', width: 100, sortable: true },
                    { key: 'selects_received', label: 'Selects Received', width: 120, sortable: true },
                    { key: 'sent_to_pr', label: 'Sent to PR', width: 100, sortable: true }
                  ].map((column) => (
                    <th
                      key={column.key}
                      className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 relative ${
                        column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                      } ${
                        column.key === 'film_program_display' ? 'sticky left-0 bg-gray-50 z-10' : 
                        column.key === 'subjects_display' ? 'sticky bg-gray-50 z-9' : ''
                      }`}
                      style={{ 
                        width: columnWidths[column.key] || column.width,
                        minWidth: column.key === 'film_program_display' || column.key === 'subjects_display' ? `${column.width}px` : '100px',
                        maxWidth: column.key === 'film_program_display' || column.key === 'subjects_display' ? `${columnWidths[column.key] || column.width}px` : 'none',
                        left: column.key === 'subjects_display' ? `${columnWidths['film_program_display'] || 200}px` : '0px'
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
                {sortedPhotoShoots.map((shoot) => (
                  <tr key={shoot.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 sticky left-0 bg-white z-10" style={{ minWidth: `${columnWidths['film_program_display'] || 200}px`, maxWidth: `${columnWidths['film_program_display'] || 200}px` }}>
                      {shoot.film_program_display ? (
                        <div className="flex flex-wrap gap-1">
                          {shoot.film_program_display.split(', ').map((title, index) => {
                            const trimmedTitle = title.trim()
                            const exists = existingFilms.has(trimmedTitle)
                            return (
                              <span key={index}>
                                {exists ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openFilmCard(trimmedTitle)
                                    }}
                                    className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                                  >
                                    {title}
                                  </button>
                                ) : (
                                  <span className="text-gray-900">{title}</span>
                                )}
                                {index < shoot.film_program_display.split(', ').length - 1 && <span className="text-gray-400">, </span>}
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 sticky left-200px bg-white z-9" style={{ minWidth: `${columnWidths['subjects_display'] || 200}px`, maxWidth: `${columnWidths['subjects_display'] || 200}px`, left: `${columnWidths['film_program_display'] || 200}px` }}>
                      {shoot.subjects_display ? (
                        <div className="flex flex-wrap gap-1">
                          {shoot.subjects_display.split(', ').map((name, index) => {
                            const trimmedName = name.trim()
                            const exists = existingGuests.has(trimmedName)
                            return (
                              <span key={index}>
                                {exists ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openGuestCard(trimmedName)
                                    }}
                                    className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                                  >
                                    {name}
                                  </button>
                                ) : (
                                  <span className="text-gray-900">{name}</span>
                                )}
                                {index < shoot.subjects_display.split(', ').length - 1 && <span className="text-gray-400">, </span>}
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['venue_name'] || 150}px` }}>
                      {shoot.venue_name ? (
                        <div>
                          <div>{shoot.venue_name}</div>
                          {shoot.house && <div className="text-xs text-gray-500">{shoot.house}</div>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['shoot_date'] || 100}px` }}>
                      {formatDate(shoot.shoot_date)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['call_time'] || 100}px` }}>
                      {formatTime(shoot.call_time)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['shoot_time'] || 100}px` }}>
                      {formatTime(shoot.shoot_time)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['film_program_start_time'] || 120}px` }}>
                      {formatTime(shoot.film_program_start_time)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['photographer'] || 120}px` }}>
                      {shoot.photographer || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['videographer'] || 120}px` }}>
                      {shoot.videographer || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['intro_qa'] || 100}px` }}>
                      {shoot.intro_qa || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center" style={{ minWidth: `${columnWidths['selects_received'] || 120}px` }}>
                      <input
                        type="checkbox"
                        checked={shoot.selects_received}
                        onChange={() => toggleCheckbox(shoot.id, 'selects_received', shoot.selects_received)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-center" style={{ minWidth: `${columnWidths['sent_to_pr'] || 100}px` }}>
                      <input
                        type="checkbox"
                        checked={shoot.sent_to_pr}
                        onChange={() => toggleCheckbox(shoot.id, 'sent_to_pr', shoot.sent_to_pr)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-center">
                      <button
                        onClick={() => setSelectedShoot(shoot)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {sortedPhotoShoots.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || selectsFilter !== 'all' || prFilter !== 'all' 
                        ? 'No photo shoots match your filters.'
                        : 'No photo shoots found. Click "Add Shoot" to create your first photo shoot.'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Photo Shoot Form Modal */}
      <PhotoShootFormModal
        photoShoot={selectedShoot}
        isOpen={showAddModal || !!selectedShoot}
        onClose={() => {
          setShowAddModal(false)
          setSelectedShoot(null)
        }}
        onSave={(savedShoot) => {
          if (selectedShoot) {
            // Update existing shoot in the list
            setPhotoShoots(prev => prev.map(shoot => 
              shoot.id === savedShoot.id ? savedShoot : shoot
            ))
          } else {
            // Add new shoot to the list
            setPhotoShoots(prev => [savedShoot, ...prev])
          }
        }}
      />

      {/* Film Card Popup */}
      {showFilmCard && (
        <FilmCardPopup
          film={showFilmCard}
          onClose={() => setShowFilmCard(null)}
        />
      )}

      {/* Guest Card Popup */}
      {showGuestCard && (
        <GuestCardPopup
          guest={showGuestCard}
          onClose={() => setShowGuestCard(null)}
        />
      )}
    </div>
  )
}