'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'

interface FestivalSettings {
  id: string
  edition_number: number
  festival_name: string
  start_date: string
  end_date: string
  important_links: { title: string; url: string }[]
  created_at: string
  updated_at: string
}

export default function FestivalOverviewPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview')
  const [festivalSettings, setFestivalSettings] = useState<FestivalSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state for settings
  const [editionNumber, setEditionNumber] = useState(60)
  const [festivalName, setFestivalName] = useState('Chicago International Film Festival')
  const [startDate, setStartDate] = useState('2024-10-16')
  const [endDate, setEndDate] = useState('2024-10-27')
  const [importantLinks, setImportantLinks] = useState<{ title: string; url: string }[]>([
    { title: 'Festival Website', url: 'https://chicagofilmfestival.com' },
    { title: 'Box Office System', url: '#' },
    { title: 'Press Portal', url: '#' }
  ])

  const supabase = createClient()
  const { user } = useAuth()

  useEffect(() => {
    loadFestivalSettings()
  }, [])

  const loadFestivalSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('festival_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error
      }

      if (data) {
        setFestivalSettings(data)
        setEditionNumber(data.edition_number)
        setFestivalName(data.festival_name)
        setStartDate(data.start_date)
        setEndDate(data.end_date)
        setImportantLinks(data.important_links || [])
      }
    } catch (error) {
      console.error('Error loading festival settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveFestivalSettings = async () => {
    if (!user) return

    setSaving(true)
    try {
      const settingsData = {
        edition_number: editionNumber,
        festival_name: festivalName,
        start_date: startDate,
        end_date: endDate,
        important_links: importantLinks
      }

      if (festivalSettings) {
        // Update existing
        const { error } = await supabase
          .from('festival_settings')
          .update(settingsData)
          .eq('id', festivalSettings.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('festival_settings')
          .insert([settingsData])

        if (error) throw error
      }

      alert('Festival settings saved successfully!')
      await loadFestivalSettings()
    } catch (error) {
      console.error('Error saving festival settings:', error)
      alert('Error saving festival settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const addImportantLink = () => {
    setImportantLinks([...importantLinks, { title: '', url: '' }])
  }

  const updateImportantLink = (index: number, field: 'title' | 'url', value: string) => {
    const updated = [...importantLinks]
    updated[index][field] = value
    setImportantLinks(updated)
  }

  const removeImportantLink = (index: number) => {
    const updated = importantLinks.filter((_, i) => i !== index)
    setImportantLinks(updated)
  }

  const formatDateRange = () => {
    if (!startDate || !endDate) return 'Festival Dates TBD'
    
    try {
      // Parse dates using string operations only
      const startParts = startDate.split('-')  // [YYYY, MM, DD]
      const endParts = endDate.split('-')      // [YYYY, MM, DD]
      
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
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4 w-64"></div>
          <div className="h-4 bg-gray-200 rounded mb-2 w-48"></div>
          <div className="h-4 bg-gray-200 rounded mb-4 w-32"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-green-600 mb-8">🎬 Festival Management</h1>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2 rounded-t-lg font-medium ${
              activeTab === 'overview'
                ? 'bg-white border-t border-l border-r border-gray-300 text-green-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Festival Overview
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2 rounded-t-lg font-medium ${
              activeTab === 'settings'
                ? 'bg-white border-t border-l border-r border-gray-300 text-green-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Festival Settings
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {editionNumber}th {festivalName}
              </h2>
              <p className="text-xl text-gray-600">
                {formatDateRange()}
              </p>
            </div>

            {/* Important Links */}
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">Important Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {importantLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                  >
                    <h4 className="font-medium text-gray-900">{link.title}</h4>
                    <p className="text-sm text-gray-500 truncate">{link.url}</p>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Stats - Placeholder for future */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Total Films</h4>
                <p className="text-3xl font-bold text-green-600">—</p>
                <p className="text-sm text-gray-500">Coming soon</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Screenings</h4>
                <p className="text-3xl font-bold text-green-600">—</p>
                <p className="text-sm text-gray-500">Coming soon</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Venues</h4>
                <p className="text-3xl font-bold text-green-600">—</p>
                <p className="text-sm text-gray-500">Coming soon</p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg border border-gray-300 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8">Festival Settings</h2>
            
            <div className="max-w-2xl">
              {/* Basic Festival Info */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Festival Information</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Edition Number
                    </label>
                    <input
                      type="number"
                      value={editionNumber}
                      onChange={(e) => setEditionNumber(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Festival Name
                    </label>
                    <input
                      type="text"
                      value={festivalName}
                      onChange={(e) => setFestivalName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Important Links */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Important Links</h3>
                
                <div className="space-y-4">
                  {importantLinks.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Link Title"
                        value={link.title}
                        onChange={(e) => updateImportantLink(index, 'title', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="url"
                        placeholder="URL"
                        value={link.url}
                        onChange={(e) => updateImportantLink(index, 'url', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        onClick={() => removeImportantLink(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={addImportantLink}
                    className="text-green-600 hover:bg-green-50 px-3 py-2 rounded-md"
                  >
                    + Add Link
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={saveFestivalSettings}
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}