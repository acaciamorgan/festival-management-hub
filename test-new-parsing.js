// Test the new parsing logic with database titles
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk'

const supabase = createClient(supabaseUrl, supabaseKey)

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

function parseFilmTitles(filmsDisplay, knownTitles) {
  if (!filmsDisplay || filmsDisplay.trim() === '' || filmsDisplay === '—') {
    return []
  }

  const trimmedDisplay = filmsDisplay.trim()

  // Check if this is a single title with trailing article
  if (/,\s*(a|an|the)$/i.test(trimmedDisplay)) {
    return [trimmedDisplay]
  }

  // First, try to match against known titles to see if the entire string is one title
  if (knownTitles.length > 0) {
    const exactMatch = knownTitles.find(title =>
      title.toLowerCase().trim() === trimmedDisplay.toLowerCase().trim()
    )
    if (exactMatch) {
      console.log(`EXACT MATCH: "${trimmedDisplay}" matched "${exactMatch}"`)
      return [trimmedDisplay]
    }

    // Also check normalized matching
    const normalizedMatch = knownTitles.find(title => {
      const normalizedCsv = normalizeTitle(trimmedDisplay)
      const normalizedDb = normalizeTitle(title)
      return normalizedCsv && normalizedDb && normalizedCsv === normalizedDb
    })
    if (normalizedMatch) {
      console.log(`NORMALIZED MATCH: "${trimmedDisplay}" matched "${normalizedMatch}" (both normalize to "${normalizeTitle(trimmedDisplay)}")`)
      return [trimmedDisplay]
    }
  }

  console.log(`NO MATCH: "${trimmedDisplay}" will be split on commas`)

  // Split on commas but be smart about trailing articles
  const parts = trimmedDisplay.split(',').map(part => part.trim()).filter(part => part)
  const result = []
  let i = 0

  while (i < parts.length) {
    const currentPart = parts[i]
    const nextPart = parts[i + 1]

    // Check if next part is an article - if so, combine them
    if (nextPart && /^(a|an|the)$/i.test(nextPart)) {
      result.push(`${currentPart}, ${nextPart}`)
      i += 2 // Skip both parts
    } else {
      result.push(currentPart)
      i++
    }
  }

  return result
}

async function testParsing() {
  console.log('=== TESTING NEW PARSING LOGIC ===')

  // Get all database titles
  const [allFeatureFilms, allShortFilms, allPrograms] = await Promise.all([
    supabase.from('feature_films').select('id, title'),
    supabase.from('short_films').select('id, title'),
    supabase.from('programs').select('id, title')
  ])

  const allDbTitles = [
    ...(allFeatureFilms.data || []).map(f => f.title),
    ...(allShortFilms.data || []).map(f => f.title),
    ...(allPrograms.data || []).map(p => p.title)
  ]

  console.log(`Found ${allDbTitles.length} titles in database`)

  // Test the problematic cases
  const testCases = [
    "Black Rabbit, White Rabbit",
    "Wind, Talk To Me",
    "Wind, Talk to Me", // Different capitalization
    "The Mastermind, First Cow, Old Joy, Showing Up", // Multiple films
    "Tale of Silyan, The", // Trailing article
    "Kidnapping of Arabella, The" // Trailing article
  ]

  for (const testCase of testCases) {
    console.log(`\n--- Testing: "${testCase}" ---`)
    const result = parseFilmTitles(testCase, allDbTitles)
    console.log(`Result: [${result.map(r => `"${r}"`).join(', ')}]`)
  }
}

testParsing().catch(console.error)