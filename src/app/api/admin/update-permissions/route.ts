import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  return handleUpdatePermissions(request)
}

export async function PUT(request: Request) {
  return handleUpdatePermissions(request)
}

async function handleUpdatePermissions(request: Request) {
  try {
    const body = await request.json()
    console.log('Update permissions request body:', body)
    const { userId, modulePermissions, isAdmin } = body

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
      .select('is_admin, is_super_admin, id')
      .eq('user_id', user.id)
      .single()

    if (permError || !requesterPermissions?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get the target user's current permissions
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('user_permissions')
      .select('is_super_admin, is_admin, id, user_email')
      .eq('id', userId)
      .single()

    if (targetError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Protect super admin accounts from modification (only super admins can modify super admins)
    if (targetUser.is_super_admin && !requesterPermissions.is_super_admin) {
      return NextResponse.json({ error: 'Cannot modify super admin permissions' }, { status: 403 })
    }

    // Prevent self-demotion: admin cannot remove their own admin status
    if (targetUser.id === requesterPermissions.id && targetUser.is_admin && isAdmin === false) {
      return NextResponse.json({ error: 'Cannot remove your own admin privileges' }, { status: 403 })
    }

    // Prepare update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (modulePermissions !== undefined) {
      updateData.module_permissions = modulePermissions
    }

    if (isAdmin !== undefined) {
      updateData.is_admin = isAdmin
    }

    // Update user_permissions record
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('user_permissions')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user permissions:', updateError)
      return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Permissions updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.user_email,
        name: updatedUser.user_name,
        role: updatedUser.user_role,
        phone: updatedUser.phone,
        isAdmin: updatedUser.is_admin,
        isSuperAdmin: updatedUser.is_super_admin,
        modulePermissions: updatedUser.module_permissions
      }
    })

  } catch (error) {
    console.error('Error in update-permissions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}