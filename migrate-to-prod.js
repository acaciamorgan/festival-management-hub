const { createClient } = require('@supabase/supabase-js')

// Development environment
const devSupabase = createClient(
  'https://xqzjthbearpqcrzfdfer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMxNDYwNSwiZXhwIjoyMDY4ODkwNjA1fQ.7kcrVymLxC4Bvf6x92LPL3tBK54xytNUCTJsGavh8Qc'
)

// Production environment
const prodSupabase = createClient(
  'https://kugapjjgvqzzvmfecolu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1Z2FwampndnF6enZtZmVjb2x1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMxNTIyMSwiZXhwIjoyMDY4ODkxMjIxfQ.fYTkkMvsZHLj7gxJ__0LuLy0-pFckdc0AZIdexYeLJ8'
)

async function migrateData() {
  console.log('Starting migration from dev to prod...')
  
  try {
    // Get all table names from dev
    const { data: tables } = await devSupabase.rpc('get_all_tables')
    
    // Core tables to migrate (in order due to foreign key dependencies)
    const tablesToMigrate = [
      'users',
      'user_permissions', 
      'feature_films',
      'shorts_programs',
      'short_films',
      'guests',
      'press',
      'venues',
      'contacts',
      'interviews',
      'press_screenings',
      'screener_access',
      'press_requests',
      'photo_shoots',
      'in_attendance',
      'special_events',
      'red_carpets',
      'programming_pipeline',
      'archive_2024_feature_films',
      'archive_2024_shorts_programs', 
      'archive_2024_short_films',
      'archive_2024_guests',
      'archive_2024_press',
      'archive_2024_venues',
      'archive_2024_contacts',
      'archive_2024_interviews',
      'archive_2024_press_screenings',
      'archive_2024_screener_access',
      'archive_2024_press_requests',
      'archive_2024_photo_shoots',
      'archive_2024_in_attendance',
      'archive_2024_special_events',
      'archive_2024_red_carpets',
      'archive_2024_programming_pipeline'
    ]
    
    for (const tableName of tablesToMigrate) {
      console.log(`Migrating table: ${tableName}`)
      
      // Get data from dev
      const { data: tableData, error: fetchError } = await devSupabase
        .from(tableName)
        .select('*')
      
      if (fetchError) {
        console.log(`Table ${tableName} doesn't exist or couldn't be read, skipping...`)
        continue
      }
      
      if (!tableData || tableData.length === 0) {
        console.log(`Table ${tableName} is empty, skipping...`)
        continue
      }
      
      console.log(`Found ${tableData.length} rows in ${tableName}`)
      
      // Insert into prod (batch insert for performance)
      const batchSize = 100
      for (let i = 0; i < tableData.length; i += batchSize) {
        const batch = tableData.slice(i, i + batchSize)
        
        const { error: insertError } = await prodSupabase
          .from(tableName)
          .insert(batch)
        
        if (insertError) {
          console.error(`Error inserting batch ${i}-${i + batch.length} into ${tableName}:`, insertError)
          throw insertError
        }
        
        console.log(`Inserted batch ${i + 1}-${Math.min(i + batchSize, tableData.length)} into ${tableName}`)
      }
      
      console.log(`✅ Successfully migrated ${tableName}`)
    }
    
    console.log('🎉 Migration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateData()