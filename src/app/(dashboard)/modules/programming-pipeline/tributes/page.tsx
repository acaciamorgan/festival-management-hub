'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'

interface GridCell {
  id: string
  row_number: number
  column_number: number
  content: string | null
  created_at: string
  updated_at: string
  created_by: string
}

export default function TributesPage() {
  const { user } = useAuth()
  const [gridData, setGridData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null)
  const [editValue, setEditValue] = useState('')
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({})

  const supabase = createClient()

  // Generate cell key for row/column combination
  const getCellKey = (row: number, col: number) => `${row}-${col}`

  // Load grid data from database
  const loadGridData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tributes_grid')
        .select('*')

      if (error) throw error

      // Convert array of cells to object for easy lookup
      const gridObject: Record<string, string> = {}
      data?.forEach(cell => {
        gridObject[getCellKey(cell.row_number, cell.column_number)] = cell.content || ''
      })
      
      setGridData(gridObject)
    } catch (error) {
      console.error('Error loading grid data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadGridData()
  }, [loadGridData])

  // Handle cell editing
  const handleCellEdit = (row: number, col: number) => {
    const cellKey = getCellKey(row, col)
    setEditingCell({ row, col })
    setEditValue(gridData[cellKey] || '')
  }

  const handleCellSave = async () => {
    if (!editingCell) return

    const cellKey = getCellKey(editingCell.row, editingCell.col)
    
    try {
      // Upsert the cell data
      const { error } = await supabase
        .from('tributes_grid')
        .upsert({
          row_number: editingCell.row,
          column_number: editingCell.col,
          content: editValue || null,
          created_by: user?.id
        }, {
          onConflict: 'row_number,column_number'
        })

      if (error) throw error

      // Update local state
      setGridData(prev => ({
        ...prev,
        [cellKey]: editValue
      }))

      setEditingCell(null)
      setEditValue('')
    } catch (error) {
      console.error('Error saving cell:', error)
    }
  }

  const handleCellSaveAndEdit = async (nextRow: number, nextCol: number) => {
    if (!editingCell) return

    const cellKey = getCellKey(editingCell.row, editingCell.col)
    
    try {
      // Save current cell
      const { error } = await supabase
        .from('tributes_grid')
        .upsert({
          row_number: editingCell.row,
          column_number: editingCell.col,
          content: editValue || null,
          created_by: user?.id
        }, {
          onConflict: 'row_number,column_number'
        })

      if (error) throw error

      // Update local state
      setGridData(prev => ({
        ...prev,
        [cellKey]: editValue
      }))

      // Immediately start editing next cell
      const nextCellKey = getCellKey(nextRow, nextCol)
      setEditingCell({ row: nextRow, col: nextCol })
      setEditValue(gridData[nextCellKey] || '')
    } catch (error) {
      console.error('Error saving cell:', error)
    }
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setEditValue('')
  }

  // Generate column headers (A, B, C, etc.)
  const getColumnHeader = (colIndex: number) => {
    return String.fromCharCode(65 + colIndex) // A=65, B=66, etc.
  }

  // Render individual cell
  const renderCell = (row: number, col: number) => {
    const cellKey = getCellKey(row, col)
    const isEditing = editingCell?.row === row && editingCell?.col === col
    const value = gridData[cellKey] || ''

    if (isEditing) {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              // Save current cell and immediately edit next cell
              const nextRow = row + 1 < 100 ? row + 1 : 0
              handleCellSaveAndEdit(nextRow, col)
            }
            if (e.key === 'Escape') handleCellCancel()
            if (e.key === 'Tab') {
              e.preventDefault()
              // Save current cell and immediately edit next cell
              const nextCol = col + 1 < 20 ? col + 1 : 0
              const nextRow = col + 1 < 20 ? row : row + 1 < 100 ? row + 1 : 0
              handleCellSaveAndEdit(nextRow, nextCol)
            }
          }}
          onBlur={handleCellSave}
          className="w-full h-full px-2 py-1 text-sm border-none focus:outline-none bg-blue-50"
          autoFocus
        />
      )
    }

    return (
      <div
        className="w-full h-full px-2 py-1 text-sm cursor-text hover:bg-gray-50 flex items-center"
        onClick={() => handleCellEdit(row, col)}
        title="Click to edit"
      >
        {value || ''}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">🏆 Tributes & Special Events</h1>
            <p className="text-sm text-gray-600 mt-1">
              Excel-like grid for notes and planning
            </p>
          </div>
        </div>
      </div>

      {/* Excel-like Grid */}
      <div className="flex-1 overflow-hidden bg-white">
        <div className="overflow-auto" style={{ height: 'calc(100vh - 200px)' }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-500">Loading grid...</div>
            </div>
          ) : (
            <table className="border-collapse" style={{ minWidth: '2560px' }}>
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {/* Empty corner cell */}
                  <th className="w-12 h-8 border border-gray-300 bg-gray-100 text-xs font-medium text-gray-500"></th>
                  {/* Column headers A, B, C, etc. */}
                  {Array.from({ length: 20 }, (_, colIndex) => (
                    <th 
                      key={colIndex}
                      className="h-8 border border-gray-300 bg-gray-100 text-xs font-medium text-gray-500 text-center relative"
                      style={{ width: columnWidths[colIndex] || 128 }}
                    >
                      {getColumnHeader(colIndex)}
                      {/* Resize handle */}
                      <div
                        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          
                          const startX = e.pageX
                          const startWidth = columnWidths[colIndex] || 128

                          const handleMouseMove = (e: MouseEvent) => {
                            e.preventDefault()
                            const newWidth = Math.max(50, startWidth + (e.pageX - startX))
                            setColumnWidths(prev => ({ ...prev, [colIndex]: newWidth }))
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
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 100 }, (_, rowIndex) => (
                  <tr key={rowIndex}>
                    {/* Row number */}
                    <td className="w-12 h-8 border border-gray-300 bg-gray-100 text-xs font-medium text-gray-500 text-center sticky left-0 z-10">
                      {rowIndex + 1}
                    </td>
                    {/* Data cells */}
                    {Array.from({ length: 20 }, (_, colIndex) => (
                      <td 
                        key={colIndex}
                        className="h-8 border border-gray-300 bg-white hover:bg-gray-50"
                        style={{ width: columnWidths[colIndex] || 128 }}
                      >
                        {renderCell(rowIndex, colIndex)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
        <p className="text-xs text-gray-500">
          Click any cell to edit • Press Enter to save • Press Tab to move to next cell • Press Escape to cancel
        </p>
      </div>
    </div>
  )
}