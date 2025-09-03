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

type ViewMode = 'features' | 'shorts'

export default function ScreenerAccessPage() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const [viewMode, setViewMode] = useState<ViewMode>('features')
  const [films, setFilms] = useState<FilmWithScreenerData[]>([])
  const [shorts, setShorts] = useState<ShortFilmWithScreenerData[]>([])
  const [filteredFilms, setFilteredFilms] = useState<FilmWithScreenerData[]>([])
  const [filteredShorts, setFilteredShorts] = useState<ShortFilmWithScreenerData[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilm, setSelectedFilm] = useState<FeatureFilm | ShortFilm | null>(null)
  const [showFilmCard, setShowFilmCard] = useState(false)
  const [showFilmCardsMode, setShowFilmCardsMode] = useState(false)
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'title', direction: 'asc' })
  const [accessTypeFilter, setAccessTypeFilter] = useState<'all' | 'tbd' | 'cinesend' | 'link_available' | 'request_link' | 'no_links'>('all')
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
      { field: 'title', display: 'Short Film (Program)' },
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

  const loadFeatures = useCallback(async () => {
    setLoading(true)
    try {
      // Load all feature films
      const { data: filmsData, error: filmsError } = await supabase
        .from('feature_films')
        .select('id, title')
        .order('title')

      if (filmsError) {
        console.error('Error loading films:', filmsError)
        setFilms([])
        setFilteredFilms([])
        return
      }

      // Load contacts and screener data for each film
      const filmsWithData = await Promise.all(
        (filmsData || []).map(async (film) => {
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
            ...film,
            contacts: contactsData || [],
            screener_data: screenerData || null
          }
        })
      )

      setFilms(filmsWithData)
      setFilteredFilms(filmsWithData)
    } catch (error) {
      console.error('Error loading films:', error)
      setFilms([])
      setFilteredFilms([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const loadShorts = useCallback(async () => {
    setLoading(true)
    try {
      // Load all short films with their shorts programs - match working Titles pattern
      const { data: shortsData, error: shortsError } = await supabase
        .from('short_films')
        .select(`
          *,
          shorts_programs(id, program_name, program_number)
        `)
        .order('shorts_program_id, program_order')

      if (shortsError) {
        console.error('Error loading shorts:', shortsError)
        setShorts([])
        setFilteredShorts([])
        return
      }

      // Load contacts and screener data for each short film
      const shortsWithData = await Promise.all(
        (shortsData || []).map(async (short) => {
          // Load film contacts
          const { data: contactsData } = await supabase
            .from('film_contacts')
            .select('id, name, company, email, contact_type')
            .eq('film_id', short.id)
            .eq('film_type', 'short')
            .order('contact_type, name')

          // Load screener data
          const { data: screenerData } = await supabase
            .from('screener_access')
            .select('*')
            .eq('film_id', short.id)
            .single()

          return {
            ...short,
            contacts: contactsData || [],
            screener_data: screenerData || null,
            shorts_program: short.shorts_programs
          }
        })
      )

      setShorts(shortsWithData)
      setFilteredShorts(shortsWithData)
    } catch (error) {
      console.error('Error loading shorts:', error)
      setShorts([])
      setFilteredShorts([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (viewMode === 'features') {
      loadFeatures()
    } else {
      loadShorts()
    }
  }, [viewMode, loadFeatures, loadShorts])

  // Filter and search for features
  useEffect(() => {
    if (viewMode !== 'features') return
    
    let filtered = films

    // Access type filter
    if (accessTypeFilter !== 'all') {
      if (accessTypeFilter === 'tbd') {
        filtered = filtered.filter(film => !film.screener_data || film.screener_data.access_type === 'tbd')
      } else {
        filtered = filtered.filter(film => film.screener_data?.access_type === accessTypeFilter)
      }
    }

    // Search filter with accent-insensitive search
    if (searchTerm) {
      const searchFilter = createAccentInsensitiveFilter<FilmWithScreenerData>(
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
  }, [films, searchTerm, accessTypeFilter, viewMode])

  // Filter and search for shorts
  useEffect(() => {
    if (viewMode !== 'shorts') return
    
    let filtered = shorts

    // For shorts, only filter by link_available, no_links, and tbd
    if (accessTypeFilter !== 'all') {
      if (accessTypeFilter === 'tbd') {
        filtered = filtered.filter(short => !short.screener_data || short.screener_data.access_type === 'tbd')
      } else if (accessTypeFilter === 'link_available' || accessTypeFilter === 'no_links') {
        filtered = filtered.filter(short => short.screener_data?.access_type === accessTypeFilter)
      } else {
        // For shorts, ignore cinesend and request_link filters
        filtered = shorts
      }
    }

    // Search filter with accent-insensitive search
    if (searchTerm) {
      const searchFilter = createAccentInsensitiveFilter<ShortFilmWithScreenerData>(
        searchTerm,
        (short) => [
          short.title,
          short.shorts_program?.program_name || '',
          ...short.contacts.map(c => c.name),
          ...short.contacts.map(c => c.company),
          ...short.contacts.map(c => c.email)
        ]
      )
      filtered = filtered.filter(searchFilter)
    }

    setFilteredShorts(filtered)
  }, [shorts, searchTerm, accessTypeFilter, viewMode])

  // Sort films
  const sortedFilms = useMemo(() => {
    if (viewMode === 'features') {
      if (!sortConfig) return filteredFilms

      return [...filteredFilms].sort((a, b) => {
        const aVal = a[sortConfig.key as keyof FilmWithScreenerData]
        const bVal = b[sortConfig.key as keyof FilmWithScreenerData]

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
    } else {
      // For shorts, maintain program order
      return [...filteredShorts].sort((a, b) => {
        // First sort by shorts program order
        const programOrderA = a.shorts_program?.program_order || 0
        const programOrderB = b.shorts_program?.program_order || 0
        if (programOrderA !== programOrderB) {
          return programOrderA - programOrderB
        }
        // Then sort by program order within the shorts program
        return a.program_order - b.program_order
      })
    }
  }, [filteredFilms, filteredShorts, sortConfig, viewMode])

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
      if (viewMode === 'features') {
        loadFeatures()
      } else {
        loadShorts()
      }
    } catch (error) {
      console.error('Error updating screener data:', error)
    }
  }

  const renderAccessTypeCell = (film: FilmWithScreenerData | ShortFilmWithScreenerData) => {
    const currentType = film.screener_data?.access_type || 'tbd'
    
    return (
      <select
        value={currentType}
        onChange={(e) => updateScreenerData(film.id, { 
          access_type: e.target.value as ScreenerData['access_type']
        })}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="tbd">TBD</option>
        {viewMode === 'features' && (
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

  const renderLinkColumns = (film: FilmWithScreenerData | ShortFilmWithScreenerData) => {
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
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </td>
      </>
    )
  }

  const renderCineSendColumns = (film: FilmWithScreenerData) => {
    if (viewMode === 'shorts') return null // No CineSend columns for shorts
    
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
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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

  const getRowBackgroundColor = (film: FilmWithScreenerData | ShortFilmWithScreenerData) => {
    const accessType = film.screener_data?.access_type || 'tbd'
    switch (accessType) {
      case 'tbd': return 'bg-white'
      case 'cinesend': return 'bg-blue-50'
      case 'link_available': return 'bg-green-50'
      case 'request_link': return 'bg-yellow-50'
      case 'no_links': return 'bg-red-50'
      default: return 'bg-white'
    }
  }

  const getFilterCounts = () => {
    const currentData = viewMode === 'features' ? films : shorts
    const counts = {
      all: currentData.length,
      tbd: currentData.filter(f => !f.screener_data || f.screener_data.access_type === 'tbd').length,
      cinesend: viewMode === 'features' ? films.filter(f => f.screener_data?.access_type === 'cinesend').length : 0,
      link_available: currentData.filter(f => f.screener_data?.access_type === 'link_available').length,
      request_link: viewMode === 'features' ? films.filter(f => f.screener_data?.access_type === 'request_link').length : 0,
      no_links: currentData.filter(f => f.screener_data?.access_type === 'no_links').length
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
              <button
                onClick={viewMode === 'features' ? exportFeaturesTemplate : exportShortsTemplate}
                className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
              >
                📄 Create {viewMode === 'features' ? 'Features' : 'Shorts'} Template
              </button>
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

      {/* View Mode Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setViewMode('features')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                viewMode === 'features'
                  ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Features
            </button>
            <button
              onClick={() => setViewMode('shorts')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                viewMode === 'shorts'
                  ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Shorts
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
            {viewMode === 'features' && (
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
            {viewMode === 'features' && (
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
              onClick={() => setAccessTypeFilter('tbd')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                accessTypeFilter === 'tbd'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              TBD ({filterCounts.tbd})
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
      <div className="flex-1 p-6">
        {viewMode === 'features' ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)]">
              <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { key: 'title', label: viewMode === 'features' ? 'Film Title' : 'Short Film (Program)', width: 180, sortable: viewMode === 'features' },
                    { key: 'contacts', label: 'Contacts', width: 160, sortable: false },
                    { key: 'all_emails', label: 'All Emails', width: 200, sortable: false },
                    { key: 'access_type', label: 'Access Type', width: 120, sortable: false },
                    { key: 'link', label: 'Link', width: 180, sortable: false },
                    { key: 'password', label: 'Password', width: 100, sortable: false },
                    ...(viewMode === 'features' ? [
                      { key: 'instructions_sent', label: 'Instructions Sent', width: 110, sortable: false },
                      { key: 'uploaded', label: 'Uploaded', width: 90, sortable: false }
                    ] : [])
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
                      {viewMode === 'shorts' && 'shorts_program' in film && film.shorts_program && (
                        <div className="text-xs text-gray-500 mt-1">
                          {film.shorts_program.program_name}
                        </div>
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
                    {viewMode === 'features' && renderCineSendColumns(film as FilmWithScreenerData)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
          /* Shorts Grouped View */
          <div className="overflow-auto max-h-[calc(100vh-350px)] space-y-6">
            {(() => {
              // Group shorts by Shorts Program
              const groupedShorts = (sortedFilms as ShortFilmWithScreenerData[]).reduce((groups, short) => {
                const programName = short.shorts_program?.program_name || 'Unassigned Shorts'
                if (!groups[programName]) {
                  groups[programName] = []
                }
                groups[programName].push(short)
                return groups
              }, {} as Record<string, ShortFilmWithScreenerData[]>)

              // Sort programs by program number (extract number from program name)
              const sortedPrograms = Object.entries(groupedShorts).sort(([nameA], [nameB]) => {
                // Put 'Unassigned Shorts' at the end
                if (nameA === 'Unassigned Shorts') return 1
                if (nameB === 'Unassigned Shorts') return -1
                
                // Extract program numbers for sorting
                const numberA = parseInt(nameA.match(/\d+/)?.[0] || '999')
                const numberB = parseInt(nameB.match(/\d+/)?.[0] || '999')
                
                return numberA - numberB
              })

              // Filter out Unassigned Shorts for now
              const filteredPrograms = sortedPrograms.filter(([programName]) => programName !== 'Unassigned Shorts')

              return filteredPrograms.map(([programName, programShorts]) => (
                <div key={programName} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* Program Header */}
                  <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{programName}</h3>
                      <p className="text-sm text-gray-300">{programShorts.length} shorts</p>
                    </div>
                  </div>
                  
                  {/* Shorts Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {[
                            { key: 'title', label: 'Short Film', width: 180, sortable: false },
                            { key: 'contacts', label: 'Contacts', width: 160, sortable: false },
                            { key: 'all_emails', label: 'All Emails', width: 200, sortable: false },
                            { key: 'access_type', label: 'Access Type', width: 120, sortable: false },
                            { key: 'link', label: 'Link', width: 180, sortable: false },
                            { key: 'password', label: 'Password', width: 100, sortable: false }
                          ].map((column) => (
                            <th
                              key={column.key}
                              className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50"
                              style={{ 
                                minWidth: `${columnWidths[column.key] || column.width}px`,
                                width: `${columnWidths[column.key] || column.width}px`
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span>{column.label}</span>
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
                        {programShorts.map((short) => (
                          <tr key={short.id} className={`hover:bg-gray-100 ${getRowBackgroundColor(short)}`}>
                            <td 
                              className="px-3 py-2 border-r border-gray-100"
                              style={{ 
                                minWidth: `${columnWidths['title'] || 200}px`,
                                width: `${columnWidths['title'] || 200}px`
                              }}
                            >
                              {showFilmCardsMode ? (
                                <button
                                  onClick={() => handleFilmClick(short)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline text-left font-medium"
                                >
                                  {short.title}
                                </button>
                              ) : (
                                <span className="text-gray-900 font-medium">{short.title}</span>
                              )}
                            </td>
                            <td 
                              className="px-3 py-2 text-sm border-r border-gray-100"
                              style={{ 
                                minWidth: `${columnWidths['contacts'] || 250}px`,
                                width: `${columnWidths['contacts'] || 250}px`
                              }}
                            >
                              {renderContactsCell(short.contacts)}
                            </td>
                            <td 
                              className="px-3 py-2 text-sm border-r border-gray-100"
                              style={{ 
                                minWidth: `${columnWidths['all_emails'] || 300}px`,
                                width: `${columnWidths['all_emails'] || 300}px`
                              }}
                            >
                              {renderAllEmailsCell(short.contacts)}
                            </td>
                            <td 
                              className="px-3 py-2 border-r border-gray-100"
                              style={{ 
                                minWidth: `${columnWidths['access_type'] || 150}px`,
                                width: `${columnWidths['access_type'] || 150}px`
                              }}
                            >
                              {renderAccessTypeCell(short)}
                            </td>
                            {renderLinkColumns(short)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            })()}
          </div>
        )}

        {sortedFilms.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">🎬</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No {viewMode} found</h3>
            <p className="text-gray-500">
              {searchTerm || accessTypeFilter !== 'all' ? 'Try adjusting your filters' : `No ${viewMode} available`}
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