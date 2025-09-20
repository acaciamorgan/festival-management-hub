/**
 * Utility functions for normalizing and matching film/program titles
 * Handles articles (A, An, The) and punctuation for flexible matching
 */

/**
 * Normalizes a title for comparison by:
 * - Converting to lowercase
 * - Removing/standardizing articles (A, An, The)
 * - Removing most punctuation except essential characters
 * - Trimming whitespace
 */
export function normalizeTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    return ''
  }

  let normalized = title.trim().toLowerCase()

  // Handle trailing articles FIRST - convert "title, a/an/the" to just "title"
  normalized = normalized.replace(/,\s*(a|an|the)$/i, '')

  // Remove leading articles - this removes them from the beginning
  normalized = normalized.replace(/^(a|an|the)\s+/i, '')

  // Remove punctuation but keep essential characters
  // Keep: letters, numbers, spaces, hyphens, apostrophes
  // Remove: commas, periods, colons, semicolons, quotes, etc.
  normalized = normalized.replace(/[^\w\s\-']/g, ' ')

  // Normalize multiple spaces to single spaces
  normalized = normalized.replace(/\s+/g, ' ').trim()

  return normalized
}

/**
 * Finds the best matching title from a list of database titles
 * First tries exact match, then normalized match
 */
export function findBestTitleMatch(csvTitle: string, dbTitles: string[]): string | null {
  console.log(`DEBUG findBestTitleMatch: CSV="${csvTitle}", DB=[${dbTitles.join(', ')}]`)

  if (!csvTitle || !dbTitles || dbTitles.length === 0) {
    console.log(`DEBUG: returning null - empty inputs`)
    return null
  }

  // First try exact match (case insensitive)
  const exactMatch = dbTitles.find(dbTitle =>
    dbTitle.toLowerCase().trim() === csvTitle.toLowerCase().trim()
  )
  if (exactMatch) {
    console.log(`DEBUG: exact match found: "${exactMatch}"`)
    return exactMatch
  }

  // Try normalized matching
  const normalizedCsvTitle = normalizeTitle(csvTitle)
  console.log(`DEBUG: normalized CSV: "${normalizedCsvTitle}"`)

  if (!normalizedCsvTitle) {
    console.log(`DEBUG: returning null - empty normalized CSV`)
    return null
  }

  const normalizedMatch = dbTitles.find(dbTitle => {
    const normalizedDbTitle = normalizeTitle(dbTitle)
    console.log(`DEBUG: comparing "${normalizedCsvTitle}" vs "${normalizedDbTitle}" = ${normalizedDbTitle === normalizedCsvTitle}`)
    return normalizedDbTitle === normalizedCsvTitle
  })

  console.log(`DEBUG: final result: ${normalizedMatch ? `"${normalizedMatch}"` : 'null'}`)
  return normalizedMatch || null
}

/**
 * Finds all matching titles from database titles for a list of CSV titles
 * Returns a map of CSV title -> matched database title
 */
export function matchTitles(csvTitles: string[], dbTitles: string[]): Map<string, string> {
  const matches = new Map<string, string>()

  for (const csvTitle of csvTitles) {
    const match = findBestTitleMatch(csvTitle, dbTitles)
    if (match) {
      matches.set(csvTitle, match)
    }
  }

  return matches
}

/**
 * Test cases for the normalization function
 */
export const titleNormalizationTests = [
  // Articles at beginning
  { input: 'A Poet', normalized: 'poet', shouldMatch: ['Poet', 'A Poet'] },
  { input: 'The Great Film', normalized: 'great film', shouldMatch: ['Great Film', 'The Great Film'] },
  { input: 'An Amazing Story', normalized: 'amazing story', shouldMatch: ['Amazing Story', 'An Amazing Story'] },

  // Articles at end
  { input: 'Poet, A', normalized: 'a poet', shouldMatch: ['A Poet', 'Poet, A'] },
  { input: 'Film, The', normalized: 'the film', shouldMatch: ['The Film', 'Film, The'] },

  // Punctuation handling
  { input: 'Wind, Talk to Me', normalized: 'wind talk to me', shouldMatch: ['Wind, Talk to Me', 'Wind Talk to Me'] },
  { input: "Director's Cut", normalized: "directors cut", shouldMatch: ["Director's Cut", "Directors Cut"] },
  { input: 'Film: The Story', normalized: 'film the story', shouldMatch: ['Film The Story', 'Film: The Story'] },

  // Mixed cases
  { input: 'The Wind, Talk to Me', normalized: 'wind talk to me', shouldMatch: ['Wind, Talk to Me', 'Wind Talk to Me'] },
  { input: "A Director's Film, The", normalized: 'the a directors film', shouldMatch: ["The A Director's Film", "A Director's Film, The"] }
]