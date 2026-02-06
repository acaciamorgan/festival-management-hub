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

console.log('════════════════════════════════════════════════════════════════════════════')
console.log('           MULTI-YEAR MIGRATION - VERIFICATION')
console.log('════════════════════════════════════════════════════════════════════════════')
console.log('')

const issues = []
const successes = []

// Check festival_settings table
console.log('📋 Checking festival_settings table...')
try {
  const { data, error } = await supabase
    .from('festival_settings')
    .select('*')

  if (error) throw error

  if (!data || data.length === 0) {
    issues.push('❌ festival_settings table is empty')
  } else {
    const year2025 = data.find(s => s.year === 2025)
    if (year2025) {
      successes.push(`✓ festival_settings has 2025 (archived: ${year2025.is_archived})`)
    } else {
      issues.push('❌ festival_settings missing year 2025')
    }
  }
} catch (error) {
  issues.push(`❌ festival_settings table: ${error.message}`)
}

console.log('')

// Check sample tables for festival_year column
const tablesToCheck = [
  'feature_films',
  'short_films',
  'guests',
  'venues',
  'press',
  'press_screenings',
  'ticketing_screenings',
  'interviews',
  'photo_shoots',
  'red_carpets',
  'special_events'
]

console.log('📊 Checking festival_year columns...')
for (const table of tablesToCheck) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('festival_year')
      .limit(1)

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        issues.push(`❌ ${table}: festival_year column missing`)
      } else {
        issues.push(`❌ ${table}: ${error.message}`)
      }
    } else {
      successes.push(`✓ ${table}: has festival_year column`)
    }
  } catch (error) {
    issues.push(`❌ ${table}: ${error.message}`)
  }
}

console.log('')

// Check that data is backfilled with 2025
console.log('🔢 Checking data backfill...')
try {
  const { count: filmCount } = await supabase
    .from('feature_films')
    .select('*', { count: 'exact', head: true })
    .eq('festival_year', 2025)

  if (filmCount > 0) {
    successes.push(`✓ feature_films: ${filmCount} records have festival_year = 2025`)
  } else {
    issues.push('⚠️  feature_films: No records with festival_year = 2025')
  }
} catch (error) {
  issues.push(`❌ feature_films backfill check: ${error.message}`)
}

try {
  const { count: guestCount } = await supabase
    .from('guests')
    .select('*', { count: 'exact', head: true })
    .eq('festival_year', 2025)

  if (guestCount > 0) {
    successes.push(`✓ guests: ${guestCount} records have festival_year = 2025`)
  } else {
    issues.push('⚠️  guests: No records with festival_year = 2025')
  }
} catch (error) {
  issues.push(`❌ guests backfill check: ${error.message}`)
}

console.log('')
console.log('════════════════════════════════════════════════════════════════════════════')
console.log('                          VERIFICATION RESULTS')
console.log('════════════════════════════════════════════════════════════════════════════')
console.log('')

if (issues.length > 0) {
  console.log('❌ ISSUES FOUND:')
  console.log('────────────────────────────────────────────────────────────────────────────')
  issues.forEach(issue => console.log(issue))
  console.log('')
}

if (successes.length > 0) {
  console.log('✅ SUCCESSFUL CHECKS:')
  console.log('────────────────────────────────────────────────────────────────────────────')
  successes.forEach(success => console.log(success))
  console.log('')
}

console.log(`Total Checks: ${issues.length + successes.length}`)
console.log(`✅ Passed: ${successes.length}`)
console.log(`❌ Failed: ${issues.length}`)
console.log('')

if (issues.length === 0) {
  console.log('🎉 MIGRATION SUCCESSFUL!')
  console.log('')
  console.log('Next steps:')
  console.log('  1. Update frontend code with FestivalYearContext')
  console.log('  2. Add year selector to UI')
  console.log('  3. Update queries to filter by year')
} else {
  console.log('⚠️  MIGRATION INCOMPLETE')
  console.log('')
  console.log('Please run the migration SQL in Supabase Dashboard:')
  console.log('  migrations/add-multi-year-support.sql')
}

console.log('')
console.log('════════════════════════════════════════════════════════════════════════════')
