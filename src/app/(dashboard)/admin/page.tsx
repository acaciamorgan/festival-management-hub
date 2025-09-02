'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'

interface UserRecord {
  id: string
  user_id: string
  user_email: string
  user_name?: string
  user_role?: string
  user_phone?: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

export default function AdminPage() {
  const { user, permissions, loading } = useAuth()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [error, setError] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('')
  const [newUserPhone, setNewUserPhone] = useState('')
  const [addingUser, setAddingUser] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (!loading && permissions?.isAdmin) {
      loadUsers()
    }
  }, [loading, permissions])

  const loadUsers = async () => {
    setLoadingUsers(true)
    setError('')
    
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .order('user_name', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      console.error('Error loading users:', err)
      setError(err.message || 'Failed to load users')
      setUsers([])
    } finally {
      setLoadingUsers(false)
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
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚙️</span>
            <h1 className="text-2xl font-semibold text-gray-900">System Administration</h1>
          </div>
          
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
        </div>
      </div>

      {error && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* User List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">User Management</h2>
          </div>
          
          {loadingUsers ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500">Users will appear here when they are added to the system</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Access Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((userRecord) => (
                    <tr key={userRecord.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {userRecord.user_name || 'No name'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        {userRecord.user_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {userRecord.user_role || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {userRecord.user_phone || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          userRecord.is_admin
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {userRecord.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:text-blue-800">
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-800">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
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
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="123-456-7890"
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  An invitation email will be sent to this address. The user will receive a link to set their password and access the platform.
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
                onClick={() => alert('User creation will be implemented next')}
                disabled={addingUser || !newUserName || !newUserEmail}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {addingUser ? 'Adding User...' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}