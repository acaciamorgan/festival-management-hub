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

console.log('Checking festival_settings dependencies...\n')

// 1. Check current data
console.log('1. Current festival_settings data:')
const { data: currentData, error: currentError } = await supabase
  .from('festival_settings')
  .select('*')

if (currentError) {
  console.error('   ❌ Error:', currentError.message)
} else {
  console.log('   Rows:', currentData.length)
  currentData.forEach(row => {
    console.log(`   - Year ${row.year}: columns =`, Object.keys(row).join(', '))
  })
}

console.log('\n✅ Dependency check complete')
