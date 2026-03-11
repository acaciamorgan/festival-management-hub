// Archive configurations for each module
export const archiveConfigs = {
  festivalOverview: {
    tableName: 'festival_settings',
    title: 'Festival Overview',
    columns: [
      { key: 'festival_name', label: 'Festival Name' },
      { key: 'edition_number', label: 'Edition' },
      { key: 'start_date', label: 'Start Date', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } },
      { key: 'end_date', label: 'End Date', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } },
      { key: 'created_at', label: 'Created', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  programmingPipeline: {
    tableName: 'programs',
    title: 'Programs',
    columns: [
      { key: 'title', label: 'Program Title' },
      { key: 'program_type', label: 'Type' },
      { key: 'description', label: 'Description', render: (value: string) => value?.substring(0, 100) + '...' },
      { key: 'created_at', label: 'Created', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  titles: {
    tableName: 'feature_films',
    title: 'Feature Films',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'director', label: 'Director' },
      { key: 'producer', label: 'Producer' },
      { key: 'executive_producer', label: 'Executive Producer' },
      { key: 'screenwriter', label: 'Screenwriter' },
      { key: 'cinematographer', label: 'Cinematographer' },
      { key: 'editor', label: 'Editor' },
      { key: 'principal_cast', label: 'Principal Cast' },
      { key: 'countries', label: 'Countries' },
      { key: 'original_release_year', label: 'Year' },
      { key: 'run_time', label: 'Runtime' },
      { key: 'language', label: 'Language' },
      { key: 'production_companies', label: 'Production Companies' },
      { key: 'premiere_status', label: 'Premiere Status' },
      { key: 'created_at', label: 'Added', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  pressManagement: {
    tableName: 'press',
    title: 'Press',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'media_outlet', label: 'Media Outlet' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'created_at', label: 'Added', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  pressScreenings: {
    tableName: 'press_screenings_with_films',
    title: 'Press Screenings',
    columns: [
      { key: 'film_title', label: 'Film Title' },
      { key: 'screening_date', label: 'Date', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } },
      { key: 'screening_time', label: 'Time' },
      { key: 'short_code', label: 'Venue' },
      { key: 'created_at', label: 'Created', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  screenerAccess: {
    tableName: 'screener_access',
    title: 'Screener Access',
    columns: [
      { key: 'film_id', label: 'Film ID' },
      { key: 'access_type', label: 'Access Type' },
      { key: 'created_at', label: 'Granted', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  pressRequests: {
    tableName: 'press_requests_with_films',
    title: 'Press Requests',
    columns: [
      { key: 'requester_name', label: 'Requester' },
      { key: 'requester_outlet', label: 'Outlet' },
      { key: 'request_type', label: 'Type' },
      { key: 'film_title_resolved', label: 'Films' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Requested', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  photoShoots: {
    tableName: 'photo_shoots',
    title: 'Photo Shoots',
    columns: [
      { key: 'film_program_display', label: 'Film/Program' },
      { key: 'subjects_display', label: 'Subjects' },
      { key: 'photographer', label: 'Photographer' },
      { key: 'shoot_date', label: 'Date', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } },
      { key: 'shoot_time', label: 'Time' },
      { key: 'created_at', label: 'Created', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  inAttendance: {
    tableName: 'film_contacts',
    title: 'In Attendance',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'contact_type', label: 'Role' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'company', label: 'Company' },
      { key: 'created_at', label: 'Added', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  interviewManagement: {
    tableName: 'press',
    title: 'Interview Management (Press)',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'media_outlet', label: 'Media Outlet' },
      { key: 'email', label: 'Email' },
      { key: 'created_at', label: 'Added', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  redCarpets: {
    tableName: 'red_carpets',
    title: 'Red Carpets',
    columns: [
      { key: 'film_program_display', label: 'Film/Program' },
      { key: 'subjects_display', label: 'Subjects' },
      { key: 'carpet_date', label: 'Date', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } },
      { key: 'carpet_start_time', label: 'Start Time' },
      { key: 'house', label: 'Venue' },
      { key: 'created_at', label: 'Created', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  specialEvents: {
    tableName: 'special_events',
    title: 'Special Events',
    columns: [
      { key: 'title', label: 'Event Title' },
      { key: 'event_type', label: 'Type' },
      { key: 'event_date', label: 'Date', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } },
      { key: 'start_time', label: 'Start Time' },
      { key: 'venue_name', label: 'Venue' },
      { key: 'created_at', label: 'Created', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  venueManagement: {
    tableName: 'venues',
    title: 'Venues',
    columns: [
      { key: 'venue_name', label: 'Venue Name' },
      { key: 'short_code', label: 'Code' },
      { key: 'address', label: 'Address' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'contact_person', label: 'Contact' },
      { key: 'created_at', label: 'Added', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  contactsManagement: {
    tableName: 'film_contacts',
    title: 'Contacts',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'contact_type', label: 'Type' },
      { key: 'company', label: 'Company' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'created_at', label: 'Added', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  ticketing: {
    tableName: 'published_screenings',
    title: 'Published Screenings',
    columns: [
      { key: 'film_title', label: 'Film' },
      { key: 'screening_date', label: 'Date', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } },
      { key: 'start_time', label: 'Time' },
      { key: 'venue_short_code', label: 'Venue' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'tickets_sold', label: 'Sold' },
      { key: 'created_at', label: 'Created', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  },
  reportsAnalytics: {
    tableName: 'press_requests',
    title: 'Analytics Data',
    columns: [
      { key: 'requester_outlet', label: 'Outlet' },
      { key: 'request_type', label: 'Request Type' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Date', render: (value: string) => {
        if (!value) return '—'
        // Parse date string directly without timezone conversion
        if (value.includes('-')) {
          const [year, month, day] = value.split(' ')[0].split('-')
          return `${month}/${day}/${year}`
        }
        return value
      } }
    ]
  }
}