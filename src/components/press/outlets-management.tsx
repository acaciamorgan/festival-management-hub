'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { OutletCard, CoverageOutletType, CoverageGeography } from '@/types'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'

interface OutletsManagementProps {
  canEdit: boolean
}

interface OutletFormData {
  name: string
  outlet_type: CoverageOutletType | ''
  uvm_reach: string
  geography: CoverageGeography | ''
  website: string
}

const OUTLET_TYPES: CoverageOutletType[] = ['Print Daily', 'Magazine', 'Print Weekly', 'Online', 'Radio', 'TV', 'Podcast', 'College', 'Trade']
const GEOGRAPHIES: CoverageGeography[] = ['Local', 'Regional', 'National', 'International']

const emptyForm: OutletFormData = {
  name: '',
  outlet_type: '',
  uvm_reach: '',
  geography: '',
  website: ''
}

export function OutletsManagement({ canEdit }: OutletsManagementProps) {
  const { currentYear } = useFestivalYear()
  const [outlets, setOutlets] = useState<OutletCard[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [outletTypeFilter, setOutletTypeFilter] = useState<string>('all')
  const [geographyFilter, setGeographyFilter] = useState<string>('all')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'name', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingOutlet, setEditingOutlet] = useState<OutletCard | null>(null)
  const [formData, setFormData] = useState<OutletFormData>({ ...emptyForm })

  const supabase = createClient()

  const loadOutlets = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .eq('festival_year', currentYear)
        .order('name')

      if (error) throw error
      setOutlets(data || [])
    } catch (error) {
      console.error('Error loading outlets:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, currentYear])

  useEffect(() => {
    loadOutlets()
  }, [loadOutlets])

  const filteredOutlets = useMemo(() => {
    return outlets.filter(outlet => {
      if (searchTerm) {
        const filter = createAccentInsensitiveFilter<OutletCard>(
          searchTerm,
          (o) => [o.name, o.outlet_type, o.geography, o.uvm_reach]
        )
        if (!filter(outlet)) return false
      }
      if (outletTypeFilter !== 'all' && outlet.outlet_type !== outletTypeFilter) return false
      if (geographyFilter !== 'all' && outlet.geography !== geographyFilter) return false
      return true
    })
  }, [outlets, searchTerm, outletTypeFilter, geographyFilter])

  const sortedOutlets = useMemo(() => {
    if (!sortConfig) return filteredOutlets
    return [...filteredOutlets].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof OutletCard]
      const bVal = b[sortConfig.key as keyof OutletCard]
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredOutlets, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return '↕'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const openAddModal = () => {
    setFormData({ ...emptyForm })
    setEditingOutlet(null)
    setShowAddModal(true)
  }

  const openEditModal = (outlet: OutletCard) => {
    setFormData({
      name: outlet.name,
      outlet_type: outlet.outlet_type || '',
      uvm_reach: outlet.uvm_reach || '',
      geography: outlet.geography || '',
      website: outlet.website || ''
    })
    setEditingOutlet(outlet)
    setShowAddModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      const payload = {
        name: formData.name.trim(),
        outlet_type: formData.outlet_type || null,
        uvm_reach: formData.uvm_reach.trim() || null,
        geography: formData.geography || null,
        website: formData.website.trim() || null,
        festival_year: currentYear,
        updated_at: new Date().toISOString()
      }

      if (editingOutlet) {
        const { error } = await supabase
          .from('outlets')
          .update(payload)
          .eq('id', editingOutlet.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('outlets')
          .insert([{ ...payload, created_at: new Date().toISOString() }])
        if (error) throw error
      }

      setShowAddModal(false)
      setEditingOutlet(null)
      await loadOutlets()
    } catch (error) {
      console.error('Error saving outlet:', error)
      alert('Error saving outlet. Please try again.')
    }
  }

  const handleDelete = async (outlet: OutletCard) => {
    if (!confirm(`Are you sure you want to delete "${outlet.name}"? Any coverage entries referencing this outlet will lose their outlet link.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('outlets')
        .delete()
        .eq('id', outlet.id)

      if (error) throw error
      await loadOutlets()
    } catch (error) {
      console.error('Error deleting outlet:', error)
      alert('Error deleting outlet. Please try again.')
    }
  }

  const missingReachCount = outlets.filter(o => !o.uvm_reach).length

  const columns = [
    { key: 'name', label: 'Outlet Name', width: 220 },
    { key: 'outlet_type', label: 'Type', width: 130 },
    { key: 'geography', label: 'Geography', width: 120 },
    { key: 'uvm_reach', label: 'UVM / Reach', width: 150 },
    { key: 'website', label: 'Website', width: 200 },
    ...(canEdit ? [{ key: 'actions', label: 'Actions', width: 140 }] : [])
  ]

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{filteredOutlets.length} of {outlets.length} outlets</p>
            {missingReachCount > 0 && (
              <p className="text-xs text-amber-600 mt-1">{missingReachCount} outlet{missingReachCount !== 1 ? 's' : ''} missing UVM/Reach data</p>
            )}
          </div>
          {canEdit && (
            <button
              onClick={openAddModal}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md transition-colors font-medium"
            >
              Add Outlet
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search outlets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={outletTypeFilter}
              onChange={(e) => setOutletTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              {OUTLET_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Geography:</label>
            <select
              value={geographyFilter}
              onChange={(e) => setGeographyFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              {GEOGRAPHIES.map(geo => (
                <option key={geo} value={geo}>{geo}</option>
              ))}
            </select>
          </div>
          {(searchTerm || outletTypeFilter !== 'all' || geographyFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setOutletTypeFilter('all')
                setGeographyFilter('all')
              }}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading outlets...</p>
            </div>
          </div>
        ) : outlets.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h2 className="text-lg font-medium mb-4">No Outlets Yet</h2>
            <p className="text-gray-600 mb-4">Add outlets to track coverage sources.</p>
            {canEdit && (
              <button
                onClick={openAddModal}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-md transition-colors font-medium"
              >
                Add First Outlet
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50"
                        style={{ minWidth: `${columnWidths[column.key] || column.width}px` }}
                      >
                        <div className="flex items-center justify-between">
                          {column.key !== 'actions' ? (
                            <button
                              onClick={() => handleSort(column.key)}
                              className="flex items-center space-x-1 hover:text-gray-700"
                            >
                              <span>{column.label}</span>
                              <span className={sortConfig?.key === column.key ? 'text-blue-600' : 'text-gray-400'}>
                                {getSortIcon(column.key)}
                              </span>
                            </button>
                          ) : (
                            <span>{column.label}</span>
                          )}
                        </div>
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            const startX = e.clientX
                            const startWidth = columnWidths[column.key] || column.width
                            const handleMouseMove = (e: MouseEvent) => {
                              const newWidth = Math.max(50, startWidth + (e.clientX - startX))
                              setColumnWidths(prev => ({ ...prev, [column.key]: newWidth }))
                            }
                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove)
                              document.removeEventListener('mouseup', handleMouseUp)
                            }
                            document.addEventListener('mousemove', handleMouseMove)
                            document.addEventListener('mouseup', handleMouseUp)
                          }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedOutlets.map((outlet) => (
                    <tr key={outlet.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 font-medium" style={{ minWidth: `${columnWidths['name'] || 220}px` }}>
                        {outlet.name}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['outlet_type'] || 130}px` }}>
                        {outlet.outlet_type && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {outlet.outlet_type}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['geography'] || 120}px` }}>
                        {outlet.geography}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['uvm_reach'] || 150}px` }}>
                        {outlet.uvm_reach || (
                          <span className="text-amber-500 text-xs">Missing</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['website'] || 200}px` }}>
                        {outlet.website && (
                          <a href={outlet.website.startsWith('http') ? outlet.website : `https://${outlet.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline truncate block max-w-[200px]">
                            {outlet.website}
                          </a>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-3 py-2 text-sm border-r border-gray-100" style={{ minWidth: `${columnWidths['actions'] || 140}px` }}>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openEditModal(outlet)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(outlet)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
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
        )}
      </div>

      {/* Add/Edit Outlet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editingOutlet ? 'Edit Outlet' : 'Add New Outlet'}</h2>
              <button
                onClick={() => { setShowAddModal(false); setEditingOutlet(null) }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Outlet Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outlet Type</label>
                  <select
                    value={formData.outlet_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, outlet_type: e.target.value as CoverageOutletType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    {OUTLET_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geography</label>
                  <select
                    value={formData.geography}
                    onChange={(e) => setFormData(prev => ({ ...prev, geography: e.target.value as CoverageGeography }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Geography</option>
                    {GEOGRAPHIES.map(geo => (
                      <option key={geo} value={geo}>{geo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UVM / Reach</label>
                <input
                  type="text"
                  value={formData.uvm_reach}
                  onChange={(e) => setFormData(prev => ({ ...prev, uvm_reach: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 1.2M, 50,000, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingOutlet(null) }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  {editingOutlet ? 'Save Changes' : 'Add Outlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
