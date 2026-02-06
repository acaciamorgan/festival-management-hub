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

console.log('============================================================================')
console.log('CHECKING ARCHIVE TABLES FOR PHOTO SHOOTS DATA')
console.log('============================================================================')
console.log('')

const archiveTables = [
  'photo_shoots_old',
  'photo_shoots_backup',
  'photo_shoots_archive',
  'archive_photo_shoots_2024'
]

for (const tableName of archiveTables) {
  console.log(`\n━━ ${tableName} ━━`)

  try {
    // Try to select all data
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .limit(5)

    if (error) {
      console.log(`❌ Error: ${error.message}`)
      continue
    }

    console.log(`  Records: ${count}`)

    if (data && data.length > 0) {
      console.log(`  ✓ HAS DATA! Found ${data.length} sample records:`)
      data.forEach((record, idx) => {
        const keys = Object.keys(record).slice(0, 5).join(', ')
        console.log(`    Record ${idx + 1}: ${keys}...`)
        console.log(`      ID: ${record.id || 'N/A'}`)
        console.log(`      Date: ${record.shoot_date || record.date || record.created_at || 'N/A'}`)
      })
    } else {
      console.log(`  ⚠️  Table exists but is empty`)
    }
  } catch (error) {
    console.log(`❌ Unexpected error: ${error.message}`)
  }
}

console.log('')
console.log('============================================================================')
console.log('COMPLETE')
console.log('============================================================================')
