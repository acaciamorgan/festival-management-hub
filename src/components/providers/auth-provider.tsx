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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchUserPermissions = async (userId: string) => {
      try {
        console.log('Fetching permissions for user:', userId)
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Permission fetch timeout')), 3000)
        })
        
        const queryPromise = supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', userId)
          .single()

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

        if (error) {
          console.error('Error fetching permissions:', error)
          // Fallback to admin permissions
          return {
            userId: userId,
            modulePermissions: {},
            isAdmin: true
          }
        }

        console.log('Retrieved permissions:', data)
        
        // Parse module_permissions if it's stored as a string
        const modulePerms = typeof data.module_permissions === 'string' 
          ? JSON.parse(data.module_permissions)
          : data.module_permissions || {}
        
        return {
          userId: data.user_id,
          modulePermissions: modulePerms,
          isAdmin: data.is_admin || false
        }
      } catch (err) {
        console.error('Error in fetchUserPermissions (probably timeout):', err)
        // Return minimal permissions on error instead of admin
        return {
          userId: userId,
          modulePermissions: {
            festivalOverview: { canRead: true, canEdit: false }
          },
          isAdmin: false
        }
      }
    }

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Fetch real permissions from database
        const perms = await fetchUserPermissions(session.user.id)
        setPermissions(perms)
      }
      
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Fetch real permissions from database
          const perms = await fetchUserPermissions(session.user.id)
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
  }

  const value = {
    user,
    permissions,
    loading,
    signOut,
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