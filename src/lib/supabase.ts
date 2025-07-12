import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (to be updated based on your actual Supabase schema)
export interface Database {
  public: {
    Tables: {
      celebrities: {
        Row: {
          id: string
          name: string
          category: string
          days: string[]
          known_for: string
          agent: string
          agent_contact: string
          pr_available: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          days: string[]
          known_for: string
          agent: string
          agent_contact: string
          pr_available: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          days?: string[]
          known_for?: string
          agent?: string
          agent_contact?: string
          pr_available?: string
          created_at?: string
          updated_at?: string
        }
      }
      journalists: {
        Row: {
          id: string
          name: string
          outlet: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          outlet: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          outlet?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      interview_requests: {
        Row: {
          id: string
          journalist_id: string
          celebrities: string[]
          status: string
          priority: Record<string, string>
          completed: Record<string, boolean>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          journalist_id: string
          celebrities: string[]
          status: string
          priority: Record<string, string>
          completed: Record<string, boolean>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          journalist_id?: string
          celebrities?: string[]
          status?: string
          priority?: Record<string, string>
          completed?: Record<string, boolean>
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          type: string
          from: string
          from_role: string
          to: string | null
          recipients: string[] | null
          message: string
          urgent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          from: string
          from_role: string
          to?: string | null
          recipients?: string[] | null
          message: string
          urgent: boolean
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          from?: string
          from_role?: string
          to?: string | null
          recipients?: string[] | null
          message?: string
          urgent?: boolean
          created_at?: string
        }
      }
    }
  }
}