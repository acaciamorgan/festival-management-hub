'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { UserPermissions } from '@/types'

interface AuthContextType {
  user: User | null
  permissions: UserPermissions | null
  loading: boolean
  signOut: () => Promise<void>
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchUserPermissions = async (userId: string, userEmail: string): Promise<UserPermissions | null> => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('No permissions found for user:', error)
        // Return basic fallback permissions instead of trying to create record
        return {
          userId: userId,
          userEmail: userEmail,
          userName: undefined,
          userRole: undefined,
          isAdmin: false,
          isSuperAdmin: false,
          modulePermissions: {}
        }
      }

      if (!data) return null

      // Parse module permissions if stored as string
      const modulePerms = typeof data.module_permissions === 'string' 
        ? JSON.parse(data.module_permissions)
        : data.module_permissions || {}

      return {
        userId: data.user_id,
        userEmail: data.user_email,
        userName: data.user_name,
        userRole: data.user_role,
        isAdmin: data.is_admin || false,
        isSuperAdmin: data.is_super_admin || false,
        modulePermissions: modulePerms
      }
    } catch (err) {
      console.error('Error in fetchUserPermissions:', err)
      return null
    }
  }

  const refreshPermissions = async () => {
    if (user?.id && user?.email) {
      const perms = await fetchUserPermissions(user.id, user.email)
      setPermissions(perms)
    }
  }

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        
        if (session?.user?.id && session?.user?.email) {
          const perms = await fetchUserPermissions(session.user.id, session.user.email)
          setPermissions(perms)
        } else {
          setPermissions(null)
        }
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user?.id && session?.user?.email) {
          const perms = await fetchUserPermissions(session.user.id, session.user.email)
          setPermissions(perms)
        } else {
          setPermissions(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setPermissions(null)
  }

  const value = {
    user,
    permissions,
    loading,
    signOut,
    refreshPermissions
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}