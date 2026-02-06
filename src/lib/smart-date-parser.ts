import { createClient } from '@/lib/supabase/client'

/**
 * Get the festival year from Festival Settings
 * Accepts optional currentYear parameter for explicit year context
 * Falls back to localStorage, then current year if not provided
 */
export async function getFestivalYear(currentYear?: number): Promise<string> {
  // Prefer explicit parameter
  if (currentYear !== undefined) {
    return currentYear.toString()
  }

  // Fallback to localStorage (from FestivalYearProvider)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('festival_selected_year')
    if (stored) {
      console.warn('getFestivalYear: using localStorage fallback, consider passing year parameter')
      return stored
    }
  }

  // Last resort: fetch from database (non-archived year)
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('festival_settings')
      .select('year, start_date')
      .eq('is_archived', false)
      .order('year', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      console.warn('No festival year found in settings, using current year')
      return new Date().getFullYear().toString()
    }

    return data.year.toString()
  } catch (error) {
    console.error('Error fetching festival year:', error)
    return new Date().getFullYear().toString()
  }
}

/**
 * Parse various date formats into YYYY-MM-DD format
 * Uses festival year from settings for partial dates
 * NO TIMEZONE HANDLING - pure string manipulation only
 */
export function parseSmartDate(input: string | null | undefined, festivalYear: string): string | null {
  if (!input || input.trim() === '') return null
  
  const trimmed = input.trim()
  
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }
  
  // Handle slash-separated dates (MM/DD, MM/DD/YY, MM/DD/YYYY)
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/')
    
    if (parts.length < 2) {
      console.warn(`Invalid date format: ${trimmed}`)
      return null
    }
    
    const month = (parts[0] || '').padStart(2, '0')
    const day = (parts[1] || '').padStart(2, '0')
    
    // Validate month and day
    const monthNum = parseInt(month)
    const dayNum = parseInt(day)
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
      console.warn(`Invalid date values: ${trimmed}`)
      return null
    }
    
    let year = festivalYear
    
    // Handle year if provided
    if (parts[2]) {
      const yearPart = parts[2].trim()
      if (yearPart.length === 2) {
        // 2-digit year - assume 20XX
        year = '20' + yearPart
      } else if (yearPart.length === 4) {
        // 4-digit year
        year = yearPart
      }
    }
    
    return `${year}-${month}-${day}`
  }
  
  // Handle dash-separated dates that aren't full ISO format
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-')
    
    // MM-DD format
    if (parts.length === 2 && parts[0].length <= 2) {
      const month = parts[0].padStart(2, '0')
      const day = parts[1].padStart(2, '0')
      return `${festivalYear}-${month}-${day}`
    }
    
    // If it doesn't match expected patterns, return as-is (might be valid)
    return trimmed
  }
  
  // Handle natural language month names (e.g., "Oct 16", "October 16")
  const monthNames = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ]
  
  const lowerInput = trimmed.toLowerCase()
  for (let i = 0; i < monthNames.length; i++) {
    if (lowerInput.includes(monthNames[i])) {
      // Extract day number
      const dayMatch = trimmed.match(/\d{1,2}/)
      if (dayMatch) {
        const month = (i + 1).toString().padStart(2, '0')
        const day = dayMatch[0].padStart(2, '0')
        
        // Check if year is included
        const yearMatch = trimmed.match(/\d{4}/)
        const year = yearMatch ? yearMatch[0] : festivalYear
        
        return `${year}-${month}-${day}`
      }
    }
  }
  
  console.warn(`Unable to parse date: ${trimmed}`)
  return null
}

/**
 * Async wrapper that fetches festival year and parses date
 * Use this when you don't already have the festival year
 * @param input - Date string to parse
 * @param currentYear - Optional year for context (defaults to getFestivalYear logic)
 */
export async function parseSmartDateAsync(input: string | null | undefined, currentYear?: number): Promise<string | null> {
  const festivalYear = await getFestivalYear(currentYear)
  return parseSmartDate(input, festivalYear)
}

/**
 * Parse multiple dates at once (useful for CSV import)
 * Fetches festival year once and reuses for all dates
 * @param inputs - Array of date strings to parse
 * @param currentYear - Optional year for context (defaults to getFestivalYear logic)
 */
export async function parseSmartDateBatch(inputs: (string | null | undefined)[], currentYear?: number): Promise<(string | null)[]> {
  const festivalYear = await getFestivalYear(currentYear)
  return inputs.map(input => parseSmartDate(input, festivalYear))
}