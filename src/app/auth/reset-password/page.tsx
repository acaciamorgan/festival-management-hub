'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setAuthLoading(true)
        setMessage('Verifying your reset link...')
        
        // First, handle any auth callback from URL hash
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          setError('Authentication error: ' + error.message)
          setAuthLoading(false)
          return
        }
        
        // If no session yet, try to exchange tokens from URL
        if (!data.session) {
          // Check URL for auth tokens (from email link)
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          const type = hashParams.get('type')
          
          if (accessToken && refreshToken && type === 'recovery') {
            setMessage('Setting up your session...')
            
            // Set the session using the tokens from the URL
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            
            if (sessionError) {
              setError('Failed to authenticate: ' + sessionError.message)
              setAuthLoading(false)
              return
            }
            
            if (!sessionData.session) {
              setError('Invalid or expired reset link. Please request a new password reset.')
              setAuthLoading(false)
              return
            }
            
            // Clear the URL hash for security
            window.history.replaceState({}, document.title, window.location.pathname)
            setHasValidSession(true)
            setMessage('Ready to set your password!')
            
          } else {
            setError('Invalid or expired reset link. Please request a new password reset.')
          }
        } else {
          // Already have a valid session
          setHasValidSession(true)
          setMessage('Ready to set your password!')
        }
      } catch (err: any) {
        setError('Authentication error: ' + err.message)
      } finally {
        setAuthLoading(false)
      }
    }
    
    handleAuthCallback()
  }, [supabase])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      // First verify we have a session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setError('Session expired. Please request a new password reset.')
        return
      }
      
      const { data, error } = await supabase.auth.updateUser({ 
        password: password 
      })

      if (error) {
        setError(error.message)
        console.error('Password update error:', error)
      } else if (!data.user) {
        setError('Failed to update password. Please try again.')
      } else {
        setMessage('Password updated successfully! Redirecting to login...')
        
        // Sign out to ensure clean login with new password
        await supabase.auth.signOut()
        
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
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

        {authLoading ? (
          <div className="mt-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Verifying your reset link...</p>
          </div>
        ) : error ? (
          <div className="mt-8 space-y-6">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/auth/login')}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Back to login
              </button>
            </div>
          </div>
        ) : hasValidSession ? (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            {message && !error && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                {message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/auth/login')}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Back to login
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}