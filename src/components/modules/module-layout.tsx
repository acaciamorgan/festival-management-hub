'use client'

import { useState } from 'react'
import { ModuleLayoutProps } from '@/types'
import { DataGrid } from '@/components/ui/data-grid'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'


export function ModuleLayout({
  moduleConfig,
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  children
}: ModuleLayoutProps) {
  const [view, setView] = useState<'grid' | 'calendar'>('grid')
  const { } = useAuth()
  const { permissions } = usePermissions()

  const canEdit = permissions?.isAdmin || 
    permissions?.modulePermissions[moduleConfig.id]?.canEdit || false

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📄</span>
            <h1 className="text-2xl font-semibold text-gray-900">
              {moduleConfig.name}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* View Toggle */}
            {moduleConfig.hasCalendarView && (
              <div className="flex bg-gray-100 rounded-md p-1">
                <button
                  onClick={() => setView('grid')}
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    view === 'grid'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setView('calendar')}
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    view === 'calendar'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Calendar
                </button>
              </div>
            )}
            
            {/* Add Button */}
            {canEdit && onAdd && (
              <button
                onClick={onAdd}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Add {moduleConfig.name.slice(0, -1)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {view === 'grid' ? (
          <DataGrid
            data={data}
            columns={columns}
            onEdit={canEdit ? onEdit : undefined}
            onDelete={canEdit ? onDelete : undefined}
            canEdit={canEdit}
            canDelete={canEdit}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center text-gray-500">
              Calendar view coming soon...
            </div>
          </div>
        )}
        
        {children}
      </div>
    </div>
  )
}