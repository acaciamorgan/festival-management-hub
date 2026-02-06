import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: 'User ID and email are required' },
        { status: 400 }
      )
    }

    // Fetch permissions using service role
    const { data: initialData, error } = await supabaseAdmin
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .single()

    let data = initialData

    if (error) {
      console.error('Error fetching permissions:', error)

      // Try by email as fallback
      const { data: emailData, error: emailError } = await supabaseAdmin
        .from('user_permissions')
        .select('*')
        .eq('user_email', email)
        .single()

      if (emailError) {
        return NextResponse.json({
          success: false,
          error: 'No permissions found'
        })
      }

      data = emailData
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'No permissions data found'
      })
    }

    // Parse module permissions if stored as string
    const modulePerms = typeof data.module_permissions === 'string' 
      ? JSON.parse(data.module_permissions)
      : data.module_permissions || {}

    const permissions = {
      userId: data.user_id || userId,
      userEmail: data.user_email,
      userName: data.user_name,
      userRole: data.user_role,
      isAdmin: data.is_admin || false,
      isSuperAdmin: data.is_super_admin || false,
      modulePermissions: modulePerms
    }

    return NextResponse.json({
      success: true,
      permissions
    })

  } catch (error) {
    console.error('Error in permissions API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}