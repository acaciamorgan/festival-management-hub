// Date utility functions for handling 2-digit year conversion

/**
 * Normalizes date input to handle 2-digit years
 * Converts MM/DD/YY format to YYYY-MM-DD format for database storage
 * @param dateValue - Input date string
 * @returns Normalized date string in YYYY-MM-DD format
 */
export const normalizeDateValue = (dateValue: string): string => {
  if (!dateValue) return dateValue
  
  // Check if it's in MM/DD/YY or similar format
  const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/
  const match = dateValue.match(dateRegex)
  
  if (match) {
    const [, month, day, year] = match
    const fullYear = `20${year}` // Convert YY to 20YY
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  
  return dateValue
}