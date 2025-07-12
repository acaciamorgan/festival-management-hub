export interface User {
  id: number
  role: 'journalist' | 'pr'
  name: string
  outlet?: string
  lastActive: number
}

export interface Celebrity {
  id: number
  name: string
  category: 'Celebrity' | 'Voice' | 'Artist' | 'Exec'
  days: string[]
  knownFor: string
  agent: string
  agentContact: string
  prAvailable: string
}

export interface Journalist {
  id: number
  name: string
  outlet: string
  email: string
  phone?: string
  specialty?: string
  bio?: string
  twitter?: string
  website?: string
  verified?: boolean
}

export interface InterviewRequest {
  id: number
  journalistId: number
  journalistName: string
  outlet: string
  celebrities: string[]
  status: 'pending' | 'approved' | 'rejected'
  priority: Record<string, string>
  completed: Record<string, boolean>
  timestamp: string
}

export interface Message {
  id: number
  type: 'general' | 'direct' | 'targeted' | 'broadcast'
  from: string
  fromRole: 'journalist' | 'pr'
  to?: string
  recipients?: string[]
  message: string
  timestamp: string
  urgent: boolean
}

export interface PressItem {
  name: string
  type: string
  size: string
}

export interface CategoryColors {
  [key: string]: string
}

export interface CategoryIcons {
  [key: string]: string
}