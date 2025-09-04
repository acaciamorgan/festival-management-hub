import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

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

    // Get the target user's information
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('user_permissions')
      .select('is_super_admin, user_id, id, user_email')
      .eq('id', userId)
      .single()

    if (targetError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Protect super admin accounts from deletion (only super admins can delete super admins)
    if (targetUser.is_super_admin && !requesterPermissions.is_super_admin) {
      return NextResponse.json({ error: 'Cannot delete super admin accounts' }, { status: 403 })
    }

    // Prevent self-deletion
    if (targetUser.id === requesterPermissions.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 })
    }

    // Always try to find and delete the auth user by email
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
    const authUserToDelete = authUsers?.find(u => u.email === targetUser.user_email)
    
    if (authUserToDelete) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserToDelete.id)
      if (authDeleteError) {
        console.error('Error deleting user from auth:', authDeleteError)
        // Continue anyway - we'll delete from permissions even if auth fails
      } else {
        console.log(`Successfully deleted auth user: ${authUserToDelete.email}`)
      }
    } else {
      console.log(`No auth user found for email: ${targetUser.user_email}`)
    }

    // Delete from user_permissions table
    const { error: permissionsDeleteError } = await supabaseAdmin
      .from('user_permissions')
      .delete()
      .eq('id', userId)

    if (permissionsDeleteError) {
      console.error('Error deleting user permissions:', permissionsDeleteError)
      return NextResponse.json({ error: 'Failed to delete user permissions' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'User deleted successfully',
      email: targetUser.user_email
    })

  } catch (error) {
    console.error('Error in delete-user API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}