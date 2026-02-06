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
console.log('           MULTI-YEAR ARCHIVE SYSTEM - DATABASE MIGRATION')
console.log('════════════════════════════════════════════════════════════════════════════')
console.log('')
console.log('⚠️  This will add festival_year columns to all tables')
console.log('⚠️  All existing data will be set to year 2025')
console.log('')
console.log('Starting migration...')
console.log('')

// Read the migration SQL file
const migrationSQL = readFileSync(
  join(__dirname, '../migrations/add-multi-year-support.sql'),
  'utf-8'
)

try {
  // Execute the migration
  // Note: Supabase client doesn't support multi-statement SQL directly
  // We need to use the REST API or pg client
  // For now, let's tell the user to run it manually

  console.log('════════════════════════════════════════════════════════════════════════════')
  console.log('⚠️  MANUAL STEP REQUIRED')
  console.log('════════════════════════════════════════════════════════════════════════════')
  console.log('')
  console.log('The Supabase JS client cannot run multi-statement SQL migrations.')
  console.log('')
  console.log('Please run the migration manually:')
  console.log('')
  console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard')
  console.log('2. Go to SQL Editor')
  console.log('3. Copy the contents of: migrations/add-multi-year-support.sql')
  console.log('4. Paste and run the SQL')
  console.log('')
  console.log('OR use psql:')
  console.log('')
  console.log('psql -h [your-host].supabase.co \\')
  console.log('     -U postgres \\')
  console.log('     -d postgres \\')
  console.log('     -f migrations/add-multi-year-support.sql')
  console.log('')
  console.log('════════════════════════════════════════════════════════════════════════════')
  console.log('')
  console.log('After running the migration, verify with:')
  console.log('  node scripts/verify-multi-year-migration.mjs')
  console.log('')

} catch (error) {
  console.error('❌ Migration failed:', error.message)
  process.exit(1)
}
