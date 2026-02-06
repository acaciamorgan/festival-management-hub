/**
 * Smart date utilities that use Festival Settings as context
 * NO TIMEZONE HANDLING - all dates are treated as strings
 */

import { parseSmartDate, parseSmartDateAsync, getFestivalYear } from './smart-date-parser'

/**
 * Format a date from YYYY-MM-DD to MM/DD/YYYY for display
 * Pure string manipulation, no Date objects
 */
export function formatDateForDisplay(dateString: string | null | undefined): string {
  if (!dateString) return ''
  
  // Handle YYYY-MM-DD format
  if (dateString.includes('-')) {
    const parts = dateString.split('-')
    if (parts.length === 3) {
      const year = parts[0]
      const month = parts[1]
      const day = parts[2]
      return `${month}/${day}/${year}`
    }
  }
  
  // Return as-is if not in expected format
  return dateString
}

/**
 * Format a date from YYYY-MM-DD to MM/DD for short display
 * Pure string manipulation, no Date objects
 */
export function formatDateForShortDisplay(dateString: string | null | undefined): string {
  if (!dateString) return ''
  
  // Handle YYYY-MM-DD format
  if (dateString.includes('-')) {
    const parts = dateString.split('-')
    if (parts.length === 3) {
      const month = parseInt(parts[1]).toString() // Remove leading zero
      const day = parseInt(parts[2]).toString()   // Remove leading zero
      return `${month}/${day}`
    }
  }
  
  // Return as-is if not in expected format
  return dateString
}

/**
 * Parse any date input into YYYY-MM-DD format using festival context
 * This is the main function to use throughout the application
 * @param input - Date string to parse
 * @param currentYear - Optional year for context (defaults to getFestivalYear logic)
 */
export async function parseDate(input: string | null | undefined, currentYear?: number): Promise<string | null> {
  return parseSmartDateAsync(input, currentYear)
}

/**
 * Parse date synchronously if festival year is already known
 * Use this in components that already have the festival year
 */
export function parseDateSync(input: string | null | undefined, festivalYear: string): string | null {
  return parseSmartDate(input, festivalYear)
}

/**
 * Validate that a date string is in YYYY-MM-DD format
 */
export function isValidDateFormat(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString)
}

/**
 * Compare two date strings (YYYY-MM-DD format)
 * Returns: -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDates(date1: string | null, date2: string | null): number {
  if (!date1 && !date2) return 0
  if (!date1) return -1
  if (!date2) return 1
  
  // Simple string comparison works for YYYY-MM-DD format
  if (date1 < date2) return -1
  if (date1 > date2) return 1
  return 0
}

/**
 * Check if a date falls within the festival dates
 * @param dateString - Date in YYYY-MM-DD format
 * @param currentYear - Festival year to check against (required)
 */
export async function isWithinFestivalDates(dateString: string | null, currentYear: number): Promise<boolean> {
  if (!dateString) return false

  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    const { data, error } = await supabase
      .from('festival_settings')
      .select('start_date, end_date')
      .eq('year', currentYear)
      .single()

    if (error || !data || !data.start_date || !data.end_date) {
      return true // If no festival dates set, consider all dates valid
    }

    return dateString >= data.start_date && dateString <= data.end_date
  } catch (error) {
    console.error('Error checking festival dates:', error)
    return true
  }
}

// Re-export the core functions for convenience
export { parseSmartDate, parseSmartDateAsync, getFestivalYear }