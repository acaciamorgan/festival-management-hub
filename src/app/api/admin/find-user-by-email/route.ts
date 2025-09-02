import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create admin client with service role key
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Find user in Supabase Auth by email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email)
    
    if (userError) {
      return NextResponse.json({ 
        success: true,
        found: false,
        message: `No user found in auth with email ${email}`
      })
    }

    if (userData.user) {
      // Delete the ghost user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userData.user.id)
      
      if (deleteError) throw deleteError

      return NextResponse.json({ 
        success: true,
        found: true,
        deleted: true,
        message: `Found and deleted ghost user ${email} from Supabase Auth`
      })
    } else {
      return NextResponse.json({ 
        success: true,
        found: false,
        message: `No user found in auth with email ${email}`
      })
    }
    
  } catch (error: any) {
    console.error('Find user error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to find user' },
      { status: 500 }
    )
  }
}