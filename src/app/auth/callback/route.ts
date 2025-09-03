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

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(errorDescription || error)}`)
  }

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent('Failed to complete authentication')}`)
    }

    const user = data.user
    if (user) {
      // Update the user_permissions record to link the new user_id
      const { error: updateError } = await supabaseAdmin
        .from('user_permissions')
        .update({ 
          user_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('user_email', user.email)

      if (updateError) {
        console.error('Error linking user to permissions:', updateError)
      }
    }

    // Redirect to the main app
    return NextResponse.redirect(`${origin}/modules/festival-overview`)
  }

  // No code, redirect to login
  return NextResponse.redirect(`${origin}/auth/login`)
}