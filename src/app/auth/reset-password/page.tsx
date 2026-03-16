'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if we have a valid recovery session
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User has clicked the recovery link
      }
    })
  }, [])

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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-center">
            <p className="font-medium">Password reset successfully!</p>
            <p className="text-sm mt-2">Redirecting to login page...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter new password (min 8 characters)"
              />
              {newPassword && (
                <p className={`mt-1 text-sm ${passwordStrength.color}`}>
                  Password strength: {passwordStrength.text}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm new password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/auth/login"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Back to Sign In
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}