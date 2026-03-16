// TIMEZONE-SAFE DATE UTILITIES
// NEVER use new Date(dateString) - only manual parsing to prevent timezone shifts

import { getCurrentFestivalSettings } from './festival-context'

async function getFestivalYear(): Promise<number> {
  const settings = await getCurrentFestivalSettings()
  return settings?.year || new Date().getFullYear()
}

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
    const year = parts.length > 2 ? parseInt(parts[2]) : new Date().getFullYear()
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

// Convert Excel date number to MM/DD/YYYY format using pure math (no Date objects)
export async function convertExcelDateWithContext(excelDateNumber: number): Promise<string> {
  const festivalYear = await getFestivalYear()
  
  // Excel epoch: January 1, 1900 is day 1
  // Calculate days since epoch using pure math
  let daysSince1900 = excelDateNumber - 1
  
  // Account for Excel's leap year bug (1900 wasn't a leap year but Excel thinks it was)
  if (excelDateNumber >= 60) {
    daysSince1900 -= 1
  }
  
  // Calculate year using pure math
  let year = 1900
  let remainingDays = daysSince1900
  
  // Add years
  while (remainingDays >= 365) {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
    const daysInYear = isLeapYear ? 366 : 365
    
    if (remainingDays >= daysInYear) {
      remainingDays -= daysInYear
      year++
    } else {
      break
    }
  }
  
  // Calculate month and day using pure math
  const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  
  // Adjust February for leap year
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
  if (isLeapYear) {
    daysInMonths[1] = 29
  }
  
  let month = 1
  let day = remainingDays + 1
  
  for (let i = 0; i < 12; i++) {
    if (day <= daysInMonths[i]) {
      month = i + 1
      break
    }
    day -= daysInMonths[i]
  }
  
  // If calculated year is close to festival year, use festival year
  const yearDiff = Math.abs(year - festivalYear)
  const finalYear = yearDiff <= 1 ? festivalYear : year
  
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
    components.year = new Date().getFullYear()
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
  return `${hour12}:${(minutes || '00').padStart(2, '0')} ${ampm}`
}