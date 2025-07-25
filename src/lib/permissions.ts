import { createClient } from '@/lib/supabase/server'
import { UserPermissions } from '@/types'

export async function getUserPermissions(userId: string): Promise<UserPermissions | null> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return null
  }
}

export async function hasModulePermission(
  userId: string, 
  moduleId: string, 
  permission: 'read' | 'edit'
): Promise<boolean> {
  const permissions = await getUserPermissions(userId)
  
  if (!permissions) return false
  
  // Admins have all permissions
  if (permissions.isAdmin) return true
  
  // Check specific module permission
  const modulePermission = permissions.modulePermissions[moduleId]
  return modulePermission ? modulePermission[permission === 'read' ? 'canRead' : 'canEdit'] : false
}

export async function requireAuth() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}

export async function requireModulePermission(
  moduleId: string, 
  permission: 'read' | 'edit' = 'read'
) {
  const user = await requireAuth()
  
  const hasPermission = await hasModulePermission(user.id, moduleId, permission)
  
  if (!hasPermission) {
    throw new Error(`Insufficient permissions for module: ${moduleId}`)
  }

  return user
}