import { ModuleConfig } from '@/types'

export const moduleConfigs: Record<string, ModuleConfig> = {
  programmingPipeline: {
    id: 'programmingPipeline',
    name: 'Programming Pipeline',
    icon: 'cog',
    hasGridView: true,
    hasRSVP: false,
    cardTypes: ['contacts'],
    route: '/modules/programming-pipeline'
  },
  titles: {
    id: 'titles',
    name: 'Titles & Programs',
    icon: 'film',
    hasGridView: true,
    hasRSVP: false,
    cardTypes: ['titles'],
    route: '/modules/titles'
  },
  pressManagement: {
    id: 'pressManagement',
    name: 'Press Management',
    icon: 'newspaper',
    hasGridView: true,
    hasRSVP: false,
    cardTypes: ['press'],
    route: '/modules/press-management'
  },
  pressScreenings: {
    id: 'pressScreenings',
    name: 'Press Screenings',
    icon: 'calendar',
    hasGridView: true,
    hasRSVP: true,
    cardTypes: ['titles', 'press', 'venues'],
    route: '/modules/press-screenings'
  },
  screenerAccess: {
    id: 'screenerAccess',
    name: 'Screener Access',
    icon: 'play',
    hasGridView: true,
    hasRSVP: false,
    cardTypes: ['titles', 'press'],
    route: '/modules/screener-access'
  },
  photoShoots: {
    id: 'photoShoots',
    name: 'Photo Shoots',
    icon: 'camera',
    hasGridView: true,
    hasRSVP: true,
    cardTypes: ['guests', 'venues'],
    route: '/modules/photo-shoots'
  },
  inAttendance: {
    id: 'inAttendance',
    name: 'In Attendance',
    icon: 'users',
    hasGridView: true,
    hasRSVP: false,
    cardTypes: ['guests'],
    route: '/modules/in-attendance'
  },
  interviewManagement: {
    id: 'interviewManagement',
    name: 'Interview Management',
    icon: 'mic',
    hasGridView: true,
    hasRSVP: false,
    cardTypes: ['guests', 'press', 'venues'],
    route: '/modules/interview-management'
  },
  redCarpets: {
    id: 'redCarpets',
    name: 'Red Carpets',
    icon: 'star',
    hasGridView: true,
    hasRSVP: true,
    cardTypes: ['guests', 'press', 'venues'],
    route: '/modules/red-carpets'
  },
  specialEvents: {
    id: 'specialEvents',
    name: 'Special Events',
    icon: 'sparkles',
    hasGridView: true,
    hasCalendarView: true,
    hasRSVP: true,
    cardTypes: ['guests', 'press', 'venues', 'programs'],
    route: '/modules/special-events'
  },
  venueManagement: {
    id: 'venueManagement',
    name: 'Venue Management',
    icon: 'building',
    hasGridView: true,
    hasRSVP: false,
    cardTypes: ['venues'],
    route: '/modules/venues'
  },
  contactsManagement: {
    id: 'contactsManagement',
    name: 'Contacts Management',
    icon: 'address-book',
    hasGridView: true,
    hasRSVP: false,
    cardTypes: ['contacts'],
    route: '/modules/contacts'
  },
  reportsAnalytics: {
    id: 'reportsAnalytics',
    name: 'Reports & Analytics',
    icon: 'chart-bar',
    hasGridView: true,
    hasRSVP: false,
    cardTypes: ['titles', 'guests', 'press', 'venues', 'programs'],
    route: '/modules/reports-analytics'
  },
  admin: {
    id: 'admin',
    name: 'Admin',
    icon: 'settings',
    hasGridView: true,
    hasRSVP: false,
    cardTypes: [],
    route: '/admin'
  }
}

export const getModuleConfig = (moduleId: string): ModuleConfig | undefined => {
  return moduleConfigs[moduleId]
}

export const getAllModules = (): ModuleConfig[] => {
  return Object.values(moduleConfigs)
}