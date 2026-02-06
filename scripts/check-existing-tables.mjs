#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('Checking which tables exist in your database...\n')

const tablesToCheck = [
  'feature_films',
  'short_films',
  'shorts_programs',
  'programs',
  'guests',
  'venues',
  'press',
  'contacts',
  'press_screenings',
  'ticketing_screenings',
  'pi_jury_screenings',
  'tech_check_screenings',
  'interviews',
  'press_requests',
  'screener_access',
  'photo_shoots',
  'red_carpets',
  'special_events',
  'press_request_films',
  'photo_shoot_films',
  'photo_shoot_subjects',
  'red_carpet_films',
  'red_carpet_subjects',
  'special_event_films',
  'special_event_guests',
  'guest_films',
  'guest_programs',
  'in_attendance',
  'theater_houses',
  'sticky_notes'
]

const existingTables = []
const missingTables = []

for (const table of tablesToCheck) {
  try {
    const { error } = await supabase
      .from(table)
      .select('id')
      .limit(1)

    if (error) {
      if (error.message.includes('does not exist')) {
        missingTables.push(table)
      } else {
        console.log(`⚠️  ${table}: ${error.message}`)
      }
    } else {
      existingTables.push(table)
    }
  } catch (error) {
    missingTables.push(table)
  }
}

console.log('✅ EXISTING TABLES:')
console.log('──────────────────────────────────────')
existingTables.forEach(table => console.log(`  ✓ ${table}`))

console.log('\n❌ MISSING TABLES:')
console.log('──────────────────────────────────────')
if (missingTables.length > 0) {
  missingTables.forEach(table => console.log(`  ✗ ${table}`))
} else {
  console.log('  (none)')
}

console.log(`\nTotal: ${existingTables.length} existing, ${missingTables.length} missing`)
console.log('\nCreating custom migration for existing tables only...')
