'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getAllModules } from '@/config/modules'
import { useAuth } from '@/components/providers/auth-provider'

export function Sidebar() {
  const pathname = usePathname()
  const { permissions } = useAuth()
  const modules = getAllModules()

  const canAccessModule = (moduleId: string) => {
    // For development, allow access to core modules when no permissions
    if (!permissions) {
      return ['festivalOverview', 'titles', 'programmingPipeline', 'pressManagement', 'pressScreenings', 'screenerAccess', 'venueManagement', 'contactsManagement', 'photoShoots', 'inAttendance', 'interviewManagement', 'redCarpets', 'specialEvents', 'ticketing', 'reportsAnalytics'].includes(moduleId)
    }
    if (permissions.isAdmin) return true
    return permissions.modulePermissions[moduleId]?.canRead || false
  }

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen overflow-y-auto">
      <div className="p-4">
        <h1 className="text-xl font-bold">Festival Management</h1>
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
                  <span className="mr-3">
                    {/* Icon placeholder - would use actual icons */}
                    📄
                  </span>
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