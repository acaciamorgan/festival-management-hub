// Test the exact failing scenario from console
function normalizeTitle(title) {
  if (!title || typeof title !== 'string') {
    return ''
  }

  let normalized = title.trim().toLowerCase()
  normalized = normalized.replace(/,\s*(a|an|the)$/i, '')
  normalized = normalized.replace(/^(a|an|the)\s+/i, '')
  normalized = normalized.replace(/[^\w\s\-']/g, ' ')
  normalized = normalized.replace(/\s+/g, ' ').trim()
  return normalized
}

function findBestTitleMatch(csvTitle, dbTitles) {
  console.log(`\n=== findBestTitleMatch ===`)
  console.log(`CSV Title: "${csvTitle}"`)
  console.log(`DB Titles: [${dbTitles.map(t => `"${t}"`).join(', ')}]`)

  if (!csvTitle || !dbTitles || dbTitles.length === 0) {
    console.log(`Result: null (empty inputs)`)
    return null
  }

  // First try exact match (case insensitive)
  const exactMatch = dbTitles.find(dbTitle =>
    dbTitle.toLowerCase().trim() === csvTitle.toLowerCase().trim()
  )
  if (exactMatch) {
    console.log(`Result: "${exactMatch}" (exact match)`)
    return exactMatch
  }

  // Try normalized matching
  const normalizedCsvTitle = normalizeTitle(csvTitle)
  console.log(`CSV Normalized: "${normalizedCsvTitle}"`)

  if (!normalizedCsvTitle) {
    console.log(`Result: null (empty normalized)`)
    return null
  }

  const normalizedMatch = dbTitles.find(dbTitle => {
    const normalizedDbTitle = normalizeTitle(dbTitle)
    console.log(`  DB "${dbTitle}" → "${normalizedDbTitle}" | Match: ${normalizedDbTitle === normalizedCsvTitle}`)
    return normalizedDbTitle === normalizedCsvTitle
  })

  console.log(`Result: ${normalizedMatch ? `"${normalizedMatch}"` : 'null'} (normalized match)`)
  return normalizedMatch || null
}

// Test the EXACT failing case
console.log("=== TESTING FAILING CASE ===")

const csvTitle = "Mysterious Gaze of the Flamingo, The"
const dbTitle = "The Mysterious Gaze of the Flamingo"

const result = findBestTitleMatch(csvTitle, [dbTitle])
console.log(`\nFINAL RESULT: ${result ? `FOUND "${result}"` : 'NOT FOUND - THIS IS THE BUG'}`)