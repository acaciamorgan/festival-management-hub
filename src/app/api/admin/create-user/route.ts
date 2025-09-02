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
    const { name, email, role, phone } = await request.json()
    
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Create user in Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: {
        user_name: name,
        user_role: role,
        user_phone: phone
      }
    })

    if (signUpError) {
      if (signUpError.message?.includes('already been registered')) {
        return NextResponse.json(
          { success: false, error: 'A user with this email address already exists' },
          { status: 400 }
        )
      }
      throw signUpError
    }
    
    const userId = signUpData.user?.id
    if (!userId) {
      throw new Error('Failed to create user')
    }

    // Create user_permissions record
    const { error: permError } = await supabase
      .from('user_permissions')
      .insert({
        user_id: userId,
        user_email: email,
        user_name: name,
        user_role: role,
        user_phone: phone,
        is_admin: false,
        module_permissions: {
          festivalOverview: { canRead: true, canEdit: false }
        }
      })

    if (permError) throw permError

    // Generate password reset link
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://callsheet.acaciaconsultinggroup.com/auth/reset-password'
      }
    })

    if (resetError || !resetData.properties?.action_link) {
      throw new Error('Failed to generate password reset link: ' + resetError?.message)
    }

    // Send invitation email
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-gmail-email', {
      body: {
        to: email,
        subject: 'Register your Callsheet account today!',
        setupUrl: resetData.properties.action_link,
        type: 'invitation'
      }
    })

    if (emailError) throw emailError
    if (emailData?.error) throw new Error(emailData.error)

    return NextResponse.json({ 
      success: true, 
      email: email,
      message: 'User created and invitation sent successfully'
    })
    
  } catch (error: any) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}