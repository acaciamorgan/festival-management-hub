// Test the exact problem titles
function normalizeTitle(title) {
  if (!title || typeof title !== 'string') {
    return ''
  }

  let normalized = title.trim().toLowerCase()

  // Handle trailing articles FIRST - convert "title, a/an/the" to just "title"
  // This removes the article from the end completely
  normalized = normalized.replace(/,\s*(a|an|the)$/i, '')

  // Remove leading articles - this removes them from the beginning
  normalized = normalized.replace(/^(a|an|the)\s+/i, '')

  // Now both "The Reckoning" and "Reckoning, The" become just "reckoning"

  // Remove punctuation but keep essential characters
  // Keep: letters, numbers, spaces, hyphens, apostrophes
  // Remove: commas, periods, colons, semicolons, quotes, etc.
  normalized = normalized.replace(/[^\w\s\-']/g, ' ')

  // Normalize multiple spaces to single spaces
  normalized = normalized.replace(/\s+/g, ' ').trim()

  return normalized
}

function findBestTitleMatch(csvTitle, dbTitles) {
  if (!csvTitle || !dbTitles || dbTitles.length === 0) {
    return null
  }

  // First try exact match (case insensitive)
  const exactMatch = dbTitles.find(dbTitle =>
    dbTitle.toLowerCase().trim() === csvTitle.toLowerCase().trim()
  )
  if (exactMatch) {
    return exactMatch
  }

  // Try normalized matching
  const normalizedCsvTitle = normalizeTitle(csvTitle)
  if (!normalizedCsvTitle) {
    return null
  }

  const normalizedMatch = dbTitles.find(dbTitle => {
    const normalizedDbTitle = normalizeTitle(dbTitle)
    return normalizedDbTitle === normalizedCsvTitle
  })

  return normalizedMatch || null
}

console.log('=== TESTING EXACT PROBLEM TITLES ===')

const tests = [
  {
    csv: "Kidnapping of Arabella, The",
    db: "The Kidnapping of Arabella"
  },
  {
    csv: "Mysterious Gaze of the Flamingo, The",
    db: "The Mysterious Gaze of the Flamingo"
  }
]

tests.forEach(test => {
  console.log(`\nTesting: "${test.csv}" vs "${test.db}"`)
  console.log(`CSV normalized: "${normalizeTitle(test.csv)}"`)
  console.log(`DB normalized: "${normalizeTitle(test.db)}"`)

  const match = findBestTitleMatch(test.csv, [test.db])
  console.log(`Match result: ${match ? `"${match}"` : 'NO MATCH'} ${match ? '✓' : '✗'}`)
})