'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { exportFestivalToExcel } from '@/utils/excel-export'
import { createNewFestivalYear, archiveFestivalYear, unarchiveFestivalYear } from '@/lib/festival-year-actions'

export default function ArchivesPage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const { currentYear, availableYears, refreshYears } = useFestivalYear()
  const [activeTab, setActiveTab] = useState<'years' | 'export'>('years')
  const [exporting, setExporting] = useState(false)

  // Year Management states
  const [showNewYearForm, setShowNewYearForm] = useState(false)
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear() + 1)
  const [newEditionNumber, setNewEditionNumber] = useState<number>(62)
  const [newFestivalName, setNewFestivalName] = useState('Chicago International Film Festival')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [copyVenues, setCopyVenues] = useState(true)
  const [copyTemplatePrograms, setCopyTemplatePrograms] = useState(true)
  const [creatingYear, setCreatingYear] = useState(false)
  const [yearCreationResult, setYearCreationResult] = useState<any>(null)

  const supabase = createClient()

  // Check if user has admin permissions for archives
  const isAdmin = permissions?.modulePermissions?.['archives']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false


  const handleExportYear = async (year: number) => {
    setExporting(true)

    try {
      const result = await exportFestivalToExcel({ festivalYear: year })

      if (result.success) {
        alert(`Export successful! File saved as: ${result.filename}`)
      } else {
        alert(`Export failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (dateString: string | null) => {
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

  const handleCreateNewYear = async () => {
    if (!isAdmin) {
      alert('Admin permissions required to create new festival years.')
      return
    }

    if (!newStartDate || !newEndDate) {
      alert('Please provide start and end dates for the new festival year.')
      return
    }

    setCreatingYear(true)
    setYearCreationResult(null)

    try {
      const result = await createNewFestivalYear({
        year: newYear,
        editionNumber: newEditionNumber,
        festivalName: newFestivalName,
        startDate: newStartDate,
        endDate: newEndDate,
        copyVenues,
        copyTemplatePrograms,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to create year')
      }

      setYearCreationResult({
        success: true,
        message: `Successfully created ${newYear} festival year!`
      })

      // Refresh the year list
      await refreshYears()

      // Reset form
      setShowNewYearForm(false)
      setNewYear(newYear + 1)
      setNewEditionNumber(newEditionNumber + 1)
      setNewStartDate('')
      setNewEndDate('')
      setCopyVenues(true)
      setCopyTemplatePrograms(true)
    } catch (error) {
      console.error('Year creation failed:', error)
      setYearCreationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setCreatingYear(false)
    }
  }

  const handleArchiveYear = async (year: number) => {
    if (!isAdmin) {
      alert('Admin permissions required to archive years.')
      return
    }

    const confirmed = confirm(
      `Archive ${year} Festival?\n\n` +
      'This will mark the year as archived (read-only for regular users).\n' +
      'You can unarchive it later if needed.\n\n' +
      'Continue?'
    )

    if (!confirmed) return

    try {
      const result = await archiveFestivalYear(year)
      if (!result.success) {
        throw new Error(result.error || 'Failed to archive year')
      }

      await refreshYears()
      alert(`${year} has been archived.`)
    } catch (error) {
      console.error('Archive failed:', error)
      alert('Failed to archive year: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleUnarchiveYear = async (year: number) => {
    if (!isAdmin) {
      alert('Admin permissions required to unarchive years.')
      return
    }

    try {
      const result = await unarchiveFestivalYear(year)
      if (!result.success) {
        throw new Error(result.error || 'Failed to unarchive year')
      }

      await refreshYears()
      alert(`${year} has been unarchived.`)
    } catch (error) {
      console.error('Unarchive failed:', error)
      alert('Failed to unarchive year: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }


  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">📊 Reports & Archives</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage festival years and export data
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="px-6">
          <div className="flex space-x-8">
            {['years', 'export'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'years' ? 'Years' : tab}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Export Festival Data to Excel</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <h3 className="text-sm font-medium text-blue-800 mb-2">What's included in the export:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-700">
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

              <div>
                <h3 className="text-base font-medium text-gray-900 mb-3">Select a year to export:</h3>
                <div className="space-y-2">
                  {availableYears.map((year) => (
                    <div key={year.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-gray-900">{year.year}</span>
                        <span className="text-sm text-gray-600">{year.edition_number && `${year.edition_number}${['st', 'nd', 'rd'][((year.edition_number % 100) - 20) % 10 - 1] || 'th'} ${year.festival_name}`}</span>
                        {year.is_archived && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">Archived</span>
                        )}
                        {year.year === currentYear && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">Current</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleExportYear(year.year)}
                        disabled={exporting}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {exporting ? 'Exporting...' : 'Export'}
                      </button>
                    </div>
                  ))}
                </div>

                {availableYears.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <p>No festival years available to export</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'years' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Festival Year Management</h2>
                    <p className="text-sm text-gray-600">Create and manage festival years</p>
                  </div>
                </div>
                {isAdmin && !showNewYearForm && (
                  <button
                    onClick={() => setShowNewYearForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
                  >
                    + Create New Year
                  </button>
                )}
              </div>

              {!isAdmin && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                  <div className="text-yellow-800">
                    <strong>Admin permissions required</strong> to manage festival years.
                  </div>
                </div>
              )}

              {/* New Year Form */}
              {showNewYearForm && isAdmin && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Create New Festival Year</h3>
                    <button
                      onClick={() => {
                        setShowNewYearForm(false)
                        setYearCreationResult(null)
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year
                      </label>
                      <input
                        type="number"
                        value={newYear}
                        onChange={(e) => setNewYear(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Edition Number
                      </label>
                      <input
                        type="number"
                        value={newEditionNumber}
                        onChange={(e) => setNewEditionNumber(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Festival Name
                      </label>
                      <input
                        type="text"
                        value={newFestivalName}
                        onChange={(e) => setNewFestivalName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={copyVenues}
                        onChange={(e) => setCopyVenues(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Copy venues from previous year
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={copyTemplatePrograms}
                        onChange={(e) => setCopyTemplatePrograms(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Copy template programs from previous year
                      </span>
                    </label>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleCreateNewYear}
                      disabled={creatingYear}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                      {creatingYear ? 'Creating...' : 'Create Year'}
                    </button>
                    <button
                      onClick={() => {
                        setShowNewYearForm(false)
                        setYearCreationResult(null)
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>

                  {yearCreationResult && (
                    <div className={`mt-4 p-4 rounded-md ${
                      yearCreationResult.success
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                      {yearCreationResult.success ? (
                        <p className="font-medium">✅ {yearCreationResult.message}</p>
                      ) : (
                        <p className="font-medium">❌ {yearCreationResult.error}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* List of All Years */}
              <div>
                <h3 className="text-base font-medium text-gray-900 mb-3">All Festival Years</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Year
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Edition
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Festival Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dates
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        {isAdmin && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {availableYears.map((year) => (
                        <tr key={year.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {year.year}
                            {year.year === currentYear && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                                Current
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {year.edition_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {year.festival_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {year.start_date && year.end_date ? (
                              <span>
                                {formatDate(year.start_date)} - {formatDate(year.end_date)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {year.is_archived ? (
                              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                                Archived
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                Active
                              </span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              {year.is_archived ? (
                                <button
                                  onClick={() => handleUnarchiveYear(year.year)}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Unarchive
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleArchiveYear(year.year)}
                                  className="text-yellow-600 hover:text-yellow-900"
                                >
                                  Archive
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}