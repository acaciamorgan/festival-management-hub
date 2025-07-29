'use client'

import { useState, useEffect, useCallback } from 'react'
import { InterviewCard } from '@/types'

interface InterviewCardPopupProps {
  interview: InterviewCard
  onClose: () => void
  onEdit?: () => void
  onDelete?: (interviewId: string) => void
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  isEmpty?: boolean
}

function CollapsibleSection({ title, children, isEmpty = false }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-4 px-6 text-left hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          {isEmpty && (
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              No data
            </span>
          )}
          <span className="text-gray-400">
            {isExpanded ? '−' : '+'}
          </span>
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-4">
          {isEmpty ? (
            <p className="text-gray-500 text-sm">
              No information available.
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}

export function InterviewCardPopup({ interview, onClose, onEdit, onDelete }: InterviewCardPopupProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const getStatusStyling = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'bg-green-50 border-green-200'
      case 'Scheduled':
        return 'bg-blue-50 border-blue-200'
      case 'Declined':
        return 'bg-red-50 border-red-200'
      case 'Pitching':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'bg-green-100 text-green-800'
      case 'Scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'Declined':
        return 'bg-red-100 text-red-800'
      case 'Pitching':
        return 'bg-yellow-100 text-yellow-800'
      case 'Subject Pending':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[date.getDay()]
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${dayName}, ${month}/${day}`
  }

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '—'
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${ampm}`
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete this interview for "${interview.film_title}"?`)) {
      onDelete?.(interview.id)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 pointer-events-none">
      <div 
        className="bg-white rounded-lg shadow-2xl border border-gray-300 overflow-hidden pointer-events-auto max-w-4xl w-full mx-4"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          position: 'fixed',
          maxWidth: '800px',
          maxHeight: '90vh',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Draggable Header */}
        <div 
          className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <h1 className="text-lg font-semibold text-gray-900">Interview Details</h1>
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Top-level info */}
          <div className={`p-6 border-b border-gray-200 ${getStatusStyling(interview.status)}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {interview.film_title}
                  </h2>
                  {interview.journalist_name && (
                    <p className="text-lg text-gray-600 font-medium">
                      Interview with {interview.journalist_name}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Status</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(interview.status)}`}>
                      {interview.status}
                    </span>
                  </div>
                </div>

                {interview.outlet && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Outlet</span>
                    <p className="text-lg text-gray-900 mt-1">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {interview.outlet}
                      </span>
                    </p>
                  </div>
                )}

                {interview.subject_names && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Subject(s)</span>
                    <p className="text-lg text-gray-900 mt-1">{interview.subject_names}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {interview.email && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Email</span>
                    <p className="text-lg text-gray-900 mt-1">
                      <a href={`mailto:${interview.email}`} className="text-blue-600 hover:text-blue-800">
                        {interview.email}
                      </a>
                    </p>
                  </div>
                )}

                {interview.status === 'Scheduled' && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Interview Schedule</h3>
                    
                    {interview.interview_date && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-500">Date:</span>
                        <span className="ml-2 text-sm text-gray-900">{formatDate(interview.interview_date)}</span>
                      </div>
                    )}
                    
                    {interview.interview_time && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-500">Time:</span>
                        <span className="ml-2 text-sm text-gray-900">{formatTime(interview.interview_time)}</span>
                      </div>
                    )}
                    
                    {interview.location && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-500">Location:</span>
                        <span className="ml-2 text-sm text-gray-900">{interview.location}</span>
                      </div>
                    )}
                  </div>
                )}

                {interview.notes && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Notes</span>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{interview.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible Sections */}
          <CollapsibleSection title="Related Information" isEmpty={true}>
            <p className="text-gray-500 text-sm">
              Additional interview context and related information will appear here as the system develops.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="History" isEmpty={true}>
            <p className="text-gray-500 text-sm">
              Interview status changes and history will be tracked here.
            </p>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  )
}