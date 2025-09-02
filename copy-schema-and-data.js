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

async function migrateToProduction() {
  console.log('🚀 Starting complete migration to production...')
  
  // Step 1: Create basic tables via direct table creation
  console.log('\n📋 Step 1: Creating basic tables...')
  
  const createTables = [
    // User permissions
    `CREATE TABLE IF NOT EXISTS user_permissions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      module_id TEXT NOT NULL,
      can_view BOOLEAN DEFAULT false,
      can_edit BOOLEAN DEFAULT false,
      can_delete BOOLEAN DEFAULT false,
      can_admin BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    
    // Feature films
    `CREATE TABLE IF NOT EXISTS feature_films (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      title TEXT NOT NULL,
      director TEXT,
      producer TEXT,
      country TEXT,
      year INTEGER,
      genre TEXT,
      runtime INTEGER,
      synopsis TEXT,
      language TEXT,
      subtitles TEXT,
      world_premiere BOOLEAN DEFAULT false,
      us_premiere BOOLEAN DEFAULT false,
      regional_premiere BOOLEAN DEFAULT false,
      screening_format TEXT,
      aspect_ratio TEXT,
      sound_format TEXT,
      rating TEXT,
      distributor TEXT,
      sales_agent TEXT,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      submission_date DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    
    // Shorts programs
    `CREATE TABLE IF NOT EXISTS shorts_programs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      program_name TEXT NOT NULL,
      theme TEXT,
      description TEXT,
      total_runtime INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`
  ]
  
  for (const sql of createTables) {
    try {
      await prodSupabase.rpc('exec_sql', { sql })
      console.log('✅ Table created successfully')
    } catch (error) {
      console.error('❌ Error creating table:', error)
    }
  }
  
  // Step 2: Test data migration with user_permissions first
  console.log('\n📊 Step 2: Testing data migration...')
  
  try {
    const { data: permissions, error } = await devSupabase
      .from('user_permissions')
      .select('*')
    
    if (error) {
      console.error('Error fetching permissions:', error)
      return
    }
    
    console.log(`Found ${permissions?.length || 0} permission records`)
    
    if (permissions && permissions.length > 0) {
      console.log('Sample permission:', JSON.stringify(permissions[0], null, 2))
      
      // Try inserting one record first
      const { error: insertError } = await prodSupabase
        .from('user_permissions')
        .insert([permissions[0]])
      
      if (insertError) {
        console.error('Insert error:', insertError)
      } else {
        console.log('✅ Test insert successful!')
      }
    }
    
  } catch (error) {
    console.error('Migration test failed:', error)
  }
}

migrateToProduction()