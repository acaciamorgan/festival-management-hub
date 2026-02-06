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
console.log('CLEANUP ORPHANED PHOTO SHOOTS JUNCTION LINKS')
console.log('============================================================================')
console.log('')

// Step 1: Check current state
console.log('📊 STEP 1: Current State Before Cleanup')
console.log('---')

const { count: filmsCountBefore, error: filmsErrorBefore } = await supabase
  .from('photo_shoot_films')
  .select('*', { count: 'exact', head: true })

if (filmsErrorBefore) {
  console.error(`❌ Error checking photo_shoot_films: ${filmsErrorBefore.message}`)
  process.exit(1)
}

const { count: subjectsCountBefore, error: subjectsErrorBefore } = await supabase
  .from('photo_shoot_subjects')
  .select('*', { count: 'exact', head: true })

if (subjectsErrorBefore) {
  console.error(`❌ Error checking photo_shoot_subjects: ${subjectsErrorBefore.message}`)
  process.exit(1)
}

const { count: photoShootsCount } = await supabase
  .from('photo_shoots')
  .select('*', { count: 'exact', head: true })

console.log(`  photo_shoots table: ${photoShootsCount} records`)
console.log(`  photo_shoot_films junction: ${filmsCountBefore} links`)
console.log(`  photo_shoot_subjects junction: ${subjectsCountBefore} links`)
console.log('')

// Step 2: Identify orphaned links
console.log('🔍 STEP 2: Identifying Orphaned Links')
console.log('---')

// Get all photo shoot IDs from junction tables
const { data: filmLinks } = await supabase
  .from('photo_shoot_films')
  .select('photo_shoot_id')

const { data: subjectLinks } = await supabase
  .from('photo_shoot_subjects')
  .select('photo_shoot_id')

const filmPhotoShootIds = [...new Set(filmLinks?.map(link => link.photo_shoot_id) || [])]
const subjectPhotoShootIds = [...new Set(subjectLinks?.map(link => link.photo_shoot_id) || [])]

console.log(`  Unique photo_shoot_ids in photo_shoot_films: ${filmPhotoShootIds.length}`)
console.log(`  Unique photo_shoot_ids in photo_shoot_subjects: ${subjectPhotoShootIds.length}`)

// Check which ones are orphaned
let orphanedFilmIds = []
let orphanedSubjectIds = []

for (const id of filmPhotoShootIds) {
  const { count } = await supabase
    .from('photo_shoots')
    .select('*', { count: 'exact', head: true })
    .eq('id', id)

  if (count === 0) {
    orphanedFilmIds.push(id)
  }
}

for (const id of subjectPhotoShootIds) {
  const { count } = await supabase
    .from('photo_shoots')
    .select('*', { count: 'exact', head: true })
    .eq('id', id)

  if (count === 0) {
    orphanedSubjectIds.push(id)
  }
}

console.log(`  ⚠️  Orphaned photo_shoot_ids in photo_shoot_films: ${orphanedFilmIds.length}`)
if (orphanedFilmIds.length > 0) {
  console.log(`     IDs: ${orphanedFilmIds.join(', ')}`)
}

console.log(`  ⚠️  Orphaned photo_shoot_ids in photo_shoot_subjects: ${orphanedSubjectIds.length}`)
if (orphanedSubjectIds.length > 0) {
  console.log(`     IDs: ${orphanedSubjectIds.join(', ')}`)
}
console.log('')

// Step 3: Delete orphaned links
console.log('🗑️  STEP 3: Deleting Orphaned Links')
console.log('---')

let totalDeleted = 0

// Delete from photo_shoot_films
if (orphanedFilmIds.length > 0) {
  const { error: deleteFilmsError, count: deletedFilmsCount } = await supabase
    .from('photo_shoot_films')
    .delete({ count: 'exact' })
    .in('photo_shoot_id', orphanedFilmIds)

  if (deleteFilmsError) {
    console.error(`❌ Error deleting from photo_shoot_films: ${deleteFilmsError.message}`)
  } else {
    console.log(`✓ Deleted ${deletedFilmsCount} orphaned links from photo_shoot_films`)
    totalDeleted += deletedFilmsCount || 0
  }
}

// Delete from photo_shoot_subjects
if (orphanedSubjectIds.length > 0) {
  const { error: deleteSubjectsError, count: deletedSubjectsCount } = await supabase
    .from('photo_shoot_subjects')
    .delete({ count: 'exact' })
    .in('photo_shoot_id', orphanedSubjectIds)

  if (deleteSubjectsError) {
    console.error(`❌ Error deleting from photo_shoot_subjects: ${deleteSubjectsError.message}`)
  } else {
    console.log(`✓ Deleted ${deletedSubjectsCount} orphaned links from photo_shoot_subjects`)
    totalDeleted += deletedSubjectsCount || 0
  }
}

if (totalDeleted === 0 && orphanedFilmIds.length === 0 && orphanedSubjectIds.length === 0) {
  console.log('✓ No orphaned links found - database is clean!')
}

console.log('')

// Step 4: Verify cleanup
console.log('✅ STEP 4: Verification After Cleanup')
console.log('---')

const { count: filmsCountAfter } = await supabase
  .from('photo_shoot_films')
  .select('*', { count: 'exact', head: true })

const { count: subjectsCountAfter } = await supabase
  .from('photo_shoot_subjects')
  .select('*', { count: 'exact', head: true })

console.log(`  photo_shoot_films: ${filmsCountAfter} links (was ${filmsCountBefore})`)
console.log(`  photo_shoot_subjects: ${subjectsCountAfter} links (was ${subjectsCountBefore})`)
console.log('')

if (filmsCountAfter === 0 && subjectsCountAfter === 0) {
  console.log('✅ SUCCESS: All junction tables are now clean!')
  console.log('   Photo Shoots module is ready for new data.')
} else {
  console.log('⚠️  WARNING: Some links remain. This is normal if valid photo shoots exist.')
}

console.log('')
console.log('============================================================================')
console.log('CLEANUP COMPLETE')
console.log('============================================================================')
