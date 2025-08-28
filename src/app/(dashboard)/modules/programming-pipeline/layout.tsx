'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface ProgrammingLayoutProps {
  children: React.ReactNode
}

export default function ProgrammingLayout({ children }: ProgrammingLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const pathname = usePathname()

  const navigationItems = [
    {
      id: 'films',
      name: 'Films Grid',
      icon: '📋',
      href: '/modules/programming-pipeline',
      description: 'Main programming workflow'
    },
    {
      id: 'ticketing',
      name: 'Ticketing Grid',
      icon: '🎫',
      href: '/modules/programming-pipeline/ticketing-grid',
      description: 'Screening schedule management'
    },
    {
      id: 'tributes',
      name: 'Tributes & Special Events',
      icon: '🏆',
      href: '/modules/programming-pipeline/tributes',
      description: 'Special event planning'
    },
    {
      id: 'reports',
      name: 'Reports & Export',
      icon: '📊',
      href: '/modules/programming-pipeline/reports',
      description: 'Data exports and summaries'
    }
  ]

  const isActiveRoute = (href: string) => {
    if (href === '/modules/programming-pipeline') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!sidebarCollapsed && (
            <h1 className="text-lg font-semibold text-gray-900">Programming Pipeline</h1>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-2">
          <ul className="space-y-1">
            {navigationItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActiveRoute(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <span className="text-lg mr-3">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Collapse hint */}
        {!sidebarCollapsed && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="text-xs text-gray-400 text-center">
              Click ← to collapse sidebar
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}