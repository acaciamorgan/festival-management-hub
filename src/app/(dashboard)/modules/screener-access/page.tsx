'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { FilmCardPopup } from '@/components/cards/film-card-popup'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'
import * as XLSX from 'xlsx-js-style'

interface FeatureFilm {
  id: string
  title: string
}

interface ShortFilm {
  id: string
  title: string
  shorts_program_id: string
  program_order: number
  shorts_program?: {
    program_name: string
    program_order: number
  }
}

interface ShortsProgram {
  id: string
  program_name: string
  program_number: number
  shorts?: ShortFilm[]
}

interface FilmContact {
  id: string
  name: string
  company: string
  email: string
  contact_type: string
}

interface ScreenerData {
  film_id: string
  access_type: 'tbd' | 'cinesend' | 'link_available' | 'request_link' | 'no_links'
  cinesend_instructions_sent: boolean
  cinesend_uploaded: boolean
  link_url: string | null
  link_password: string | null
}

interface FilmWithScreenerData extends FeatureFilm {
  contacts: FilmContact[]
  screener_data: ScreenerData | null
}

interface ShortFilmWithScreenerData extends ShortFilm {
  contacts: FilmContact[]
  screener_data: ScreenerData | null
}

interface ShortsProgramWithScreenerData extends ShortsProgram {
  contacts: FilmContact[]
  screener_data: ScreenerData | null
}

interface UnifiedFilm {
  id: string
  title: string
  contacts: FilmContact[]
  screener_data: ScreenerData | null
  isProgram?: boolean
  program_number?: number
}


export default function ScreenerAccessPage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const [allFilms, setAllFilms] = useState<UnifiedFilm[]>([])
  const [filteredFilms, setFilteredFilms] = useState<UnifiedFilm[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilm, setSelectedFilm] = useState<FeatureFilm | ShortsProgram | null>(null)
  const [showFilmCard, setShowFilmCard] = useState(false)
  const [showFilmCardsMode, setShowFilmCardsMode] = useState(false)
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'title', direction: 'asc' })
  const [accessTypeFilter, setAccessTypeFilter] = useState<'all' | 'TBD' | 'cinesend' | 'link_available' | 'request_link' | 'no_links'>('all')
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

  const supabase = createClient()

  // Check if user has edit permissions for screener access
  const canEditScreenerAccess = permissions?.modulePermissions?.['screenerAccess']?.canEdit || permissions?.isAdmin || permissions?.isSuperAdmin || false

  // Export template function for Features
  const exportFeaturesTemplate = () => {
    // Define headers with proper display names
    const headerMapping = [
      { field: 'title', display: 'Film Title' },
      { field: 'contacts', display: 'Contacts' },
      { field: 'all_emails', display: 'All Emails' },
      { field: 'access_type', display: 'Access Type' },
      { field: 'link', display: 'Link' },
      { field: 'password', display: 'Password' },
      { field: 'instructions_sent', display: 'Instructions Sent' },
      { field: 'uploaded', display: 'Uploaded' }
    ]
    
    const headers = headerMapping.map(h => h.display)
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers])
    
    // Style headers - bold with light grey background
    const headerStyle = { 
      font: { bold: true, sz: 12, name: 'Arial' }, 
      fill: { patternType: "solid", fgColor: { rgb: "E8E8E8" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } }
      }
    }
    
    // Apply styles and set column widths based on header length
    const cols: any[] = []
    headers.forEach((header, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: index })
      if (!ws[cellRef]) ws[cellRef] = {}
      ws[cellRef].s = headerStyle
      
      // Calculate column width based on header length (min 15, max 30)
      cols.push({ wch: Math.min(Math.max(header.length + 2, 15), 30) })
    })
    
    ws['!cols'] = cols
    
    // Freeze the header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    
    XLSX.utils.book_append_sheet(wb, ws, 'Features Screener Template')
    XLSX.writeFile(wb, 'features_screener_access_template.xlsx')
  }

  // Export template function for Shorts
  const exportShortsTemplate = () => {
    // Define headers with proper display names
    const headerMapping = [
      { field: 'title', display: 'Shorts Program' },
      { field: 'contacts', display: 'Contacts' },
      { field: 'all_emails', display: 'All Emails' },
      { field: 'access_type', display: 'Access Type' },
      { field: 'link', display: 'Link' },
      { field: 'password', display: 'Password' }
    ]
    
    const headers = headerMapping.map(h => h.display)
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers])
    
    // Style headers - bold with light grey background
    const headerStyle = { 
      font: { bold: true, sz: 12, name: 'Arial' }, 
      fill: { patternType: "solid", fgColor: { rgb: "E8E8E8" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } }
      }
    }
    
    // Apply styles and set column widths based on header length
    const cols: any[] = []
    headers.forEach((header, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: index })
      if (!ws[cellRef]) ws[cellRef] = {}
      ws[cellRef].s = headerStyle
      
      // Calculate column width based on header length (min 15, max 30)
      cols.push({ wch: Math.min(Math.max(header.length + 2, 15), 30) })
    })
    
    ws['!cols'] = cols
    
    // Freeze the header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    
    XLSX.utils.book_append_sheet(wb, ws, 'Shorts Screener Template')
    XLSX.writeFile(wb, 'shorts_screener_access_template.xlsx')
  }

  const loadAllFilms = useCallback(async () => {
    setLoading(true)
    try {
      // Load all feature films
      const { data: filmsData, error: filmsError } = await supabase
        .from('feature_films')
        .select('id, title')
        .order('title')

      if (filmsError) {
        console.error('Error loading films:', filmsError)
      }

      // Load all shorts programs - using exact field names
      const { data: programsData, error: programsError } = await supabase
        .from('shorts_programs')
        .select('id, program_name, program_number')
        .order('program_number')
      
      if (programsError) {
        console.error('Error loading programs:', programsError)
      }

      const unifiedFilms: UnifiedFilm[] = []

      // Process feature films
      if (filmsData) {
        const filmsWithData = await Promise.all(
          filmsData.map(async (film) => {
            // Load film contacts
            const { data: contactsData } = await supabase
              .from('film_contacts')
              .select('id, name, company, email, contact_type')
              .eq('film_id', film.id)
              .eq('film_type', 'feature')
              .order('contact_type, name')

            // Load screener data
            const { data: screenerData } = await supabase
              .from('screener_access')
              .select('*')
              .eq('film_id', film.id)
              .single()

            return {
              id: film.id,
              title: film.title,
              contacts: contactsData || [],
              screener_data: screenerData || null,
              isProgram: false
            }
          })
        )
        unifiedFilms.push(...filmsWithData)
      }

      // Process shorts programs
      if (programsData && programsData.length > 0) {
        const programsWithData = await Promise.all(
          programsData.map(async (program) => {
            // Get the first short from this program to use its contacts
            const { data: firstShort } = await supabase
              .from('short_films')
              .select('id')
              .eq('shorts_program_id', program.id)
              .limit(1)
              .single()
            
            let contacts = []
            if (firstShort) {
              const { data: contactsData } = await supabase
                .from('film_contacts')
                .select('id, name, company, email, contact_type')
                .eq('film_id', firstShort.id)
                .eq('film_type', 'short')
                .order('contact_type, name')
              
              contacts = contactsData || []
            }

            // Load screener data for the program (using program id as film_id)
            const { data: screenerData } = await supabase
              .from('screener_access')
              .select('*')
              .eq('film_id', program.id)
              .single()

            return {
              id: program.id,
              title: program.program_name,
              contacts,
              screener_data: screenerData || null,
              isProgram: true,
              program_number: program.program_number
            }
          })
        )
        unifiedFilms.push(...programsWithData)
      }

      setAllFilms(unifiedFilms)
      setFilteredFilms(unifiedFilms)
    } catch (error) {
      console.error('Error loading films:', error)
      setAllFilms([])
      setFilteredFilms([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadAllFilms()
  }, [loadAllFilms])

  // Filter and search for all films and programs
  useEffect(() => {
    let filtered = allFilms

    // Access type filter
    if (accessTypeFilter !== 'all') {
      if (accessTypeFilter === 'TBD') {
        filtered = filtered.filter(film => !film.screener_data || film.screener_data.access_type === 'TBD')
      } else if (accessTypeFilter === 'cinesend' || accessTypeFilter === 'request_link') {
        // Only show features for cinesend and request_link
        filtered = filtered.filter(film => !film.isProgram && film.screener_data?.access_type === accessTypeFilter)
      } else {
        // For link_available and no_links, show both features and programs
        filtered = filtered.filter(film => film.screener_data?.access_type === accessTypeFilter)
      }
    }

    // Search filter with accent-insensitive search
    if (searchTerm) {
      const searchFilter = createAccentInsensitiveFilter<UnifiedFilm>(
        searchTerm,
        (film) => [
          film.title,
          ...film.contacts.map(c => c.name),
          ...film.contacts.map(c => c.company),
          ...film.contacts.map(c => c.email)
        ]
      )
      filtered = filtered.filter(searchFilter)
    }

    setFilteredFilms(filtered)
  }, [allFilms, searchTerm, accessTypeFilter])

  // Sort films
  const sortedFilms = useMemo(() => {
    if (!sortConfig) return filteredFilms

    return [...filteredFilms].sort((a, b) => {
      // For programs, sort by program number first
      if (a.isProgram && b.isProgram && a.program_number && b.program_number) {
        return a.program_number - b.program_number
      }

      // For mixed or feature films, sort by title
      const aVal = a[sortConfig.key as keyof UnifiedFilm]
      const bVal = b[sortConfig.key as keyof UnifiedFilm]

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const result = aVal.localeCompare(bVal)
        return sortConfig.direction === 'asc' ? result : -result
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredFilms, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return '↕️'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const handleFilmClick = (film: FeatureFilm | ShortFilm) => {
    if (!showFilmCardsMode) return
    setSelectedFilm(film)
    setShowFilmCard(true)
  }

  const updateScreenerData = async (filmId: string, updates: Partial<ScreenerData>) => {
    try {
      // First check if screener data exists
      const { data: existing } = await supabase
        .from('screener_access')
        .select('id')
        .eq('film_id', filmId)
        .single()

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('screener_access')
          .update(updates)
          .eq('film_id', filmId)

        if (error) throw error
      } else {
        // Create new record
        const { error } = await supabase
          .from('screener_access')
          .insert({ film_id: filmId, ...updates })

        if (error) throw error
      }

      // Refresh the data
      loadAllFilms()
    } catch (error) {
      console.error('Error updating screener data:', error)
    }
  }

  const renderAccessTypeCell = (film: UnifiedFilm) => {
    const currentType = film.screener_data?.access_type || 'tbd'
    
    return (
      <select
        value={currentType}
        onChange={(e) => updateScreenerData(film.id, { 
          access_type: e.target.value as ScreenerData['access_type']
        })}
        disabled={!canEditScreenerAccess}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="tbd">TBD</option>
        {!film.isProgram && (
          <>
            <option value="cinesend">CineSend</option>
            <option value="request_link">Request Link</option>
          </>
        )}
        <option value="link_available">Link Available</option>
        <option value="no_links">No Links</option>
      </select>
    )
  }

  const renderLinkColumns = (film: UnifiedFilm) => {
    const isVisible = film.screener_data?.access_type === 'link_available'
    
    if (!isVisible) {
      return (
        <>
          <td 
            className="px-3 py-2 text-sm text-gray-400 border-r border-gray-100"
            style={{ 
              minWidth: `${columnWidths['link'] || 200}px`,
              width: `${columnWidths['link'] || 200}px`
            }}
          >
            —
          </td>
          <td 
            className="px-3 py-2 text-sm text-gray-400 border-r border-gray-100"
            style={{ 
              minWidth: `${columnWidths['password'] || 150}px`,
              width: `${columnWidths['password'] || 150}px`
            }}
          >
            —
          </td>
        </>
      )
    }

    return (
      <>
        <td 
          className="px-3 py-2 text-sm border-r border-gray-100"
          style={{ 
            minWidth: `${columnWidths['link'] || 200}px`,
            width: `${columnWidths['link'] || 200}px`
          }}
        >
          <input
            type="url"
            value={film.screener_data?.link_url || ''}
            onChange={(e) => updateScreenerData(film.id, { 
              link_url: e.target.value || null 
            })}
            placeholder="https://..."
            disabled={!canEditScreenerAccess}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </td>
        <td 
          className="px-3 py-2 text-sm border-r border-gray-100"
          style={{ 
            minWidth: `${columnWidths['password'] || 150}px`,
            width: `${columnWidths['password'] || 150}px`
          }}
        >
          <input
            type="text"
            value={film.screener_data?.link_password || ''}
            onChange={(e) => updateScreenerData(film.id, { 
              link_password: e.target.value || null 
            })}
            placeholder="Optional password"
            disabled={!canEditScreenerAccess}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </td>
      </>
    )
  }

  const renderCineSendColumns = (film: UnifiedFilm) => {
    if (film.isProgram) return null // No CineSend columns for shorts programs
    
    const isVisible = film.screener_data?.access_type === 'cinesend'
    
    if (!isVisible) {
      return (
        <>
          <td 
            className="px-3 py-2 text-sm text-gray-400 border-r border-gray-100"
            style={{ 
              minWidth: `${columnWidths['instructions_sent'] || 120}px`,
              width: `${columnWidths['instructions_sent'] || 120}px`
            }}
          >
            —
          </td>
          <td 
            className="px-3 py-2 text-sm border-r border-gray-100"
            style={{ 
              minWidth: `${columnWidths['uploaded'] || 100}px`,
              width: `${columnWidths['uploaded'] || 100}px`
            }}
          >
            —
          </td>
        </>
      )
    }

    return (
      <>
        <td 
          className="px-3 py-2 text-sm border-r border-gray-100"
          style={{ 
            minWidth: `${columnWidths['instructions_sent'] || 120}px`,
            width: `${columnWidths['instructions_sent'] || 120}px`
          }}
        >
          <input
            type="checkbox"
            checked={film.screener_data?.cinesend_instructions_sent || false}
            onChange={(e) => updateScreenerData(film.id, { 
              cinesend_instructions_sent: e.target.checked 
            })}
            disabled={!canEditScreenerAccess}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
          />
        </td>
        <td 
          className="px-3 py-2 text-sm border-r border-gray-100"
          style={{ 
            minWidth: `${columnWidths['uploaded'] || 100}px`,
            width: `${columnWidths['uploaded'] || 100}px`
          }}
        >
          <input
            type="checkbox"
            checked={film.screener_data?.cinesend_uploaded || false}
            onChange={(e) => updateScreenerData(film.id, { 
              cinesend_uploaded: e.target.checked 
            })}
            disabled={!canEditScreenerAccess}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
          />
        </td>
      </>
    )
  }

  const renderContactsCell = (contacts: FilmContact[]) => {
    if (contacts.length === 0) {
      return <span className="text-gray-400 italic">No contacts</span>
    }

    return (
      <div className="space-y-1">
        {contacts.map((contact, index) => (
          <div key={contact.id} className="text-sm">
            <div className="font-medium">{contact.name}</div>
            <div className="text-gray-600">{contact.company}</div>
            <div className="text-blue-600">{contact.email}</div>
            {index < contacts.length - 1 && <div className="border-t border-gray-200 my-1"></div>}
          </div>
        ))}
      </div>
    )
  }

  const renderAllEmailsCell = (contacts: FilmContact[]) => {
    if (contacts.length === 0) {
      return <span className="text-gray-400 italic">No emails</span>
    }

    const emails = contacts.filter(c => c.email).map(c => c.email).join(', ')
    return (
      <div className="text-sm text-blue-600">
        {emails}
      </div>
    )
  }

  const getRowBackgroundColor = (film: UnifiedFilm) => {
    const accessType = film.screener_data?.access_type || 'TBD'
    switch (accessType) {
      case 'TBD': return 'bg-white'
      case 'cinesend': return 'bg-blue-50'
      case 'link_available': return 'bg-green-50'
      case 'request_link': return 'bg-yellow-50'
      case 'no_links': return 'bg-red-50'
      default: return 'bg-white'
    }
  }

  const getFilterCounts = () => {
    const counts = {
      all: allFilms.length,
      TBD: allFilms.filter(f => !f.screener_data || f.screener_data.access_type === 'TBD').length,
      cinesend: allFilms.filter(f => !f.isProgram && f.screener_data?.access_type === 'cinesend').length,
      link_available: allFilms.filter(f => f.screener_data?.access_type === 'link_available').length,
      request_link: allFilms.filter(f => !f.isProgram && f.screener_data?.access_type === 'request_link').length,
      no_links: allFilms.filter(f => f.screener_data?.access_type === 'no_links').length
    }
    return counts
  }

  const filterCounts = getFilterCounts()

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading screener access data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🎬</span>
            <h1 className="text-2xl font-semibold text-gray-900">Screener Access</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {canEditScreenerAccess && (
              <div className="flex space-x-2">
                <button
                  onClick={exportFeaturesTemplate}
                  className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
                >
                  📄 Features Template
                </button>
                <button
                  onClick={exportShortsTemplate}
                  className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
                >
                  📄 Shorts Template
                </button>
              </div>
            )}
            <button
              onClick={() => setShowFilmCardsMode(!showFilmCardsMode)}
              className={`px-4 py-2 rounded-md transition-colors font-medium ${
                showFilmCardsMode
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              🎞️ {showFilmCardsMode ? 'Hide' : 'Show'} Film Cards
            </button>
          </div>
        </div>
      </div>


      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAccessTypeFilter('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                accessTypeFilter === 'all'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All ({filterCounts.all})
            </button>
            {filterCounts.cinesend > 0 && (
              <button
                onClick={() => setAccessTypeFilter('cinesend')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  accessTypeFilter === 'cinesend'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-200 text-blue-700 hover:bg-blue-300'
                }`}
              >
                CineSend ({filterCounts.cinesend})
              </button>
            )}
            <button
              onClick={() => setAccessTypeFilter('link_available')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                accessTypeFilter === 'link_available'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-200 text-green-700 hover:bg-green-300'
              }`}
            >
              Link Available ({filterCounts.link_available})
            </button>
            {filterCounts.request_link > 0 && (
              <button
                onClick={() => setAccessTypeFilter('request_link')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  accessTypeFilter === 'request_link'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-yellow-200 text-yellow-700 hover:bg-yellow-300'
                }`}
              >
                Request Link ({filterCounts.request_link})
              </button>
            )}
            <button
              onClick={() => setAccessTypeFilter('no_links')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                accessTypeFilter === 'no_links'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-200 text-red-700 hover:bg-red-300'
              }`}
            >
              No Links ({filterCounts.no_links})
            </button>
            <button
              onClick={() => setAccessTypeFilter('TBD')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                accessTypeFilter === 'TBD'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              TBD ({filterCounts.TBD})
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search films and contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => {
              setSearchTerm('')
              setAccessTypeFilter('all')
            }}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Films Grid */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { key: 'title', label: 'Film Title / Shorts Program', width: 180, sortable: true },
                  { key: 'contacts', label: 'Contacts', width: 160, sortable: false },
                  { key: 'all_emails', label: 'All Emails', width: 200, sortable: false },
                  { key: 'access_type', label: 'Access Type', width: 120, sortable: false },
                  { key: 'link', label: 'Link', width: 180, sortable: false },
                  { key: 'password', label: 'Password', width: 100, sortable: false },
                  { key: 'instructions_sent', label: 'Instructions Sent', width: 110, sortable: false },
                  { key: 'uploaded', label: 'Uploaded', width: 90, sortable: false }
                ].map((column) => (
                    <th
                      key={column.key}
                      className={`relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 ${
                        column.sortable ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'
                      }`}
                      style={{ 
                        minWidth: `${columnWidths[column.key] || column.width}px`,
                        width: `${columnWidths[column.key] || column.width}px`
                      }}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{column.label}</span>
                        {column.sortable && (
                          <span className="text-gray-400 ml-1">
                            {getSortIcon(column.key)}
                          </span>
                        )}
                      </div>
                      
                      {/* Resize Handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 hover:opacity-100"
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
                {sortedFilms.map((film) => (
                  <tr key={film.id} className={`hover:bg-gray-100 ${getRowBackgroundColor(film)}`}>
                    <td 
                      className="px-3 py-2 border-r border-gray-100"
                      style={{ 
                        minWidth: `${columnWidths['title'] || 200}px`,
                        width: `${columnWidths['title'] || 200}px`
                      }}
                    >
                      {showFilmCardsMode ? (
                        <button
                          onClick={() => handleFilmClick(film)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left font-medium"
                        >
                          {film.title}
                        </button>
                      ) : (
                        <span className="text-gray-900 font-medium">{film.title}</span>
                      )}
                    </td>
                    <td 
                      className="px-3 py-2 text-sm border-r border-gray-100"
                      style={{ 
                        minWidth: `${columnWidths['contacts'] || 250}px`,
                        width: `${columnWidths['contacts'] || 250}px`
                      }}
                    >
                      {renderContactsCell(film.contacts)}
                    </td>
                    <td 
                      className="px-3 py-2 text-sm border-r border-gray-100"
                      style={{ 
                        minWidth: `${columnWidths['all_emails'] || 300}px`,
                        width: `${columnWidths['all_emails'] || 300}px`
                      }}
                    >
                      {renderAllEmailsCell(film.contacts)}
                    </td>
                    <td 
                      className="px-3 py-2 border-r border-gray-100"
                      style={{ 
                        minWidth: `${columnWidths['access_type'] || 150}px`,
                        width: `${columnWidths['access_type'] || 150}px`
                      }}
                    >
                      {renderAccessTypeCell(film)}
                    </td>
                    {renderLinkColumns(film)}
                    {renderCineSendColumns(film)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {sortedFilms.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">🎬</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No films found</h3>
            <p className="text-gray-500">
              {searchTerm || accessTypeFilter !== 'all' ? 'Try adjusting your filters' : 'No films available'}
            </p>
          </div>
        )}
      </div>

      {/* Film Card Popup */}
      {showFilmCard && selectedFilm && (
        <FilmCardPopup
          film={selectedFilm}
          onClose={() => {
            setShowFilmCard(false)
            setSelectedFilm(null)
          }}
        />
      )}
    </div>
  )
}