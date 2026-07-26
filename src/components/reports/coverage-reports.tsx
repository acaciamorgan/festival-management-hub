'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BreakType, CoverageOutletType, CoverageGeography } from '@/types'
import * as XLSX from 'xlsx-js-style'

interface CoverageEntry {
  id: string
  headline: string
  break_type: BreakType | null
  coverage_date: string | null
  byline: string | null
  url: string | null
  notes: string | null
  pdf_clip_link: string | null
  outlet_name: string | null
  outlet_type: CoverageOutletType | null
  uvm_reach: string | null
  geography: CoverageGeography | null
  film_tags: { film_id: string, film_type: string, title: string }[]
}

interface FilmOption {
  id: string
  title: string
  type: string
}

const BREAK_TYPES: BreakType[] = ['Festival Feature', 'Film Article', 'Review', 'Capsule', 'Listing', 'Mention']
const GEOGRAPHIES: CoverageGeography[] = ['Local', 'Regional', 'National', 'International']
const OUTLET_TYPES: CoverageOutletType[] = ['Print Daily', 'Magazine', 'Print Weekly', 'Online', 'Radio', 'TV', 'Podcast', 'College', 'Trade']

interface TitleFilter {
  kind: 'film' | 'category'
  value: string
  label: string
}

interface CoverageReportsProps {
  availableYears: number[]
  defaultYear: number
  canImport?: boolean
}

export default function CoverageReports({ availableYears, defaultYear, canImport }: CoverageReportsProps) {
  const [selectedYear, setSelectedYear] = useState(defaultYear)
  const [reportType, setReportType] = useState<'coverage-summary' | 'coverage-by-title' | 'coverage-by-outlet'>('coverage-summary')
  const [coverage, setCoverage] = useState<CoverageEntry[]>([])
  const [allFilms, setAllFilms] = useState<FilmOption[]>([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [breakTypeFilter, setBreakTypeFilter] = useState<string>('all')
  const [geographyFilter, setGeographyFilter] = useState<string>('all')
  const [outletTypeFilter, setOutletTypeFilter] = useState<string>('all')
  const [selectedFilmFilters, setSelectedFilmFilters] = useState<TitleFilter[]>([])
  const [titleSearchQuery, setTitleSearchQuery] = useState('')
  const [showTitleDropdown, setShowTitleDropdown] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const titleDropdownRef = useRef<HTMLDivElement>(null)

  // Sort state
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Import state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importData, setImportData] = useState<Record<string, string>[]>([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ imported: number, outletsCreated: number, errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load coverage with outlet data
      const { data: coverageData, error } = await supabase
        .from('press_coverage')
        .select('*, outlets(name, outlet_type, uvm_reach, geography)')
        .eq('festival_year', selectedYear)
        .order('coverage_date', { ascending: false })

      if (error) throw error

      const entries: CoverageEntry[] = (coverageData || []).map((row: any) => ({
        id: row.id,
        headline: row.headline,
        break_type: row.break_type,
        coverage_date: row.coverage_date,
        byline: row.byline,
        url: row.url,
        notes: row.notes,
        pdf_clip_link: row.pdf_clip_link,
        outlet_name: row.outlets?.name || null,
        outlet_type: row.outlets?.outlet_type || null,
        uvm_reach: row.outlets?.uvm_reach || null,
        geography: row.outlets?.geography || null,
        film_tags: []
      }))

      // Load film tags
      if (entries.length > 0) {
        const ids = entries.map(e => e.id)
        const { data: filmTags } = await supabase
          .from('press_coverage_films')
          .select('coverage_id, film_id, film_type')
          .in('coverage_id', ids)

        if (filmTags && filmTags.length > 0) {
          const featureIds = filmTags.filter(f => f.film_type === 'feature').map(f => f.film_id)
          const shortIds = filmTags.filter(f => f.film_type === 'short').map(f => f.film_id)
          const spIds = filmTags.filter(f => f.film_type === 'shorts_program').map(f => f.film_id)
          const progIds = filmTags.filter(f => f.film_type === 'program').map(f => f.film_id)

          const [features, shorts, shortsProg, programs] = await Promise.all([
            featureIds.length > 0 ? supabase.from('feature_films').select('id, title').in('id', featureIds) : { data: [] },
            shortIds.length > 0 ? supabase.from('short_films').select('id, title').in('id', shortIds) : { data: [] },
            spIds.length > 0 ? supabase.from('shorts_programs').select('id, program_name').in('id', spIds) : { data: [] },
            progIds.length > 0 ? supabase.from('programs').select('id, title').in('id', progIds) : { data: [] },
          ])

          const titleMap = new Map<string, string>()
          ;(features.data || []).forEach((f: any) => titleMap.set(f.id, f.title))
          ;(shorts.data || []).forEach((f: any) => titleMap.set(f.id, f.title))
          ;(shortsProg.data || []).forEach((f: any) => titleMap.set(f.id, f.program_name))
          ;(programs.data || []).forEach((f: any) => titleMap.set(f.id, f.title))

          entries.forEach(entry => {
            entry.film_tags = filmTags
              .filter(ft => ft.coverage_id === entry.id)
              .map(ft => ({
                film_id: ft.film_id,
                film_type: ft.film_type,
                title: titleMap.get(ft.film_id) || 'Unknown'
              }))
          })
        }
      }

      setCoverage(entries)

      // Load all films for title filter
      const [feat, short, sp, prog] = await Promise.all([
        supabase.from('feature_films').select('id, title').eq('festival_year', selectedYear).order('title'),
        supabase.from('short_films').select('id, title').eq('festival_year', selectedYear).order('title'),
        supabase.from('shorts_programs').select('id, program_name').eq('festival_year', selectedYear).order('program_name'),
        supabase.from('programs').select('id, title').eq('festival_year', selectedYear).order('title'),
      ])
      setAllFilms([
        ...(feat.data || []).map((f: any) => ({ id: f.id, title: f.title, type: 'feature' })),
        ...(short.data || []).map((f: any) => ({ id: f.id, title: f.title, type: 'short' })),
        ...(sp.data || []).map((f: any) => ({ id: f.id, title: f.program_name, type: 'shorts_program' })),
        ...(prog.data || []).map((f: any) => ({ id: f.id, title: f.title, type: 'program' })),
      ])
    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, selectedYear])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Click outside to close title dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        titleDropdownRef.current && !titleDropdownRef.current.contains(event.target as Node) &&
        titleInputRef.current && !titleInputRef.current.contains(event.target as Node)
      ) {
        setShowTitleDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Title search results
  const titleSearchResults = useMemo(() => {
    const q = titleSearchQuery.toLowerCase().trim()
    if (q.length < 1) return []

    const selectedIds = new Set(selectedFilmFilters.filter(f => f.kind === 'film').map(f => f.value))
    const selectedCategories = new Set(selectedFilmFilters.filter(f => f.kind === 'category').map(f => f.value))

    const results: { kind: 'film' | 'category', value: string, label: string }[] = []

    // Category matches
    const categoryMap: Record<string, { keywords: string[], label: string }> = {
      'feature': { keywords: ['feature', 'features'], label: 'All Feature Films' },
      'short': { keywords: ['short', 'shorts', 'short film'], label: 'All Short Films' },
      'shorts_program': { keywords: ['short', 'shorts', 'shorts program', 'program'], label: 'All Shorts Programs' },
      'program': { keywords: ['program', 'programs', 'event', 'events'], label: 'All Programs' },
    }

    Object.entries(categoryMap).forEach(([value, { keywords, label }]) => {
      if (selectedCategories.has(value)) return
      if (keywords.some(kw => kw.includes(q) || q.includes(kw))) {
        const count = allFilms.filter(f => f.type === value).length
        if (count > 0) {
          results.push({ kind: 'category', value, label: `${label} (${count})` })
        }
      }
    })

    // Individual film matches
    allFilms.forEach(f => {
      if (selectedIds.has(f.id)) return
      if (f.title.toLowerCase().includes(q)) {
        const typeLabel = f.type === 'feature' ? 'Feature' : f.type === 'short' ? 'Short' : f.type === 'shorts_program' ? 'Shorts Prog.' : 'Program'
        results.push({ kind: 'film', value: f.id, label: `${f.title} (${typeLabel})` })
      }
    })

    return results.slice(0, 15)
  }, [titleSearchQuery, allFilms, selectedFilmFilters])

  // Apply filters
  const filteredCoverage = useMemo(() => {
    return coverage.filter(entry => {
      if (breakTypeFilter !== 'all' && entry.break_type !== breakTypeFilter) return false
      if (geographyFilter !== 'all' && entry.geography !== geographyFilter) return false
      if (outletTypeFilter !== 'all' && entry.outlet_type !== outletTypeFilter) return false
      if (selectedFilmFilters.length > 0) {
        const matchesAny = selectedFilmFilters.some(filter => {
          if (filter.kind === 'film') {
            return entry.film_tags.some(ft => ft.film_id === filter.value)
          } else {
            return entry.film_tags.some(ft => ft.film_type === filter.value)
          }
        })
        if (!matchesAny) return false
      }
      return true
    })
  }, [coverage, breakTypeFilter, geographyFilter, outletTypeFilter, selectedFilmFilters])

  // Summary stats
  const summaryStats = useMemo(() => {
    const total = filteredCoverage.length

    const byBreakType: Record<string, number> = {}
    BREAK_TYPES.forEach(t => { byBreakType[t] = 0 })
    filteredCoverage.forEach(e => { if (e.break_type) byBreakType[e.break_type] = (byBreakType[e.break_type] || 0) + 1 })

    const byGeography: Record<string, number> = {}
    GEOGRAPHIES.forEach(g => { byGeography[g] = 0 })
    filteredCoverage.forEach(e => { if (e.geography) byGeography[e.geography] = (byGeography[e.geography] || 0) + 1 })

    const byOutletType: Record<string, number> = {}
    filteredCoverage.forEach(e => { if (e.outlet_type) byOutletType[e.outlet_type] = (byOutletType[e.outlet_type] || 0) + 1 })

    const uniqueOutlets = new Set(filteredCoverage.map(e => e.outlet_name).filter(Boolean)).size

    const titlesCovered = new Set<string>()
    filteredCoverage.forEach(e => e.film_tags.forEach(ft => titlesCovered.add(ft.film_id)))

    return { total, byBreakType, byGeography, byOutletType, uniqueOutlets, titlesCovered: titlesCovered.size }
  }, [filteredCoverage])

  // By-title grouped data
  const coverageByTitle = useMemo(() => {
    const grouped: Record<string, { title: string, type: string, entries: CoverageEntry[] }> = {}

    filteredCoverage.forEach(entry => {
      entry.film_tags.forEach(ft => {
        if (!grouped[ft.film_id]) {
          grouped[ft.film_id] = { title: ft.title, type: ft.film_type, entries: [] }
        }
        grouped[ft.film_id].entries.push(entry)
      })
    })

    return Object.entries(grouped)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.entries.length - a.entries.length)
  }, [filteredCoverage])

  // By-outlet grouped data
  const coverageByOutlet = useMemo(() => {
    const grouped: Record<string, { outlet: string, outletType: string | null, geography: string | null, uvm: string | null, entries: CoverageEntry[] }> = {}

    filteredCoverage.forEach(entry => {
      const key = entry.outlet_name || 'Unknown Outlet'
      if (!grouped[key]) {
        grouped[key] = { outlet: key, outletType: entry.outlet_type || null, geography: entry.geography || null, uvm: entry.uvm_reach || null, entries: [] }
      }
      grouped[key].entries.push(entry)
    })

    return Object.values(grouped).sort((a, b) => b.entries.length - a.entries.length)
  }, [filteredCoverage])

  // Sortable coverage
  const stripArticle = (s: string) => s.replace(/^(the|a|an)\s+/i, '')

  const sortedCoverage = useMemo(() => {
    if (!sortColumn) return filteredCoverage
    return [...filteredCoverage].sort((a, b) => {
      let valA: string, valB: string
      switch (sortColumn) {
        case 'headline': valA = a.headline.toLowerCase(); valB = b.headline.toLowerCase(); break
        case 'break_type': valA = (a.break_type || '').toLowerCase(); valB = (b.break_type || '').toLowerCase(); break
        case 'date': valA = a.coverage_date || ''; valB = b.coverage_date || ''; break
        case 'outlet': valA = stripArticle(a.outlet_name || '').toLowerCase(); valB = stripArticle(b.outlet_name || '').toLowerCase(); break
        case 'byline': valA = (a.byline || '').toLowerCase(); valB = (b.byline || '').toLowerCase(); break
        case 'geography': valA = (a.geography || '').toLowerCase(); valB = (b.geography || '').toLowerCase(); break
        case 'titles': valA = a.film_tags.map(ft => ft.title).join(', ').toLowerCase(); valB = b.film_tags.map(ft => ft.title).join(', ').toLowerCase(); break
        default: return 0
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredCoverage, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortIndicator = (column: string) => {
    if (sortColumn !== column) return ' ↕'
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  // CSV Import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const wb = XLSX.read(text, { type: 'string' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const allRows: (string | number)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      const dataRows = allRows.slice(7)
      const parsed = dataRows
        .filter(row => row[1] && String(row[1]).trim())
        .map(row => ({
          headline: String(row[1] || '').trim(),
          break_type: String(row[2] || '').trim(),
          date: String(row[3] || '').trim(),
          outlet: String(row[4] || '').trim(),
          byline: String(row[5] || '').trim(),
          uvm_reach: String(row[6] || '').replace(/[",]/g, '').trim(),
          outlet_type: String(row[7] || '').trim(),
          geography: String(row[8] || '').trim(),
          url: String(row[9] || '').trim(),
          titles_mentioned: String(row[10] || '').trim(),
          notes: String(row[11] || '').trim(),
          pdf_clip_link: String(row[12] || '').trim(),
        }))

      setImportData(parsed)
      setImportResults(null)
      setShowImportModal(true)
    } catch (error) {
      console.error('Error parsing CSV:', error)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const mapGeography = (geo: string): string | null => {
    if (!geo) return null
    if (geo.toLowerCase() === 'chicago') return 'Local'
    const match = GEOGRAPHIES.find(g => g.toLowerCase() === geo.toLowerCase())
    return match || null
  }

  const mapOutletType = (type: string): string | null => {
    if (!type) return null
    const match = OUTLET_TYPES.find(t => t.toLowerCase() === type.toLowerCase())
    return match || null
  }

  const parseCSVDate = (dateStr: string): string | null => {
    if (!dateStr) return null
    const parts = dateStr.split('/')
    if (parts.length !== 3) return null
    const month = parseInt(parts[0])
    const day = parseInt(parts[1])
    let year = parseInt(parts[2])
    if (isNaN(month) || isNaN(day) || isNaN(year)) return null
    if (year < 100) year += 2000
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const processImport = async () => {
    setImporting(true)
    const results = { imported: 0, outletsCreated: 0, errors: [] as string[] }

    const { data: existingOutlets } = await supabase
      .from('outlets')
      .select('id, name')
      .eq('festival_year', selectedYear)

    const outletMap = new Map<string, string>()
    ;(existingOutlets || []).forEach((o: any) => outletMap.set(o.name.toLowerCase(), o.id))

    for (const row of importData) {
      try {
        let outletId: string | null = null
        if (row.outlet) {
          const key = row.outlet.toLowerCase()
          if (outletMap.has(key)) {
            outletId = outletMap.get(key)!
          } else {
            const { data: newOutlet, error: outletError } = await supabase
              .from('outlets')
              .insert({
                name: row.outlet,
                outlet_type: mapOutletType(row.outlet_type),
                geography: mapGeography(row.geography),
                uvm_reach: row.uvm_reach || null,
                festival_year: selectedYear
              })
              .select('id')
              .single()

            if (outletError) throw outletError
            outletId = newOutlet.id
            outletMap.set(key, newOutlet.id)
            results.outletsCreated++
          }
        }

        const matchedBreakType = BREAK_TYPES.find(bt => bt.toLowerCase() === row.break_type.toLowerCase())

        const { data: newCoverage, error: coverageError } = await supabase
          .from('press_coverage')
          .insert({
            headline: row.headline,
            break_type: matchedBreakType || null,
            coverage_date: parseCSVDate(row.date),
            outlet_id: outletId,
            byline: row.byline || null,
            url: row.url || null,
            notes: row.notes || null,
            pdf_clip_link: row.pdf_clip_link || null,
            festival_year: selectedYear
          })
          .select('id')
          .single()

        if (coverageError) throw coverageError

        if (row.titles_mentioned && newCoverage) {
          const titleNames = row.titles_mentioned.split(/[,;]/).map((t: string) => t.trim()).filter(Boolean)
          for (const titleName of titleNames) {
            const match = allFilms.find(f => f.title.toLowerCase() === titleName.toLowerCase())
            if (match) {
              await supabase.from('press_coverage_films').insert({
                coverage_id: newCoverage.id,
                film_id: match.id,
                film_type: match.type,
                festival_year: selectedYear
              })
            }
          }
        }

        results.imported++
      } catch (error: any) {
        results.errors.push(`"${row.headline}": ${error.message}`)
      }
    }

    setImportResults(results)
    setImporting(false)
    loadData()
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-').map(Number)
    return `${month}/${day}/${year}`
  }

  // Export to Excel
  const exportReport = () => {
    const wb = XLSX.utils.book_new()
    const headerStyle = { font: { bold: true }, fill: { patternType: 'solid' as const, fgColor: { rgb: 'E8E8E8' } } }

    if (reportType === 'coverage-summary') {
      const summaryData = [
        ['Press Coverage Summary Report'],
        ['Festival Year', selectedYear],
        [''],
        ['Total Coverage Entries', summaryStats.total],
        ['Unique Outlets', summaryStats.uniqueOutlets],
        ['Titles Covered', summaryStats.titlesCovered],
        [''],
        ['By Break Type'],
        ...Object.entries(summaryStats.byBreakType).map(([type, count]) => [type, count]),
        [''],
        ['By Geography'],
        ...Object.entries(summaryStats.byGeography).map(([geo, count]) => [geo, count]),
        [''],
        ['By Outlet Type'],
        ...Object.entries(summaryStats.byOutletType).map(([type, count]) => [type, count]),
      ]
      const ws = XLSX.utils.aoa_to_sheet(summaryData)
      ws['A1'] = { v: 'Press Coverage Summary Report', s: { font: { bold: true, sz: 14 } } }
      XLSX.utils.book_append_sheet(wb, ws, 'Summary')

      const detailHeaders = ['Headline', 'Break Type', 'Date', 'Outlet', 'Byline', 'UVM/Reach', 'Outlet Type', 'Geography', 'Titles Mentioned', 'URL', 'Notes', 'PDF/Clip']
      const detailRows = filteredCoverage.map(e => [
        e.headline, e.break_type || '', formatDate(e.coverage_date), e.outlet_name || '', e.byline || '',
        e.uvm_reach || '', e.outlet_type || '', e.geography || '', e.film_tags.map(ft => ft.title).join(', '),
        e.url || '', e.notes || '', e.pdf_clip_link || ''
      ])
      const ws2 = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows])
      detailHeaders.forEach((_, i) => {
        const cell = ws2[XLSX.utils.encode_cell({ r: 0, c: i })]
        if (cell) cell.s = headerStyle
      })
      XLSX.utils.book_append_sheet(wb, ws2, 'All Coverage')
    } else if (reportType === 'coverage-by-title') {
      const headers = ['Title', 'Type', 'Coverage Count', 'Outlets']
      const rows = coverageByTitle.map(t => [
        t.title,
        t.type === 'feature' ? 'Feature Film' : t.type === 'short' ? 'Short Film' : t.type === 'shorts_program' ? 'Shorts Program' : 'Program',
        t.entries.length,
        [...new Set(t.entries.map(e => e.outlet_name).filter(Boolean))].join(', ')
      ])
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      headers.forEach((_, i) => {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })]
        if (cell) cell.s = headerStyle
      })
      XLSX.utils.book_append_sheet(wb, ws, 'Coverage by Title')

      coverageByTitle.slice(0, 10).forEach(t => {
        const sheetName = t.title.substring(0, 28).replace(/[\\/*?[\]]/g, '')
        const detailHeaders = ['Headline', 'Break Type', 'Date', 'Outlet', 'Byline', 'UVM/Reach', 'URL']
        const detailRows = t.entries.map(e => [
          e.headline, e.break_type || '', formatDate(e.coverage_date), e.outlet_name || '', e.byline || '', e.uvm_reach || '', e.url || ''
        ])
        const ws2 = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows])
        detailHeaders.forEach((_, i) => {
          const cell = ws2[XLSX.utils.encode_cell({ r: 0, c: i })]
          if (cell) cell.s = headerStyle
        })
        XLSX.utils.book_append_sheet(wb, ws2, sheetName)
      })
    } else {
      const headers = ['Outlet', 'Outlet Type', 'Geography', 'UVM/Reach', 'Coverage Count', 'Break Types']
      const rows = coverageByOutlet.map(o => [
        o.outlet, o.outletType || '', o.geography || '', o.uvm || '', o.entries.length,
        [...new Set(o.entries.map(e => e.break_type).filter(Boolean))].join(', ')
      ])
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      headers.forEach((_, i) => {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })]
        if (cell) cell.s = headerStyle
      })
      XLSX.utils.book_append_sheet(wb, ws, 'Coverage by Outlet')
    }

    XLSX.writeFile(wb, `Press_Coverage_Report_${selectedYear}_${reportType}.xlsx`)
  }

  const hasFilters = breakTypeFilter !== 'all' || geographyFilter !== 'all' || outletTypeFilter !== 'all' || selectedFilmFilters.length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Report Type Tabs + Export */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Press Coverage Reports</h2>
          <div className="flex items-center gap-2">
            {canImport && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium text-sm"
                >
                  Import CSV
                </button>
              </>
            )}
            <button
              onClick={exportReport}
              disabled={filteredCoverage.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium text-sm disabled:opacity-50"
            >
              Export to Excel
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex space-x-1 mb-4">
          {[
            { key: 'coverage-summary' as const, label: 'Coverage Summary' },
            { key: 'coverage-by-title' as const, label: 'Coverage by Title' },
            { key: 'coverage-by-outlet' as const, label: 'Coverage by Outlet' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setReportType(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                reportType === tab.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Break Type:</label>
            <select
              value={breakTypeFilter}
              onChange={(e) => setBreakTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="all">All</option>
              {BREAK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Geography:</label>
            <select
              value={geographyFilter}
              onChange={(e) => setGeographyFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="all">All</option>
              {GEOGRAPHIES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Outlet Type:</label>
            <select
              value={outletTypeFilter}
              onChange={(e) => setOutletTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="all">All</option>
              {OUTLET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {hasFilters && (
            <button
              onClick={() => { setBreakTypeFilter('all'); setGeographyFilter('all'); setOutletTypeFilter('all'); setSelectedFilmFilters([]) }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Title Tag Search */}
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700">Titles:</label>
          <div className="mt-1 relative">
            <div className="flex flex-wrap items-center gap-1.5 border border-gray-300 rounded-md px-2 py-1.5 bg-white min-h-[36px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
              {selectedFilmFilters.map((filter, i) => (
                <span
                  key={`${filter.kind}-${filter.value}`}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    filter.kind === 'category'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {filter.label}
                  <button
                    onClick={() => setSelectedFilmFilters(prev => prev.filter((_, idx) => idx !== i))}
                    className="hover:text-red-600 ml-0.5"
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                ref={titleInputRef}
                type="text"
                value={titleSearchQuery}
                onChange={(e) => {
                  setTitleSearchQuery(e.target.value)
                  setShowTitleDropdown(true)
                }}
                onFocus={() => { if (titleSearchQuery.length >= 1) setShowTitleDropdown(true) }}
                placeholder={selectedFilmFilters.length === 0 ? 'Search titles or type "shorts", "features"...' : 'Add more...'}
                className="flex-1 min-w-[150px] outline-none text-sm py-0.5 bg-transparent"
              />
            </div>
            {showTitleDropdown && titleSearchResults.length > 0 && (
              <div
                ref={titleDropdownRef}
                className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-20 mt-1"
              >
                {titleSearchResults.map((result) => (
                  <button
                    key={`${result.kind}-${result.value}`}
                    onClick={() => {
                      setSelectedFilmFilters(prev => [...prev, { kind: result.kind, value: result.value, label: result.label }])
                      setTitleSearchQuery('')
                      setShowTitleDropdown(false)
                      titleInputRef.current?.focus()
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>{result.label}</span>
                    {result.kind === 'category' && (
                      <span className="text-xs text-purple-600 font-medium">Category</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Content */}
      {filteredCoverage.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No coverage data {hasFilters ? 'matches the selected filters' : 'yet'}</p>
          {!hasFilters && <p className="text-gray-400 mt-2">Add coverage entries in the Press Management module</p>}
        </div>
      ) : reportType === 'coverage-summary' ? (
        <div className="space-y-6">
          {/* Top-level stats */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <div className="text-3xl font-bold text-blue-600">{summaryStats.total}</div>
              <div className="text-sm text-gray-600 mt-1">Total Coverage Entries</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <div className="text-3xl font-bold text-green-600">{summaryStats.uniqueOutlets}</div>
              <div className="text-sm text-gray-600 mt-1">Unique Outlets</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <div className="text-3xl font-bold text-purple-600">{summaryStats.titlesCovered}</div>
              <div className="text-sm text-gray-600 mt-1">Titles Covered</div>
            </div>
          </div>

          {/* Breakdowns */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">By Break Type</h3>
              <div className="space-y-3">
                {Object.entries(summaryStats.byBreakType).filter(([, count]) => count > 0).sort(([,a], [,b]) => b - a).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{type}</span>
                    <div className="flex items-center">
                      <div className="w-24 h-2 bg-gray-200 rounded-full mr-3">
                        <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${(count / summaryStats.total) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">By Geography</h3>
              <div className="space-y-3">
                {Object.entries(summaryStats.byGeography).filter(([, count]) => count > 0).sort(([,a], [,b]) => b - a).map(([geo, count]) => (
                  <div key={geo} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{geo}</span>
                    <div className="flex items-center">
                      <div className="w-24 h-2 bg-gray-200 rounded-full mr-3">
                        <div className="h-2 bg-green-500 rounded-full" style={{ width: `${(count / summaryStats.total) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">By Outlet Type</h3>
              <div className="space-y-3">
                {Object.entries(summaryStats.byOutletType).filter(([, count]) => count > 0).sort(([,a], [,b]) => b - a).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{type}</span>
                    <div className="flex items-center">
                      <div className="w-24 h-2 bg-gray-200 rounded-full mr-3">
                        <div className="h-2 bg-purple-500 rounded-full" style={{ width: `${(count / summaryStats.total) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detail table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">All Coverage ({filteredCoverage.length})</h3>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {[
                      { key: 'headline', label: 'Headline' },
                      { key: 'break_type', label: 'Break Type' },
                      { key: 'date', label: 'Date' },
                      { key: 'outlet', label: 'Outlet' },
                      { key: 'byline', label: 'Byline' },
                      { key: 'geography', label: 'Geography' },
                      { key: 'titles', label: 'Titles' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                      >
                        {col.label}{sortIndicator(col.key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedCoverage.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {entry.url ? (
                          <a href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{entry.headline}</a>
                        ) : entry.headline}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{entry.break_type || ''}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{formatDate(entry.coverage_date)}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{entry.outlet_name || ''}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{entry.byline || ''}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{entry.geography || ''}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{entry.film_tags.map(ft => ft.title).join(', ') || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : reportType === 'coverage-by-title' ? (
        <div className="space-y-4">
          {coverageByTitle.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No titles have been tagged in coverage entries yet</p>
            </div>
          ) : coverageByTitle.map(item => (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.type === 'feature' ? 'Feature Film' : item.type === 'short' ? 'Short Film' : item.type === 'shorts_program' ? 'Shorts Program' : 'Program'}
                  </p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {item.entries.length} piece{item.entries.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Headline', 'Break Type', 'Date', 'Outlet', 'Byline', 'UVM/Reach'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {item.entries.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {entry.url ? (
                            <a href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{entry.headline}</a>
                          ) : entry.headline}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{entry.break_type || ''}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{formatDate(entry.coverage_date)}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{entry.outlet_name || ''}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{entry.byline || ''}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{entry.uvm_reach || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {coverageByOutlet.map(item => (
            <div key={item.outlet} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{item.outlet}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {[item.outletType, item.geography, item.uvm ? `Reach: ${item.uvm}` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  {item.entries.length} piece{item.entries.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Headline', 'Break Type', 'Date', 'Byline', 'Titles'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {item.entries.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {entry.url ? (
                            <a href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{entry.headline}</a>
                          ) : entry.headline}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{entry.break_type || ''}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{formatDate(entry.coverage_date)}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{entry.byline || ''}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{entry.film_tags.map(ft => ft.title).join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Import Coverage Data</h3>
              <button
                onClick={() => { setShowImportModal(false); setImportData([]); setImportResults(null) }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                &times;
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {importResults ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 text-lg">✓</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Import Complete</p>
                      <p className="text-sm text-gray-600">
                        {importResults.imported} entries imported · {importResults.outletsCreated} new outlets created
                      </p>
                    </div>
                  </div>
                  {importResults.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-sm font-medium text-red-800 mb-2">{importResults.errors.length} error{importResults.errors.length !== 1 ? 's' : ''}:</p>
                      <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                        {importResults.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Ready to import <span className="font-semibold">{importData.length}</span> coverage entries into <span className="font-semibold">{selectedYear}</span>.
                  </p>
                  <div className="bg-gray-50 rounded-md border border-gray-200 overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Headline</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Outlet</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {importData.slice(0, 10).map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 text-gray-900 max-w-[200px] truncate">{row.headline}</td>
                            <td className="px-3 py-1.5 text-gray-700">{row.date}</td>
                            <td className="px-3 py-1.5 text-gray-700">{row.outlet}</td>
                            <td className="px-3 py-1.5 text-gray-700">{row.break_type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importData.length > 10 && (
                      <p className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200">
                        ...and {importData.length - 10} more rows
                      </p>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                    <p>New outlets will be auto-created. Dates will be parsed as M/D/YY. Geography &ldquo;Chicago&rdquo; maps to &ldquo;Local&rdquo;. Film title matching is best-effort against existing titles.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowImportModal(false); setImportData([]); setImportResults(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {importResults ? 'Close' : 'Cancel'}
              </button>
              {!importResults && (
                <button
                  onClick={processImport}
                  disabled={importing}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : `Import ${importData.length} Entries`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
