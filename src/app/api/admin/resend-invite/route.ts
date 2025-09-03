import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    // Get the Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    // Verify the requester is authenticated and get their user info
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if requester is an admin
    const { data: requesterPermissions, error: permError } = await supabaseAdmin
      .from('user_permissions')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (permError || !requesterPermissions?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists in user_permissions (should exist for resend)
    const { data: existingUser, error: existingError } = await supabaseAdmin
      .from('user_permissions')
      .select('user_email, user_name, user_role, user_id')
      .eq('user_email', email)
      .single()

    if (existingError || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only resend if user hasn't accepted the invite yet (user_id is null)
    if (existingUser.user_id) {
      return NextResponse.json({ error: 'User has already accepted the invitation' }, { status: 400 })
    }

    // Resend Supabase Auth invitation email
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        name: existingUser.user_name || '',
        role: existingUser.user_role || ''
      }
    })

    if (inviteError) {
      console.error('Error resending invitation:', inviteError)
      return NextResponse.json({ error: 'Failed to resend invitation' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Invitation resent successfully',
      email: email
    })

  } catch (error) {
    console.error('Error in resend-invite API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}