'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Reply } from 'lucide-react'
import Link from 'next/link'

interface FeedbackRow {
  id: string
  user_id: string
  user_email: string
  feedback_type: 'bug' | 'suggestion' | 'other'
  description: string
  current_page: string
  status: 'new' | 'reviewed' | 'resolved'
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  bug: 'bg-red-100 text-red-700',
  suggestion: 'bg-blue-100 text-blue-700',
  other: 'bg-gray-100 text-gray-700',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
}

const NEXT_STATUS: Record<string, string> = {
  new: 'reviewed',
  reviewed: 'resolved',
  resolved: 'new',
}

export default function FeedbackViewerPage() {
  const { loading: authLoading } = useAuth()
  const { permissions } = usePermissions()
  const supabase = createClient()

  const [feedback, setFeedback] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const isAdmin = permissions?.isAdmin || permissions?.isSuperAdmin || false

  useEffect(() => {
    if (isAdmin) {
      fetchFeedback()
    }
  }, [isAdmin])

  const fetchFeedback = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setFeedback(data as FeedbackRow[])
    }
    setLoading(false)
  }

  const cycleStatus = async (item: FeedbackRow) => {
    const newStatus = NEXT_STATUS[item.status]
    const { error } = await supabase
      .from('feedback')
      .update({ status: newStatus })
      .eq('id', item.id)

    if (!error) {
      setFeedback((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: newStatus as FeedbackRow['status'] } : f))
      )
      // Notify sidebar to update feedback badge count
      window.dispatchEvent(new Event('feedback-status-changed'))
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Access denied. Admin privileges required.
        </div>
      </div>
    )
  }

  const filtered = feedback.filter((f) => {
    if (typeFilter !== 'all' && f.feedback_type !== typeFilter) return false
    if (statusFilter !== 'all' && f.status !== statusFilter) return false
    return true
  })

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Feedback</h1>
          <span className="text-sm text-gray-500">({filtered.length})</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="bug">Bug</option>
            <option value="suggestion">Suggestion</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No feedback found.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {item.user_email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[item.feedback_type]}`}>
                        {item.feedback_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap font-mono">
                      {item.current_page}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                      <div className={expandedId === item.id ? '' : 'line-clamp-2'}>{item.description}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); cycleStatus(item) }}
                          className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 ${STATUS_COLORS[item.status]}`}
                          title="Click to change status"
                        >
                          {item.status}
                        </button>
                        <a
                          href={`mailto:${item.user_email}?subject=${encodeURIComponent(`Re: Your ${item.feedback_type} report on Callsheet`)}&body=${encodeURIComponent(`\n\n--- Original ${item.feedback_type} (${new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}) ---\nPage: ${item.current_page}\n\n${item.description}`)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Reply via email"
                        >
                          <Reply className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
