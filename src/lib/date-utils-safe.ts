// TIMEZONE-SAFE DATE UTILITIES
// NEVER use new Date(dateString) - only manual parsing to prevent timezone shifts

import { getFestivalYear } from './festival-context'

export interface DateComponents {
  year: number
  month: number
  day: number
}

// Parse date string into components without timezone conversion
export function parseDateSafe(dateString: string): DateComponents {
  if (!dateString) throw new Error('Invalid date string')
  
  // Handle YYYY-MM-DD format
  if (dateString.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number)
    return { year, month, day }
  }
  
  // Handle MM/DD/YYYY format
  if (dateString.includes('/')) {
    const parts = dateString.split('/')
    const month = parseInt(parts[0])
    const day = parseInt(parts[1])
    const year = parts.length > 2 ? parseInt(parts[2]) : 2024
    return { year, month, day }
  }
  
  throw new Error(`Unsupported date format: ${dateString}`)
}

// Parse date string with festival year context for ambiguous formats
export async function parseDateSafeWithContext(dateString: string): Promise<DateComponents> {
  if (!dateString) throw new Error('Invalid date string')
  
  // Handle YYYY-MM-DD format (already has year)
  if (dateString.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number)
    return { year, month, day }
  }
  
  // Handle MM/DD/YYYY format (already has year)
  if (dateString.includes('/') && dateString.split('/').length === 3) {
    const parts = dateString.split('/')
    const month = parseInt(parts[0])
    const day = parseInt(parts[1])
    const year = parseInt(parts[2])
    return { year, month, day }
  }
  
  // Handle MM/DD format (missing year - use festival year)
  if (dateString.includes('/') && dateString.split('/').length === 2) {
    const parts = dateString.split('/')
    const month = parseInt(parts[0])
    const day = parseInt(parts[1])
    const year = await getFestivalYear()
    return { year, month, day }
  }
  
  // Handle "Oct. 16" format (missing year - use festival year)
  if (dateString.match(/^[A-Za-z]{3}\.?\s+\d{1,2}$/)) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const parts = dateString.toLowerCase().replace('.', '').split(/\s+/)
    const monthName = parts[0]
    const day = parseInt(parts[1])
    const monthIndex = monthNames.indexOf(monthName)
    
    if (monthIndex === -1) {
      throw new Error(`Unknown month: ${monthName}`)
    }
    
    const month = monthIndex + 1
    const year = await getFestivalYear()
    return { year, month, day }
  }
  
  throw new Error(`Unsupported date format: ${dateString}`)
}

// Convert Excel date number to MM/DD/YYYY format using festival year context
export async function convertExcelDateWithContext(excelDateNumber: number): Promise<string> {
  const festivalYear = await getFestivalYear()
  
  // Excel date calculation: 1 = January 1, 1900
  // But Excel incorrectly treats 1900 as a leap year, so we need to account for that
  const excelEpoch = new Date(1900, 0, 1) // January 1, 1900
  let daysSinceEpoch = excelDateNumber - 1
  
  // Account for Excel's leap year bug (Feb 29, 1900 doesn't exist but Excel thinks it does)
  if (excelDateNumber >= 60) {
    daysSinceEpoch -= 1
  }
  
  // Create date in UTC to avoid timezone issues
  const resultDate = new Date(1900, 0, 1)
  resultDate.setUTCDate(resultDate.getUTCDate() + daysSinceEpoch)
  
  const month = resultDate.getUTCMonth() + 1
  const day = resultDate.getUTCDate() + 1
  const calculatedYear = resultDate.getUTCFullYear()
  
  // If the calculated year is close to the festival year, use festival year
  // This handles cases where Excel dates might be slightly off
  const yearDiff = Math.abs(calculatedYear - festivalYear)
  const finalYear = yearDiff <= 1 ? festivalYear : calculatedYear
  
  return `${month}/${day}/${finalYear}`
}

// Format date components to YYYY-MM-DD string
export function formatDateSafe(components: DateComponents): string {
  const { year, month, day } = components
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Parse and format in one step
export function normalizeDateSafe(dateString: string): string {
  const components = parseDateSafe(dateString)
  
  // Validate year range
  if (components.year < 2020 || components.year > 2030) {
    components.year = 2024
  }
  
  return formatDateSafe(components)
}

// Format for display (e.g., "Oct. 17")
export function formatDateDisplay(dateString: string): string {
  try {
    const components = parseDateSafe(dateString)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[components.month - 1]}. ${components.day}`
  } catch {
    return dateString || '—'
  }
}

// Get day of week using Zeller's congruence algorithm (no JavaScript Date object)
export function getDayOfWeekSafe(dateString: string): string {
  try {
    const components = parseDateSafe(dateString)
    
    // Manual day of week calculation using Zeller's congruence
    let { year, month, day } = components
    
    // Adjust for Zeller's algorithm (Jan/Feb are months 13/14 of previous year)
    if (month < 3) {
      month += 12
      year -= 1
    }
    
    // Zeller's congruence formula
    const k = year % 100  // year of century
    const j = Math.floor(year / 100)  // century
    
    let h = (day + Math.floor((13 * (month + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
    
    // Handle negative modulo results
    if (h < 0) h += 7
    
    // Convert Zeller's result to day names (0=Saturday, 1=Sunday, etc.)
    const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const dayOfWeek = dayNames[h]
    
    // Debug logging for Oct 16 specifically
    if ((components.year === 2024 && components.month === 10 && components.day === 16) || 
        dateString.includes('Oct. 16') || dateString.includes('10-16') || dateString.includes('10/16')) {
      console.log(`DEBUG getDayOfWeekSafe: input="${dateString}"`)
      console.log(`DEBUG getDayOfWeekSafe: parsed components:`, components)
      console.log(`DEBUG getDayOfWeekSafe: Zeller's algorithm: h=${h}, dayOfWeek=${dayOfWeek}`)
      console.log(`DEBUG getDayOfWeekSafe: Should be Wednesday for Oct 16, 2024`)
    }
    
    return dayOfWeek
  } catch (error) {
    console.warn('getDayOfWeekSafe error:', error, 'for input:', dateString)
    return '—'
  }
}

// Format time string to 12-hour format
export function formatTimeSafe(timeString: string): string {
  if (!timeString) return '—'
  
  const [hours, minutes] = timeString.split(':')
  const hour24 = parseInt(hours, 10)
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  return `${hour12}:${minutes} ${ampm}`
}