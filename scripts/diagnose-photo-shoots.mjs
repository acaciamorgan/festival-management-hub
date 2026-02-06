#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read .env.local file manually
const envPath = join(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('============================================================================')
console.log('PHOTO SHOOTS DATABASE DIAGNOSTIC')
console.log('============================================================================')
console.log('')

// Check 1: Count records in photo_shoots
console.log('📊 CHECK 1: Photo Shoots Table Data')
console.log('---')
try {
  const { count, error } = await supabase
    .from('photo_shoots')
    .select('*', { count: 'exact', head: true })

  if (error) throw error
  console.log(`✓ photo_shoots table exists`)
  console.log(`  Total records: ${count}`)
} catch (error) {
  console.log(`❌ photo_shoots table issue: ${error.message}`)
}
console.log('')

// Check 2: Sample a few photo shoots
console.log('📋 CHECK 2: Sample Photo Shoots Data')
console.log('---')
try {
  const { data, error } = await supabase
    .from('photo_shoots')
    .select('id, shoot_date, film_program_display, subjects_display, film_program_description, subjects_description, venue_id')
    .order('shoot_date', { ascending: false })
    .limit(3)

  if (error) throw error

  if (data && data.length > 0) {
    console.log(`✓ Found ${data.length} photo shoots`)
    data.forEach((shoot, idx) => {
      console.log(`\n  Photo Shoot #${idx + 1}:`)
      console.log(`    ID: ${shoot.id}`)
      console.log(`    Date: ${shoot.shoot_date || 'N/A'}`)
      console.log(`    Old film_program_display: "${shoot.film_program_display || ''}"`)
      console.log(`    Old subjects_display: "${shoot.subjects_display || ''}"`)
      console.log(`    New film_program_description: "${shoot.film_program_description || ''}"`)
      console.log(`    New subjects_description: "${shoot.subjects_description || ''}"`)
      console.log(`    Venue ID: ${shoot.venue_id || 'N/A'}`)
    })
  } else {
    console.log('⚠️  No photo shoots found in database')
  }
} catch (error) {
  console.log(`❌ Error reading photo_shoots: ${error.message}`)
}
console.log('')

// Check 3: Check junction tables
console.log('🔗 CHECK 3: Junction Tables')
console.log('---')
try {
  const { count: filmCount, error: filmError } = await supabase
    .from('photo_shoot_films')
    .select('*', { count: 'exact', head: true })

  if (filmError) throw new Error(`photo_shoot_films: ${filmError.message}`)
  console.log(`✓ photo_shoot_films table exists`)
  console.log(`  Total links: ${filmCount}`)
} catch (error) {
  console.log(`❌ photo_shoot_films: ${error.message}`)
}

try {
  const { count: subjectCount, error: subjectError } = await supabase
    .from('photo_shoot_subjects')
    .select('*', { count: 'exact', head: true })

  if (subjectError) throw new Error(`photo_shoot_subjects: ${subjectError.message}`)
  console.log(`✓ photo_shoot_subjects table exists`)
  console.log(`  Total links: ${subjectCount}`)
} catch (error) {
  console.log(`❌ photo_shoot_subjects: ${error.message}`)
}
console.log('')

// Check 4: Check the view
console.log('👁️  CHECK 4: Photo Shoots View')
console.log('---')
try {
  const { data, error } = await supabase
    .from('photo_shoots_with_details')
    .select('id, shoot_date, film_program_display_combined, subjects_display_combined, venue_name_from_fk, linked_films_display, linked_subjects_display')
    .order('shoot_date', { ascending: false })
    .limit(3)

  if (error) throw error

  console.log(`✓ photo_shoots_with_details view exists`)
  console.log(`  Records returned: ${data?.length || 0}`)

  if (data && data.length > 0) {
    data.forEach((shoot, idx) => {
      console.log(`\n  View Result #${idx + 1}:`)
      console.log(`    ID: ${shoot.id}`)
      console.log(`    Date: ${shoot.shoot_date || 'N/A'}`)
      console.log(`    Linked films (relational): "${shoot.linked_films_display || ''}"`)
      console.log(`    Combined films (hybrid): "${shoot.film_program_display_combined || ''}"`)
      console.log(`    Linked subjects (relational): "${shoot.linked_subjects_display || ''}"`)
      console.log(`    Combined subjects (hybrid): "${shoot.subjects_display_combined || ''}"`)
      console.log(`    Venue: ${shoot.venue_name_from_fk || 'N/A'}`)
    })
  }
} catch (error) {
  console.log(`❌ photo_shoots_with_details view: ${error.message}`)
}
console.log('')

// Check 5: Core reference tables
console.log('📚 CHECK 5: Core Reference Tables')
console.log('---')
const tables = ['feature_films', 'short_films', 'shorts_programs', 'programs', 'guests', 'venues']
for (const table of tables) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) throw error
    console.log(`✓ ${table}: ${count} records`)
  } catch (error) {
    console.log(`❌ ${table}: ${error.message}`)
  }
}

console.log('')
console.log('============================================================================')
console.log('DIAGNOSTIC COMPLETE')
console.log('============================================================================')
