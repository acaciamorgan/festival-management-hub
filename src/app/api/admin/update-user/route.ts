import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { userId, name, role, phone } = await request.json()

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
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get the target user's current permissions to check for super admin protection
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('user_permissions')
      .select('is_super_admin, user_email')
      .eq('id', userId)
      .single()

    if (targetError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Protect super admin accounts from modification (only super admins can modify super admins)
    if (targetUser.is_super_admin && !requesterPermissions.is_super_admin) {
      return NextResponse.json({ error: 'Cannot modify super admin accounts' }, { status: 403 })
    }

    // Prepare update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.user_name = name
    if (role !== undefined) updateData.user_role = role
    if (phone !== undefined) updateData.user_phone = phone

    // Update user_permissions record
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('user_permissions')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.user_email,
        name: updatedUser.user_name,
        role: updatedUser.user_role,
        phone: updatedUser.user_phone,
        isAdmin: updatedUser.is_admin,
        isSuperAdmin: updatedUser.is_super_admin
      }
    })

  } catch (error) {
    console.error('Error in update-user API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}