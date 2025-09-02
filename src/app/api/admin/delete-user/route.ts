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
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Delete from user_permissions table first
    const { error: permError } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)

    if (permError) throw permError

    // Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    if (authError) throw authError

    return NextResponse.json({ 
      success: true,
      message: 'User completely deleted from both permissions and auth'
    })
    
  } catch (error: any) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}