'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ArchiveFestivalSettings {
  id: string
  edition_number: number
  festival_name: string
  start_date: string
  end_date: string
  important_links: { title: string; url: string }[]
  created_at: string
  updated_at: string
  archived_year: number
}

interface FestivalOverviewArchiveProps {
  archiveYear: number
}

export default function FestivalOverviewArchive({ archiveYear }: FestivalOverviewArchiveProps) {
  const [festivalSettings, setFestivalSettings] = useState<ArchiveFestivalSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadArchiveFestivalSettings()
  }, [archiveYear])

  const loadArchiveFestivalSettings = async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from(`archive_${archiveYear}_festival_settings`)
        .select('*')
        .maybeSingle()

      if (error && error.code === 'PGRST116') {
        // No data found - this is expected if nothing was archived yet
        setFestivalSettings(null)
      } else if (error) {
        throw error
      } else {
        setFestivalSettings(data)
      }
    } catch (err: any) {
      console.error('Error loading archive festival settings:', err)
      setError(err.message || 'Failed to load archived festival settings')
    } finally {
      setLoading(false)
    }
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 'Festival Dates TBD'
    
    try {
      const startParts = startDate.split('-')
      const endParts = endDate.split('-')
      
      const startYear = parseInt(startParts[0])
      const startMonth = parseInt(startParts[1])
      const startDay = parseInt(startParts[2])
      
      const endYear = parseInt(endParts[0])
      const endMonth = parseInt(endParts[1])
      const endDay = parseInt(endParts[2])
      
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December']
      
      const startMonthName = monthNames[startMonth - 1]
      const endMonthName = monthNames[endMonth - 1]
      
      if (startMonth === endMonth) {
        return `${startMonthName} ${startDay}-${endDay}, ${startYear}`
      } else {
        return `${startMonthName} ${startDay} - ${endMonthName} ${endDay}, ${startYear}`
      }
    } catch (error) {
      console.error('Error formatting date range:', error)
      return 'Festival Dates TBD'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-2xl mb-4">🎬</div>
          <div className="text-lg text-gray-600">Loading archived festival overview...</div>
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

  if (!festivalSettings) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Festival Data Found</h3>
          <p className="text-gray-600">
            No festival overview data was archived from {archiveYear}.
          </p>
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
            <strong>Archived Festival Overview from {archiveYear}</strong>
            <div className="text-sm text-amber-700 mt-1">
              This is a read-only view of the festival settings and information from the {archiveYear} festival archive.
            </div>
          </div>
        </div>
      </div>

      {/* Festival Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {festivalSettings.edition_number}th {festivalSettings.festival_name}
          </h2>
          <p className="text-xl text-gray-600">
            {formatDateRange(festivalSettings.start_date, festivalSettings.end_date)}
          </p>
          <div className="mt-4 text-sm text-gray-500">
            Archived from {archiveYear} festival
          </div>
        </div>

        {/* Important Links */}
        {festivalSettings.important_links && festivalSettings.important_links.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">Important Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {festivalSettings.important_links.map((link, index) => (
                <div
                  key={index}
                  className="block p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <h4 className="font-medium text-gray-900">{link.title}</h4>
                  <p className="text-sm text-gray-500 truncate">{link.url}</p>
                  <div className="mt-2 text-xs text-amber-600">
                    🔒 Read-only (archived link)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Archive Metadata */}
        <div className="border-t pt-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Archive Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <strong>Originally Created:</strong> {(() => {
                const parts = festivalSettings.created_at.split('T')[0].split('-')
                if (parts.length !== 3) return festivalSettings.created_at
                const month = parseInt(parts[1]).toString()
                const day = parseInt(parts[2]).toString()
                const year = parts[0]
                return `${month}/${day}/${year}`
              })()}
            </div>
            <div>
              <strong>Last Updated:</strong> {(() => {
                const parts = festivalSettings.updated_at.split('T')[0].split('-')
                if (parts.length !== 3) return festivalSettings.updated_at
                const month = parseInt(parts[1]).toString()
                const day = parseInt(parts[2]).toString()
                const year = parts[0]
                return `${month}/${day}/${year}`
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Archive Footer */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="text-center text-sm text-gray-600">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span>🔒</span>
            <strong className="text-amber-700">READ-ONLY ARCHIVE</strong>
          </div>
          <p>This archived festival overview data cannot be modified. All settings are preserved as they were during the {archiveYear} festival.</p>
        </div>
      </div>
    </div>
  )
}