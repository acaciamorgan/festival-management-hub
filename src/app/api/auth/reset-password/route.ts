import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    // Validate email
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('user_permissions')
      .select('user_id, user_email')
      .eq('user_email', email)
      .single()

    if (userError || !existingUser) {
      return NextResponse.json({ error: 'No account found with this email address' }, { status: 404 })
    }

    // Generate secure temporary password
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!${Math.floor(Math.random() * 9) + 1}`
    
    // Update the user's password to the temporary password
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.user_id,
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

    // Send custom email via Gmail API using Supabase Edge Function
    const emailResponse = await fetch(`https://xqzjthbearpqcrzfdfer.supabase.co/functions/v1/send-gmail-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk`
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

    return NextResponse.json({ 
      message: 'Password reset email sent successfully'
    })

  } catch (error) {
    console.error('Error in reset-password API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}