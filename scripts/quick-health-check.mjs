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

async function check(name, tableName, isView = false) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      if (error.message.includes('does not exist')) {
        return { name, exists: false, count: 0, error: 'Table/view does not exist' }
      }
      return { name, exists: true, count: 0, error: error.message }
    }

    return { name, exists: true, count, error: null, isView }
  } catch (error) {
    return { name, exists: false, count: 0, error: error.message }
  }
}

console.log('══════════════════════════════════════════════════════════════════')
console.log('             FILM FESTIVAL SYSTEM - QUICK HEALTH CHECK')
console.log('══════════════════════════════════════════════════════════════════')
console.log('')

const checks = []

// Core tables
checks.push(await check('Feature Films', 'feature_films'))
checks.push(await check('Short Films', 'short_films'))
checks.push(await check('Shorts Programs', 'shorts_programs'))
checks.push(await check('Programs', 'programs'))
checks.push(await check('Guests', 'guests'))
checks.push(await check('Venues', 'venues'))
checks.push(await check('Press', 'press'))
checks.push(await check('Contacts', 'contacts'))

// Screening modules
checks.push(await check('Press Screenings', 'press_screenings'))
checks.push(await check('Press Screenings View', 'press_screenings_with_films', true))
checks.push(await check('Ticketing Screenings', 'ticketing_screenings'))
checks.push(await check('Ticketing View', 'ticketing_screenings_with_films', true))
checks.push(await check('P&I/Jury Screenings', 'pi_jury_screenings'))
checks.push(await check('P&I/Jury View', 'pi_jury_screenings_with_films', true))
checks.push(await check('Tech Check Screenings', 'tech_check_screenings'))
checks.push(await check('Tech Check View', 'tech_check_screenings_with_films', true))

// Press & media
checks.push(await check('Interviews', 'interviews'))
checks.push(await check('Interviews View', 'interviews_with_films', true))
checks.push(await check('Press Requests', 'press_requests'))
checks.push(await check('Press Requests View', 'press_requests_with_films', true))
checks.push(await check('Screener Access', 'screener_access'))

// Event modules (hybrid)
checks.push(await check('Photo Shoots', 'photo_shoots'))
checks.push(await check('Photo Shoots View', 'photo_shoots_with_details', true))
checks.push(await check('Red Carpets', 'red_carpets'))
checks.push(await check('Red Carpets View', 'red_carpets_with_details', true))
checks.push(await check('Special Events', 'special_events'))
checks.push(await check('Special Events View', 'special_events_with_details', true))

// Guest management
checks.push(await check('Guest Films', 'guest_films'))
checks.push(await check('Guest Films View', 'guest_films_with_details', true))
checks.push(await check('Guest Programs', 'guest_programs'))
checks.push(await check('In Attendance', 'in_attendance'))

// Other
checks.push(await check('Theater Houses', 'theater_houses'))
checks.push(await check('Festival Settings', 'festival_settings'))

const issues = checks.filter(c => !c.exists || c.error)
const empty = checks.filter(c => c.exists && !c.error && c.count === 0 && !c.isView)
const healthy = checks.filter(c => c.exists && !c.error && (c.count > 0 || c.isView))

console.log('📊 RESULTS SUMMARY')
console.log('──────────────────────────────────────────────────────────────────')
console.log(`Total components checked: ${checks.length}`)
console.log(`✅ Healthy: ${healthy.length}`)
console.log(`⚠️  Empty tables: ${empty.length}`)
console.log(`❌ Missing/broken: ${issues.length}`)
console.log('')

if (issues.length > 0) {
  console.log('❌ MISSING OR BROKEN COMPONENTS:')
  console.log('──────────────────────────────────────────────────────────────────')
  issues.forEach(c => {
    console.log(`  ❌ ${c.name}: ${c.error}`)
  })
  console.log('')
}

if (empty.length > 0) {
  console.log('⚠️  EMPTY TABLES (infrastructure exists, no data):')
  console.log('──────────────────────────────────────────────────────────────────')
  empty.forEach(c => {
    console.log(`  ⚠️  ${c.name}: 0 records`)
  })
  console.log('')
}

console.log('✅ HEALTHY COMPONENTS (with data):')
console.log('──────────────────────────────────────────────────────────────────')
const coreData = healthy.filter(c => !c.isView && ['Feature Films', 'Short Films', 'Guests', 'Venues', 'Press'].includes(c.name))
const moduleData = healthy.filter(c => !c.isView && !['Feature Films', 'Short Films', 'Guests', 'Venues', 'Press', 'Shorts Programs', 'Programs', 'Contacts'].includes(c.name))
const views = healthy.filter(c => c.isView)

if (coreData.length > 0) {
  console.log('  Core Data:')
  coreData.forEach(c => console.log(`    ✓ ${c.name}: ${c.count} records`))
}

if (moduleData.length > 0) {
  console.log('  Module Data:')
  moduleData.forEach(c => console.log(`    ✓ ${c.name}: ${c.count} records`))
}

if (views.length > 0) {
  console.log('  Views (working):')
  views.forEach(c => console.log(`    ✓ ${c.name} (${c.count} visible records)`))
}

console.log('')
console.log('══════════════════════════════════════════════════════════════════')

if (issues.length === 0) {
  console.log('🎉 EXCELLENT! All infrastructure components exist and are working.')
} else {
  console.log(`⚠️  ${issues.length} component(s) need attention.`)
}

console.log('══════════════════════════════════════════════════════════════════')
