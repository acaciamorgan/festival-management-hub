// Core Card Types
export type CardType = 'titles' | 'venues' | 'guests' | 'press' | 'programs' | 'contacts' | 'press-screenings' | 'interviews'

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
  short_code?: string
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

// Program Management Types
export interface ProgramCard {
  id: string
  title: string
  event_date?: string | null
  start_time?: string | null
  end_time?: string | null
  venue_name?: string | null
  venue_address?: string | null
  participants?: string | null
  description?: string | null
  is_industry_days: boolean
  created_at: string
  updated_at: string
  created_by: string
}

// Contact Management Types
export interface ContactCard {
  id: string
  contact_name: string
  contact_company?: string | null
  contact_email?: string | null
  phone?: string | null
  notes?: string | null
  contact_type?: string | null
  mailing_address?: string | null
  created_at: string
  updated_at: string
  created_by: string
  // Associated films (computed)
  associated_films?: string[]
  associated_films_data?: Array<{
    id: string
    title: string
    film_type: 'feature' | 'short'
    director?: string
    countries?: string
    programs?: string
  }>
}

// Film Contact Types
export type FilmContactType = 'Distributor/Studio' | 'Production Team' | 'Publicity' | 'Other'

export interface FilmContact {
  id: string
  film_id: string
  film_type: 'feature' | 'short'
  name: string
  company?: string
  email?: string
  contact_type: FilmContactType
  created_at: string
  updated_at: string
  created_by: string
}

// Press Screenings Types
export interface PressScreeningCard {
  id: string
  film_id: string
  film_type: 'feature' | 'short'
  title: string
  runtime?: number
  screening_date?: string | null
  screening_time?: string | null
  venue_id?: string | null
  venue_name?: string | null
  house?: string | null
  short_code?: string | null
  film_approved: boolean
  locked: boolean
  invites_out: boolean
  canceled: boolean
  staffer?: string | null
  notes?: string | null
  rsvp_form_url?: string | null
  rsvp_responses_url?: string | null
  created_at: string
  updated_at: string
  created_by: string
}

// Interview Management Types
export type InterviewStatus = 'TBD' | 'Pitching' | 'Subject Pending' | 'Scheduled' | 'Complete' | 'Declined'

export interface InterviewCard {
  id: string
  
  // Film/Program reference (required - at least one must be present)
  film_id?: string | null
  shorts_program_id?: string | null
  program_id?: string | null
  film_title: string // Cached for display
  
  // Journalist (can link to press card or be open text)
  press_id?: string | null
  journalist_name?: string | null
  outlet?: string | null
  email?: string | null
  
  // Subjects (can link to guest cards or be open text)
  subject_names?: string | null
  subject_guest_ids?: string[] | null
  
  // Interview details
  status: InterviewStatus
  interview_date?: string | null
  interview_time?: string | null
  location?: string | null
  
  // Metadata
  notes?: string | null
  created_at: string
  updated_at: string
  created_by: string
}

// Sticky Notes Types
export interface StickyNote {
  id: string
  x_position: number
  y_position: number
  width: number
  height: number
  color: string
  content: string
  module_id: string
  created_at: string
  updated_at: string
  created_by: string
  related_film_id?: string | null
}