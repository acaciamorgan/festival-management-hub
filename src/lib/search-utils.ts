/**
 * Utility functions for accent-insensitive searching
 */

/**
 * Normalizes a string by removing accents and diacritics
 * @param str - The string to normalize
 * @returns Normalized string without accents
 */
export function normalizeString(str: string): string {
  if (!str) return ''
  
  return str
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .toLowerCase()
}

/**
 * Performs accent-insensitive search to check if searchTerm is found in text
 * @param text - The text to search in
 * @param searchTerm - The term to search for
 * @returns true if searchTerm is found in text (accent-insensitive)
 */
export function accentInsensitiveIncludes(text: string, searchTerm: string): boolean {
  if (!text || !searchTerm) return false
  
  const normalizedText = normalizeString(text)
  const normalizedSearchTerm = normalizeString(searchTerm)
  
  return normalizedText.includes(normalizedSearchTerm)
}

/**
 * Performs accent-insensitive search across multiple text fields
 * @param fields - Array of text fields to search in
 * @param searchTerm - The term to search for
 * @returns true if searchTerm is found in any of the fields
 */
export function accentInsensitiveMultiFieldSearch(fields: (string | null | undefined)[], searchTerm: string): boolean {
  if (!searchTerm) return true // No search term means show all
  
  return fields.some(field => {
    if (!field) return false
    return accentInsensitiveIncludes(field, searchTerm)
  })
}

/**
 * Creates a filter function for arrays that performs accent-insensitive search
 * @param searchTerm - The term to search for
 * @param getSearchFields - Function that extracts searchable fields from an item
 * @returns Filter function that can be used with Array.filter()
 */
export function createAccentInsensitiveFilter<T>(
  searchTerm: string,
  getSearchFields: (item: T) => (string | null | undefined)[]
) {
  return (item: T): boolean => {
    const fields = getSearchFields(item)
    return accentInsensitiveMultiFieldSearch(fields, searchTerm)
  }
}