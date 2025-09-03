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

    // Generate password reset link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`
      }
    })

    if (linkError) {
      console.error('Error generating reset link:', linkError)
      return NextResponse.json({ error: 'Failed to generate password reset link' }, { status: 500 })
    }

    // Send custom email via Gmail API using Supabase Edge Function
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-gmail-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        to: email,
        subject: 'Reset your Callsheet password',
        setupUrl: linkData.properties?.action_link,
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