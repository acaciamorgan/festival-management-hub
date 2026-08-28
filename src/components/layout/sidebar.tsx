'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getAllModules } from '@/config/modules'
import { useAuth } from '@/components/providers/auth-provider'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrdinalSuffix } from '@/utils/ordinal'
import {
  Calendar, Film, Plane, Newspaper, PlayCircle, Eye, Tv,
  Camera, Star, Mic, Sparkles, BookOpen, Building, Ticket,
  BarChart3, Archive, Settings, Home, LogOut, User, ChevronDown
} from 'lucide-react'

const moduleIcons: Record<string, any> = {
  festivalOverview: Home,
  titles: Film,
  inAttendance: Plane,
  pressManagement: Newspaper,
  pressScreenings: PlayCircle,
  screenerAccess: Eye,
  pressRequests: Tv,
  photoShoots: Camera,
  redCarpets: Star,
  interviewManagement: Mic,
  specialEvents: Sparkles,
  contactsManagement: BookOpen,
  venueManagement: Building,
  ticketing: Ticket,
  reportsAnalytics: BarChart3,
  archives: Archive,
}

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const { permissions } = usePermissions()
  const { currentYear, availableYears, setCurrentYear, loading: yearLoading } = useFestivalYear()
  const modules = getAllModules()
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [newFeedbackCount, setNewFeedbackCount] = useState(0)
  const supabase = createClient()

  // Fetch new feedback count for super admin
  useEffect(() => {
    if (!permissions?.isSuperAdmin) return

    const fetchCount = async () => {
      const { count, error } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new')

      if (!error && count !== null) {
        setNewFeedbackCount(count)
      }
    }

    fetchCount()

    // Poll every 60 seconds
    const interval = setInterval(fetchCount, 60000)

    // Instantly refresh when status is changed on the feedback page
    const handleChange = () => fetchCount()
    window.addEventListener('feedback-status-changed', handleChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('feedback-status-changed', handleChange)
    }
  }, [permissions?.isSuperAdmin, supabase])

  // Can user view past/archived years?
  const canAccessPastYears = permissions?.isAdmin || permissions?.isSuperAdmin || permissions?.modulePermissions['archives']?.canRead || false

  // Filter years shown in dropdown - only show current (newest) year if user can't access archives
  const newestYear = availableYears.length > 0 ? availableYears[0].year : currentYear
  const filteredYears = canAccessPastYears
    ? availableYears
    : availableYears.filter(y => y.year === newestYear)

  // If user can't access past years but is viewing one, reset to newest
  useEffect(() => {
    if (!yearLoading && !canAccessPastYears && currentYear < newestYear) {
      setCurrentYear(newestYear)
    }
  }, [canAccessPastYears, currentYear, newestYear, yearLoading])

  const canAccessModule = (moduleId: string) => {
    if (!permissions) return false

    // Admins and super admins can access everything
    if (permissions.isAdmin || permissions.isSuperAdmin) return true

    // Check specific module permission
    return permissions.modulePermissions[moduleId]?.canRead || false
  }

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen overflow-y-auto">
      <div className="p-4">
        <h1 className="text-xl font-bold">Callsheet</h1>

        {/* Year Selector */}
        <div className="mt-3 relative">
          <button
            onClick={() => filteredYears.length > 1 && setShowYearDropdown(!showYearDropdown)}
            className={`flex items-center justify-between w-full px-3 py-2 text-sm bg-gray-800 rounded-md transition-colors ${filteredYears.length > 1 ? 'hover:bg-gray-700 cursor-pointer' : 'cursor-default'}`}
            disabled={yearLoading}
          >
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="font-medium">{currentYear}</span>
              {availableYears.find(y => y.year === currentYear)?.is_archived && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-600 rounded">
                  Archived
                </span>
              )}
            </span>
            {filteredYears.length > 1 && <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Dropdown Menu */}
          {showYearDropdown && filteredYears.length > 1 && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowYearDropdown(false)}
              />
              <div className="absolute top-full mt-1 w-full bg-gray-800 rounded-md shadow-lg z-20 border border-gray-700 max-h-64 overflow-y-auto">
                {filteredYears.map((year) => (
                  <button
                    key={year.id}
                    onClick={() => {
                      setCurrentYear(year.year)
                      setShowYearDropdown(false)
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                      year.year === currentYear ? 'bg-gray-700' : ''
                    }`}
                  >
                    <span className="font-medium">{year.year}</span>
                    {year.is_archived && (
                      <span className="px-1.5 py-0.5 text-xs bg-yellow-600 rounded">
                        Archived
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      
      <nav className="mt-4">
        <div className="px-4 py-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Modules
          </h2>
        </div>
        
        <ul className="space-y-1">
          {modules.map((module) => {
            if (!canAccessModule(module.id)) return null
            
            const isActive = pathname.startsWith(module.route)
            const Icon = moduleIcons[module.id] || Film
            
            return (
              <li key={module.id}>
                <Link
                  href={module.route}
                  onClick={onNavigate}
                  className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white border-r-2 border-blue-500'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {module.name}
                </Link>
              </li>
            )
          })}
        </ul>
        
        {/* Admin Section */}
        {permissions?.isAdmin && (
          <>
            <div className="px-4 py-2 mt-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Administration
              </h2>
            </div>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/admin"
                  onClick={onNavigate}
                  className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                    pathname === '/admin'
                      ? 'bg-gray-800 text-white border-r-2 border-blue-500'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Settings className="w-4 h-4 mr-3" />
                  User Management
                  {permissions?.isSuperAdmin && (
                    <span className="ml-auto px-2 py-1 text-xs bg-purple-600 text-white rounded">
                      SUPER
                    </span>
                  )}
                </Link>
              </li>
            </ul>
          </>
        )}
        
        {/* User Section */}
        <div className="mt-auto border-t border-gray-800">
          <div className="px-4 py-2 mt-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Account
            </h2>
          </div>
          <ul className="space-y-1 mb-4">
            <li>
              <Link
                href="/settings"
                onClick={onNavigate}
                className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                  pathname === '/settings'
                    ? 'bg-gray-800 text-white border-r-2 border-blue-500'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <User className="w-4 h-4 mr-3" />
                Settings
                {permissions?.isSuperAdmin && newFeedbackCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-xs bg-red-600 text-white rounded-full">
                    {newFeedbackCount}
                  </span>
                )}
              </Link>
            </li>
            <li>
              <button
                onClick={signOut}
                className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  )
}