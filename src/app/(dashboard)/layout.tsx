'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { FestivalYearProvider } from '@/components/providers/festival-year-provider'
import { Sidebar } from '@/components/layout/sidebar'
import { FeedbackButton } from '@/components/shared/feedback-button'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <FestivalYearProvider>
      <div className="flex h-[100dvh] bg-gray-100">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — hidden on mobile, slide-in drawer when open */}
        <div className={`
          fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out
          md:static md:translate-x-0 md:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile header bar */}
          <div className="md:hidden bg-gray-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 rounded-md hover:bg-gray-800"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-lg">Callsheet</span>
            <div className="w-8" /> {/* Spacer for centering */}
          </div>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      <FeedbackButton />
    </FestivalYearProvider>
  )
}
