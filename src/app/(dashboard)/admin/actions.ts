'use server'

import { createClient } from '@supabase/supabase-js'

// Create admin client with service role key for admin operations
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

export async function inviteUser(formData: {
  name: string
  email: string
  role: string
  phone: string
}) {
  const supabase = createAdminClient()
  
  try {
    // Check if user already exists in auth
    const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserByEmail(formData.email)
    
    let userId: string
    
    if (existingUser.user) {
      // User exists in auth, use their ID
      userId = existingUser.user.id
    } else {
      // Create new user in auth
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
    
    // Create user_permissions record  
    const { error: permError } = await supabase
      .from('user_permissions')
      .insert({
        user_id: userId,
        user_email: formData.email,
        user_name: formData.name,
        user_role: formData.role,
        user_phone: formData.phone,
        is_admin: false,
        module_permissions: {
          festivalOverview: { canRead: true, canEdit: false }
        }
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

export async function deleteUser(userId: string) {
  const supabase = createAdminClient()
  
  try {
    // Delete from user_permissions table first
    const { error: permError } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)

    if (permError) throw permError

    // Delete from Supabase Auth using admin client
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    if (authError) throw authError

    return { success: true }
    
  } catch (error: any) {
    console.error('Server-side delete error:', error)
    return { success: false, error: error.message || 'Failed to delete user' }
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