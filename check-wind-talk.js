// Check Wind Talk to Me issue
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

async function checkWindTalk() {
  console.log('=== CHECKING WIND TALK TO ME ===')

  // Check for Wind films
  const { data: windFilms } = await supabase
    .from('feature_films')
    .select('title')
    .ilike('title', '%wind%')

  console.log('Films with "wind":', windFilms)

  // Test normalization
  const csvTitle = "Wind, Talk To Me"
  const dbTitle = "Wind, Talk to Me"

  console.log(`\nTesting: "${csvTitle}" vs "${dbTitle}"`)
  console.log(`CSV normalized: "${normalizeTitle(csvTitle)}"`)
  console.log(`DB normalized: "${normalizeTitle(dbTitle)}"`)
  console.log(`Should match: ${normalizeTitle(csvTitle) === normalizeTitle(dbTitle)}`)
}

checkWindTalk().catch(console.error)