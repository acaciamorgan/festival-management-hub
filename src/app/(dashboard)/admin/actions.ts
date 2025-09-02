'use server'

import { createClient } from '@/lib/supabase/server'

export async function inviteUser(formData: {
  name: string
  email: string
  role: string
  phone: string
}) {
  const supabase = await createClient()
  
  try {
    // Generate a secure temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
    
    // Create user with admin privileges (server-side)
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email: formData.email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        user_name: formData.name,
        user_role: formData.role,
        user_phone: formData.phone
      }
    })

    if (signUpError) throw signUpError

    const userId = signUpData.user?.id
    if (!userId) throw new Error('Failed to create user')
    
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
    return { success: false, error: error.message || 'Failed to send invitation' }
  }
}

export async function resendInvitation(email: string) {
  const supabase = await createClient()
  
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
    return { success: false, error: error.message || 'Failed to resend invitation' }
  }
}