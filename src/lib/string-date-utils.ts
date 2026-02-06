// STRING-ONLY DATE UTILITIES
// NO JavaScript Date objects - pure string manipulation only

import { getFestivalYear as getFestivalYearString } from './smart-date-parser'

// Helper to get festival year as a number
async function getFestivalYear(): Promise<number> {
  const yearString = await getFestivalYearString()
  return parseInt(yearString, 10)
}

export interface DateComponents {
  year: number
  month: number
  day: number
}

// Parse date string to components using string operations only
export function parseStringDate(dateString: string): DateComponents {
  if (!dateString) throw new Error('Invalid date string')
  
  // Handle YYYY-MM-DD format
  if (dateString.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number)
    return { year, month, day }
  }
  
  // Handle MM/DD/YYYY format
  if (dateString.includes('/') && dateString.split('/').length === 3) {
    const parts = dateString.split('/')
    const month = parseInt(parts[0])
    const day = parseInt(parts[1])
    const year = parseInt(parts[2])
    return { year, month, day }
  }
  
  throw new Error(`Unsupported date format: ${dateString}`)
}

// Parse date with festival year context for ambiguous formats
export async function parseStringDateWithContext(dateString: string): Promise<DateComponents> {
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

// Format date components to YYYY-MM-DD string
export function formatStringDate(components: DateComponents): string {
  const { year, month, day } = components
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Format for display (e.g., "Oct. 17")
export function formatStringDateDisplay(dateString: string): string {
  try {
    const components = parseStringDate(dateString)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[components.month - 1]}. ${components.day}`
  } catch {
    return dateString || '—'
  }
}

// Get day of week using mathematical calculation (Zeller's congruence)
export function getStringDayOfWeek(dateString: string): string {
  try {
    const components = parseStringDate(dateString)
    
    // Zeller's congruence algorithm
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
    return dayNames[h]
  } catch {
    return '—'
  }
}

// Format time string to 12-hour format using string manipulation
export function formatStringTime(timeString: string): string {
  if (!timeString) return '—'
  
  // Handle already formatted time (e.g., "6:30 PM")
  if (timeString.includes('AM') || timeString.includes('PM')) {
    return timeString
  }
  
  // Handle 24-hour format (e.g., "18:30")
  if (timeString.includes(':')) {
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${ampm}`
  }
  
  return timeString
}

// Get current timestamp as string for database operations using pure math
export function getCurrentTimestamp(): string {
  // Return a static timestamp format to avoid timezone conversions
  // This should be used minimally - prefer user-entered dates
  const now = Date.now()
  const year = Math.floor(now / (1000 * 60 * 60 * 24 * 365.25)) + 1970
  const remainingMs = now % (1000 * 60 * 60 * 24 * 365.25)
  const dayOfYear = Math.floor(remainingMs / (1000 * 60 * 60 * 24))
  
  // Simple approximation for database use only
  return `${year}-01-01T00:00:00.000Z`
}

// Convert Excel date number to MM/DD/YYYY using pure math
export async function convertExcelToStringDate(excelNumber: number): Promise<string> {
  const festivalYear = await getFestivalYear()
  
  // Excel epoch: January 1, 1900 is day 1
  // Calculate days since epoch using pure math
  let daysSince1900 = excelNumber - 1
  
  // Account for Excel's leap year bug (1900 wasn't a leap year but Excel thinks it was)
  if (excelNumber >= 60) {
    daysSince1900 -= 1
  }
  
  // Calculate year using approximation
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
  
  // Calculate month and day
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
  
  // If calculated year is far from festival year, use festival year
  const yearDiff = Math.abs(year - festivalYear)
  const finalYear = yearDiff > 10 ? festivalYear : year
  
  return `${month}/${day}/${finalYear}`
}