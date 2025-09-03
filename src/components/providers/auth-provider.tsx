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
      // Use service role client to bypass any RLS
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        // If no permissions record exists, create a default one
        if (error.code === 'PGRST116') {
          console.log('No permissions found, creating default record')
          
          const { data: newRecord, error: insertError } = await supabase
            .from('user_permissions')
            .insert({
              user_id: userId,
              user_email: userEmail,
              is_admin: false,
              is_super_admin: false,
              module_permissions: {}
            })
            .select()
            .single()

          if (insertError) {
            console.error('Error creating default permissions:', insertError)
            return null
          }

          data = newRecord
        } else {
          console.error('Error fetching permissions:', error)
          return null
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