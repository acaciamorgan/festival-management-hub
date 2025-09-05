'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { exportFestivalToExcel, exportArchivedYear } from '@/utils/excel-export'
import { archiveFestival, clearFestivalData, getArchivedYears } from '@/lib/simple-archive'

interface FestivalYear {
  year: number
  edition: string
  festival_name: string
  start_date: string
  end_date: string
  archived_at: string
}

interface ArchiveStats {
  total_years: number
  years: FestivalYear[]
}

export default function ArchivesPage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const [activeTab, setActiveTab] = useState<'overview' | 'archive' | 'export' | 'browse' | 'administration'>('overview')
  const [archiveStats, setArchiveStats] = useState<ArchiveStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [archiving, setArchiving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [archiveResult, setArchiveResult] = useState<any>(null)
  const [exportResult, setExportResult] = useState<any>(null)
  const [selectedBrowseYear, setSelectedBrowseYear] = useState<number | null>(null)
  
  // Close Festival states
  const [closureStep, setClosureStep] = useState<'none' | 'prepare' | 'confirm'>('none')
  const [closureConfirmText, setClosureConfirmText] = useState('')
  const [closing, setClosing] = useState(false)
  const [closureResult, setClosureResult] = useState<any>(null)

  const supabase = createClient()

  // Check if user has admin permissions for archives
  const isAdmin = permissions?.modulePermissions?.['archives']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false

  useEffect(() => {
    loadArchiveStats()
  }, [])

  const loadArchiveStats = async () => {
    try {
      const years = await getArchivedYears()
      setArchiveStats({
        total_years: years.length,
        years: years
      })
    } catch (error) {
      console.error('Error loading archive stats:', error)
      setArchiveStats({ total_years: 0, years: [] })
    } finally {
      setLoading(false)
    }
  }

  const handleArchiveCurrentFestival = async () => {
    if (!isAdmin) {
      alert('Admin permissions required to archive festival data.')
      return
    }

    const confirmed = confirm(
      'Archive Current Festival?\n\n' +
      'This will copy all current festival data to the archives. ' +
      'Current data will be preserved. ' +
      'This action cannot be undone.\n\n' +
      'Continue?'
    )

    if (!confirmed) return

    setArchiving(true)
    setArchiveResult(null)

    try {
      const result = await archiveFestival(2024)
      
      if (!result.success) {
        throw new Error(`Failed to archive some tables: ${result.failed.join(', ')}`)
      }
      
      setArchiveResult({
        success: true,
        festival_year: result.year,
        archived_counts: {
          total: result.archived.length
        }
      })
      await loadArchiveStats() // Refresh stats
    } catch (error) {
      console.error('Archive failed:', error)
      setArchiveResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setArchiving(false)
    }
  }

  const handleExportCurrent = async () => {
    setExporting(true)
    setExportResult(null)

    try {
      const result = await exportFestivalToExcel()
      setExportResult(result)
      
      if (result.success) {
        alert(`Export successful! File saved as: ${result.filename}`)
      } else {
        alert(`Export failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Export failed:', error)
      setExportResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setExporting(false)
    }
  }

  const handleExportArchivedYear = async (year: number) => {
    setExporting(true)
    
    try {
      const result = await exportArchivedYear(year)
      
      if (result.success) {
        alert(`Export successful! File saved as: ${result.filename}`)
      } else {
        alert(`Export failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Archive export failed:', error)
      alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '—'
    // Parse date string directly without timezone conversion
    if (dateString.includes('-')) {
      const [year, month, day] = dateString.split(' ')[0].split('-')
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December']
      const monthIndex = parseInt(month) - 1
      return `${monthNames[monthIndex]} ${parseInt(day)}, ${year}`
    }
    return dateString
  }

  // Check if current festival can be closed (must be archived first)
  const canCloseFestival = () => {
    return archiveResult?.success === true
  }

  const handlePrepareFestivalClosure = () => {
    setClosureStep('prepare')
  }

  const handleProceedToConfirm = () => {
    setClosureStep('confirm')
    setClosureConfirmText('')
  }

  const handleCloseFestival = async () => {
    if (closureConfirmText !== 'CLOSE FESTIVAL') {
      alert('Please type "CLOSE FESTIVAL" to confirm')
      return
    }

    setClosing(true)
    setClosureResult(null)

    try {
      // Tables to wipe (everything except user_permissions and venues)
      const tablesToWipe = [
        'film_cards',
        'guest_cards', 
        'press_cards',
        'contact_cards',
        'interview_cards',
        'published_screenings',
        'pi_jury_screenings', 
        'tech_check_screenings',
        'press_screening_cards',
        'photo_shoot_cards',
        'red_carpet_cards',
        'special_event_cards',
        'screener_access_cards',
        'press_request_cards',
        'shorts_programs',
        'programming_pipeline_cards'
      ]

      console.log('Starting festival closure - wiping tables:', tablesToWipe)

      // Delete all data from each table
      for (const table of tablesToWipe) {
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', 'impossible-id') // Delete all rows
        
        if (error) {
          console.error(`Error wiping ${table}:`, error)
          throw new Error(`Failed to wipe ${table}: ${error.message}`)
        }
        
        console.log(`Successfully wiped ${table}`)
      }

      setClosureResult({
        success: true,
        message: 'Festival closed successfully. All data wiped except users and venues.',
        tablesWiped: tablesToWipe.length
      })

      // Reset states
      setClosureStep('none')
      setClosureConfirmText('')
      
    } catch (error) {
      console.error('Festival closure failed:', error)
      setClosureResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setClosing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading archives...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">📁 Festival Archives</h1>
            <p className="text-sm text-gray-600 mt-1">
              Preserve festival history and export data
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="px-6">
          <div className="flex space-x-8">
            {['overview', 'archive', 'export', 'browse', 'administration'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Archive Overview</h2>
              
              {archiveStats && archiveStats.total_years > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">{archiveStats.total_years}</div>
                      <div className="text-sm text-blue-800">Years Archived</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {archiveStats.years[0]?.year || 'N/A'}
                      </div>
                      <div className="text-sm text-green-800">Latest Archive</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {archiveStats.years[archiveStats.total_years - 1]?.year || 'N/A'}
                      </div>
                      <div className="text-sm text-purple-800">Oldest Archive</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-3">Archived Festivals</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Year
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Festival
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Dates
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Archived
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {archiveStats.years.map((year) => (
                            <tr key={year.year} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {year.year}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {year.edition} {year.festival_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(year.start_date)} - {formatDate(year.end_date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(year.archived_at)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleExportArchivedYear(year.year)}
                                  disabled={exporting}
                                  className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                                >
                                  Export Excel
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-6xl mb-4">📁</div>
                  <p className="text-lg">No archived festivals yet</p>
                  <p className="text-sm">Use the Archive tab to archive your first festival</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'archive' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Archive Current Festival</h2>
              
              {!isAdmin ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="text-yellow-800">
                    <strong>Admin permissions required</strong> to archive festival data.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-blue-800">What happens when you archive?</h3>
                    <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                      <li>All current festival data is copied to archive tables</li>
                      <li>Current data is preserved (not deleted)</li>
                      <li>Festival year and edition information is saved</li>
                      <li>Data becomes available for historical searches</li>
                    </ul>
                  </div>

                  <div className="flex items-center space-x-4">
                    {isAdmin && (
                      <button
                        onClick={handleArchiveCurrentFestival}
                        disabled={archiving}
                        className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                      >
                        {archiving ? 'Archiving...' : 'Archive Current Festival'}
                      </button>
                    )}
                  </div>

                  {archiveResult && (
                    <div className="mt-4">
                      {archiveResult.success ? (
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                          <h4 className="text-green-800 font-medium">Archive Successful!</h4>
                          <div className="mt-2 text-sm text-green-700">
                            <p><strong>Festival:</strong> {archiveResult.festival_edition} {archiveResult.festival_name}</p>
                            <p><strong>Year:</strong> {archiveResult.festival_year}</p>
                            <p><strong>Dates:</strong> {formatDate(archiveResult.start_date)} - {formatDate(archiveResult.end_date)}</p>
                            <div className="mt-2">
                              <strong>Archived:</strong>
                              <ul className="list-disc list-inside ml-4">
                                <li>{archiveResult.archived_counts.feature_films} Feature Films</li>
                                <li>{archiveResult.archived_counts.short_films} Short Films</li>
                                <li>{archiveResult.archived_counts.programs} Programs</li>
                                <li>{archiveResult.archived_counts.press} Press Contacts</li>
                                <li>{archiveResult.archived_counts.screenings} Screenings</li>
                                <li>{archiveResult.archived_counts.press_requests} Press Requests</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                          <h4 className="text-red-800 font-medium">Archive Failed</h4>
                          <p className="text-sm text-red-700 mt-1">{archiveResult.error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Export to Excel</h2>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-base font-medium text-gray-900 mb-3">Current Festival Data</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Export all current festival data to a comprehensive Excel file with separate tabs for each module.
                  </p>
                  <div className="bg-gray-50 rounded-md p-3 mb-4">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Excel file will include tabs for:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600">
                      <div>• Feature Films</div>
                      <div>• Short Films</div>
                      <div>• Programs</div>
                      <div>• Press List</div>
                      <div>• Press Screenings</div>
                      <div>• Screener Access</div>
                      <div>• Press Requests</div>
                      <div>• Photo Shoots</div>
                      <div>• In Attendance</div>
                      <div>• Red Carpets</div>
                      <div>• Special Events</div>
                      <div>• Ticketing</div>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={handleExportCurrent}
                      disabled={exporting}
                      className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {exporting ? 'Exporting...' : 'Export Current Festival'}
                    </button>
                  )}
                </div>

                {archiveStats && archiveStats.total_years > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-base font-medium text-gray-900 mb-3">Archived Festival Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Export data from previously archived festivals.
                    </p>
                    <div className="space-y-2">
                      {archiveStats.years.map((year) => (
                        <div key={year.year} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{year.year}</span> - {year.edition} {year.festival_name}
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => handleExportArchivedYear(year.year)}
                              disabled={exporting}
                              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              Export
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'browse' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🗄️</span>
                <h2 className="text-lg font-medium text-gray-900">Browse Archived Festivals</h2>
              </div>
              
              {archiveStats && archiveStats.total_years > 0 ? (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">How Archive Browsing Works</h3>
                    <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                      <li>Select a year to browse its archived festival data</li>
                      <li>Opens a full interface in a new tab (read-only)</li>
                      <li>Access all modules: films, press, events, guests, etc.</li>
                      <li>Search and filter within that archived year</li>
                      <li>Does not affect your current festival operations</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-4">Available Archived Years</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {archiveStats.years.map((year) => (
                        <div key={year.year} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-medium text-gray-900">{year.year}</div>
                              <div className="text-sm text-gray-600">{year.edition} {year.festival_name}</div>
                            </div>
                            <div className="text-xs text-gray-500">
                              Archived {formatDate(year.archived_at)}
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-600 mb-3">
                            {formatDate(year.start_date)} - {formatDate(year.end_date)}
                          </div>
                          
                          <button
                            onClick={() => {
                              // Open archive browser in new tab
                              const url = `/archive/${year.year}`
                              window.open(url, '_blank', 'noopener,noreferrer')
                            }}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                          >
                            Browse {year.year} Archive
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-6xl mb-4">🗄️</div>
                  <p className="text-lg">No archived festivals available</p>
                  <p className="text-sm">Archive a festival first to browse its data</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'administration' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">⚠️</span>
                <h2 className="text-lg font-medium text-gray-900">Festival Administration</h2>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div className="flex items-start">
                  <span className="text-red-600 text-xl mr-3">🚨</span>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Danger Zone</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Actions in this section are irreversible and will permanently modify or delete festival data.
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Festival Section */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🔄</span>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Close Current Festival</h3>
                    <p className="text-sm text-gray-600">
                      Archive current festival data and wipe all content for next edition
                    </p>
                  </div>
                </div>

                {closureResult && (
                  <div className={`mb-4 p-4 rounded-md ${
                    closureResult.success 
                      ? 'bg-green-50 border border-green-200 text-green-800' 
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    {closureResult.success ? (
                      <div>
                        <p className="font-medium">✅ {closureResult.message}</p>
                        <p className="text-sm mt-1">Wiped {closureResult.tablesWiped} data tables</p>
                      </div>
                    ) : (
                      <p className="font-medium">❌ {closureResult.error}</p>
                    )}
                  </div>
                )}

                {closureStep === 'none' && (
                  <div className="space-y-4">
                    {!canCloseFestival() && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <div className="flex items-start">
                          <span className="text-yellow-600 text-lg mr-3">⚠️</span>
                          <div>
                            <h4 className="text-sm font-medium text-yellow-800">Prerequisites Required</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              You must successfully archive the current festival before closing it.
                              Go to the "Archive" tab and complete the archive process first.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 rounded-md p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">What happens when you close the festival:</h4>
                      <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                        <li><strong>KEEPS:</strong> User accounts and venue data</li>
                        <li><strong>DELETES:</strong> All films, guests, press, events, screenings, and other festival content</li>
                        <li><strong>RESULT:</strong> Clean slate for next festival edition</li>
                      </ul>
                    </div>

                    <button
                      onClick={handlePrepareFestivalClosure}
                      disabled={!canCloseFestival()}
                      className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                      Prepare Festival Closure
                    </button>
                  </div>
                )}

                {closureStep === 'prepare' && (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex items-start">
                        <span className="text-red-600 text-xl mr-3">⚠️</span>
                        <div>
                          <h4 className="text-sm font-medium text-red-800">Final Warning</h4>
                          <p className="text-sm text-red-700 mt-1">
                            This will permanently delete ALL festival content except users and venues. 
                            This action cannot be undone. Are you absolutely sure?
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => setClosureStep('none')}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleProceedToConfirm}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-medium"
                      >
                        Yes, Proceed to Confirmation
                      </button>
                    </div>
                  </div>
                )}

                {closureStep === 'confirm' && (
                  <div className="space-y-4">
                    <div className="bg-red-100 border-2 border-red-300 rounded-md p-4">
                      <div className="flex items-start">
                        <span className="text-red-600 text-2xl mr-3">🚨</span>
                        <div>
                          <h4 className="text-lg font-bold text-red-800">CONFIRMATION REQUIRED</h4>
                          <p className="text-sm text-red-700 mt-2">
                            Type exactly: <code className="bg-red-200 px-2 py-1 rounded font-mono text-red-900">CLOSE FESTIVAL</code>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={closureConfirmText}
                        onChange={(e) => setClosureConfirmText(e.target.value)}
                        placeholder="Type confirmation text here..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => setClosureStep('prepare')}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleCloseFestival}
                        disabled={closing || closureConfirmText !== 'CLOSE FESTIVAL'}
                        className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                      >
                        {closing ? 'Closing Festival...' : 'CLOSE FESTIVAL'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}