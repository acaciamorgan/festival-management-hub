// Test the actual normalization function
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

// Test cases from your CSV
const tests = [
  {
    csv: "Reckoning of Erin Morrigan, The",
    db: "The Reckoning of Erin Morrigan",
    description: "CSV has trailing article, DB has leading article"
  },
  {
    csv: "Kidnapping of Arabella, The",
    db: "The Kidnapping of Arabella",
    description: "Another trailing/leading article test"
  }
]

console.log("=== TITLE NORMALIZATION TEST ===")

tests.forEach((test, i) => {
  const csvNormalized = normalizeTitle(test.csv)
  const dbNormalized = normalizeTitle(test.db)
  const matches = csvNormalized === dbNormalized

  console.log(`\nTest ${i + 1}: ${test.description}`)
  console.log(`CSV: "${test.csv}" → "${csvNormalized}"`)
  console.log(`DB:  "${test.db}" → "${dbNormalized}"`)
  console.log(`MATCH: ${matches ? 'YES ✓' : 'NO ✗'}`)

  if (!matches) {
    console.log(`ERROR: "${csvNormalized}" !== "${dbNormalized}"`)
  }
})