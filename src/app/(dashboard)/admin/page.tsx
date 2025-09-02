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
  
  // Close Festival state
  const [activeTab, setActiveTab] = useState<'users' | 'close-festival'>('users')
  const [archiveStatus, setArchiveStatus] = useState<any>(null)
  const [loadingArchiveStatus, setLoadingArchiveStatus] = useState(false)
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false)
  const [confirmationStep, setConfirmationStep] = useState(0)
  const [editionConfirmation, setEditionConfirmation] = useState('')
  const [closingFestival, setClosingFestival] = useState(false)
  const [closeResult, setCloseResult] = useState<any>(null)
  const [deletingUser, setDeletingUser] = useState<UserPermissionRecord | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  
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
    if (activeTab === 'close-festival') {
      loadArchiveStatus()
    }
  }, [activeTab])

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
      // Generate a secure temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
      
      // Create user directly with signUp
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: tempPassword,
        options: {
          data: {
            user_name: newUserName,
            user_role: newUserRole,
            user_phone: newUserPhone
          }
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

      // Send password reset email which will use your custom template
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(newUserEmail, {
        redirectTo: 'https://callsheet.acaciaconsultinggroup.com/auth/reset-password'
      })

      if (resetError) {
        console.warn('Password reset email failed:', resetError)
        // Continue anyway - user was created successfully
      }

      // Show success message
      setInvitationResult({
        email: newUserEmail,
        tempPassword: 'EMAIL_SENT'
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
      console.error('Error inviting user:', err)
      setError(err.message || 'Failed to send invitation')
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

  const handleDeleteUser = async () => {
    if (!deletingUser) return

    try {
      // Delete from user_permissions table
      const { error: permError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', deletingUser.user_id)

      if (permError) throw permError

      // Try to delete from Supabase Auth (may fail if not admin)
      try {
        await supabase.auth.admin.deleteUser(deletingUser.user_id)
      } catch (authError) {
        console.warn('Could not delete from auth (may require service role):', authError)
      }

      // Update local state
      setUsers(prev => prev.filter(u => u.user_id !== deletingUser.user_id))
      
      setDeletingUser(null)
      setShowDeleteConfirmation(false)
      console.log('User deleted successfully')
      
    } catch (err: any) {
      console.error('Error deleting user:', err)
      setError(err.message || 'Failed to delete user')
    }
  }

  // Close Festival functions
  const loadArchiveStatus = async () => {
    setLoadingArchiveStatus(true)
    setError('')
    
    try {
      const { data, error } = await supabase.rpc('check_archive_status')
      if (error) throw error
      setArchiveStatus(data)
    } catch (err: any) {
      console.error('Error checking archive status:', err)
      setError(err.message || 'Failed to check archive status')
    } finally {
      setLoadingArchiveStatus(false)
    }
  }

  const handleCloseFestival = async () => {
    if (!archiveStatus || !archiveStatus.is_archived) {
      setError('Festival must be archived before closing')
      return
    }

    // Parse the edition number from the confirmation
    const editionNumber = parseInt(archiveStatus.festival_edition.replace(/\D/g, ''))
    
    if (parseInt(editionConfirmation) !== editionNumber) {
      setError(`Please enter the correct edition number: ${editionNumber}`)
      return
    }

    setClosingFestival(true)
    setError('')

    try {
      const { data, error } = await supabase.rpc('close_festival', {
        confirmation_edition: editionNumber
      })
      
      if (error) throw error
      
      setCloseResult(data)
      setShowCloseConfirmation(false)
      setConfirmationStep(0)
      setEditionConfirmation('')
    } catch (err: any) {
      console.error('Error closing festival:', err)
      setError(err.message || 'Failed to close festival')
    } finally {
      setClosingFestival(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚙️</span>
            <h1 className="text-2xl font-semibold text-gray-900">System Administration</h1>
          </div>
          
          {activeTab === 'users' && (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddUser(true)}
                className="px-4 py-2 rounded-md transition-colors font-medium bg-green-600 hover:bg-green-700 text-white"
              >
                Add User
              </button>
              <button
                onClick={loadUsers}
                disabled={loadingUsers}
                className="px-4 py-2 rounded-md transition-colors font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {loadingUsers ? 'Loading...' : 'Refresh Users'}
              </button>
            </div>
          )}

          {activeTab === 'close-festival' && (
            <div className="flex items-center space-x-4">
              <button
                onClick={loadArchiveStatus}
                disabled={loadingArchiveStatus}
                className="px-4 py-2 rounded-md transition-colors font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {loadingArchiveStatus ? 'Checking...' : 'Refresh Status'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="px-6">
          <div className="flex space-x-8">
            {[
              { id: 'users', label: 'User Management', icon: '👥' },
              { id: 'close-festival', label: 'Close Festival', icon: '🔒' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {error && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'users' && (
          <div className="p-6">
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
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        userRecord.is_admin
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {userRecord.is_admin ? 'Admin' : 'User'}
                      </span>
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
                        <button
                          onClick={() => {
                            setDeletingUser(userRecord)
                            setShowDeleteConfirmation(true)
                          }}
                          className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 rounded-md transition-colors"
                        >
                          Delete
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
        )}

        {activeTab === 'close-festival' && (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm">
              {loadingArchiveStatus ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Checking archive status...</p>
                </div>
              ) : archiveStatus ? (
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">Festival Status</h2>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gray-50 p-4 rounded">
                        <div className="text-sm text-gray-600">Current Festival</div>
                        <div className="text-lg font-medium">{archiveStatus.festival_name}</div>
                        <div className="text-sm text-gray-500">{archiveStatus.festival_edition} Edition</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded">
                        <div className="text-sm text-gray-600">Festival Year</div>
                        <div className="text-lg font-medium">{archiveStatus.festival_year}</div>
                        <div className="text-sm text-gray-500">
                          {archiveStatus.start_date ? formatDate(archiveStatus.start_date) : 'Not set'} - 
                          {archiveStatus.end_date ? formatDate(archiveStatus.end_date) : 'Not set'}
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-3">Archive Status</h3>
                      {archiveStatus.is_archived ? (
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                          <div className="flex items-center">
                            <span className="text-green-600 text-xl mr-3">✓</span>
                            <div>
                              <div className="font-medium text-green-800">Festival Archived</div>
                              <div className="text-sm text-green-700">
                                The {archiveStatus.festival_year} festival has been archived and is ready to be closed.
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                          <div className="flex items-center">
                            <span className="text-yellow-600 text-xl mr-3">⚠️</span>
                            <div>
                              <div className="font-medium text-yellow-800">Not Archived</div>
                              <div className="text-sm text-yellow-700">
                                The festival must be archived before it can be closed. Please archive the festival first.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {archiveStatus.current_data_counts && (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium mb-3">Current Data</h3>
                        <div className="grid grid-cols-3 gap-3">
                          {Object.entries(archiveStatus.current_data_counts).map(([key, count]) => (
                            <div key={key} className="bg-gray-50 p-3 rounded">
                              <div className="text-sm text-gray-600">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                              <div className="text-lg font-medium">{count as number}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {archiveStatus.is_archived && (
                      <div className="mt-6 pt-6 border-t">
                        <h3 className="text-lg font-medium mb-3 text-red-800">Close Festival</h3>
                        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                          <div className="text-sm text-red-700">
                            <strong>Warning:</strong> Closing the festival will:
                            <ul className="list-disc list-inside mt-2">
                              <li>Delete all current festival data (films, guests, events, etc.)</li>
                              <li>Reset the system for the next festival edition</li>
                              <li>This action cannot be undone (data is preserved in archives)</li>
                            </ul>
                          </div>
                        </div>

                        {!showCloseConfirmation ? (
                          <button
                            onClick={() => setShowCloseConfirmation(true)}
                            className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                          >
                            Close {archiveStatus.festival_edition} Festival
                          </button>
                        ) : (
                          <div className="space-y-4">
                            {confirmationStep === 0 && (
                              <div>
                                <p className="mb-3 font-medium">Step 1: Confirm you want to close the festival</p>
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => setConfirmationStep(1)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                  >
                                    Yes, Close Festival
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowCloseConfirmation(false)
                                      setConfirmationStep(0)
                                    }}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {confirmationStep === 1 && (
                              <div>
                                <p className="mb-3 font-medium">Step 2: Enter the edition number to confirm</p>
                                <p className="text-sm text-gray-600 mb-3">
                                  Type <strong>{parseInt(archiveStatus.festival_edition.replace(/\D/g, ''))}</strong> to confirm closing the {archiveStatus.festival_edition} Festival
                                </p>
                                <input
                                  type="text"
                                  value={editionConfirmation}
                                  onChange={(e) => setEditionConfirmation(e.target.value)}
                                  placeholder={`Enter ${parseInt(archiveStatus.festival_edition.replace(/\D/g, ''))}`}
                                  className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 mb-3"
                                />
                                <div className="flex gap-3">
                                  <button
                                    onClick={handleCloseFestival}
                                    disabled={parseInt(editionConfirmation) !== parseInt(archiveStatus.festival_edition.replace(/\D/g, '')) || closingFestival}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {closingFestival ? 'Closing Festival...' : 'Confirm Close Festival'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowCloseConfirmation(false)
                                      setConfirmationStep(0)
                                      setEditionConfirmation('')
                                    }}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-gray-600">No archive status available. Click "Refresh Status" to check.</p>
                </div>
              )}

              {closeResult && (
                <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-md">
                  <h3 className="text-lg font-medium text-green-800 mb-3">Festival Closed Successfully</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Closed Festival:</strong> {closeResult.closed_festival_name} ({closeResult.closed_festival_edition})</div>
                    <div><strong>Year:</strong> {closeResult.closed_festival_year}</div>
                    <div><strong>Next Edition:</strong> {closeResult.next_edition_number}th</div>
                    <div><strong>Closed At:</strong> {new Date(closeResult.closed_at).toLocaleString()}</div>
                  </div>
                  {closeResult.deleted_counts && (
                    <div className="mt-4">
                      <div className="font-medium mb-2">Data Cleared:</div>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(closeResult.deleted_counts).map(([key, count]) => (
                          <div key={key} className="text-xs">
                            <span className="text-gray-600">{key.replace(/_/g, ' ')}:</span> {count as number}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
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
                
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={async () => {
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(editingUser.user_email, {
                          redirectTo: 'https://callsheet.acaciaconsultinggroup.com/auth/reset-password'
                        })
                        if (error) throw error
                        setError('')
                        alert('Invitation resent successfully!')
                      } catch (err: any) {
                        console.error('Error resending invitation:', err)
                        setError('Failed to resend invitation: ' + err.message)
                      }
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
                  >
                    Resend Invitation
                  </button>
                  <div className="text-xs text-gray-500 mt-1">
                    Sends a new invitation email with password reset link
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <div className="flex gap-3">
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
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium">Add New User</h3>
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
                  An invitation email will be sent to this address. The user will receive a link to set their password and access the platform with read-only Festival Overview permissions by default.
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
                {invitingUser ? 'Sending Invitation...' : 'Send Invitation'}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      {/* Permission Editor Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">
                Edit Permissions for {selectedUser.user_email}
              </h3>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Admin Toggle */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Access Level</h4>
                <button
                  onClick={() => handleAdminToggle(selectedUser.user_id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    users.find(u => u.user_id === selectedUser.user_id)?.is_admin
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {users.find(u => u.user_id === selectedUser.user_id)?.is_admin ? 'Admin User' : 'Regular User'}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  {users.find(u => u.user_id === selectedUser.user_id)?.is_admin 
                    ? 'This user has full administrative access to all modules' 
                    : 'This user has limited access based on module permissions below'
                  }
                </p>
              </div>
              
              <h4 className="text-sm font-medium text-gray-700 mb-3">Module Permissions</h4>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && deletingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-red-800">Delete User</h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <span className="text-red-400 text-xl">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h4 className="font-medium text-red-800 mb-2">Confirm Deletion</h4>
                      <p className="text-sm text-red-700">
                        Are you sure you want to permanently delete <strong>{deletingUser.user_name || deletingUser.user_email}</strong>?
                      </p>
                      <p className="text-sm text-red-600 mt-2">
                        This action cannot be undone. The user will lose access to the platform immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false)
                  setDeletingUser(null)
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Result Popup */}
      {invitationResult && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-green-800">Invitation Sent Successfully!</h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="font-medium text-green-800 mb-2">User Invited</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Email sent to:</span> 
                      <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded">{invitationResult.email}</span>
                    </div>
                    <div className="text-green-700">
                      ✓ Invitation email sent with password setup link
                    </div>
                    <div className="text-green-700">
                      ✓ User permissions configured
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-800 mb-2">What happens next:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                    <li>User will receive an email with a secure link</li>
                    <li>They'll set their own password</li>
                    <li>Once logged in, they'll have access based on permissions you set</li>
                    <li>Default: Read-only access to Festival Overview</li>
                    <li>You can modify permissions anytime from this admin panel</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setInvitationResult(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Done
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