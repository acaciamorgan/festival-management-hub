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
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('============================================================================')
console.log('ALL THREE MODULES DATABASE DIAGNOSTIC')
console.log('============================================================================')
console.log('')

// Check each module
const modules = [
  {
    name: 'PHOTO SHOOTS',
    mainTable: 'photo_shoots',
    filmsJunction: 'photo_shoot_films',
    subjectsJunction: 'photo_shoot_subjects',
    view: 'photo_shoots_with_details'
  },
  {
    name: 'RED CARPETS',
    mainTable: 'red_carpets',
    filmsJunction: 'red_carpet_films',
    subjectsJunction: 'red_carpet_subjects',
    view: 'red_carpets_with_details'
  },
  {
    name: 'SPECIAL EVENTS',
    mainTable: 'special_events',
    filmsJunction: 'special_event_films',
    subjectsJunction: 'special_event_guests',
    view: 'special_events_with_details'
  }
]

for (const module of modules) {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📦 ${module.name}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log('')

  // Check main table
  try {
    const { count, error } = await supabase
      .from(module.mainTable)
      .select('*', { count: 'exact', head: true })

    if (error) throw error
    console.log(`✓ ${module.mainTable}: ${count} records`)
  } catch (error) {
    console.log(`❌ ${module.mainTable}: ${error.message}`)
  }

  // Check junction tables
  try {
    const { count, error } = await supabase
      .from(module.filmsJunction)
      .select('*', { count: 'exact', head: true })

    if (error) throw error
    console.log(`✓ ${module.filmsJunction}: ${count} links`)
  } catch (error) {
    console.log(`❌ ${module.filmsJunction}: ${error.message}`)
  }

  try {
    const { count, error } = await supabase
      .from(module.subjectsJunction)
      .select('*', { count: 'exact', head: true })

    if (error) throw error
    console.log(`✓ ${module.subjectsJunction}: ${count} links`)
  } catch (error) {
    console.log(`❌ ${module.subjectsJunction}: ${error.message}`)
  }

  // Check view
  try {
    const { count, error } = await supabase
      .from(module.view)
      .select('*', { count: 'exact', head: true })

    if (error) throw error
    console.log(`✓ ${module.view}: ${count} records visible`)
  } catch (error) {
    console.log(`❌ ${module.view}: ${error.message}`)
  }

  // Sample data
  if (module.mainTable) {
    try {
      const { data, error } = await supabase
        .from(module.mainTable)
        .select('*')
        .limit(2)

      if (error) throw error

      if (data && data.length > 0) {
        console.log(`\n📋 Sample records:`)
        data.forEach((record, idx) => {
          console.log(`  Record #${idx + 1}: ID=${record.id}, Date=${record.shoot_date || record.carpet_date || record.event_date || 'N/A'}`)
        })
      } else {
        console.log(`\n⚠️  No records found`)
      }
    } catch (error) {
      console.log(`❌ Error sampling: ${error.message}`)
    }
  }

  console.log('')
}

// Check for possible old/archived tables
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`🔍 CHECKING FOR OLD/ARCHIVED TABLES`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log('')

const possibleOldTables = [
  'photo_shoots_old',
  'photo_shoots_backup',
  'photo_shoots_archive',
  'red_carpets_old',
  'red_carpets_backup',
  'red_carpets_archive',
  'special_events_old',
  'special_events_backup',
  'special_events_archive',
  'archive_photo_shoots_2024',
  'archive_red_carpets_2024',
  'archive_special_events_2024'
]

for (const table of possibleOldTables) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      if (error.message.includes('does not exist')) {
        // Table doesn't exist, skip silently
      } else {
        console.log(`❓ ${table}: ${error.message}`)
      }
    } else {
      console.log(`✓ FOUND: ${table} with ${count} records`)
    }
  } catch (error) {
    // Skip
  }
}

console.log('')
console.log('============================================================================')
console.log('DIAGNOSTIC COMPLETE')
console.log('============================================================================')
