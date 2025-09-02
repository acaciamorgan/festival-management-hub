const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Production environment
const prodSupabase = createClient(
  'https://kugapjjgvqzzvmfecolu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1Z2FwampndnF6enZtZmVjb2x1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMxNTIyMSwiZXhwIjoyMDY4ODkxMjIxfQ.fYTkkMvsZHLj7gxJ__0LuLy0-pFckdc0AZIdexYeLJ8'
)

async function setupSchema() {
  console.log('Setting up production schema...')
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('setup-production.sql', 'utf8')
    
    // Split by semicolons and execute each statement
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (!statement) continue
      
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      
      const { error } = await prodSupabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        console.error(`Error in statement ${i + 1}:`, error)
        // Continue with other statements
      } else {
        console.log(`✅ Statement ${i + 1} completed`)
      }
    }
    
    console.log('🎉 Schema setup completed!')
    
  } catch (error) {
    console.error('Schema setup failed:', error)
    process.exit(1)
  }
}

// Run setup
setupSchema()