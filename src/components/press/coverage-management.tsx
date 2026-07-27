'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { PressCoverageCard, OutletCard, BreakType, CoverageOutletType, CoverageGeography } from '@/types'
import { ChipSelect, ChipItem, ChipSelectSuggestion } from '@/components/ui/chip-select'
import * as XLSX from 'xlsx-js-style'

interface CoverageManagementProps {
  canEdit: boolean
}

interface CoverageRow extends PressCoverageCard {
  film_tags?: { film_id: string, film_type: string, title: string }[]
}

interface NewEntryData {
  headline: string
  break_type: BreakType | ''
  coverage_date: string
  outlet_id: string
  outlet_name: string
  byline: string
  url: string
  notes: string
  pdf_clip_link: string
}

const BREAK_TYPES: BreakType[] = ['Festival Feature', 'Film Article', 'Review', 'Capsule', 'Listing', 'Mention']
const OUTLET_TYPES: CoverageOutletType[] = ['Print Daily', 'Magazine', 'Print Weekly', 'Online', 'Radio', 'TV', 'Podcast', 'College', 'Trade']
const GEOGRAPHIES: CoverageGeography[] = ['Local', 'Regional', 'National', 'International']

const emptyEntry: NewEntryData = {
  headline: '',
  break_type: '',
  coverage_date: '',
  outlet_id: '',
  outlet_name: '',
  byline: '',
  url: '',
  notes: '',
  pdf_clip_link: ''
}

export function CoverageManagement({ canEdit }: CoverageManagementProps) {
  const { currentYear } = useFestivalYear()
  const [coverage, setCoverage] = useState<CoverageRow[]>([])
  const [loading, setLoading] = useState(false)
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'coverage_date', direction: 'desc' })
  const [searchTerm, setSearchTerm] = useState('')
  const [breakTypeFilter, setBreakTypeFilter] = useState<string>('all')
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

  // New entry row
  const [newEntry, setNewEntry] = useState<NewEntryData>({ ...emptyEntry })
  const [savingNew, setSavingNew] = useState(false)

  // Outlet auto-suggest
  const [outletQuery, setOutletQuery] = useState('')
  const [outletSuggestions, setOutletSuggestions] = useState<OutletCard[]>([])
  const [showOutletDropdown, setShowOutletDropdown] = useState(false)
  const [selectedOutletData, setSelectedOutletData] = useState<OutletCard | null>(null)
  const outletInputRef = useRef<HTMLInputElement>(null)
  const outletDropdownRef = useRef<HTMLDivElement>(null)

  // Byline auto-suggest
  const [bylineSuggestions, setBylineSuggestions] = useState<string[]>([])
  const [showBylineDropdown, setShowBylineDropdown] = useState(false)
  const bylineInputRef = useRef<HTMLInputElement>(null)
  const bylineDropdownRef = useRef<HTMLDivElement>(null)

  // Edit modal
  const [editingCoverage, setEditingCoverage] = useState<CoverageRow | null>(null)
  const [editFormData, setEditFormData] = useState<NewEntryData>({ ...emptyEntry })
  const [editOutletData, setEditOutletData] = useState<OutletCard | null>(null)
  const [editOutletQuery, setEditOutletQuery] = useState('')
  const [editOutletSuggestions, setEditOutletSuggestions] = useState<OutletCard[]>([])
  const [showEditOutletDropdown, setShowEditOutletDropdown] = useState(false)
  const [editBylineSuggestions, setEditBylineSuggestions] = useState<string[]>([])
  const [showEditBylineDropdown, setShowEditBylineDropdown] = useState(false)

  // Film tagging modal
  const [taggingCoverage, setTaggingCoverage] = useState<CoverageRow | null>(null)
  const [filmChips, setFilmChips] = useState<(ChipItem & { filmType?: string })[]>([])
  const [allFilms, setAllFilms] = useState<{ id: string, title: string, type: string }[]>([])

  // New outlet inline creation
  const [showNewOutletModal, setShowNewOutletModal] = useState(false)
  const [newOutletName, setNewOutletName] = useState('')
  const [newOutletType, setNewOutletType] = useState('')
  const [newOutletGeography, setNewOutletGeography] = useState('')
  const [newOutletUvm, setNewOutletUvm] = useState('')
  const [pendingOutletFor, setPendingOutletFor] = useState<'new' | 'edit'>('new')

  // CSV Import
  const [showImportModal, setShowImportModal] = useState(false)
  const [importData, setImportData] = useState<Record<string, string>[]>([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ imported: number, outletsCreated: number, errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const loadCoverage = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('press_coverage')
        .select('*, outlets(name, outlet_type, uvm_reach, geography)')
        .eq('festival_year', currentYear)
        .order('coverage_date', { ascending: false })

      if (error) throw error

      const rows: CoverageRow[] = (data || []).map((row: any) => ({
        id: row.id,
        headline: row.headline,
        break_type: row.break_type,
        coverage_date: row.coverage_date,
        outlet_id: row.outlet_id,
        byline: row.byline,
        url: row.url,
        notes: row.notes,
        pdf_clip_link: row.pdf_clip_link,
        festival_year: row.festival_year,
        outlet_name: row.outlets?.name || null,
        outlet_type: row.outlets?.outlet_type || null,
        uvm_reach: row.outlets?.uvm_reach || null,
        geography: row.outlets?.geography || null,
        film_tags: []
      }))

      // Load film tags for all coverage entries
      if (rows.length > 0) {
        const coverageIds = rows.map(r => r.id)
        const { data: filmTags } = await supabase
          .from('press_coverage_films')
          .select('coverage_id, film_id, film_type')
          .in('coverage_id', coverageIds)

        if (filmTags && filmTags.length > 0) {
          // Load film titles
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

          rows.forEach(row => {
            row.film_tags = filmTags
              .filter(ft => ft.coverage_id === row.id)
              .map(ft => ({
                film_id: ft.film_id,
                film_type: ft.film_type,
                title: titleMap.get(ft.film_id) || 'Unknown'
              }))
          })
        }
      }

      setCoverage(rows)
    } catch (error) {
      console.error('Error loading coverage:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, currentYear])

  // Load films for tagging
  const loadFilms = useCallback(async () => {
    const [feat, short, sp, prog] = await Promise.all([
      supabase.from('feature_films').select('id, title').eq('festival_year', currentYear).order('title'),
      supabase.from('short_films').select('id, title').eq('festival_year', currentYear).order('title'),
      supabase.from('shorts_programs').select('id, program_name').eq('festival_year', currentYear).order('program_name'),
      supabase.from('programs').select('id, title').eq('festival_year', currentYear).order('title'),
    ])
    setAllFilms([
      ...(feat.data || []).map((f: any) => ({ id: f.id, title: f.title, type: 'feature' })),
      ...(short.data || []).map((f: any) => ({ id: f.id, title: f.title, type: 'short' })),
      ...(sp.data || []).map((f: any) => ({ id: f.id, title: f.program_name, type: 'shorts_program' })),
      ...(prog.data || []).map((f: any) => ({ id: f.id, title: f.title, type: 'program' })),
    ])
  }, [supabase, currentYear])

  useEffect(() => {
    loadCoverage()
    loadFilms()
  }, [loadCoverage, loadFilms])

  // CSV Import handlers
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
      .eq('festival_year', currentYear)

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
                festival_year: currentYear
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
            festival_year: currentYear
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
                festival_year: currentYear
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
    loadCoverage()
  }

  // Outlet auto-suggest (fuzzy)
  const searchOutlets = useCallback(async (query: string) => {
    if (query.length < 1) {
      setOutletSuggestions([])
      return
    }
    const { data } = await supabase
      .from('outlets')
      .select('*')
      .eq('festival_year', currentYear)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10)
    setOutletSuggestions(data || [])
  }, [supabase, currentYear])

  const searchOutletsForEdit = useCallback(async (query: string) => {
    if (query.length < 1) {
      setEditOutletSuggestions([])
      return
    }
    const { data } = await supabase
      .from('outlets')
      .select('*')
      .eq('festival_year', currentYear)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10)
    setEditOutletSuggestions(data || [])
  }, [supabase, currentYear])

  // Byline auto-suggest
  const searchBylines = useCallback(async (query: string, target: 'new' | 'edit') => {
    if (query.length < 1) {
      if (target === 'new') setBylineSuggestions([])
      else setEditBylineSuggestions([])
      return
    }

    const [pressResult, coverageResult] = await Promise.all([
      supabase.from('press').select('name').eq('festival_year', currentYear).ilike('name', `%${query}%`).limit(5),
      supabase.from('press_coverage').select('byline').eq('festival_year', currentYear).ilike('byline', `%${query}%`).limit(5),
    ])

    const names = new Set<string>()
    ;(pressResult.data || []).forEach((p: any) => { if (p.name) names.add(p.name) })
    ;(coverageResult.data || []).forEach((c: any) => { if (c.byline) names.add(c.byline) })

    const sorted = Array.from(names).sort()
    if (target === 'new') setBylineSuggestions(sorted)
    else setEditBylineSuggestions(sorted)
  }, [supabase, currentYear])

  // Handle outlet input change (new entry)
  const handleOutletInput = (value: string) => {
    setOutletQuery(value)
    setNewEntry(prev => ({ ...prev, outlet_name: value, outlet_id: '' }))
    setSelectedOutletData(null)
    setShowOutletDropdown(true)
    searchOutlets(value)
  }

  // Select outlet from suggestions (new entry)
  const selectOutlet = (outlet: OutletCard) => {
    setOutletQuery(outlet.name)
    setNewEntry(prev => ({ ...prev, outlet_id: outlet.id, outlet_name: outlet.name }))
    setSelectedOutletData(outlet)
    setShowOutletDropdown(false)
  }

  // Handle byline input change (new entry)
  const handleBylineInput = (value: string) => {
    setNewEntry(prev => ({ ...prev, byline: value }))
    setShowBylineDropdown(true)
    searchBylines(value, 'new')
  }

  // Film search for ChipSelect
  const handleFilmSearch = useCallback(async (query: string): Promise<ChipSelectSuggestion[]> => {
    const lower = query.toLowerCase()
    return allFilms
      .filter(f => f.title.toLowerCase().includes(lower))
      .slice(0, 15)
      .map(f => ({
        id: f.id,
        label: f.title,
        sublabel: f.type === 'feature' ? 'Feature Film' :
                  f.type === 'short' ? 'Short Film' :
                  f.type === 'shorts_program' ? 'Shorts Program' : 'Program',
        type: f.type,
      }))
  }, [allFilms])

  // Save new entry
  const handleSaveNew = async () => {
    if (!newEntry.headline.trim()) return
    setSavingNew(true)

    try {
      const payload = {
        headline: newEntry.headline.trim(),
        break_type: newEntry.break_type || null,
        coverage_date: parseDateInput(newEntry.coverage_date),
        outlet_id: newEntry.outlet_id || null,
        byline: newEntry.byline.trim() || null,
        url: newEntry.url.trim() || null,
        notes: newEntry.notes.trim() || null,
        pdf_clip_link: newEntry.pdf_clip_link.trim() || null,
        festival_year: currentYear,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase.from('press_coverage').insert([payload])
      if (error) throw error

      setNewEntry({ ...emptyEntry })
      setOutletQuery('')
      setSelectedOutletData(null)
      await loadCoverage()
    } catch (error) {
      console.error('Error saving coverage:', error)
      alert('Error saving coverage entry. Please try again.')
    } finally {
      setSavingNew(false)
    }
  }

  // Open edit modal
  const openEdit = (row: CoverageRow) => {
    setEditingCoverage(row)
    setEditFormData({
      headline: row.headline,
      break_type: row.break_type || '',
      coverage_date: formatDateForEdit(row.coverage_date),
      outlet_id: row.outlet_id || '',
      outlet_name: row.outlet_name || '',
      byline: row.byline || '',
      url: row.url || '',
      notes: row.notes || '',
      pdf_clip_link: row.pdf_clip_link || ''
    })
    setEditOutletQuery(row.outlet_name || '')
    if (row.outlet_id) {
      setEditOutletData({
        id: row.outlet_id,
        name: row.outlet_name || '',
        outlet_type: row.outlet_type,
        uvm_reach: row.uvm_reach,
        geography: row.geography,
        festival_year: currentYear
      })
    } else {
      setEditOutletData(null)
    }
  }

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingCoverage || !editFormData.headline.trim()) return

    try {
      const payload = {
        headline: editFormData.headline.trim(),
        break_type: editFormData.break_type || null,
        coverage_date: parseDateInput(editFormData.coverage_date),
        outlet_id: editFormData.outlet_id || null,
        byline: editFormData.byline.trim() || null,
        url: editFormData.url.trim() || null,
        notes: editFormData.notes.trim() || null,
        pdf_clip_link: editFormData.pdf_clip_link.trim() || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('press_coverage')
        .update(payload)
        .eq('id', editingCoverage.id)
      if (error) throw error

      setEditingCoverage(null)
      await loadCoverage()
    } catch (error) {
      console.error('Error updating coverage:', error)
      alert('Error updating coverage. Please try again.')
    }
  }

  // Delete coverage
  const handleDelete = async (row: CoverageRow) => {
    if (!confirm(`Delete "${row.headline}"?`)) return
    try {
      const { error } = await supabase.from('press_coverage').delete().eq('id', row.id)
      if (error) throw error
      await loadCoverage()
    } catch (error) {
      console.error('Error deleting coverage:', error)
      alert('Error deleting coverage. Please try again.')
    }
  }

  // Open film tagging modal
  const openFilmTagging = (row: CoverageRow) => {
    setTaggingCoverage(row)
    setFilmChips(
      (row.film_tags || []).map(ft => ({
        id: ft.film_id,
        label: ft.title,
        type: ft.film_type,
        filmType: ft.film_type
      }))
    )
  }

  // Save film tags
  const saveFilmTags = async () => {
    if (!taggingCoverage) return
    try {
      // Delete existing tags
      await supabase.from('press_coverage_films').delete().eq('coverage_id', taggingCoverage.id)

      // Insert new tags
      const fkFilms = filmChips.filter(c => c.id)
      if (fkFilms.length > 0) {
        const inserts = fkFilms.map(chip => ({
          coverage_id: taggingCoverage.id,
          film_id: chip.id!,
          film_type: chip.type || chip.filmType || 'feature',
          festival_year: currentYear
        }))
        const { error } = await supabase.from('press_coverage_films').insert(inserts)
        if (error) throw error
      }

      setTaggingCoverage(null)
      await loadCoverage()
    } catch (error) {
      console.error('Error saving film tags:', error)
      alert('Error saving film tags. Please try again.')
    }
  }

  // Create new outlet inline
  const handleCreateOutlet = async () => {
    if (!newOutletName.trim()) return
    try {
      const { data, error } = await supabase
        .from('outlets')
        .insert([{
          name: newOutletName.trim(),
          outlet_type: newOutletType || null,
          geography: newOutletGeography || null,
          uvm_reach: newOutletUvm.trim() || null,
          festival_year: currentYear,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      const outlet: OutletCard = data
      if (pendingOutletFor === 'new') {
        selectOutlet(outlet)
      } else {
        setEditFormData(prev => ({ ...prev, outlet_id: outlet.id, outlet_name: outlet.name }))
        setEditOutletQuery(outlet.name)
        setEditOutletData(outlet)
      }

      setShowNewOutletModal(false)
      setNewOutletName('')
      setNewOutletType('')
      setNewOutletGeography('')
      setNewOutletUvm('')
    } catch (error) {
      console.error('Error creating outlet:', error)
      alert('Error creating outlet. Please try again.')
    }
  }

  // Filtering and sorting
  const filteredCoverage = useMemo(() => {
    return coverage.filter(row => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const searchable = [row.headline, row.byline, row.outlet_name, row.notes, row.url].filter(Boolean).join(' ').toLowerCase()
        if (!searchable.includes(term)) return false
      }
      if (breakTypeFilter !== 'all' && row.break_type !== breakTypeFilter) return false
      return true
    })
  }, [coverage, searchTerm, breakTypeFilter])

  const sortedCoverage = useMemo(() => {
    if (!sortConfig) return filteredCoverage
    return [...filteredCoverage].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof CoverageRow]
      const bVal = b[sortConfig.key as keyof CoverageRow]
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredCoverage, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      return { key, direction: 'asc' }
    })
  }

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return '↕'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-').map(Number)
    return `${month}/${day}/${String(year).slice(-2)}`
  }

  const formatDateForEdit = (dateStr: string | null | undefined): string => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-').map(Number)
    return `${month}/${day}/${String(year).slice(-2)}`
  }

  const parseDateInput = (input: string): string | null => {
    if (!input) return null
    const parts = input.split('/')
    if (parts.length !== 3) return null
    const month = parseInt(parts[0])
    const day = parseInt(parts[1])
    let year = parseInt(parts[2])
    if (isNaN(month) || isNaN(day) || isNaN(year)) return null
    if (year < 100) year += 2000
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (outletDropdownRef.current && !outletDropdownRef.current.contains(e.target as Node) &&
          outletInputRef.current && !outletInputRef.current.contains(e.target as Node)) {
        setShowOutletDropdown(false)
      }
      if (bylineDropdownRef.current && !bylineDropdownRef.current.contains(e.target as Node) &&
          bylineInputRef.current && !bylineInputRef.current.contains(e.target as Node)) {
        setShowBylineDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const columns = [
    { key: 'headline', label: 'Headline', width: 200 },
    { key: 'break_type', label: 'Break Type', width: 120 },
    { key: 'coverage_date', label: 'Date', width: 100 },
    { key: 'outlet_name', label: 'Outlet', width: 160 },
    { key: 'byline', label: 'Byline', width: 140 },
    { key: 'uvm_reach', label: 'UVM / Reach', width: 110 },
    { key: 'outlet_type', label: 'Outlet Type', width: 110 },
    { key: 'geography', label: 'Geography', width: 100 },
    { key: 'film_tags', label: 'Titles', width: 140 },
    { key: 'url', label: 'URL', width: 100 },
    { key: 'notes', label: 'Notes', width: 150 },
    { key: 'pdf_clip_link', label: 'PDF/Clip', width: 80 },
    ...(canEdit ? [{ key: 'actions', label: '', width: 100 }] : [])
  ]

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">{filteredCoverage.length} of {coverage.length} coverage entries</p>
          {canEdit && (
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
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search coverage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Break Type:</label>
            <select
              value={breakTypeFilter}
              onChange={(e) => setBreakTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              {BREAK_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          {(searchTerm || breakTypeFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setBreakTypeFilter('all') }}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading coverage...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50"
                        style={{ minWidth: `${columnWidths[col.key] || col.width}px` }}
                      >
                        <div className="flex items-center justify-between">
                          {col.key !== 'actions' && col.key !== 'film_tags' ? (
                            <button onClick={() => handleSort(col.key)} className="flex items-center space-x-1 hover:text-gray-700">
                              <span>{col.label}</span>
                              <span className={sortConfig?.key === col.key ? 'text-blue-600' : 'text-gray-400'}>{getSortIcon(col.key)}</span>
                            </button>
                          ) : (
                            <span>{col.label}</span>
                          )}
                        </div>
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            const startX = e.clientX
                            const startWidth = columnWidths[col.key] || col.width
                            const onMove = (e: MouseEvent) => {
                              setColumnWidths(prev => ({ ...prev, [col.key]: Math.max(50, startWidth + (e.clientX - startX)) }))
                            }
                            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
                            document.addEventListener('mousemove', onMove)
                            document.addEventListener('mouseup', onUp)
                          }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* New entry row (top) */}
                  {canEdit && (
                    <tr className="bg-green-50 border-b-2 border-green-300 sticky top-[41px] z-[5]">
                      {/* Headline */}
                      <td className="px-2 py-2 border-r border-gray-100">
                        <input
                          type="text"
                          value={newEntry.headline}
                          onChange={(e) => setNewEntry(prev => ({ ...prev, headline: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter' && newEntry.headline.trim()) handleSaveNew() }}
                          placeholder="Headline..."
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      {/* Break Type */}
                      <td className="px-2 py-2 border-r border-gray-100">
                        <select
                          value={newEntry.break_type}
                          onChange={(e) => setNewEntry(prev => ({ ...prev, break_type: e.target.value as BreakType }))}
                          className="w-full px-1 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Type...</option>
                          {BREAK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      {/* Date */}
                      <td className="px-2 py-2 border-r border-gray-100">
                        <input
                          type="text"
                          placeholder="M/D/YY"
                          value={newEntry.coverage_date}
                          onChange={(e) => setNewEntry(prev => ({ ...prev, coverage_date: e.target.value }))}
                          className="w-full px-1 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      {/* Outlet (auto-suggest) */}
                      <td className="px-2 py-2 border-r border-gray-100 relative">
                        <input
                          ref={outletInputRef}
                          type="text"
                          value={outletQuery}
                          onChange={(e) => handleOutletInput(e.target.value)}
                          onFocus={() => { if (outletQuery.length >= 1) setShowOutletDropdown(true) }}
                          placeholder="Outlet..."
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {showOutletDropdown && (
                          <div ref={outletDropdownRef} className="absolute z-20 left-2 right-2 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {outletSuggestions.map(o => (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => selectOutlet(o)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium">{o.name}</div>
                                {o.outlet_type && <div className="text-xs text-gray-500">{o.outlet_type} · {o.geography || 'No geography'}</div>}
                              </button>
                            ))}
                            {outletQuery.length >= 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewOutletName(outletQuery)
                                  setPendingOutletFor('new')
                                  setShowNewOutletModal(true)
                                  setShowOutletDropdown(false)
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 font-medium"
                              >
                                + Add &quot;{outletQuery}&quot; as new outlet
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      {/* Byline (auto-suggest) */}
                      <td className="px-2 py-2 border-r border-gray-100 relative">
                        <input
                          ref={bylineInputRef}
                          type="text"
                          value={newEntry.byline}
                          onChange={(e) => handleBylineInput(e.target.value)}
                          onFocus={() => { if (newEntry.byline.length >= 1 && bylineSuggestions.length > 0) setShowBylineDropdown(true) }}
                          placeholder="Byline..."
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {showBylineDropdown && bylineSuggestions.length > 0 && (
                          <div ref={bylineDropdownRef} className="absolute z-20 left-2 right-2 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {bylineSuggestions.map((name, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setNewEntry(prev => ({ ...prev, byline: name }))
                                  setShowBylineDropdown(false)
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      {/* UVM/Reach (auto-filled) */}
                      <td className="px-2 py-2 text-xs text-gray-400 border-r border-gray-100">{selectedOutletData?.uvm_reach || ''}</td>
                      {/* Outlet Type (auto-filled) */}
                      <td className="px-2 py-2 text-xs text-gray-400 border-r border-gray-100">{selectedOutletData?.outlet_type || ''}</td>
                      {/* Geography (auto-filled) */}
                      <td className="px-2 py-2 text-xs text-gray-400 border-r border-gray-100">{selectedOutletData?.geography || ''}</td>
                      {/* Titles (tag after save) */}
                      <td className="px-2 py-2 text-xs text-gray-400 border-r border-gray-100">Save first</td>
                      {/* URL */}
                      <td className="px-2 py-2 border-r border-gray-100">
                        <input
                          type="text"
                          value={newEntry.url}
                          onChange={(e) => setNewEntry(prev => ({ ...prev, url: e.target.value }))}
                          placeholder="URL..."
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      {/* Notes */}
                      <td className="px-2 py-2 border-r border-gray-100">
                        <input
                          type="text"
                          value={newEntry.notes}
                          onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Notes..."
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      {/* PDF/Clip */}
                      <td className="px-2 py-2 border-r border-gray-100">
                        <input
                          type="text"
                          value={newEntry.pdf_clip_link}
                          onChange={(e) => setNewEntry(prev => ({ ...prev, pdf_clip_link: e.target.value }))}
                          placeholder="Link..."
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      {/* Save button */}
                      <td className="px-2 py-2 border-r border-gray-100">
                        <button
                          onClick={handleSaveNew}
                          disabled={!newEntry.headline.trim() || savingNew}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium disabled:opacity-50 transition-colors"
                        >
                          {savingNew ? '...' : '+ Add'}
                        </button>
                      </td>
                    </tr>
                  )}

                  {/* Existing rows */}
                  {sortedCoverage.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 font-medium">{row.headline}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">
                        {row.break_type && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{row.break_type}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">{formatDate(row.coverage_date)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">{row.outlet_name}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">{row.byline}</td>
                      <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-100">{row.uvm_reach || ''}</td>
                      <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-100">{row.outlet_type || ''}</td>
                      <td className="px-3 py-2 text-sm text-gray-500 border-r border-gray-100">{row.geography || ''}</td>
                      <td className="px-3 py-2 text-sm border-r border-gray-100">
                        {row.film_tags && row.film_tags.length > 0 ? (
                          <button
                            onClick={() => canEdit && openFilmTagging(row)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            {row.film_tags.length} title{row.film_tags.length !== 1 ? 's' : ''}
                          </button>
                        ) : canEdit ? (
                          <button
                            onClick={() => openFilmTagging(row)}
                            className="text-xs text-gray-400 hover:text-blue-600"
                          >
                            + Tag
                          </button>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-sm border-r border-gray-100">
                        {row.url && (
                          <a href={row.url.startsWith('http') ? row.url : `https://${row.url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                            Link
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 truncate max-w-[150px]" title={row.notes || ''}>{row.notes}</td>
                      <td className="px-3 py-2 text-sm border-r border-gray-100">
                        {row.pdf_clip_link && (
                          <a href={row.pdf_clip_link.startsWith('http') ? row.pdf_clip_link : `https://${row.pdf_clip_link}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                            Clip
                          </a>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-3 py-2 text-sm border-r border-gray-100">
                          <div className="flex space-x-1">
                            <button onClick={() => openEdit(row)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                            <button onClick={() => handleDelete(row)} className="text-red-600 hover:text-red-800 text-xs font-medium">Del</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}

                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Coverage Modal */}
      {editingCoverage && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Coverage Entry</h2>
              <button onClick={() => setEditingCoverage(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headline *</label>
                <input
                  type="text"
                  value={editFormData.headline}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, headline: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Break Type</label>
                  <select
                    value={editFormData.break_type}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, break_type: e.target.value as BreakType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select...</option>
                    {BREAK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="text"
                    placeholder="M/D/YY"
                    value={editFormData.coverage_date}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, coverage_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outlet</label>
                  <input
                    type="text"
                    value={editOutletQuery}
                    onChange={(e) => {
                      setEditOutletQuery(e.target.value)
                      setEditFormData(prev => ({ ...prev, outlet_id: '', outlet_name: e.target.value }))
                      setEditOutletData(null)
                      setShowEditOutletDropdown(true)
                      searchOutletsForEdit(e.target.value)
                    }}
                    onFocus={() => { if (editOutletQuery.length >= 1) { searchOutletsForEdit(editOutletQuery); setShowEditOutletDropdown(true) } }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {showEditOutletDropdown && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {editOutletSuggestions.map(o => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            setEditFormData(prev => ({ ...prev, outlet_id: o.id, outlet_name: o.name }))
                            setEditOutletQuery(o.name)
                            setEditOutletData(o)
                            setShowEditOutletDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b border-gray-100"
                        >
                          <div className="font-medium">{o.name}</div>
                          {o.outlet_type && <div className="text-xs text-gray-500">{o.outlet_type} · {o.geography || ''}</div>}
                        </button>
                      ))}
                      {editOutletQuery.length >= 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewOutletName(editOutletQuery)
                            setPendingOutletFor('edit')
                            setShowNewOutletModal(true)
                            setShowEditOutletDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 font-medium"
                        >
                          + Add &quot;{editOutletQuery}&quot; as new outlet
                        </button>
                      )}
                    </div>
                  )}
                  {editOutletData && (
                    <div className="mt-1 text-xs text-gray-500">
                      {[editOutletData.outlet_type, editOutletData.geography, editOutletData.uvm_reach].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Byline</label>
                  <input
                    type="text"
                    value={editFormData.byline}
                    onChange={(e) => {
                      setEditFormData(prev => ({ ...prev, byline: e.target.value }))
                      setShowEditBylineDropdown(true)
                      searchBylines(e.target.value, 'edit')
                    }}
                    onFocus={() => { if (editFormData.byline.length >= 1 && editBylineSuggestions.length > 0) setShowEditBylineDropdown(true) }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {showEditBylineDropdown && editBylineSuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {editBylineSuggestions.map((name, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setEditFormData(prev => ({ ...prev, byline: name }))
                            setShowEditBylineDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="text"
                  value={editFormData.url}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PDF/Clip Link</label>
                  <input
                    type="text"
                    value={editFormData.pdf_clip_link}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, pdf_clip_link: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingCoverage(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Film Tagging Modal */}
      {taggingCoverage && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold">Tag Titles</h2>
                <p className="text-sm text-gray-500 mt-1">{taggingCoverage.headline}</p>
              </div>
              <button onClick={() => setTaggingCoverage(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <ChipSelect
              items={filmChips}
              onChange={(items) => {
                setFilmChips(items.map(item => {
                  const filmOption = allFilms.find(f => f.id === item.id)
                  return { ...item, filmType: filmOption?.type || item.type || undefined }
                }))
              }}
              onSearch={handleFilmSearch}
              placeholder="Search films or programs..."
              label="Content / Titles Mentioned"
              allowFreeText={true}
              helpText="Search for titles or type to add free text."
            />

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={() => setTaggingCoverage(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveFilmTags}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Save Tags
              </button>
            </div>
          </div>
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
                    Ready to import <span className="font-semibold">{importData.length}</span> coverage entries into <span className="font-semibold">{currentYear}</span>.
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
                    New outlets will be auto-created. Dates parsed as M/D/YY. Geography &ldquo;Chicago&rdquo; maps to &ldquo;Local&rdquo;. Film title matching is best-effort against existing titles.
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

      {/* New Outlet Modal (inline creation) */}
      {showNewOutletModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Add New Outlet</h2>
              <button onClick={() => setShowNewOutletModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Outlet Name *</label>
                <input
                  type="text"
                  value={newOutletName}
                  onChange={(e) => setNewOutletName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outlet Type</label>
                  <select
                    value={newOutletType}
                    onChange={(e) => setNewOutletType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select...</option>
                    {['Print Daily', 'Magazine', 'Print Weekly', 'Online', 'Radio', 'TV', 'Podcast', 'College', 'Trade'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geography</label>
                  <select
                    value={newOutletGeography}
                    onChange={(e) => setNewOutletGeography(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select...</option>
                    {['Local', 'Regional', 'National', 'International'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UVM / Reach</label>
                <input
                  type="text"
                  value={newOutletUvm}
                  onChange={(e) => setNewOutletUvm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional — can fill in later"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewOutletModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOutlet}
                  disabled={!newOutletName.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  Create & Select
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
