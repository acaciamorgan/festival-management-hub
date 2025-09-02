'use server'

import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Create admin client with service role key for admin operations
function createAdminClient() {
  console.log('Admin client ENV check:', {
    url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
    keyStart: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20)
  })
  
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

export async function inviteUser(formData: {
  name: string
  email: string
  role: string
  phone: string
}) {
  const supabase = createAdminClient()
  
  try {
    // Test admin access first
    const { data: testData, error: testError } = await supabase.auth.admin.listUsers()
    
    if (testError) {
      console.error('Admin test failed:', testError)
      throw new Error(`Admin auth failed: ${testError.message}`)
    }
    
    console.log('Admin test successful, users found:', testData.users.length)
    
    // First, check if user already exists
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(formData.email)
    
    let userId: string
    
    if (existingUser.user) {
      // User exists, just use their ID
      userId = existingUser.user.id
    } else {
      // Create user without password - they'll set it via recovery link
      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: formData.email,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          user_name: formData.name,
          user_role: formData.role,
          user_phone: formData.phone
        }
      })

      if (signUpError) throw signUpError
      userId = signUpData.user?.id || ''
      if (!userId) throw new Error('Failed to create user')
    }
    
    // Create or update user_permissions record
    const { error: permError } = await supabase
      .from('user_permissions')
      .upsert({
        user_id: userId,
        user_email: formData.email,
        user_name: formData.name,
        user_role: formData.role,
        user_phone: formData.phone,
        is_admin: false,
        module_permissions: {
          festivalOverview: { canRead: true, canEdit: false }
        }
      }, {
        onConflict: 'user_id'
      })

    if (permError) throw permError

    // Generate proper password reset link using admin privileges
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: formData.email,
      options: {
        redirectTo: 'https://callsheet.acaciaconsultinggroup.com/auth/reset-password'
      }
    })

    if (resetError || !resetData.properties?.action_link) {
      throw new Error('Failed to generate password reset link: ' + resetError?.message)
    }

    // Send email via Edge Function
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-gmail-email', {
      body: {
        to: formData.email,
        subject: 'Register your Callsheet account today!',
        setupUrl: resetData.properties.action_link,
        type: 'invitation'
      }
    })

    if (emailError) throw emailError
    if (emailData?.error) throw new Error(emailData.error)

    return { success: true, email: formData.email }
    
  } catch (error: any) {
    console.error('Server-side invite error:', error)
    // Return more specific error messages
    if (error.message?.includes('admin')) {
      return { success: false, error: 'Admin permissions required. Check server configuration.' }
    }
    if (error.message?.includes('EMAIL')) {
      return { success: false, error: 'Email service error. Please try again.' }
    }
    return { success: false, error: error.message || 'Failed to send invitation' }
  }
}

export async function resendInvitation(email: string) {
  const supabase = createAdminClient()
  
  try {
    // Generate new password reset link
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

    // Send email
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-gmail-email', {
      body: {
        to: email,
        subject: 'Reset your Callsheet password',
        setupUrl: resetData.properties.action_link,
        type: 'password_reset'
      }
    })

    if (emailError) throw emailError
    if (emailData?.error) throw new Error(emailData.error)

    return { success: true }
    
  } catch (error: any) {
    console.error('Server-side resend error:', error)
    // Return more specific error messages
    if (error.message?.includes('admin')) {
      return { success: false, error: 'Admin permissions required. Check server configuration.' }
    }
    if (error.message?.includes('EMAIL')) {
      return { success: false, error: 'Email service error. Please try again.' }
    }
    return { success: false, error: error.message || 'Failed to resend invitation' }
  }
}