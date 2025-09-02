'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { PressCardPopup } from '@/components/cards/press-card-popup'
import { PressCard, SocialMedia } from '@/types'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'
import * as XLSX from 'xlsx-js-style'


export default function PressManagementPage() {
  const { permissions } = useAuth()
  const [press, setPress] = useState<PressCard[]>([])
  const [filteredPress, setFilteredPress] = useState<PressCard[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedAccreditationLevel, setSelectedAccreditationLevel] = useState('')
  const [selectedOutletType, setSelectedOutletType] = useState('')
  const [credentialsFilter, setCredentialsFilter] = useState<'all' | 'picked_up' | 'not_picked_up'>('all')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'name', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [selectedPress, setSelectedPress] = useState<PressCard | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addFormData, setAddFormData] = useState({
    name: '',
    email: '',
    phone: '',
    media_outlet: '',
    secondary_outlets: '',
    outlet_type: '',
    social_media: { twitter: '' },
    rotten_tomatoes_accredited: false,
    critics_groups: '',
    accreditation_level: 'Unassigned'
  })
  
  const supabase = createClient()

  // Check if user has edit permissions for press management
  const canEditPress = permissions?.modulePermissions?.['pressManagement']?.canEdit || permissions?.isAdmin

  // Export template function for Press
  const exportPressTemplate = () => {
    // Define headers with proper display names
    const headerMapping = [
      { field: 'name', display: 'Name' },
      { field: 'email', display: 'Email' },
      { field: 'phone', display: 'Phone' },
      { field: 'media_outlet', display: 'Media Outlet' },
      { field: 'secondary_outlets', display: 'Secondary Outlets' },
      { field: 'website_url', display: 'Website URL' },
      { field: 'secondary_outlet_urls', display: 'Secondary Outlet URLs' },
      { field: 'industry', display: 'Industry' },
      { field: 'twitter', display: 'Twitter' },
      { field: 'instagram', display: 'Instagram' },
      { field: 'bluesky', display: 'Bluesky' },
      { field: 'youtube', display: 'YouTube' },
      { field: 'rotten_tomatoes_accredited', display: 'Rotten Tomatoes Accredited' },
      { field: 'critics_groups', display: 'Critics Groups' },
      { field: 'credential_status', display: 'Credential Status' },
      { field: 'accreditation_level', display: 'Accreditation Level' },
      { field: 'picked_up_credentials', display: 'Picked Up Credentials' },
      { field: 'preferred_contact_method', display: 'Preferred Contact Method' },
      { field: 'special_requirements', display: 'Special Requirements' },
      { field: 'internal_notes', display: 'Internal Notes' }
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
    
    XLSX.utils.book_append_sheet(wb, ws, 'Press Template')
    XLSX.writeFile(wb, 'press_import_template.xlsx')
  }

  const loadPress = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('press')
        .select('*')
        .order('name')
      
      if (error) {
        console.error('Error loading press cards:', error)
      } else {
        setPress(data || [])
        setFilteredPress(data || [])
      }
    } catch (error) {
      console.error('Error loading press cards:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Get unique values for filters
  const uniqueAccreditationLevels = useMemo(() => {
    const levels = new Set<string>()
    press.forEach(p => {
      if (p.accreditation_level) levels.add(p.accreditation_level)
    })
    return Array.from(levels).sort()
  }, [press])

  const uniqueOutletTypes = useMemo(() => {
    const types = new Set<string>()
    press.forEach(p => {
      if (p.outlet_type) {
        // Handle comma-separated outlet types
        p.outlet_type.split(',').forEach(type => {
          const cleanType = type.trim()
          if (cleanType) types.add(cleanType)
        })
      }
    })
    return Array.from(types).sort()
  }, [press])

  // Get credentials pickup counts
  const credentialsCounts = useMemo(() => {
    const pickedUp = press.filter(p => p.picked_up_credentials).length
    const total = press.length
    return { pickedUp, total }
  }, [press])

  // Normalize text for sorting
  const normalizeForSort = (text: string | undefined, field?: string): string => {
    if (!text) return ''
    
    // For names, extract last name for sorting
    if (field === 'name') {
      const nameParts = text.trim().split(/\s+/)
      const lastName = nameParts[nameParts.length - 1] || ''
      return lastName.toLowerCase().replace(/[^a-z0-9]/g, '')
    }
    
    // For outlets, remove articles and special characters
    return text
      .toLowerCase()
      .replace(/^(the|a|an)\s+/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
  }

  // Search functionality
  const generateSearchSuggestions = (term: string) => {
    if (term.length < 2) return []
    
    const suggestions = new Set<string>()
    const searchLower = term.toLowerCase()
    
    press.forEach(p => {
      // Search in names
      if (p.name?.toLowerCase().includes(searchLower)) {
        suggestions.add(p.name)
      }
      
      // Search in media outlets
      if (p.media_outlet?.toLowerCase().includes(searchLower)) {
        suggestions.add(p.media_outlet)
      }

      // Search in email
      if (p.email?.toLowerCase().includes(searchLower)) {
        suggestions.add(p.email)
      }
    })
    
    return Array.from(suggestions).slice(0, 10)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (term.length >= 2) {
      const suggestions = generateSearchSuggestions(term)
      setSearchSuggestions(suggestions)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  // Filtering and sorting
  const applyFiltersAndSort = useMemo(() => {
    const filtered = press.filter(p => {
      // Search filter (accent-insensitive)
      if (searchTerm) {
        const searchableFields = [p.name, p.email, p.media_outlet, p.phone]
        const accentInsensitiveFilter = createAccentInsensitiveFilter(
          searchTerm,
          () => searchableFields
        )
        
        if (!accentInsensitiveFilter(p)) return false
      }
      
      // Accreditation level filter
      if (selectedAccreditationLevel && p.accreditation_level !== selectedAccreditationLevel) {
        return false
      }
      
      // Outlet type filter
      if (selectedOutletType) {
        const hasType = p.outlet_type && p.outlet_type.split(',').some(type => type.trim() === selectedOutletType)
        if (!hasType) return false
      }
      
      // Credentials filter
      if (credentialsFilter === 'picked_up' && !p.picked_up_credentials) {
        return false
      }
      if (credentialsFilter === 'not_picked_up' && p.picked_up_credentials) {
        return false
      }
      
      return true
    })

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof PressCard]
        const bVal = b[sortConfig.key as keyof PressCard]
        
        const aNorm = normalizeForSort(aVal?.toString(), sortConfig.key)
        const bNorm = normalizeForSort(bVal?.toString(), sortConfig.key)
        
        if (aNorm < bNorm) return sortConfig.direction === 'asc' ? -1 : 1
        if (aNorm > bNorm) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [press, searchTerm, selectedAccreditationLevel, selectedOutletType, credentialsFilter, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  useEffect(() => {
    setFilteredPress(applyFiltersAndSort)
  }, [applyFiltersAndSort])

  // Phone number formatting helper
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return ''
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '')
    
    // Handle US numbers (10 or 11 digits)
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    } else if (digits.length === 11 && digits.startsWith('1')) {
      const tenDigits = digits.slice(1)
      return `${tenDigits.slice(0, 3)}-${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`
    }
    
    // For international numbers or non-standard formats, clean up spacing but preserve structure
    return phone.replace(/\s+/g, ' ').replace(/[()]/g, '').replace(/\./g, '-').trim()
  }


  // Get row styling based on accreditation level
  const getRowStyling = (accreditationLevel: string) => {
    switch (accreditationLevel) {
      case 'P':
        return 'bg-purple-50 hover:bg-purple-100'
      case 'G':
        return 'bg-green-50 hover:bg-green-100'
      default:
        return 'hover:bg-gray-50'
    }
  }

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = []
    let currentRow: string[] = []
    let currentField = ''
    let inQuotes = false
    let i = 0

    while (i < text.length) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"'
          i += 2
          continue
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        currentRow.push(currentField.trim())
        currentField = ''
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        // Row separator
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField.trim())
          if (currentRow.some(field => field.length > 0)) {
            rows.push(currentRow)
          }
          currentRow = []
          currentField = ''
        }
        // Skip \r\n combinations
        if (char === '\r' && nextChar === '\n') {
          i++
        }
      } else {
        currentField += char
      }
      i++
    }

    // Add final field/row
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim())
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow)
      }
    }

    return rows
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadStatus('Processing CSV...')

    try {
      const text = await file.text()
      const rows = parseCSV(text)
      
      if (rows.length === 0) {
        setUploadStatus('Error: CSV file is empty')
        return
      }

      const headers = rows[0]
      
      // Clean field mapping - only fields we want to keep
      const fieldMap: Record<string, string> = {
        // Name fields (combine First + Last into name)
        'First Name': 'first_name',
        'Last Name': 'last_name',
        'Name': 'name', // The final Name column in CSV
        
        // Contact info
        'Email Address': 'email',
        'Cell Phone': 'phone',
        'Office Phone': 'office_phone', // Fallback for phone
        
        // Outlets - EXACT match from debug logs
        'Primary Outlet': 'media_outlet', // This was working in debug logs
        'Additional Outlets (if applicable)': 'secondary_outlet_1',
        'Primary Outlet Type (check all that apply)': 'outlet_type',
        
        // Future-ready for outlet URLs (when available)
        'Primary Outlet URL': 'website_url',
        'Secondary Outlet URL 1': 'secondary_outlet_url_1',
        'Secondary Outlet URL 2': 'secondary_outlet_url_2',
        'Secondary Outlet URL 3': 'secondary_outlet_url_3',
        'Secondary Outlet URL 4': 'secondary_outlet_url_4',
        
        // Social media
        'Twitter Handle': 'twitter',
        
        // Professional credentials
        'Are you an accredited Rotten Tomatoes critic?': 'rotten_tomatoes_accredited',
        'If you are a member of a Film Critics organization, please specify all memberships.': 'critics_groups',
        
        // Accreditation from form
        'Accreditation:': 'accreditation_raw'
      }

      // Debug: Log the headers and mapping results
      console.log('CSV Headers:', headers)
      console.log('=== FIELD MAPPING ANALYSIS ===')
      headers.forEach(header => {
        const cleanHeader = header.trim()
        const dbField = fieldMap[cleanHeader]
        console.log(`"${cleanHeader}" -> ${dbField ? `"${dbField}"` : 'UNMAPPED'}`)
      })
      console.log('=== END MAPPING ANALYSIS ===')

      const pressToInsert = []
      
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i]
        const pressData: Partial<PressCard> = {}
        let firstName = ''
        let lastName = ''
        const socialMedia: SocialMedia = {}
        const secondaryOutlets: string[] = []
        const secondaryOutletUrls: string[] = []
        
        headers.forEach((header, index) => {
          const cleanHeader = header.trim()
          const dbField = fieldMap[cleanHeader]
          
          // Remove fallback - use exact mapping only
          
          // Debug: log field mappings for first row
          if (i === 1) {
            console.log(`Header: "${cleanHeader}" -> Field: "${dbField || 'UNMAPPED'}" -> Value: "${values[index] || 'EMPTY'}"`)
          }
          
          // Special debug for Primary Outlet
          if (cleanHeader.includes('Primary Outlet') && i === 1) {
            console.log(`🔥 PRIMARY OUTLET DEBUG: Header="${cleanHeader}", Mapped to="${dbField}", Value="${values[index]}"`)
          }
          
          if (dbField && values[index]) {
            const value = values[index].trim()
            
            // Handle name combination
            if (dbField === 'first_name') {
              firstName = value
            } else if (dbField === 'last_name') {
              lastName = value
            } else if (dbField === 'name') {
              pressData.name = value
            }
            // Handle accreditation parsing from "Accredited - G" format
            else if (dbField === 'accreditation_raw') {
              if (value.includes('Accredited - G')) {
                pressData.accreditation_level = 'G'
              } else if (value.includes('Accredited - P')) {
                pressData.accreditation_level = 'P'
              } else {
                pressData.accreditation_level = 'Unassigned'
              }
            }
            // Handle social media fields
            else if (dbField === 'twitter') {
              if (value) {
                socialMedia.twitter = value
              }
            }
            // Handle secondary outlets - collect them into arrays
            else if (dbField === 'secondary_outlet_1') {
              if (value) secondaryOutlets.push(value)
            }
            else if (dbField.startsWith('secondary_outlet_url_')) {
              if (value) secondaryOutletUrls.push(value)
            }
            // Convert boolean fields
            else if (dbField === 'picked_up_credentials') {
              pressData[dbField] = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' || value === '1'
            }
            else if (dbField === 'rotten_tomatoes_accredited') {
              pressData[dbField] = value.toLowerCase() === 'yes'
            }
            // Handle phone fields - prefer cell phone and format
            else if (dbField === 'phone') {
              pressData.phone = formatPhoneNumber(value)
            } else if (dbField === 'office_phone' && !pressData.phone) {
              pressData.phone = formatPhoneNumber(value)
            } else if (value) {
              // ONLY save these exact fields - reject everything else
              const allowedFields = [
                'email', 'phone', 'media_outlet', 'secondary_outlet_1', 
                'outlet_type', 'rotten_tomatoes_accredited', 'critics_groups'
              ]
              
              if (allowedFields.includes(dbField)) {
                (pressData as Record<string, string | boolean>)[dbField] = value
              }
            }
          }
        })
        
        // Combine first and last name if they exist and no combined name was provided
        if (firstName && lastName && !pressData.name) {
          pressData.name = `${firstName} ${lastName}`.trim()
        } else if (firstName && !lastName && !pressData.name) {
          pressData.name = firstName
        }
        
        // Add social media JSON if any social media fields were found
        if (Object.keys(socialMedia).length > 0) {
          pressData.social_media = socialMedia
        }
        
        // Combine secondary outlets into comma-separated strings
        if (secondaryOutlets.length > 0) {
          pressData.secondary_outlets = secondaryOutlets.join(', ')
        }
        if (secondaryOutletUrls.length > 0) {
          pressData.secondary_outlet_urls = secondaryOutletUrls.join(', ')
        }
        
        // Only add if we have a name and primary outlet
        if (pressData.name && pressData.media_outlet) {
          // Debug first record
          if (pressToInsert.length === 0) {
            console.log('First processed press record:', pressData)
            console.log('Field mappings that worked:', Object.keys(pressData))
          }
          pressToInsert.push(pressData)
        } else {
          console.log('Skipped record - missing name or outlet:', { 
            name: pressData.name, 
            outlet: pressData.media_outlet,
            firstName: firstName,
            lastName: lastName,
            allData: pressData 
          })
        }
      }

      setUploadStatus(`Processing ${pressToInsert.length} press cards...`)

      // Get existing cards
      const { data: existingCards, error: fetchError } = await supabase
        .from('press')
        .select('*')
      
      if (fetchError) {
        setUploadStatus(`Error loading existing cards: ${fetchError.message}`)
        return
      }
      
      let created = 0
      let updated = 0
      
      for (const pressData of pressToInsert) {
        if (!pressData.name) continue
        
        // Check if Card with this exact name already exists
        const existingCard = (existingCards || []).find(card => card.name === pressData.name)
        
        if (existingCard) {
          // UPDATE existing Card - newest data takes priority
          const { error } = await supabase
            .from('press')
            .update({ ...pressData, updated_at: new Date().toISOString() })
            .eq('id', existingCard.id)
          
          if (!error) updated++
        } else {
          // CREATE new Card
          const { error } = await supabase
            .from('press')
            .insert([pressData])
          
          if (!error) created++
        }
      }

      setUploadStatus(`Successfully processed ${pressToInsert.length} press cards! Created: ${created}, Updated: ${updated}`)
      await loadPress() // Reload the Cards
    } catch (error) {
      console.error('CSV processing error:', error)
      setUploadStatus(`Error processing CSV: ${error}`)
    } finally {
      setUploading(false)
      // Clear the file input
      event.target.value = ''
    }
  }

  const handleCredentialPickupToggle = async (pressId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('press')
        .update({ 
          picked_up_credentials: !currentValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', pressId)
      
      if (!error) {
        // Update local state
        setPress(prev => prev.map(p => 
          p.id === pressId 
            ? { ...p, picked_up_credentials: !currentValue }
            : p
        ))
      }
    } catch (error) {
      console.error('Error updating credential pickup:', error)
    }
  }

  const handleAddJournalist = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!addFormData.name || !addFormData.email || !addFormData.media_outlet) {
      alert('Please fill in required fields: Name, Email, and Primary Outlet')
      return
    }
    
    try {
      const journalistData = {
        name: addFormData.name.trim(),
        email: addFormData.email.trim(),
        phone: formatPhoneNumber(addFormData.phone),
        media_outlet: addFormData.media_outlet.trim(),
        secondary_outlets: addFormData.secondary_outlets.trim() || null,
        outlet_type: addFormData.outlet_type || null,
        social_media: addFormData.social_media.twitter ? { twitter: addFormData.social_media.twitter } : null,
        rotten_tomatoes_accredited: addFormData.rotten_tomatoes_accredited,
        critics_groups: addFormData.critics_groups.trim() || null,
        accreditation_level: addFormData.accreditation_level,
        picked_up_credentials: false
      }
      
      const { error } = await supabase
        .from('press')
        .insert([journalistData])
      
      if (error) {
        console.error('Error adding journalist:', error)
        alert('Error adding journalist. Please try again.')
      } else {
        setShowAddModal(false)
        setAddFormData({
          name: '',
          email: '',
          phone: '',
          media_outlet: '',
          secondary_outlets: '',
          outlet_type: '',
          social_media: { twitter: '' },
          rotten_tomatoes_accredited: false,
          critics_groups: '',
          accreditation_level: 'Unassigned'
        })
        await loadPress() // Reload the list
      }
    } catch (error) {
      console.error('Error adding journalist:', error)
      alert('Error adding journalist. Please try again.')
    }
  }

  useEffect(() => {
    loadPress()
  }, [loadPress])
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">📰 Press</h1>
            <p className="text-sm text-gray-600 mt-1">{filteredPress.length} of {press.length} press cards</p>
          </div>
          <div className="flex items-center space-x-4">
            {canEditPress && (
              <button
                onClick={exportPressTemplate}
                className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
              >
                📄 Create Press Template
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              ➕ Add Journalist
            </button>
            <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer transition-colors">
              {uploading ? 'Uploading...' : '📂 Upload CSV'}
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="mt-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search press, outlets, emails..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchTerm(suggestion)
                      setShowSuggestions(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-4">
            {/* Accreditation Level Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Accreditation:</label>
              <select
                value={selectedAccreditationLevel}
                onChange={(e) => setSelectedAccreditationLevel(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Levels</option>
                {uniqueAccreditationLevels.map(level => (
                  <option key={level} value={level}>
                    {level === 'P' ? 'Premium (P)' : level === 'G' ? 'General (G)' : level}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Outlet Type Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Type:</label>
              <select
                value={selectedOutletType}
                onChange={(e) => setSelectedOutletType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                {uniqueOutletTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            {/* Credentials Filter */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (credentialsFilter === 'all') {
                    setCredentialsFilter('picked_up')
                  } else if (credentialsFilter === 'picked_up') {
                    setCredentialsFilter('not_picked_up')
                  } else {
                    setCredentialsFilter('all')
                  }
                }}
                className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                  credentialsFilter === 'all' 
                    ? 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    : credentialsFilter === 'picked_up'
                    ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
                    : 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200'
                }`}
              >
                {credentialsFilter === 'all' && `Picked Up Credentials (${credentialsCounts.pickedUp}/${credentialsCounts.total})`}
                {credentialsFilter === 'picked_up' && `Picked Up (${credentialsCounts.pickedUp})`}
                {credentialsFilter === 'not_picked_up' && `Not Picked Up (${credentialsCounts.total - credentialsCounts.pickedUp})`}
              </button>
            </div>
            
            {/* Clear Filters */}
            {(searchTerm || selectedAccreditationLevel || selectedOutletType || credentialsFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedAccreditationLevel('')
                  setSelectedOutletType('')
                  setCredentialsFilter('all')
                  setShowSuggestions(false)
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
        {uploadStatus && (
          <div className={`mt-3 p-3 rounded-md ${
            uploadStatus.includes('Error') 
              ? 'bg-red-100 text-red-700 border border-red-200'
              : uploadStatus.includes('Successfully')
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {uploadStatus}
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading press...</p>
            </div>
          </div>
        ) : press.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h2 className="text-lg font-medium mb-4">No Press Cards Yet</h2>
            <p className="text-gray-600 mb-4">Upload a CSV file to add press to the database.</p>
            <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md cursor-pointer transition-colors inline-block">
              📂 Upload CSV File
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {[
                      { key: 'picked_up_credentials', label: 'Credentials', width: 100 },
                      { key: 'name', label: 'Name', width: 200 },
                      { key: 'email', label: 'Email', width: 200 },
                      { key: 'phone', label: 'Phone', width: 150 },
                      { key: 'media_outlet', label: 'Primary Outlet', width: 200 },
                      { key: 'secondary_outlets', label: 'Secondary Outlets', width: 250 },
                      { key: 'outlet_type', label: 'Outlet Type', width: 150 },
                      { key: 'social_media', label: 'Social Media', width: 200 },
                      { key: 'rotten_tomatoes_accredited', label: 'RT Accredited', width: 120 },
                      { key: 'critics_groups', label: 'Critics Groups', width: 200 },
                      { key: 'accreditation_level', label: 'Level', width: 80 }
                    ].map((column) => (
                      <th
                        key={column.key}
                        className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50"
                        style={{ minWidth: `${columnWidths[column.key] || column.width}px` }}
                      >
                        <div className="flex items-center justify-between">
                          {column.key !== 'picked_up_credentials' ? (
                            <button
                              onClick={() => handleSort(column.key)}
                              className="flex items-center space-x-1 hover:text-gray-700"
                            >
                              <span>{column.label}</span>
                              {sortConfig?.key === column.key && (
                                <span className="text-blue-600">
                                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </button>
                          ) : (
                            <span>{column.label}</span>
                          )}
                        </div>
                        {/* Resize Handle */}
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
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
                  {filteredPress.map((pressCard) => (
                    <tr key={pressCard.id} className={getRowStyling(pressCard.accreditation_level)}>
                      <td className="px-3 py-2 text-sm border-r border-gray-100" style={{ minWidth: `${columnWidths['picked_up_credentials'] || 100}px` }}>
                        <input
                          type="checkbox"
                          checked={pressCard.picked_up_credentials}
                          onChange={() => handleCredentialPickupToggle(pressCard.id, pressCard.picked_up_credentials)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td 
                        className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 cursor-pointer hover:bg-blue-50" 
                        style={{ minWidth: `${columnWidths['name'] || 200}px` }}
                        onClick={() => setSelectedPress(pressCard)}
                      >
                        <span className="text-blue-600 hover:text-blue-800 hover:underline">
                          {pressCard.name}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['email'] || 200}px` }}>{pressCard.email}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['phone'] || 150}px` }}>{pressCard.phone}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['media_outlet'] || 200}px` }}>{pressCard.media_outlet}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['secondary_outlets'] || 250}px` }}>{pressCard.secondary_outlets}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['outlet_type'] || 150}px` }}>{pressCard.outlet_type}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['social_media'] || 200}px` }}>
                        {pressCard.social_media && Object.keys(pressCard.social_media).length > 0 && (
                          <div className="space-y-1">
                            {Object.entries(pressCard.social_media).map(([platform, handle]) => (
                              <div key={platform} className="text-xs">
                                <span className="font-medium">{platform}:</span> {handle}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['rotten_tomatoes_accredited'] || 120}px` }}>
                        {pressCard.rotten_tomatoes_accredited && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            RT Accredited
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['critics_groups'] || 200}px` }}>{pressCard.critics_groups}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['accreditation_level'] || 80}px` }}>
                        {pressCard.accreditation_level && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            pressCard.accreditation_level === 'P' 
                              ? 'bg-purple-100 text-purple-800'
                              : pressCard.accreditation_level === 'G'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {pressCard.accreditation_level === 'P' ? 'Premium' : pressCard.accreditation_level === 'G' ? 'General' : pressCard.accreditation_level}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Add Journalist Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add New Journalist</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddJournalist} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={addFormData.email}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={addFormData.phone}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Outlet *</label>
                  <input
                    type="text"
                    value={addFormData.media_outlet}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, media_outlet: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outlet Type</label>
                  <select
                    value={addFormData.outlet_type}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, outlet_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="Print/Online">Print/Online</option>
                    <option value="Magazine">Magazine</option>
                    <option value="TV">TV</option>
                    <option value="Radio">Radio</option>
                    <option value="College">College</option>
                    <option value="Trade">Trade</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accreditation Level</label>
                  <select
                    value={addFormData.accreditation_level}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, accreditation_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Unassigned">Unassigned</option>
                    <option value="P">Premium (P)</option>
                    <option value="G">General (G)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Outlets</label>
                <textarea
                  value={addFormData.secondary_outlets}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, secondary_outlets: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Comma-separated list of additional outlets"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Twitter Handle</label>
                <input
                  type="text"
                  value={addFormData.social_media.twitter}
                  onChange={(e) => setAddFormData(prev => ({ 
                    ...prev, 
                    social_media: { ...prev.social_media, twitter: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="@username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Critics Groups</label>
                <input
                  type="text"
                  value={addFormData.critics_groups}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, critics_groups: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Film critics organizations"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rt-accredited"
                  checked={addFormData.rotten_tomatoes_accredited}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, rotten_tomatoes_accredited: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="rt-accredited" className="ml-2 text-sm text-gray-700">
                  Rotten Tomatoes Accredited
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Add Journalist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Press Card Popup */}
      {selectedPress && (
        <PressCardPopup
          press={selectedPress}
          onClose={() => setSelectedPress(null)}
          onUpdate={(updatedPress) => {
            setPress(prev => prev.map(p => 
              p.id === updatedPress.id ? updatedPress : p
            ))
          }}
          onDelete={(pressId) => {
            setPress(prev => prev.filter(p => p.id !== pressId))
            setSelectedPress(null)
          }}
        />
      )}
    </div>
  )
}