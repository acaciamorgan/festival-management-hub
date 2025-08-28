'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { getAllModules } from '@/config/modules'
import GenericArchiveViewer from '@/components/archive/generic-archive-viewer'
import TitlesArchive from '@/components/archive/titles-archive'
import { archiveConfigs } from '@/components/archive/module-archive-configs'

interface FestivalYear {
  year: number
  edition: string
  festival_name: string
  start_date: string
  end_date: string
  archived_at: string
}

export default function ArchiveBrowserPage() {
  const params = useParams()
  const year = parseInt(params.year as string)
  const { user, permissions, loading } = useAuth()
  const [festivalInfo, setFestivalInfo] = useState<FestivalYear | null>(null)
  const [activeModule, setActiveModule] = useState<string>('festival-overview')
  const [loadingFestival, setLoadingFestival] = useState(true)
  const [error, setError] = useState('')

  const supabase = createClient()
  const modules = getAllModules()

  useEffect(() => {
    loadFestivalInfo()
  }, [year])

  const loadFestivalInfo = async () => {
    setLoadingFestival(true)
    setError('')
    
    try {
      const { data, error } = await supabase
        .from('festival_years')
        .select('*')
        .eq('year', year)
        .single()
      
      if (error) throw error
      
      if (!data) {
        throw new Error(`No archived data found for year ${year}`)
      }
      
      setFestivalInfo(data)
    } catch (err: any) {
      console.error('Error loading festival info:', err)
      setError(err.message || 'Failed to load festival information')
    } finally {
      setLoadingFestival(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading || loadingFestival) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🗄️</div>
          <div className="text-lg text-gray-600">Loading archived festival...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Archive Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Close Window
          </button>
        </div>
      </div>
    )
  }

  if (!festivalInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📁</div>
          <div className="text-lg text-gray-600">No festival data found for {year}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Archive Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
        {/* Archive Header */}
        <div className="p-4 border-b border-gray-200 bg-amber-50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🗄️</span>
            <span className="font-semibold text-amber-800">ARCHIVE MODE</span>
          </div>
          <div className="text-sm text-amber-700">
            <div className="font-medium">{festivalInfo.festival_name}</div>
            <div>{festivalInfo.edition} • {year}</div>
            <div className="text-xs mt-1">
              {formatDate(festivalInfo.start_date)} - {formatDate(festivalInfo.end_date)}
            </div>
          </div>
        </div>

        {/* Archive Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {modules.map((module) => (
              <button
                key={module.id}
                onClick={() => setActiveModule(module.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  activeModule === module.id
                    ? 'bg-amber-100 text-amber-800 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>📄</span>
                  <span>{module.name}</span>
                </div>
              </button>
            ))}
          </div>
        </nav>

        {/* Archive Info Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600">
            <div>Archived: {formatDate(festivalInfo.archived_at)}</div>
            <div className="mt-2">
              <strong className="text-amber-700">READ-ONLY MODE</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Archive Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Archive Content Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🗄️</span>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {modules.find(m => m.id === activeModule)?.name || 'Archive Browser'}
                </h1>
                <p className="text-sm text-amber-700">
                  {festivalInfo.edition} {festivalInfo.festival_name} ({year}) - Read Only
                </p>
              </div>
            </div>
            
            <button
              onClick={() => window.close()}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Close Archive
            </button>
          </div>
        </div>

        {/* Archive Module Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeModule === 'titles' ? (
            <TitlesArchive archiveYear={year} />
          ) : archiveConfigs[activeModule as keyof typeof archiveConfigs] ? (
            <GenericArchiveViewer
              archiveYear={year}
              tableName={archiveConfigs[activeModule as keyof typeof archiveConfigs].tableName}
              title={archiveConfigs[activeModule as keyof typeof archiveConfigs].title}
              columns={archiveConfigs[activeModule as keyof typeof archiveConfigs].columns}
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🗄️</div>
                <h2 className="text-xl font-medium text-gray-900 mb-2">Archive Module Not Available</h2>
                <p className="text-gray-600 mb-4">
                  The archive for <strong>{modules.find(m => m.id === activeModule)?.name}</strong> is not configured yet.
                </p>
                <p className="text-sm text-gray-500">
                  This module may not have archivable data or the configuration hasn't been added.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}