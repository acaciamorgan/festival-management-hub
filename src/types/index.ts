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
  responses: Record<string, string | boolean | number>
  submittedAt: string
  linkedCardId?: string
  linkedCardType?: CardType
}

// Social Media Types
export interface SocialMedia {
  twitter?: string
  instagram?: string
}

// Press Management Types
export type OutletType = 'Print/Online' | 'Magazine' | 'TV' | 'Radio' | 'College' | 'Trade' | 'Podcast'
export type AccreditationLevel = 'P' | 'G' | 'Unassigned'

export interface PressCard {
  id: string
  name: string
  email: string
  phone?: string | null
  media_outlet: string
  secondary_outlets?: string | null
  outlet_type?: OutletType | null
  website_url?: string | null
  secondary_outlet_urls?: string | null
  social_media?: SocialMedia | null
  rotten_tomatoes_accredited: boolean
  critics_groups?: string | null
  accreditation_level: AccreditationLevel
  picked_up_credentials: boolean
}

// Film/Title Types
export interface FilmCard {
  id: string
  title: string
  source?: string
  director?: string
  genre?: string
  runtime?: number
  year?: number
  country?: string
  language?: string
  rating?: string
  synopsis?: string
}

// CSV Processing Types
export interface CSVFieldMapping {
  [csvHeader: string]: string
}

export interface CSVProcessingResult {
  success: boolean
  data?: PressCard[] | FilmCard[]
  errors?: string[]
  warnings?: string[]
}

// Form Types
export type FormFieldValue = string | boolean | number | SocialMedia

export interface FormChangeHandler {
  (name: string, value: FormFieldValue): void
}

// Grid/Table Types
export interface GridData {
  [key: string]: string | number | boolean | SocialMedia | null | undefined
}

export interface GridColumn {
  key: string
  label: string
  sortable: boolean
  resizable: boolean
  width?: number
}

// Module Layout Types
export interface ModuleLayoutProps {
  moduleConfig: ModuleConfig
  data: GridData[]
  columns: GridColumn[]
  onAdd?: () => void
  onEdit?: (item: GridData) => void
  onDelete?: (item: GridData) => void
  children?: React.ReactNode
}

// Guest Management Types
export type GuestType = 'Features' | 'Shorts' | 'Industry' | 'CineYouth' | 'Jury' | 'Other'
export type ArrangingTravel = 'Festival' | 'Distributor' | 'Local' | 'TBD'

export interface GuestFilm {
  id: string
  guest_id: string
  film_id: string
  film_title: string
}

export interface GuestProgram {
  id: string
  guest_id: string
  program_id?: string
  program_title: string
}

export interface GuestCard {
  id: string
  name: string
  country?: string
  guest_type: GuestType
  confirmed: boolean
  role?: string
  
  // Contact
  contact_name?: string
  contact_email?: string
  
  // Travel
  arranging_travel: ArrangingTravel
  
  // Arrival
  arrival_date?: string
  arrival_airline?: string
  arrival_flight_number?: string
  inbound_departure_time?: string
  arrival_origin_airport?: string
  arrival_airport?: string
  inbound_arrival_time?: string
  
  // Departure
  departure_date?: string
  outbound_departure_time?: string
  departure_airline?: string
  departure_flight_number?: string
  departure_airport?: string
  destination_airport?: string
  outbound_arrival_time?: string
  
  // Hotel
  hotel_name?: string
  hotel_address?: string
  hotel_confirmation_number?: string
  
  // Management
  checked_in: boolean
  notes?: string
  
  // Relationships
  films?: GuestFilm[]
  programs?: GuestProgram[]
  films_display?: string // "Film A, Film B, Film C"
  
  created_at: string
  updated_at: string
  created_by: string
}

// Venue Management Types
export type VenueType = 'Movie Theater' | 'Restaurant' | 'Event Space'

export interface TheaterHouse {
  id?: string
  venue_id?: string
  house_name: string
  seat_count: number
  created_at?: string
}

export interface VenueCard {
  id: string
  name: string
  address: string
  venue_type: VenueType
  contact_names?: string[] | null
  contact_emails?: string[] | null
  contact_phones?: string[] | null
  houses?: TheaterHouse[]
  houses_display?: string // Computed field for grid display
  created_at: string
  updated_at: string
  created_by: string
}