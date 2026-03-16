'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { VenueCard, TheaterHouse, VenueType } from '@/types'
import { VenueFormModal } from '@/components/forms/venue-form-modal'
import { VenueCardPopup } from '@/components/cards/venue-card-popup'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'

export default function VenueManagementPage() {
  const { permissions } = usePermissions()
  const { currentYear } = useFestivalYear()
  const [venues, setVenues] = useState<VenueCard[]>([])
  const [filteredVenues, setFilteredVenues] = useState<VenueCard[]>([])
  const [loading, setLoading] = useState(false)

  const canEditVenues = permissions?.modulePermissions?.['venueManagement']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVenueType, setSelectedVenueType] = useState('')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'name', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [selectedVenue, setSelectedVenue] = useState<VenueCard | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showVenueCard, setShowVenueCard] = useState<VenueCard | null>(null)

  const supabase = createClient()

  // Define table columns configuration
  const tableColumns = [
    { key: 'name', label: 'Venue Name', width: 200, sortable: true },
    { key: 'address', label: 'Address', width: 250, sortable: true },
    { key: 'venue_type', label: 'Type', width: 120, sortable: true },
    { key: 'houses_display', label: 'Houses', width: 250, sortable: false },
    { key: 'contact_emails', label: 'Email', width: 200, sortable: false },
    { key: 'contact_phones', label: 'Phone', width: 150, sortable: false }
  ]

  // Phone number formatting function
  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone // Return original if not 10 digits
  }

  const loadVenues = useCallback(async () => {
    setLoading(true)
    try {
      // Load venues with their theater houses
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('*')
        .eq('festival_year', currentYear)
        .order('name', { ascending: true })

      if (venuesError) throw venuesError

      // Load theater houses for movie theaters
      const { data: housesData, error: housesError } = await supabase
        .from('theater_houses')
        .select('*')
        .eq('festival_year', currentYear)
        .order('house_name', { ascending: true })

      if (housesError) throw housesError

      // Combine venues with their houses and create display string
      const venuesWithHouses = (venuesData || []).map(venue => {
        const venueHouses = (housesData || []).filter(house => house.venue_id === venue.id)
        
        const houses_display = venue.venue_type === 'Movie Theater' && venueHouses.length > 0
          ? venueHouses
              .sort((a, b) => {
                // Extract numbers from house names for proper numerical sorting
                const numA = parseInt(a.house_name.match(/\d+/)?.[0] || '0');
                const numB = parseInt(b.house_name.match(/\d+/)?.[0] || '0');
                return numA - numB;
              })
              .map(house => `${house.house_name}${house.short_code ? ` - ${house.short_code}` : ''} (${house.seat_count})`)
              .join(', ')
          : venue.venue_type === 'Movie Theater' ? 'No houses configured' : 'N/A'

        return {
          ...venue,
          houses: venueHouses,
          houses_display
        }
      })

      setVenues(venuesWithHouses)
      setFilteredVenues(venuesWithHouses)
    } catch (error) {
      console.error('Error loading venues:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, currentYear])

  // Get unique venue types for filtering
  const uniqueVenueTypes = useMemo(() => {
    const types = new Set<string>()
    venues.forEach(venue => {
      if (venue.venue_type) types.add(venue.venue_type)
    })
    return Array.from(types).sort()
  }, [venues])

  // Smart sorting function (ignores articles and special characters)
  const normalizeForSort = (str: string | undefined | null): string => {
    if (!str) return ''
    return str
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/[^\w\s]/g, '')
      .toLowerCase()
      .trim()
  }

  // Filtering and sorting
  const applyFiltersAndSort = useMemo(() => {
    const filtered = venues.filter(venue => {
      // Search filter with accent-insensitive search
      if (searchTerm) {
        const searchFilter = createAccentInsensitiveFilter<VenueCard>(
          searchTerm,
          (venue) => [
            venue.name,
            venue.address,
            venue.venue_type,
            venue.contact_names?.join(' '),
            venue.contact_emails?.join(' '),
            venue.contact_phones?.join(' '),
            venue.houses_display
          ]
        )
        if (!searchFilter(venue)) return false
      }

      // Venue type filter
      if (selectedVenueType && venue.venue_type !== selectedVenueType) {
        return false
      }

      return true
    })

    // Apply sorting
    const sortVenues = (venuesToSort: VenueCard[]) => {
      if (sortConfig) {
        return [...venuesToSort].sort((a, b) => {
          const aVal = a[sortConfig.key as keyof VenueCard]
          const bVal = b[sortConfig.key as keyof VenueCard]
          
          const aNorm = normalizeForSort(aVal?.toString())
          const bNorm = normalizeForSort(bVal?.toString())
          
          if (aNorm < bNorm) return sortConfig.direction === 'asc' ? -1 : 1
          if (aNorm > bNorm) return sortConfig.direction === 'asc' ? 1 : -1
          return 0
        })
      }
      return venuesToSort
    }

    // Split into movie theaters and other venues
    const movieTheaters = sortVenues(filtered.filter(venue => venue.venue_type === 'Movie Theater'))
    const otherVenues = sortVenues(filtered.filter(venue => venue.venue_type !== 'Movie Theater'))

    return { movieTheaters, otherVenues, all: filtered }
  }, [venues, searchTerm, selectedVenueType, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return { key, direction: 'asc' }
    })
  }

  const handleResize = (columnKey: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: width
    }))
  }

  const handleDeleteVenue = async (venueId: string) => {
    try {
      await supabase
        .from('theater_houses')
        .delete()
        .eq('venue_id', venueId)

      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId)
      
      if (error) throw error
      
      setVenues(prev => prev.filter(v => v.id !== venueId))
    } catch (error) {
      console.error('Error deleting venue:', error)
      alert('Error deleting venue. Please try again.')
    }
  }

  // Helper function to render venue table section
  const renderVenueSection = (sectionVenues: VenueCard[], sectionTitle: string, sectionIcon: string) => {
    if (sectionVenues.length === 0) return null

    return (
      <div className="mb-8">
        {/* Section Header */}
        <div className="bg-gray-100 px-6 py-3 border-b border-gray-300">
          <div className="flex items-center">
            <span className="text-xl mr-2">{sectionIcon}</span>
            <h3 className="text-lg font-semibold text-gray-900">{sectionTitle}</h3>
            <span className="ml-2 text-sm text-gray-600">({sectionVenues.length})</span>
          </div>
        </div>

        {/* Section Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {tableColumns.map((column) => (
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
              {canEditVenues && (
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sectionVenues.map((venue) => (
              <tr
                key={venue.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setShowVenueCard(venue)}
              >
                <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['name'] || 200}px` }}>
                  {venue.name}
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['address'] || 250}px` }}>
                  {venue.address}
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['venue_type'] || 120}px` }}>
                  {venue.venue_type}
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['houses_display'] || 250}px` }}>
                  {venue.houses_display}
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contact_emails'] || 200}px` }}>
                  {venue.contact_emails?.[0] || '—'}
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contact_phones'] || 150}px` }}>
                  {venue.contact_phones?.[0] ? formatPhoneNumber(venue.contact_phones[0]) : '—'}
                </td>
                {canEditVenues && (
                  <td className="px-3 py-2 text-center text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedVenue(venue)
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-xs font-medium"
                    >
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    )
  }

  useEffect(() => {
    const { all } = applyFiltersAndSort
    setFilteredVenues(all)
  }, [applyFiltersAndSort])

  useEffect(() => {
    loadVenues()
  }, [loadVenues])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🏢</span>
            <h1 className="text-2xl font-semibold text-gray-900">Venue Management</h1>
          </div>
          
          {canEditVenues && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Add Venue
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search venues, addresses, contacts..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Venue Type Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Type:</label>
              <select
                value={selectedVenueType}
                onChange={(e) => setSelectedVenueType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                {uniqueVenueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            {/* Clear Filters */}
            {(searchTerm || selectedVenueType) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedVenueType('')
                }}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-gray-50 px-6 py-2 text-sm text-gray-600 border-b border-gray-200">
        Showing {applyFiltersAndSort.movieTheaters.length + applyFiltersAndSort.otherVenues.length} of {venues.length} venues
        {searchTerm && ` for "${searchTerm}"`}
        {selectedVenueType && ` (${selectedVenueType})`}
        {applyFiltersAndSort.movieTheaters.length > 0 && applyFiltersAndSort.otherVenues.length > 0 && 
          ` • ${applyFiltersAndSort.movieTheaters.length} movie theaters, ${applyFiltersAndSort.otherVenues.length} other venues`
        }
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden bg-white">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-500">Loading venues...</div>
          </div>
        ) : (
          <div>
            {/* Movie Theaters Section */}
            {renderVenueSection(applyFiltersAndSort.movieTheaters, 'Movie Theaters', '🎬')}
            
            {/* Other Venues Section */}
            {renderVenueSection(applyFiltersAndSort.otherVenues, 'Other Venues', '🏢')}
            
            {/* No Results Message */}
            {!loading && applyFiltersAndSort.movieTheaters.length === 0 && applyFiltersAndSort.otherVenues.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {venues.length === 0 ? 'No venues found. Add your first venue!' : 'No venues match your search criteria.'}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Venue Form Modal */}
      <VenueFormModal
        venue={showAddModal ? null : selectedVenue}
        isOpen={showAddModal || !!selectedVenue}
        currentYear={currentYear}
        onClose={() => {
          setShowAddModal(false)
          setSelectedVenue(null)
        }}
        onSave={(savedVenue) => {
          // Reload all venues to get proper houses data
          loadVenues()
          setShowAddModal(false)
          setSelectedVenue(null)
        }}
      />

      {/* Venue Card Popup */}
      {showVenueCard && (
        <VenueCardPopup
          venue={showVenueCard}
          onClose={() => setShowVenueCard(null)}
          onUpdate={(updatedVenue) => {
            // Reload all venues to get proper houses data
            loadVenues()
            setShowVenueCard(null)
          }}
          onDelete={(venueId) => {
            setVenues(prev => prev.filter(v => v.id !== venueId))
            setShowVenueCard(null)
          }}
        />
      )}
    </div>
  )
}