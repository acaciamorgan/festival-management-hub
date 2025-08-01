'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { getAllModules } from '@/config/modules'

interface UserPermissionRecord {
  id: string
  user_id: string
  user_email: string
  user_name?: string
  user_role?: string
  user_phone?: string
  is_admin: boolean
  module_permissions: Record<string, { canRead: boolean; canEdit: boolean }>
  created_at: string
  updated_at: string
}

export default function AdminPage() {
  const { user, permissions, loading } = useAuth()
  const [users, setUsers] = useState<UserPermissionRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [error, setError] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserPermissionRecord | null>(null)
  const [editingUser, setEditingUser] = useState<UserPermissionRecord | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState('')
  const [newUserPhone, setNewUserPhone] = useState('')
  const [invitingUser, setInvitingUser] = useState(false)
  const [invitationResult, setInvitationResult] = useState<{email: string, tempPassword: string} | null>(null)
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'user_name', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const supabase = createClient()
  const modules = getAllModules()

  // Format phone number to 123-456-7890 format as user types
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    
    if (cleaned.length === 0) return ''
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
    if (cleaned.length <= 10) return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    
    // If more than 10 digits, only use first 10
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  // No mock data - we'll work with real data or nothing

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoadingUsers(true)
    setError('')
    
    try {
      // Try real database query with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database timeout')), 3000)
      })
      
      const queryPromise = supabase
        .from('user_permissions')
        .select('*')

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      if (error) {
        console.error('Database error:', error)
        setError(`Database error: ${error.message}`)
        setUsers([])
      } else if (data) {
        console.log('Loaded users from database:', data)
        console.log('First user data:', data[0]) // Debug specific user
        // Parse module_permissions if it's a string
        const parsedUsers = data.map((user: any) => ({
          ...user,
          module_permissions: typeof user.module_permissions === 'string' 
            ? JSON.parse(user.module_permissions) 
            : user.module_permissions || {}
        }))
        setUsers(parsedUsers)
      } else {
        setUsers([])
      }
      
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Database connection timeout - check Supabase configuration')
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  // Sort users function
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return '↕️'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  // Sort users by last name
  const sortedUsers = useMemo(() => {
    if (!sortConfig) return users

    return [...users].sort((a, b) => {
      let aVal: any, bVal: any

      if (sortConfig.key === 'user_name') {
        // Sort by last name, then first name
        const aName = a.user_name || a.user_email || ''
        const bName = b.user_name || b.user_email || ''
        
        // Split names and get last word as last name
        const aNameParts = aName.trim().split(' ')
        const bNameParts = bName.trim().split(' ')
        
        // If only one word, use the whole name. Otherwise use the last word.
        const aLastName = aNameParts.length > 1 ? aNameParts[aNameParts.length - 1] : aName
        const bLastName = bNameParts.length > 1 ? bNameParts[bNameParts.length - 1] : bName
        
        const aFirstName = aNameParts.length > 1 ? aNameParts[0] : ''
        const bFirstName = bNameParts.length > 1 ? bNameParts[0] : ''
        
        // Compare last names first
        const lastNameCompare = aLastName.toLowerCase().localeCompare(bLastName.toLowerCase())
        if (lastNameCompare !== 0) {
          return sortConfig.direction === 'asc' ? lastNameCompare : -lastNameCompare
        }
        
        // If last names are the same, compare first names
        const firstNameCompare = aFirstName.toLowerCase().localeCompare(bFirstName.toLowerCase())
        return sortConfig.direction === 'asc' ? firstNameCompare : -firstNameCompare
      } else {
        aVal = a[sortConfig.key as keyof UserPermissionRecord] || ''
        bVal = b[sortConfig.key as keyof UserPermissionRecord] || ''
      }

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const result = aVal.localeCompare(bVal)
        return sortConfig.direction === 'asc' ? result : -result
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [users, sortConfig])

  const handlePermissionToggle = async (userId: string, moduleId: string, permission: 'read' | 'edit') => {
    try {
      // TODO: Replace with real database update when connection is fixed
      console.log(`Would toggle ${permission} permission for user ${userId} on module ${moduleId}`)
      
      // Update local state and selected user
      setUsers(prev => prev.map(u => {
        if (u.user_id === userId) {
          const newPermissions = { ...u.module_permissions }
          if (!newPermissions[moduleId]) {
            newPermissions[moduleId] = { canRead: false, canEdit: false }
          }
          
          const currentValue = newPermissions[moduleId]
          console.log(`Current ${moduleId} ${permission}:`, currentValue)
          
          if (permission === 'read') {
            const newReadValue = !currentValue.canRead
            newPermissions[moduleId] = {
              canRead: newReadValue,
              canEdit: newReadValue ? currentValue.canEdit : false
            }
          } else {
            const newEditValue = !currentValue.canEdit
            newPermissions[moduleId] = {
              canRead: newEditValue ? true : currentValue.canRead,
              canEdit: newEditValue
            }
          }
          
          console.log(`New ${moduleId} permissions:`, newPermissions[moduleId])
          
          return { ...u, module_permissions: newPermissions }
        }
        return u
      }))
      
    } catch (err) {
      console.error('Error updating permission:', err)
      setError('Failed to update permission')
    }
  }

  const handleAdminToggle = async (userId: string) => {
    try {
      const currentUser = users.find(u => u.user_id === userId)
      if (!currentUser) return

      const { error } = await supabase
        .from('user_permissions')
        .update({ 
          is_admin: !currentUser.is_admin,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) throw error

      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, is_admin: !u.is_admin } : u
      ))
      
    } catch (err) {
      console.error('Error updating admin status:', err)
      setError('Failed to update admin status')
    }
  }

  const handleInviteUser = async () => {
    if (!newUserName || !newUserEmail) {
      setError('Name and email are required')
      return
    }

    setInvitingUser(true)
    setError('')

    try {
      // Since admin API requires service role key, we'll create a pre-approved user record
      // The user can then sign up normally and their account will be linked to this record
      
      // First, generate a unique temporary user ID using UUID format (we'll update this when they actually sign up)
      const tempUserId = crypto.randomUUID()
      
      // Create user_permissions record with pending status
      const { error: permError } = await supabase
        .from('user_permissions')
        .insert({
          user_id: tempUserId,
          user_email: newUserEmail,
          user_name: newUserName,
          user_role: newUserRole,
          user_phone: newUserPhone,
          is_admin: false,
          module_permissions: {
            festivalOverview: { canRead: true, canEdit: false }
          }
        })

      if (permError) throw permError

      // Show popup with instructions for manual account creation
      setInvitationResult({
        email: newUserEmail,
        tempPassword: 'MANUAL_SIGNUP_REQUIRED'
      })

      // Refresh users list
      await loadUsers()
      
      // Reset form
      setNewUserEmail('')
      setNewUserName('')
      setNewUserRole('')
      setNewUserPhone('')
      setShowAddUser(false)
      
    } catch (err: any) {
      console.error('Error creating user record:', err)
      setError(err.message || 'Failed to create user record')
    } finally {
      setInvitingUser(false)
    }
  }

  const handleEditUser = async () => {
    if (!editingUser) return

    try {
      const { error } = await supabase
        .from('user_permissions')
        .update({
          user_name: editingUser.user_name,
          user_role: editingUser.user_role,
          user_phone: editingUser.user_phone,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', editingUser.user_id)

      if (error) throw error

      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === editingUser.user_id ? editingUser : u
      ))

      setEditingUser(null)
      console.log('User details updated successfully')
    } catch (err: any) {
      console.error('Error updating user:', err)
      setError(err.message || 'Failed to update user')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Loading admin interface...</div>
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">👥</span>
            <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAddUser(true)}
              className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
            >
              Pre-Approve User
            </button>
            <button
              onClick={loadUsers}
              disabled={loadingUsers}
              className="px-4 py-2 rounded-md transition-colors font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {loadingUsers ? 'Loading...' : 'Refresh Users'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)]">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { key: 'user_name', label: 'Name', width: 200, sortable: true },
                    { key: 'user_email', label: 'Email', width: 250, sortable: true },
                    { key: 'user_role', label: 'Role', width: 180, sortable: true },
                    { key: 'user_phone', label: 'Phone', width: 150, sortable: true },
                    { key: 'is_admin', label: 'Access Level', width: 120, sortable: false },
                    { key: 'actions', label: 'Actions', width: 200, sortable: false }
                  ].map((column) => (
                    <th
                      key={column.key}
                      className={`relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 ${
                        column.sortable ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'
                      }`}
                      style={{ 
                        minWidth: `${columnWidths[column.key] || column.width}px`,
                        width: `${columnWidths[column.key] || column.width}px`
                      }}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{column.label}</span>
                        {column.sortable && (
                          <span className="text-gray-400 ml-1">
                            {getSortIcon(column.key)}
                          </span>
                        )}
                      </div>
                      
                      {/* Resize Handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 hover:opacity-100"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          const startX = e.clientX
                          const startWidth = columnWidths[column.key] || column.width
                          
                          const handleMouseMove = (e: MouseEvent) => {
                            const newWidth = Math.max(50, startWidth + (e.clientX - startX))
                            setColumnWidths(prev => ({ ...prev, [column.key]: newWidth }))
                          }
                          
                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove)
                            document.removeEventListener('mouseup', handleMouseUp)
                          }
                          
                          document.addEventListener('mousemove', handleMouseMove)
                          document.addEventListener('mouseup', handleMouseUp)
                        }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedUsers.map((userRecord) => (
                  <tr key={userRecord.id} className="hover:bg-gray-50">
                    <td 
                      className="px-3 py-2 border-r border-gray-100"
                      style={{ 
                        minWidth: `${columnWidths['user_name'] || 200}px`,
                        width: `${columnWidths['user_name'] || 200}px`
                      }}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {userRecord.user_name || 'No name'}
                      </div>
                    </td>
                    <td 
                      className="px-3 py-2 border-r border-gray-100"
                      style={{ 
                        minWidth: `${columnWidths['user_email'] || 250}px`,
                        width: `${columnWidths['user_email'] || 250}px`
                      }}
                    >
                      <div className="text-sm text-blue-600">
                        {userRecord.user_email || 'Missing email'}
                      </div>
                    </td>
                    <td 
                      className="px-3 py-2 border-r border-gray-100"
                      style={{ 
                        minWidth: `${columnWidths['user_role'] || 180}px`,
                        width: `${columnWidths['user_role'] || 180}px`
                      }}
                    >
                      <div className="text-sm text-gray-600">{userRecord.user_role || '—'}</div>
                    </td>
                    <td 
                      className="px-3 py-2 border-r border-gray-100"
                      style={{ 
                        minWidth: `${columnWidths['user_phone'] || 150}px`,
                        width: `${columnWidths['user_phone'] || 150}px`
                      }}
                    >
                      <div className="text-sm text-gray-600">
                      {userRecord.user_phone ? formatPhoneNumber(userRecord.user_phone) : '—'}
                    </div>
                    </td>
                    <td 
                      className="px-3 py-2 border-r border-gray-100"
                      style={{ 
                        minWidth: `${columnWidths['is_admin'] || 120}px`,
                        width: `${columnWidths['is_admin'] || 120}px`
                      }}
                    >
                      <button
                        onClick={() => handleAdminToggle(userRecord.user_id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          userRecord.is_admin
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {userRecord.is_admin ? 'Admin' : 'User'}
                      </button>
                    </td>
                    <td 
                      className="px-3 py-2"
                      style={{ 
                        minWidth: `${columnWidths['actions'] || 200}px`,
                        width: `${columnWidths['actions'] || 200}px`
                      }}
                    >
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingUser(userRecord)}
                          className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-md transition-colors"
                        >
                          Edit Details
                        </button>
                        <button
                          onClick={() => setSelectedUser(userRecord)}
                          className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-md transition-colors"
                        >
                          Permissions
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedUsers.length === 0 && !loadingUsers && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500">Start by pre-approving a user</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">Edit User Details</h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editingUser.user_name || ''}
                    onChange={(e) => setEditingUser({...editingUser, user_name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Full Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editingUser.user_email}
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">Email cannot be changed</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role/Title
                  </label>
                  <input
                    type="text"
                    value={editingUser.user_role || ''}
                    onChange={(e) => setEditingUser({...editingUser, user_role: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., Festival Coordinator, Press Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editingUser.user_phone || ''}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value)
                      setEditingUser({...editingUser, user_phone: formatted})
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="123-456-7890"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium">Pre-Approve New User</h3>
              </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Full Name"
                    autoComplete="off"
                    required
                  />
                </div>

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
                    autoComplete="new-email"
                    required
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
                    placeholder="e.g., Festival Coordinator, Press Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(formatPhoneNumber(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="123-456-7890"
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  A user record will be pre-approved for this email address. The user can then sign up normally and will automatically receive the configured permissions. They'll have read-only access to Festival Overview by default.
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddUser(false)
                  setNewUserEmail('')
                  setNewUserName('')
                  setNewUserRole('')
                  setNewUserPhone('')
                  setError('')
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                disabled={invitingUser}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {invitingUser ? 'Pre-Approving User...' : 'Pre-Approve User'}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      {/* Permission Editor Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">
                Edit Permissions for {selectedUser.user_email}
              </h3>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Read
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Edit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {modules.map((module) => {
                    // Always read from the users state for current permissions
                    const currentUser = users.find(u => u.user_id === selectedUser.user_id)
                    const perms = currentUser?.module_permissions?.[module.id] || { canRead: false, canEdit: false }
                    
                    return (
                      <tr key={module.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {module.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            checked={perms.canRead}
                            onChange={() => handlePermissionToggle(selectedUser.user_id, module.id, 'read')}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            checked={perms.canEdit}
                            onChange={() => handlePermissionToggle(selectedUser.user_id, module.id, 'edit')}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            disabled={!perms.canRead}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Save to database
                  const currentUser = users.find(u => u.user_id === selectedUser.user_id)
                  if (currentUser) {
                    try {
                      const { error } = await supabase
                        .from('user_permissions')
                        .update({ 
                          module_permissions: currentUser.module_permissions,
                          updated_at: new Date().toISOString()
                        })
                        .eq('user_id', currentUser.user_id)
                      
                      if (error) {
                        console.error('Save error:', error)
                        setError('Failed to save permissions')
                      } else {
                        console.log('Permissions saved successfully')
                        setSelectedUser(null)
                      }
                    } catch (err) {
                      console.error('Save error:', err)
                      setError('Failed to save permissions')
                    }
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Result Popup */}
      {invitationResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-green-800">User Pre-Approved Successfully!</h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="font-medium text-green-800 mb-2">Pre-Approved User Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Email:</span> 
                      <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded">{invitationResult.email}</span>
                    </div>
                    <div className="text-green-700">
                      ✓ User record created with default permissions
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Manual Setup Required</h4>
                  <div className="text-sm text-yellow-700">
                    <p className="mb-2">
                      <strong>Instructions for the new user:</strong>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Go to the login page: <code className="bg-white px-1 rounded">localhost:3000/auth/login</code></li>
                      <li>Click "Don't have an account? Contact your administrator for an invitation"</li>
                      <li>Or use the direct signup URL (if public signup is enabled)</li>
                      <li>Sign up with the exact email: <strong>{invitationResult.email}</strong></li>
                      <li>Their account will automatically inherit the pre-configured permissions</li>
                    </ol>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p className="mb-2">
                    <strong>What happens next:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>User appears as "pending" until they complete signup</li>
                    <li>They have read-only access to Festival Overview by default</li>
                    <li>You can modify their permissions using "Edit Permissions"</li>
                    <li>Their user_id will be updated when they actually sign up</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setInvitationResult(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">
            <strong>Database Error:</strong> {error}
          </p>
        </div>
      )}
    </div>
  )
}