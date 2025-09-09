'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { createClient } from '@/lib/supabase/client'
import { getAllModules } from '@/config/modules'
import { ModulePermission } from '@/types'
import { DraggableModal } from '@/components/ui/draggable-modal'

interface UserRecord {
  id: string
  user_id: string | null
  user_email: string
  user_name?: string
  user_role?: string
  user_phone?: string
  is_admin: boolean
  is_super_admin: boolean
  module_permissions: Record<string, ModulePermission>
  created_at: string
  updated_at: string
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const { permissions } = usePermissions()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // Add User Modal
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState('')
  const [newUserPhone, setNewUserPhone] = useState('')
  const [addingUser, setAddingUser] = useState(false)
  
  // Edit User Modal
  const [showEditUser, setShowEditUser] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [editUserName, setEditUserName] = useState('')
  const [editUserRole, setEditUserRole] = useState('')
  const [editUserPhone, setEditUserPhone] = useState('')
  const [updatingUser, setUpdatingUser] = useState(false)
  
  // Permissions Modal
  const [showPermissions, setShowPermissions] = useState(false)
  const [permissionsUser, setPermissionsUser] = useState<UserRecord | null>(null)
  const [userPermissions, setUserPermissions] = useState<Record<string, ModulePermission>>({})
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [updatingPermissions, setUpdatingPermissions] = useState(false)
  
  // Sorting and resizing state
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'user_name', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    user: 300,
    role: 200,
    access_level: 150,
    actions: 200
  })
  
  const supabase = createClient()
  const modules = getAllModules().filter(m => m.id !== 'admin')
  
  // Extract last name from user name for sorting
  const getLastName = (name: string | undefined): string => {
    if (!name) return ''
    const parts = name.trim().split(' ')
    return parts.length > 1 ? parts[parts.length - 1] : parts[0] || ''
  }
  
  // Sort users function
  const sortUsers = (usersToSort: UserRecord[], config: {key: string, direction: 'asc' | 'desc'} | null) => {
    if (!config) return usersToSort
    
    return [...usersToSort].sort((a, b) => {
      let aValue: string
      let bValue: string
      
      switch (config.key) {
        case 'user_name':
          aValue = getLastName(a.user_name || a.user_email)
          bValue = getLastName(b.user_name || b.user_email)
          break
        case 'user_email':
          aValue = a.user_email
          bValue = b.user_email
          break
        case 'user_role':
          aValue = a.user_role || ''
          bValue = b.user_role || ''
          break
        case 'access_level':
          aValue = a.is_super_admin ? 'super_admin' : a.is_admin ? 'admin' : 'user'
          bValue = b.is_super_admin ? 'super_admin' : b.is_admin ? 'admin' : 'user'
          break
        default:
          return 0
      }
      
      const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase())
      return config.direction === 'asc' ? comparison : -comparison
    })
  }
  
  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }
  
  // Get sort icon
  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return '↕️'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  // Handle column resize
  const handleColumnResize = (columnKey: string, newWidth: number) => {
    setColumnWidths(prev => ({ ...prev, [columnKey]: Math.max(100, newWidth) }))
  }

  // Resize handle component
  const ResizeHandle = ({ columnKey }: { columnKey: string }) => {
    const [isResizing, setIsResizing] = useState(false)
    const [startX, setStartX] = useState(0)
    const [startWidth, setStartWidth] = useState(0)

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      setStartX(e.clientX)
      setStartWidth(columnWidths[columnKey] || 150)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const diff = e.clientX - startX
      const newWidth = Math.max(100, startWidth + diff)
      handleColumnResize(columnKey, newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    React.useEffect(() => {
      if (isResizing) {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }
      }
    }, [isResizing, startX, startWidth])

    return (
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-300 bg-gray-300"
        onMouseDown={handleMouseDown}
      />
    )
  }

  useEffect(() => {
    if (!authLoading && permissions?.isAdmin) {
      loadUsers()
    }
  }, [authLoading, permissions])

  useEffect(() => {
    if (users.length > 0) {
      const sorted = sortUsers(users, sortConfig)
      setUsers(sorted)
    }
  }, [sortConfig])

  const loadUsers = async () => {
    setLoadingUsers(true)
    setError('')
    
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .order('user_email', { ascending: true })

      if (error) throw error
      
      // Parse module_permissions for each user
      const parsedUsers = (data || []).map(user => ({
        ...user,
        module_permissions: typeof user.module_permissions === 'string' 
          ? JSON.parse(user.module_permissions)
          : user.module_permissions || {}
      }))
      
      const sorted = sortUsers(parsedUsers, sortConfig)
      setUsers(sorted)
    } catch (err: any) {
      console.error('Error loading users:', err)
      setError(err.message || 'Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUserEmail) {
      setError('Email is required')
      return
    }

    setAddingUser(true)
    setError('')
    setSuccessMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: newUserEmail,
          name: newUserName,
          role: newUserRole,
          phone: newUserPhone
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to invite user')
      }

      setSuccessMessage(`Invitation sent to ${newUserEmail}`)
      
      // Close modal and reset form
      setShowAddUser(false)
      setNewUserEmail('')
      setNewUserName('')
      setNewUserRole('')
      setNewUserPhone('')
      
      await loadUsers()
    } catch (err: any) {
      setError(err.message || 'Failed to invite user')
    } finally {
      setAddingUser(false)
    }
  }

  const handleEditUser = (user: UserRecord) => {
    setEditingUser(user)
    setEditUserName(user.user_name || '')
    setEditUserRole(user.user_role || '')
    setEditUserPhone(user.user_phone || '')
    setShowEditUser(true)
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    setUpdatingUser(true)
    setError('')
    setSuccessMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: editingUser.user_id,
          email: editingUser.user_email,
          name: editUserName,
          role: editUserRole,
          phone: editUserPhone
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user')
      }

      setSuccessMessage('User updated successfully')
      setShowEditUser(false)
      setEditingUser(null)
      
      await loadUsers()
    } catch (err: any) {
      setError(err.message || 'Failed to update user')
    } finally {
      setUpdatingUser(false)
    }
  }

  const handleResendInvite = async (userEmail: string) => {
    setError('')
    setSuccessMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/admin/resend-invite', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email: userEmail })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend invitation')
      }

      setSuccessMessage(`Invitation resent to ${userEmail}`)
    } catch (err: any) {
      setError(err.message || 'Failed to resend invitation')
    }
  }

  const handleResetPassword = async (userEmail: string) => {
    if (!confirm(`Send password reset email to ${userEmail}?`)) {
      return
    }

    setError('')
    setSuccessMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email: userEmail })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send password reset')
      }

      setSuccessMessage(`Password reset email sent to ${userEmail}`)
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset')
    }
  }

  const handleManagePermissions = (user: UserRecord) => {
    setPermissionsUser(user)
    setUserPermissions(user.module_permissions || {})
    setIsAdminUser(user.is_admin)
    setShowPermissions(true)
  }

  const handlePermissionChange = (moduleId: string, permission: 'canRead' | 'canEdit', value: boolean) => {
    setUserPermissions(prev => {
      const currentPerms = prev[moduleId] || { canRead: false, canEdit: false }
      
      if (permission === 'canRead') {
        return {
          ...prev,
          [moduleId]: {
            ...currentPerms,
            canRead: value,
            // If disabling read, also disable edit
            canEdit: !value ? false : currentPerms.canEdit
          }
        }
      } else if (permission === 'canEdit') {
        return {
          ...prev,
          [moduleId]: {
            ...currentPerms,
            canEdit: value,
            // If enabling edit, also enable read
            canRead: value ? true : currentPerms.canRead
          }
        }
      }
      
      return prev
    })
  }

  const handleUpdatePermissions = async () => {
    if (!permissionsUser) return

    setUpdatingPermissions(true)
    setError('')
    setSuccessMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/admin/update-permissions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: permissionsUser.id,
          email: permissionsUser.user_email,
          modulePermissions: userPermissions,
          isAdmin: isAdminUser
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update permissions')
      }

      setSuccessMessage('Permissions updated successfully')
      setShowPermissions(false)
      setPermissionsUser(null)
      
      await loadUsers()
    } catch (err: any) {
      setError(err.message || 'Failed to update permissions')
    } finally {
      setUpdatingPermissions(false)
    }
  }

  const handleDeleteUser = async (user: UserRecord) => {
    if (!confirm(`Are you sure you want to delete ${user.user_name || user.user_email}? This action cannot be undone.`)) {
      return
    }

    setError('')
    setSuccessMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.user_email
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      setSuccessMessage('User deleted successfully')
      await loadUsers()
    } catch (err: any) {
      setError(err.message || 'Failed to delete user')
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!permissions?.isAdmin) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Access denied. Admin privileges required.
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddUser(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Invite User
            </button>
            <button
              onClick={loadUsers}
              disabled={loadingUsers}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingUsers ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="px-6 py-3 bg-green-50 border-b border-green-200">
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-gray-200"
                  style={{ minWidth: `${columnWidths.user}px` }}
                  onClick={() => handleSort('user_name')}
                >
                  <div className="flex items-center justify-between">
                    <span>User (by Last Name)</span>
                    <span className="text-gray-400 ml-1">
                      {getSortIcon('user_name')}
                    </span>
                  </div>
                  <ResizeHandle columnKey="user" />
                </th>
                <th 
                  className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-gray-200"
                  style={{ minWidth: `${columnWidths.role}px` }}
                  onClick={() => handleSort('user_role')}
                >
                  <div className="flex items-center justify-between">
                    <span>Role</span>
                    <span className="text-gray-400 ml-1">
                      {getSortIcon('user_role')}
                    </span>
                  </div>
                  <ResizeHandle columnKey="role" />
                </th>
                <th 
                  className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-gray-200"
                  style={{ minWidth: `${columnWidths.access_level}px` }}
                  onClick={() => handleSort('access_level')}
                >
                  <div className="flex items-center justify-between">
                    <span>Access Level</span>
                    <span className="text-gray-400 ml-1">
                      {getSortIcon('access_level')}
                    </span>
                  </div>
                  <ResizeHandle columnKey="access_level" />
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ minWidth: `${columnWidths.actions}px` }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(userRecord => {
                const isSuperAdmin = userRecord.is_super_admin
                const isCurrentUser = userRecord.user_email === user?.email
                
                return (
                  <tr key={userRecord.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100" style={{ minWidth: `${columnWidths.user}px` }}>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {userRecord.user_name || 'Unnamed User'}
                        </div>
                        <div className="text-sm text-gray-500">{userRecord.user_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100" style={{ minWidth: `${columnWidths.role}px` }}>
                      <div className="text-sm text-gray-900">{userRecord.user_role || '—'}</div>
                      {userRecord.user_phone && (
                        <div className="text-sm text-gray-500">{userRecord.user_phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100" style={{ minWidth: `${columnWidths.access_level}px` }}>
                      {isSuperAdmin ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          Super Admin
                        </span>
                      ) : userRecord.is_admin ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" style={{ minWidth: `${columnWidths.actions}px` }}>
                      <div className="flex justify-end gap-2">
                        {!userRecord.user_id && (
                          <button
                            onClick={() => handleResendInvite(userRecord.user_email)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Resend
                          </button>
                        )}
                        {userRecord.user_id && !isSuperAdmin && (
                          <button
                            onClick={() => handleResetPassword(userRecord.user_email)}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Reset Password
                          </button>
                        )}
                        {!isSuperAdmin && (
                          <>
                            <button
                              onClick={() => handleEditUser(userRecord)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleManagePermissions(userRecord)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Permissions
                            </button>
                            {!isCurrentUser && (
                              <button
                                onClick={() => handleDeleteUser(userRecord)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                        {isSuperAdmin && (
                          <span className="text-gray-400 italic">Protected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <DraggableModal>
          <div className="max-w-md w-full">
            <div className="px-6 py-4 border-b modal-header cursor-move">
              <h3 className="text-lg font-medium">Invite New User</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role/Title
                  </label>
                  <input
                    type="text"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., Festival Coordinator"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="555-0123"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddUser(false)
                  setNewUserEmail('')
                  setNewUserName('')
                  setNewUserRole('')
                  setNewUserPhone('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={addingUser || !newUserEmail}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {addingUser ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Edit User Modal */}
      {showEditUser && editingUser && (
        <DraggableModal>
          <div className="max-w-md w-full">
            <div className="px-6 py-4 border-b modal-header cursor-move">
              <h3 className="text-lg font-medium">Edit User</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editingUser.user_email}
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role/Title
                  </label>
                  <input
                    type="text"
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., Festival Coordinator"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editUserPhone}
                    onChange={(e) => setEditUserPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="555-0123"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditUser(false)
                  setEditingUser(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={updatingUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updatingUser ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Permissions Modal */}
      {showPermissions && permissionsUser && (
        <DraggableModal>
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b modal-header cursor-move flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Manage Permissions - {permissionsUser.user_name || permissionsUser.user_email}
              </h3>
              <button
                onClick={() => {
                  setShowPermissions(false)
                  setPermissionsUser(null)
                }}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold w-6 h-6 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Admin Toggle */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-medium">Administrator Access</div>
                      <div className="text-sm text-gray-500">
                        Administrators have full access to all modules and can manage other users
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isAdminUser}
                      onChange={(e) => setIsAdminUser(e.target.checked)}
                      className="h-5 w-5 text-blue-600 rounded"
                    />
                  </label>
                </div>

                {/* Module Permissions */}
                {!isAdminUser && (
                  <div>
                    <h4 className="font-medium mb-4">Module Permissions</h4>
                    <div className="space-y-2">
                      {modules.map(module => {
                        const perms = userPermissions[module.id] || { canRead: false, canEdit: false }
                        return (
                          <div key={module.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{module.name}</span>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={perms.canRead}
                                    onChange={(e) => handlePermissionChange(module.id, 'canRead', e.target.checked)}
                                    className="h-4 w-4 text-blue-600 rounded"
                                  />
                                  <span className="text-sm">Read</span>
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={perms.canEdit}
                                    onChange={(e) => handlePermissionChange(module.id, 'canEdit', e.target.checked)}
                                    className="h-4 w-4 text-blue-600 rounded"
                                  />
                                  <span className="text-sm">Edit</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPermissions(false)
                  setPermissionsUser(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePermissions}
                disabled={updatingPermissions}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updatingPermissions ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}