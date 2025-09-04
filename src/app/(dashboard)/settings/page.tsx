'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [forceChange, setForceChange] = useState(false)

  useEffect(() => {
    // Check if this is a forced password change from first login
    const urlParams = new URLSearchParams(window.location.search)
    setForceChange(urlParams.get('force_password_change') === 'true')
  }, [])

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: '' }
    
    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++

    const strengthMap = [
      { strength: 0, text: '', color: '' },
      { strength: 1, text: 'Weak', color: 'text-red-600' },
      { strength: 2, text: 'Fair', color: 'text-orange-600' },
      { strength: 3, text: 'Good', color: 'text-yellow-600' },
      { strength: 4, text: 'Strong', color: 'text-green-600' },
      { strength: 5, text: 'Very Strong', color: 'text-green-700' }
    ]

    return strengthMap[strength]
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Reset messages
    setPasswordError('')
    setPasswordSuccess('')

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password')
      return
    }

    setChangingPassword(true)

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      // Call API to change password
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to change password')
      }

      // Success
      setPasswordSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      // If this was a forced password change, redirect to main app
      if (forceChange) {
        setTimeout(() => {
          setPasswordSuccess('Password changed successfully! Redirecting to main app...')
          setTimeout(() => {
            router.push('/modules/festival-overview')
          }, 1000)
        }, 1000)
      }

    } catch (error: any) {
      setPasswordError(error.message || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900">Account Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* User Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Account Information</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Change Password</h2>
            
            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                {passwordError}
              </div>
            )}
            
            {passwordSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password (min 8 characters)"
                />
                {newPassword && (
                  <p className={`mt-1 text-sm ${passwordStrength.color}`}>
                    Password strength: {passwordStrength.text}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm new password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingPassword ? 'Changing Password...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-1">Security Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Use a password that is at least 8 characters long</li>
              <li>Include uppercase and lowercase letters, numbers, and symbols</li>
              <li>Do not reuse passwords from other accounts</li>
              <li>Change your password regularly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}