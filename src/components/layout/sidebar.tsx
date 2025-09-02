'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getAllModules } from '@/config/modules'
import { useAuth } from '@/components/providers/auth-provider'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrdinalSuffix } from '@/utils/ordinal'
import { 
  Calendar, Film, Plane, Newspaper, PlayCircle, Eye, Tv,
  Camera, Star, Mic, Sparkles, BookOpen, Building, Ticket,
  BarChart3, Archive, Settings, GitBranch, Home
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
  admin: Settings,
  programmingPipeline: GitBranch
}

export function Sidebar() {
  const pathname = usePathname()
  const { permissions } = useAuth()
  const modules = getAllModules()
  const [festivalInfo, setFestivalInfo] = useState<{edition: string, name: string} | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadFestivalInfo = async () => {
      const { data } = await supabase
        .from('festival_settings')
        .select('edition_number, festival_name')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (data) {
        setFestivalInfo({
          edition: getOrdinalSuffix(data.edition_number),
          name: data.festival_name
        })
      }
    }
    
    loadFestivalInfo()
  }, [supabase])

  const canAccessModule = (moduleId: string) => {
    // For development, allow access to core modules when no permissions
    if (!permissions) {
      return ['festivalOverview', 'titles', 'programmingPipeline', 'pressManagement', 'pressScreenings', 'screenerAccess', 'venueManagement', 'contactsManagement', 'photoShoots', 'inAttendance', 'interviewManagement', 'redCarpets', 'specialEvents', 'ticketing', 'admin', 'archives'].includes(moduleId)
    }
    if (permissions.isAdmin) return true
    return permissions.modulePermissions[moduleId]?.canRead || false
  }

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen overflow-y-auto">
      <div className="p-4">
        <h1 className="text-xl font-bold">Callsheet</h1>
        {festivalInfo && (
          <p className="text-xs text-gray-400 mt-1">
            {festivalInfo.edition} {festivalInfo.name}
          </p>
        )}
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
      </nav>
    </aside>
  )
}