import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { email, name, role, phone, modulePermissions } = await request.json()

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
      .single()

    if (permError || !requesterPermissions?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Validate required fields
    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 })
    }

    // Check if user already exists in user_permissions
    const { data: existingUser, error: existingError } = await supabaseAdmin
      .from('user_permissions')
      .select('id')
      .eq('user_email', email)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    // Create user_permissions record first (for pending invites)
    const { data: permissionsRecord, error: permissionsError } = await supabaseAdmin
      .from('user_permissions')
      .insert({
        user_id: null, // Will be null until they accept the invite
        user_email: email,
        user_name: name,
        user_role: role || null,
        phone: phone || null,
        is_admin: false,
        is_super_admin: false,
        module_permissions: modulePermissions || {}
      })
      .select()
      .single()

    if (permissionsError) {
      console.error('Error creating permissions record:', permissionsError)
      return NextResponse.json({ error: 'Failed to create user permissions' }, { status: 500 })
    }

    // Get sender's information for email
    const { data: senderInfo, error: senderError } = await supabaseAdmin
      .from('user_permissions')
      .select('user_name, user_email')
      .eq('user_id', user.id)
      .single()

    const senderName = senderInfo?.user_name || user.email || 'Administrator'
    const senderEmail = senderInfo?.user_email || user.email

    // Send Supabase Auth invitation email with sender information
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        name: name,
        role: role || null,
        invited_by_name: senderName,
        invited_by_email: senderEmail,
        organization: 'Film Festival Management'
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    })

    if (inviteError) {
      console.error('Error sending invitation:', inviteError)
      
      // Clean up the permissions record if invite fails
      await supabaseAdmin
        .from('user_permissions')
        .delete()
        .eq('id', permissionsRecord.id)

      return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'User invited successfully',
      user: {
        id: permissionsRecord.id,
        email: email,
        name: name,
        role: role,
        phone: phone,
        invited: true
      }
    })

  } catch (error) {
    console.error('Error in invite-user API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}