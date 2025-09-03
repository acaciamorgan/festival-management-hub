'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { UserPermissions } from '@/types'

export function usePermissions() {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPermissions = async () => {
    if (!user?.id || !user?.email) {
      setPermissions(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Use API route to fetch permissions with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch('/api/permissions/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setPermissions(data.permissions)
      } else {
        // Fallback to basic permissions if fetch fails
        setPermissions({
          userId: user.id,
          userEmail: user.email,
          userName: undefined,
          userRole: undefined,
          isAdmin: false,
          isSuperAdmin: false,
          modulePermissions: {}
        })
      }
    } catch (err) {
      console.error('Error fetching permissions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions')
      
      // Fallback to basic permissions
      setPermissions({
        userId: user.id,
        userEmail: user.email,
        userName: undefined,
        userRole: undefined,
        isAdmin: false,
        isSuperAdmin: false,
        modulePermissions: {}
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchPermissions()
    } else {
      setPermissions(null)
      setLoading(false)
      setError(null)
    }
  }, [user?.id, user?.email])

  const refetch = () => {
    if (user) {
      fetchPermissions()
    }
  }

  return {
    permissions,
    loading,
    error,
    refetch
  }
}