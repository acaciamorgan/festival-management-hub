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

    // Verify user exists (user_id should always exist now)
    if (!existingUser.user_id) {
      return NextResponse.json({ error: 'Invalid user state - missing user ID' }, { status: 400 })
    }

    // Get sender's information for email
    const { data: senderInfo, error: senderError } = await supabaseAdmin
      .from('user_permissions')
      .select('user_name, user_email')
      .eq('user_id', user.id)
      .single()

    const senderName = senderInfo?.user_name || user.email || 'Administrator'
    const senderEmail = senderInfo?.user_email || user.email

    // Auth user already exists - no need to create again

    // Generate new temporary password for resend
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!${Math.floor(Math.random() * 9) + 1}`
    
    // Update the user's password
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.user_id,
      { password: tempPassword }
    )
    
    if (passwordError) {
      console.error('Error updating password:', passwordError)
      return NextResponse.json({ error: 'Failed to generate new password' }, { status: 500 })
    }

    // Send custom email with new temporary password via Gmail API
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-gmail-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        to: email,
        subject: `Reminder: You're invited to join Callsheet - Chicago International Film Festival`,
        tempPassword: tempPassword,
        loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/login`,
        type: 'invite_with_password'
      })
    })

    if (!emailResponse.ok) {
      const emailError = await emailResponse.json()
      console.error('Error resending invitation email:', emailError)
      return NextResponse.json({ error: 'Failed to resend invitation email' }, { status: 500 })
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