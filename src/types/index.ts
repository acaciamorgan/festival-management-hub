// Core Card Types
export type CardType = 'titles' | 'venues' | 'guests' | 'press' | 'programs'

// Module Configuration
export interface ModuleConfig {
  id: string
  name: string
  icon: string
  hasGridView: boolean
  hasCalendarView?: boolean
  hasRSVP?: boolean
  cardTypes: CardType[]
  route: string
}

// Permission Types
export interface UserPermissions {
  userId: string
  modulePermissions: Record<string, {
    canRead: boolean
    canEdit: boolean
  }>
  isAdmin: boolean
}

// Grid Configuration
export interface GridColumn {
  key: string
  label: string
  sortable: boolean
  resizable: boolean
  width?: number
}

// RSVP Types
export interface RSVPForm {
  eventId: string
  moduleType: string
  fields: RSVPField[]
}

export interface RSVPField {
  name: string
  label: string
  type: 'text' | 'email' | 'select' | 'textarea' | 'checkbox'
  required: boolean
  options?: string[]
}

export interface RSVPResponse {
  id: string
  eventId: string
  responses: Record<string, any>
  submittedAt: string
  linkedCardId?: string
  linkedCardType?: CardType
}