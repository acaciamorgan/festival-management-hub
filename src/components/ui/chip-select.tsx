'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export interface ChipItem {
  id?: string        // FK to source table (undefined for free-text entries)
  label: string      // Display text
  sublabel?: string  // Secondary text (e.g., outlet, film context)
  type?: string      // Optional type tag (e.g., 'feature', 'short', 'program')
}

export interface ChipSelectSuggestion {
  id: string
  label: string
  sublabel?: string
  type?: string
}

interface ChipSelectProps {
  items: ChipItem[]
  onChange: (items: ChipItem[]) => void
  placeholder?: string
  label?: string
  required?: boolean
  /** Whether to allow free-text entries (items without an ID) */
  allowFreeText?: boolean
  /** Async function to fetch suggestions based on search query */
  onSearch?: (query: string) => Promise<ChipSelectSuggestion[]>
  /** Static list of suggestions (used if onSearch is not provided) */
  suggestions?: ChipSelectSuggestion[]
  /** Minimum characters before showing suggestions */
  minSearchLength?: number
  /** Whether the input is disabled */
  disabled?: boolean
  /** Help text below the input */
  helpText?: string
}

export function ChipSelect({
  items,
  onChange,
  placeholder = 'Search or type...',
  label,
  required = false,
  allowFreeText = false,
  onSearch,
  suggestions: staticSuggestions,
  minSearchLength = 1,
  disabled = false,
  helpText,
}: ChipSelectProps) {
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<ChipSelectSuggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load suggestions when search changes
  useEffect(() => {
    if (search.length < minSearchLength) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    if (onSearch) {
      setLoading(true)
      const timer = setTimeout(async () => {
        try {
          const results = await onSearch(search)
          // Filter out already-selected items
          const filtered = results.filter(
            s => !items.some(item => item.id === s.id && item.id)
          )
          setSuggestions(filtered)
          setShowDropdown(filtered.length > 0)
        } catch {
          setSuggestions([])
        } finally {
          setLoading(false)
        }
      }, 150)
      return () => clearTimeout(timer)
    } else if (staticSuggestions) {
      const lowerSearch = search.toLowerCase()
      const filtered = staticSuggestions.filter(
        s => s.label.toLowerCase().includes(lowerSearch) &&
             !items.some(item => item.id === s.id && item.id)
      )
      setSuggestions(filtered)
      setShowDropdown(filtered.length > 0)
    }
  }, [search, minSearchLength, onSearch, staticSuggestions, items])

  const addItem = useCallback((item: ChipItem) => {
    // Don't add duplicates
    const isDuplicate = items.some(existing =>
      (item.id && existing.id === item.id) ||
      (!item.id && !existing.id && existing.label === item.label)
    )
    if (isDuplicate) return

    onChange([...items, item])
    setSearch('')
    setSuggestions([])
    setShowDropdown(false)
    setHighlightedIndex(-1)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [items, onChange])

  const removeItem = useCallback((index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(newItems)
  }, [items, onChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        const s = suggestions[highlightedIndex]
        addItem({ id: s.id, label: s.label, sublabel: s.sublabel, type: s.type })
      } else if (suggestions.length > 0) {
        const s = suggestions[0]
        addItem({ id: s.id, label: s.label, sublabel: s.sublabel, type: s.type })
      } else if (allowFreeText && search.trim()) {
        addItem({ label: search.trim() })
      }
    } else if (e.key === 'Backspace' && search === '' && items.length > 0) {
      removeItem(items.length - 1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setHighlightedIndex(-1)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
        setHighlightedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Chips display */}
      {items.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={item.id || `free-${index}-${item.label}`}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                item.id
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {item.label}
              {item.sublabel && (
                <span className="text-xs ml-1 opacity-70">({item.sublabel})</span>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className={`ml-2 ${
                    item.id
                      ? 'text-blue-600 hover:text-blue-800'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setHighlightedIndex(-1)
          }}
          onFocus={() => {
            if (search.length >= minSearchLength && suggestions.length > 0) {
              setShowDropdown(true)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          required={required && items.length === 0}
        />

        {/* Dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
          >
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                Loading suggestions...
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => {
                    addItem({
                      id: suggestion.id,
                      label: suggestion.label,
                      sublabel: suggestion.sublabel,
                      type: suggestion.type,
                    })
                  }}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 ${
                    index === highlightedIndex
                      ? 'bg-blue-50 text-blue-900'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{suggestion.label}</div>
                  {suggestion.sublabel && (
                    <div className="text-xs text-gray-500">{suggestion.sublabel}</div>
                  )}
                </button>
              ))
            ) : search.length >= minSearchLength ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {allowFreeText
                  ? 'No matches found. Press Enter to add as free text.'
                  : 'No matches found.'}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {helpText && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  )
}
