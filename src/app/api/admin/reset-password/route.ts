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
      .select('is_admin, is_super_admin')
      .eq('user_id', user.id)
      .maybeSingle()

    if (permError || !requesterPermissions?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Validate email
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('user_permissions')
      .select('user_id, is_super_admin')
      .eq('user_email', email)
      .maybeSingle()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!targetUser.user_id) {
      return NextResponse.json({ error: 'User has not accepted invitation yet' }, { status: 400 })
    }

    // Protect super admin accounts (only super admins can reset super admin passwords)
    if (targetUser.is_super_admin && !requesterPermissions.is_super_admin) {
      return NextResponse.json({ error: 'Cannot reset super admin password' }, { status: 403 })
    }

    // Generate secure temporary password
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!${Math.floor(Math.random() * 9) + 1}`

    // Send email FIRST — if it fails, user keeps their current password
    const emailResponse = await fetch(`${process.env.GMAIL_EDGE_FUNCTION_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GMAIL_EDGE_FUNCTION_KEY}`
      },
      body: JSON.stringify({
        to: email,
        subject: 'Reset your Callsheet password',
        tempPassword: tempPassword,
        loginUrl: `https://callsheet.acaciaconsultinggroup.com/auth/login`,
        type: 'password_reset'
      })
    })

    if (!emailResponse.ok) {
      const emailError = await emailResponse.json()
      console.error('Error sending reset email:', emailError)
      return NextResponse.json({ error: 'Failed to send password reset email' }, { status: 500 })
    }

    // Email sent successfully — now update the password
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.user_id,
      {
        password: tempPassword,
        user_metadata: {
          needs_password_change: true
        }
      }
    )

    if (passwordError) {
      console.error('Error updating user password:', passwordError)
      return NextResponse.json({ error: 'Failed to update user password' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Password reset email sent successfully',
      email: email
    })

  } catch (error) {
    console.error('Error in reset-password API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}