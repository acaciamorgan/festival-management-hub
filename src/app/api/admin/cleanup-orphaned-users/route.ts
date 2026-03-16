import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
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

    // Check if requester is a super admin
    const { data: requesterPermissions, error: permError } = await supabaseAdmin
      .from('user_permissions')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .maybeSingle()

    if (permError || !requesterPermissions?.is_super_admin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    // Get all Auth users
    const { data: authUsers, error: authError2 } = await supabaseAdmin.auth.admin.listUsers()
    if (authError2) {
      console.error('Error listing Auth users:', authError2)
      return NextResponse.json({ error: 'Failed to list Auth users' }, { status: 500 })
    }

    // Get all emails from user_permissions table
    const { data: permissionUsers, error: permError2 } = await supabaseAdmin
      .from('user_permissions')
      .select('user_email')

    if (permError2) {
      console.error('Error listing permission users:', permError2)
      return NextResponse.json({ error: 'Failed to list permission users' }, { status: 500 })
    }

    const validEmails = new Set(permissionUsers.map(u => u.user_email))
    const orphanedUsers = authUsers.users.filter(authUser => 
      authUser.email && !validEmails.has(authUser.email)
    )

    console.log('Found orphaned users:', orphanedUsers.map(u => u.email))

    // Delete orphaned Auth users
    const deletedUsers = []
    for (const orphanedUser of orphanedUsers) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(orphanedUser.id)
      if (deleteError) {
        console.error(`Failed to delete orphaned user ${orphanedUser.email}:`, deleteError)
      } else {
        deletedUsers.push(orphanedUser.email)
        console.log(`Deleted orphaned user: ${orphanedUser.email}`)
      }
    }

    return NextResponse.json({
      message: `Cleanup completed. Deleted ${deletedUsers.length} orphaned users.`,
      deletedUsers
    })

  } catch (error) {
    console.error('Error in cleanup API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}