'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface GenericArchiveViewerProps {
  archiveYear: number
  tableName: string
  title: string
  columns: {
    key: string
    label: string
    render?: (value: any, row: any) => React.ReactNode
  }[]
}

export default function GenericArchiveViewer({ 
  archiveYear, 
  tableName, 
  title,
  columns 
}: GenericArchiveViewerProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadArchiveData()
  }, [archiveYear, tableName])

  const loadArchiveData = async () => {
    setLoading(true)
    setError('')

    try {
      const archiveTable = `archive_${archiveYear}_${tableName}`
      const { data, error } = await supabase
        .from(archiveTable)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setData(data || [])
    } catch (err: any) {
      console.error('Error loading archive data:', err)
      setError(err.message || 'Failed to load archived data')
    } finally {
      setLoading(false)
    }
  }

  const filteredData = data.filter(row => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return Object.values(row).some(value => 
      String(value).toLowerCase().includes(term)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-2xl mb-4">📄</div>
          <div className="text-lg text-gray-600">Loading archived {title}...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-2xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Archive</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Archive Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗄️</span>
          <div className="text-amber-800">
            <strong>Archived {title} from {archiveYear}</strong>
            <div className="text-sm text-amber-700 mt-1">
              This is a read-only view of {title.toLowerCase()} from the {archiveYear} festival archive.
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`Search archived ${title.toLowerCase()}...`}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <div className="text-sm text-gray-600 mt-2">
          Showing {filteredData.length} of {data.length} records
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
            <p className="text-gray-600">
              {data.length === 0 
                ? `No ${title.toLowerCase()} were archived from ${archiveYear}.`
                : "No records match your search."
              }
            </p>
          </div>
        ) : (
          <div className="h-96 overflow-auto border border-gray-300">
            <table className="table-fixed divide-y divide-gray-200" style={{ minWidth: `${columns.length * 150}px` }}>
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {columns.map((col, index) => (
                    <th 
                      key={col.key} 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden"
                      style={{ width: '150px' }}
                    >
                      <div className="truncate">{col.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-gray-50">
                    {columns.map((col, colIndex) => (
                      <td 
                        key={col.key} 
                        className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden"
                        style={{ width: '150px' }}
                      >
                        <div className="truncate" title={String(col.render ? col.render(row[col.key], row) : row[col.key])}>
                          {col.render ? col.render(row[col.key], row) : row[col.key]}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Archive Footer */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="text-center text-sm text-gray-600">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span>🔒</span>
            <strong className="text-amber-700">READ-ONLY ARCHIVE</strong>
          </div>
          <p>This archived data cannot be modified. All records are preserved as they were during the {archiveYear} festival.</p>
        </div>
      </div>
    </div>
  )
}