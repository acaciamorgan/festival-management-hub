// Core Card Types
export type CardType = 'titles' | 'venues' | 'guests' | 'press' | 'programs' | 'contacts' | 'press-screenings' | 'interviews' | 'special-events'

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
export interface ModulePermission {
  canRead: boolean
  canEdit: boolean
}

export interface UserPermissions {
  userId: string
  userEmail: string
  userName?: string
  userRole?: string
  isAdmin: boolean
  isSuperAdmin: boolean
  modulePermissions: Record<string, ModulePermission>
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
export type AccreditationLevel = 'P' | 'G' | 'S' | 'Unassigned'

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
  festival_year: number
}

// Press Coverage Types
export type CoverageOutletType = 'Print Daily' | 'Magazine' | 'Print Weekly' | 'Online' | 'Radio' | 'TV' | 'Podcast' | 'College' | 'Trade'
export type CoverageGeography = 'Local' | 'Regional' | 'National' | 'International'
export type BreakType = 'Festival Feature' | 'Film Article' | 'Review' | 'Capsule' | 'Listing' | 'Mention'

export interface OutletCard {
  id: string
  name: string
  outlet_type?: CoverageOutletType | null
  uvm_reach?: string | null
  geography?: CoverageGeography | null
  website?: string | null
  festival_year: number
}

export interface PressCoverageCard {
  id: string
  headline: string
  break_type?: BreakType | null
  coverage_date?: string | null
  outlet_id?: string | null
  byline?: string | null
  url?: string | null
  notes?: string | null
  pdf_clip_link?: string | null
  festival_year: number
  outlet_name?: string | null
  outlet_type?: CoverageOutletType | null
  uvm_reach?: string | null
  geography?: CoverageGeography | null
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
// ArrangingTravel is now open-text, no longer an enum
// export type ArrangingTravel = 'Festival' | 'Distributor' | 'Local' | 'TBD'

export interface GuestFilm {
  id: string
  guest_id: string
  film_id: string
  film_type: string // 'feature' | 'short' | 'shorts_program' | 'program'
  film_title?: string // resolved from guest_film_titles view (not a stored cache)
}

export interface GuestCard {
  id: string
  name: string
  country?: string
  guest_type: GuestType
  confirmed: boolean
  festival_year: number
  role?: string
  
  // Contact
  contact_name?: string
  contact_email?: string
  
  // Travel
  arranging_travel: string | null
  
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
  non_attending_screenings?: string[] // Array of screening IDs where guest is NOT attending
  
  // Relationships
  films?: GuestFilm[]
  screenings?: any[] // Array of screening objects for this guest's films
  films_display?: string // Legacy convenience cache; use films_display_combined from guests_with_details view for fresh data
  films_display_combined?: string // Computed from guest_film_titles view via guests_with_details

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
  accessibility?: string | null
  houses?: TheaterHouse[]
  houses_display?: string // Computed field for grid display
  festival_year: number
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
  festival_year: number
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
  film_title: string
  run_time?: number
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
  festival_year: number
  created_at: string
  updated_at: string
  created_by: string
}

// Interview Management Types
export type InterviewStatus = 'TBD' | 'Pitching' | 'Subject Pending' | 'Scheduled' | 'Film Team' | 'Complete' | 'Declined'

export interface InterviewCard {
  id: string

  // Film/Program reference (required - at least one must be present)
  film_id?: string | null
  shorts_program_id?: string | null
  program_id?: string | null
  short_film_id?: string | null

  // Resolved from view join (interviews_with_films)
  title?: string | null           // Film/program title resolved from source tables
  reference_type?: 'feature' | 'short' | 'shorts_program' | 'program' | null

  // Journalist (can link to press card or be open text)
  press_id?: string | null
  journalist_name?: string | null  // Cached text (used when no press_id)
  outlet?: string | null           // Cached text (used when no press_id)
  email?: string | null            // Cached text (used when no press_id)

  // Resolved press data from view join (prefer these over cached text)
  resolved_journalist_name?: string | null
  resolved_outlet?: string | null
  resolved_email?: string | null

  // Subjects (can link to guest cards or be open text)
  subject_names?: string | null
  subject_guest_ids?: string[] | null

  // Interview details
  status: InterviewStatus
  interview_date?: string | null
  interview_time?: string | null
  duration_minutes?: number | null
  venue_id?: string | null
  location?: string | null
  show_on_special_events?: boolean

  // Metadata
  notes?: string | null
  festival_year?: number
  created_at: string
  updated_at: string
  created_by: string
}

// Red Carpet Types
export interface RedCarpetCard {
  id: string
  film_program_display_combined: string
  subjects_display_combined: string
  film_program_description?: string | null
  subjects_description?: string | null
  venue_id: string | null
  venue_name_from_fk: string | null
  house: string | null
  carpet_date: string | null
  call_time: string | null
  carpet_start_time: string | null
  film_program_start_time: string | null
  rsvp_form_url: string | null
  rsvp_responses_url: string | null
  run_of_show_url: string | null
  festival_year: number
  created_at: string
  updated_at: string
  created_by: string
}

// Photo Shoot Types
export interface PhotoShootCard {
  id: string
  film_program_display_combined: string
  subjects_display_combined: string
  film_program_description?: string | null
  subjects_description?: string | null
  venue_id: string | null
  venue_name_from_fk: string | null
  house: string | null
  shoot_date: string | null
  call_time: string | null
  shoot_time: string | null
  film_program_start_time: string | null
  photographer: string | null
  videographer: string | null
  intro_qa: string | null
  selects_received: boolean
  sent_to_pr: boolean
  festival_year: number
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

// Special Events Types
export type EventType = 'Reception' | 'Mixer' | 'Party' | 'Awards' | 'Other' | 'Media Filing'
export type OpenPressType = 'Yes' | 'No' | 'Limited'

export interface SpecialEventCard {
  id: string
  title: string
  event_type?: EventType | null
  event_date?: string | null
  access_time?: string | null // Staff setup time
  start_time?: string | null // Guest arrival time
  end_time?: string | null
  
  // Location
  venue_id?: string | null
  venue_name_from_fk?: string | null // From view
  venue_address_from_fk?: string | null // From view
  venue_contact_name_from_fk?: string | null // From view
  venue_contact_phone_from_fk?: string | null // From view
  location_details?: string | null

  // Associations (hybrid display strings: relational + free text)
  films_programs_display_combined?: string | null
  guests_display_combined?: string | null
  
  // Staff and logistics
  lead_staff?: string | null
  lead_volunteer?: string | null
  number_of_vols?: string | null
  invited_tags?: string | null // Smart tags like "Filmmakers, Sponsors, VIPs"
  number_expected?: string | null
  
  // F&B
  beverages?: string | null
  bartender?: string | null
  food?: string | null
  caterer?: string | null
  
  // Media
  photography?: string | null
  open_press: OpenPressType
  
  // RSVPs
  rsvp_responder_link?: string | null
  rsvp_response_link?: string | null
  
  // Status
  confirmed: boolean

  // Post-event
  actual_attendance?: string | null
  notes?: string | null

  // System fields
  festival_year: number
  created_at: string
  updated_at: string
  created_by: string
}