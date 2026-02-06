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

const issues = []
const warnings = []
const successes = []

async function checkTable(tableName, expectedMinRecords = 0) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      issues.push(`❌ ${tableName}: ${error.message}`)
      return { exists: false, count: 0 }
    }

    if (count === 0 && expectedMinRecords > 0) {
      warnings.push(`⚠️  ${tableName}: Empty (expected at least ${expectedMinRecords} records)`)
    } else if (count === 0) {
      warnings.push(`⚠️  ${tableName}: Empty`)
    } else {
      successes.push(`✓ ${tableName}: ${count} records`)
    }

    return { exists: true, count }
  } catch (error) {
    issues.push(`❌ ${tableName}: ${error.message}`)
    return { exists: false, count: 0 }
  }
}

async function checkView(viewName) {
  try {
    const { count, error } = await supabase
      .from(viewName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      issues.push(`❌ View ${viewName}: ${error.message}`)
      return { exists: false, count: 0 }
    }

    successes.push(`✓ View ${viewName}: ${count} records`)
    return { exists: true, count }
  } catch (error) {
    issues.push(`❌ View ${viewName}: ${error.message}`)
    return { exists: false, count: 0 }
  }
}

async function checkOrphanedLinks(junctionTable, junctionIdField, parentTable, parentIdField = 'id') {
  try {
    const { data: junctionData, error: junctionError } = await supabase
      .from(junctionTable)
      .select(junctionIdField)

    if (junctionError) {
      issues.push(`❌ Cannot check ${junctionTable} for orphans: ${junctionError.message}`)
      return
    }

    if (!junctionData || junctionData.length === 0) {
      return // No links to check
    }

    const uniqueIds = [...new Set(junctionData.map(link => link[junctionIdField]))]
    let orphanedCount = 0

    for (const id of uniqueIds) {
      const { count } = await supabase
        .from(parentTable)
        .select('*', { count: 'exact', head: true })
        .eq(parentIdField, id)

      if (count === 0) {
        orphanedCount++
      }
    }

    if (orphanedCount > 0) {
      issues.push(`❌ ${junctionTable}: ${orphanedCount} orphaned links (pointing to non-existent ${parentTable} records)`)
    }
  } catch (error) {
    warnings.push(`⚠️  Could not check orphans in ${junctionTable}: ${error.message}`)
  }
}

console.log('════════════════════════════════════════════════════════════════════════════')
console.log('                    FILM FESTIVAL SYSTEM HEALTH CHECK')
console.log('════════════════════════════════════════════════════════════════════════════')
console.log('')

// ============================================================================
// CORE REFERENCE TABLES
// ============================================================================
console.log('📚 CORE REFERENCE TABLES')
console.log('────────────────────────────────────────────────────────────────────────────')

await checkTable('feature_films', 1)
await checkTable('short_films', 1)
await checkTable('shorts_programs')
await checkTable('programs')
await checkTable('guests', 1)
await checkTable('venues', 1)
await checkTable('press', 1)
await checkTable('contacts')

console.log('')

// ============================================================================
// SCREENING MODULES
// ============================================================================
console.log('🎬 SCREENING MODULES')
console.log('────────────────────────────────────────────────────────────────────────────')

// Press Screenings
const pressScreenings = await checkTable('press_screenings')
await checkView('press_screenings_with_films')
if (pressScreenings.count > 0) {
  await checkOrphanedLinks('press_screenings', 'film_id', 'feature_films')
}

// Ticketing
const ticketingScreenings = await checkTable('ticketing_screenings')
await checkView('ticketing_screenings_with_films')
if (ticketingScreenings.count > 0) {
  await checkOrphanedLinks('ticketing_screenings', 'film_id', 'feature_films')
}

// P&I/Jury Screenings
const piJuryScreenings = await checkTable('pi_jury_screenings')
await checkView('pi_jury_screenings_with_films')
if (piJuryScreenings.count > 0) {
  await checkOrphanedLinks('pi_jury_screenings', 'film_id', 'feature_films')
}

// Tech Check Screenings
const techCheckScreenings = await checkTable('tech_check_screenings')
await checkView('tech_check_screenings_with_films')
if (techCheckScreenings.count > 0) {
  await checkOrphanedLinks('tech_check_screenings', 'film_id', 'feature_films')
}

console.log('')

// ============================================================================
// PRESS & MEDIA MODULES
// ============================================================================
console.log('📰 PRESS & MEDIA MODULES')
console.log('────────────────────────────────────────────────────────────────────────────')

const interviews = await checkTable('interviews')
await checkView('interviews_with_films')
if (interviews.count > 0) {
  await checkOrphanedLinks('interviews', 'film_id', 'feature_films')
  await checkOrphanedLinks('interviews', 'press_id', 'press')
}

const pressRequests = await checkTable('press_requests')
await checkView('press_requests_with_films')

const pressRequestFilms = await checkTable('press_request_films')
if (pressRequestFilms.count > 0) {
  await checkOrphanedLinks('press_request_films', 'press_request_id', 'press_requests')
}

const screenerAccess = await checkTable('screener_access')

console.log('')

// ============================================================================
// EVENT MODULES (HYBRID RELATIONAL)
// ============================================================================
console.log('🎉 EVENT MODULES (Hybrid Relational + Free Text)')
console.log('────────────────────────────────────────────────────────────────────────────')

// Photo Shoots
const photoShoots = await checkTable('photo_shoots')
const photoShootFilms = await checkTable('photo_shoot_films')
const photoShootSubjects = await checkTable('photo_shoot_subjects')
await checkView('photo_shoots_with_details')

if (photoShootFilms.count > 0) {
  await checkOrphanedLinks('photo_shoot_films', 'photo_shoot_id', 'photo_shoots')
}
if (photoShootSubjects.count > 0) {
  await checkOrphanedLinks('photo_shoot_subjects', 'photo_shoot_id', 'photo_shoots')
  await checkOrphanedLinks('photo_shoot_subjects', 'guest_id', 'guests')
}

// Red Carpets
const redCarpets = await checkTable('red_carpets')
const redCarpetFilms = await checkTable('red_carpet_films')
const redCarpetSubjects = await checkTable('red_carpet_subjects')
await checkView('red_carpets_with_details')

if (redCarpetFilms.count > 0) {
  await checkOrphanedLinks('red_carpet_films', 'red_carpet_id', 'red_carpets')
}
if (redCarpetSubjects.count > 0) {
  await checkOrphanedLinks('red_carpet_subjects', 'red_carpet_id', 'red_carpets')
  await checkOrphanedLinks('red_carpet_subjects', 'guest_id', 'guests')
}

// Special Events
const specialEvents = await checkTable('special_events')
const specialEventFilms = await checkTable('special_event_films')
const specialEventGuests = await checkTable('special_event_guests')
await checkView('special_events_with_details')

if (specialEventFilms.count > 0) {
  await checkOrphanedLinks('special_event_films', 'special_event_id', 'special_events')
}
if (specialEventGuests.count > 0) {
  await checkOrphanedLinks('special_event_guests', 'special_event_id', 'special_events')
  await checkOrphanedLinks('special_event_guests', 'guest_id', 'guests')
}

console.log('')

// ============================================================================
// GUEST MANAGEMENT
// ============================================================================
console.log('👤 GUEST MANAGEMENT')
console.log('────────────────────────────────────────────────────────────────────────────')

const guests = await checkTable('guests')
const guestFilms = await checkTable('guest_films')
const guestPrograms = await checkTable('guest_programs')
await checkView('guest_films_with_details')

if (guestFilms.count > 0) {
  await checkOrphanedLinks('guest_films', 'guest_id', 'guests')
  await checkOrphanedLinks('guest_films', 'film_id', 'feature_films')
}

if (guestPrograms.count > 0) {
  await checkOrphanedLinks('guest_programs', 'guest_id', 'guests')
}

const inAttendance = await checkTable('in_attendance')

console.log('')

// ============================================================================
// OTHER MODULES
// ============================================================================
console.log('📋 OTHER MODULES')
console.log('────────────────────────────────────────────────────────────────────────────')

await checkTable('theater_houses')
await checkTable('festival_settings')
await checkTable('sticky_notes')

console.log('')

// ============================================================================
// SUMMARY REPORT
// ============================================================================
console.log('════════════════════════════════════════════════════════════════════════════')
console.log('                            SUMMARY REPORT')
console.log('════════════════════════════════════════════════════════════════════════════')
console.log('')

if (issues.length > 0) {
  console.log('🚨 CRITICAL ISSUES FOUND:')
  console.log('────────────────────────────────────────────────────────────────────────────')
  issues.forEach(issue => console.log(issue))
  console.log('')
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:')
  console.log('────────────────────────────────────────────────────────────────────────────')
  warnings.forEach(warning => console.log(warning))
  console.log('')
}

console.log(`✅ HEALTHY COMPONENTS: ${successes.length}`)
console.log(`⚠️  WARNINGS: ${warnings.length}`)
console.log(`❌ CRITICAL ISSUES: ${issues.length}`)
console.log('')

if (issues.length === 0 && warnings.length === 0) {
  console.log('🎉 EXCELLENT! System is healthy with no issues detected.')
} else if (issues.length === 0) {
  console.log('✅ GOOD: No critical issues. Warnings are mostly empty tables.')
} else {
  console.log('⚠️  ACTION REQUIRED: Critical issues need attention.')
}

console.log('')
console.log('════════════════════════════════════════════════════════════════════════════')
console.log('                          HEALTH CHECK COMPLETE')
console.log('════════════════════════════════════════════════════════════════════════════')
