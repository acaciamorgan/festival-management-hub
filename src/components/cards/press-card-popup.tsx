'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PressCard, AccreditationLevel, InterviewCard } from '@/types'
import { getInterviewsForPressCard } from '@/lib/interviews-client'
import { useFestivalYear } from '@/components/providers/festival-year-provider'

interface PressCardProps {
  press: PressCard
  onClose: () => void
  onUpdate?: (updatedPress: PressCard) => void
  onDelete?: (pressId: string) => void
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
              No information available. Data will appear here when {title.toLowerCase()} are added through other modules.
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}

export function PressCardPopup({ press, onClose, onUpdate, onDelete }: PressCardProps) {
  const { currentYear } = useFestivalYear()
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [pickedUpCredentials, setPickedUpCredentials] = useState(press.picked_up_credentials)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: press.name || '',
    email: press.email || '',
    phone: press.phone || '',
    media_outlet: press.media_outlet || '',
    secondary_outlets: press.secondary_outlets || '',
    outlet_type: press.outlet_type || '',
    social_media: { twitter: press.social_media?.twitter || '' },
    rotten_tomatoes_accredited: press.rotten_tomatoes_accredited || false,
    critics_groups: press.critics_groups || '',
    accreditation_level: press.accreditation_level || 'Unassigned'
  })
  const [pressInterviews, setPressInterviews] = useState<InterviewCard[]>([])

  // Edit modal dragging state
  const [editModalPosition, setEditModalPosition] = useState({ x: window.innerWidth / 2 - 320, y: 100 })
  const [isEditModalDragging, setIsEditModalDragging] = useState(false)
  const [editModalDragStart, setEditModalDragStart] = useState({ x: 0, y: 0 })

  const supabase = createClient()

  // Phone number formatting helper
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return ''
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '')
    
    // Handle US numbers (10 or 11 digits)
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    } else if (digits.length === 11 && digits.startsWith('1')) {
      const tenDigits = digits.slice(1)
      return `${tenDigits.slice(0, 3)}-${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`
    }
    
    // For international numbers or non-standard formats, clean up spacing but preserve structure
    return phone.replace(/\s+/g, ' ').replace(/[()]/g, '').replace(/\./g, '-').trim()
  }

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
  }, [isDragging, dragStart.x, dragStart.y])

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Edit modal drag handlers
  const handleEditModalMouseMove = useCallback((e: MouseEvent) => {
    if (isEditModalDragging) {
      setEditModalPosition({
        x: e.clientX - editModalDragStart.x,
        y: e.clientY - editModalDragStart.y
      })
    }
  }, [isEditModalDragging, editModalDragStart.x, editModalDragStart.y])

  const handleEditModalMouseUp = () => {
    setIsEditModalDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])

  // Handle edit modal dragging
  useEffect(() => {
    if (isEditModalDragging) {
      document.addEventListener('mousemove', handleEditModalMouseMove)
      document.addEventListener('mouseup', handleEditModalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleEditModalMouseMove)
      document.removeEventListener('mouseup', handleEditModalMouseUp)
    }
  }, [isEditModalDragging, editModalDragStart])

  const handleCredentialPickupToggle = async () => {
    try {
      const newValue = !pickedUpCredentials
      const { error } = await supabase
        .from('press')
        .update({ 
          picked_up_credentials: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', press.id)
      
      if (!error) {
        setPickedUpCredentials(newValue)
        if (onUpdate) {
          onUpdate({ ...press, picked_up_credentials: newValue })
        }
      }
    } catch (error) {
      console.error('Error updating credential pickup:', error)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editFormData.name || !editFormData.email || !editFormData.media_outlet) {
      alert('Please fill in required fields: Name, Email, and Primary Outlet')
      return
    }
    
    try {
      const updateData = {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        phone: formatPhoneNumber(editFormData.phone),
        media_outlet: editFormData.media_outlet.trim(),
        secondary_outlets: editFormData.secondary_outlets.trim() || null,
        outlet_type: editFormData.outlet_type || null,
        social_media: editFormData.social_media.twitter ? { twitter: editFormData.social_media.twitter } : null,
        rotten_tomatoes_accredited: editFormData.rotten_tomatoes_accredited,
        critics_groups: editFormData.critics_groups.trim() || null,
        accreditation_level: editFormData.accreditation_level,
        updated_at: new Date().toISOString()
      }
      
      const { error } = await supabase
        .from('press')
        .update(updateData)
        .eq('id', press.id)
      
      if (error) {
        console.error('Error updating journalist:', error)
        alert('Error updating journalist. Please try again.')
      } else {
        setShowEditModal(false)
        if (onUpdate) {
          onUpdate({ ...press, ...updateData } as PressCard)
        }
      }
    } catch (error) {
      console.error('Error updating journalist:', error)
      alert('Error updating journalist. Please try again.')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${press.name}&apos;s press card? This action cannot be undone.`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('press')
        .delete()
        .eq('id', press.id)
      
      if (error) {
        console.error('Error deleting journalist:', error)
        alert('Error deleting journalist. Please try again.')
      } else {
        if (onDelete) {
          onDelete(press.id)
        }
        onClose()
      }
    } catch (error) {
      console.error('Error deleting journalist:', error)
      alert('Error deleting journalist. Please try again.')
    }
  }

  // Get background color based on accreditation level
  const getAccreditationStyling = (level: string) => {
    switch (level) {
      case 'P':
        return 'bg-purple-50 border-purple-200'
      case 'G':
        return 'bg-green-50 border-green-200'
      case 'S':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getAccreditationBadge = (level: string) => {
    switch (level) {
      case 'P':
        return 'bg-purple-100 text-purple-800'
      case 'G':
        return 'bg-green-100 text-green-800'
      case 'S':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Load interviews for this press card
  useEffect(() => {
    const loadInterviews = async () => {
      try {
        const interviews = await getInterviewsForPressCard(press.id, currentYear)
        setPressInterviews(interviews)
      } catch (error) {
        console.error('Error loading press interviews:', error)
        setPressInterviews([])
      }
    }

    loadInterviews()
  }, [press.id])

  // Date formatting helper - string-based parsing only
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—'
    
    // Parse YYYY-MM-DD format with string manipulation only
    const parts = dateString.split('-')
    if (parts.length !== 3) return dateString // Return as-is if not expected format
    
    const month = parts[1]
    const day = parts[2]
    
    return `${month}/${day}`
  }

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '—'
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${ampm}`
  }

  return (
    <>
      <div 
        className="fixed bg-white rounded-lg shadow-2xl border border-gray-300 z-50 max-w-4xl w-[800px] max-h-[calc(100vh-2rem)] overflow-y-auto"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Draggable Header */}
        <div 
          className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <h1 className="text-lg font-semibold text-gray-900">Press Details</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Edit
            </button>
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
          <div className={`p-6 border-b border-gray-200 ${getAccreditationStyling(press.accreditation_level)}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {press.name}
                  </h2>
                  <p className="text-lg text-gray-600 font-medium">{press.media_outlet}</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Accreditation Level</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getAccreditationBadge(press.accreditation_level)}`}>
                      {press.accreditation_level === 'G' ? 'G - General Press' :
                       press.accreditation_level === 'P' ? 'P - Priority Press' :
                       press.accreditation_level === 'S' ? 'S - Social' :
                       press.accreditation_level}
                    </span>
                  </div>
                </div>

                {press.outlet_type && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Outlet Type</span>
                    <p className="text-lg text-gray-900 mt-1">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {press.outlet_type}
                      </span>
                    </p>
                  </div>
                )}

                {/* Professional Credentials */}
                <div className="space-y-2">
                  {press.rotten_tomatoes_accredited && (
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Rotten Tomatoes Accredited
                      </span>
                    </div>
                  )}
                  
                  {press.critics_groups && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Critics Groups</span>
                      <p className="text-sm text-gray-900 mt-1">{press.critics_groups}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                {press.email && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Email</span>
                    <p className="text-lg text-gray-900 mt-1">
                      <a href={`mailto:${press.email}`} className="text-blue-600 hover:text-blue-800">
                        {press.email}
                      </a>
                    </p>
                  </div>
                )}
                
                {press.phone && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Phone</span>
                    <p className="text-lg text-gray-900 mt-1">
                      <a href={`tel:${press.phone}`} className="text-blue-600 hover:text-blue-800">
                        {press.phone}
                      </a>
                    </p>
                  </div>
                )}

                {/* Picked Up Credentials Checkbox */}
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                  <input
                    type="checkbox"
                    id="picked-up-credentials"
                    checked={pickedUpCredentials}
                    onChange={handleCredentialPickupToggle}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="picked-up-credentials" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Picked Up Credentials
                  </label>
                </div>
              </div>
            </div>

            {/* Secondary Outlets */}
            {press.secondary_outlets && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Secondary Outlets</h3>
                <p className="text-sm text-gray-900">{press.secondary_outlets}</p>
              </div>
            )}

            {/* Social Media */}
            {press.social_media && Object.keys(press.social_media).length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Social Media</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(press.social_media).map(([platform, handle]) => (
                    <div key={platform}>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">{platform}</span>
                      <p className="text-sm text-gray-900 mt-1">{handle}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Collapsible sections */}
          <div className="divide-y divide-gray-200">
            <CollapsibleSection title="Interviews" isEmpty={pressInterviews.length === 0}>
              {pressInterviews.length > 0 ? (
                <div className="space-y-3">
                  {pressInterviews.map((interview) => (
                    <div key={interview.id} className="bg-gray-50 rounded-lg p-3">
                      {/* Line 1: Status Badge */}
                      <div className="mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          interview.status === 'Complete' ? 'bg-green-100 text-green-800' :
                          interview.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                          interview.status === 'Declined' ? 'bg-red-100 text-red-800' :
                          interview.status === 'Pitching' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {interview.status}
                        </span>
                      </div>
                      
                      {/* Line 2: Main Info */}
                      <div className="text-sm text-gray-900 mb-1">
                        <span className="font-medium">{interview.title}</span>
                        {interview.subject_names && <span> | Subject(s): {interview.subject_names}</span>}
                      </div>
                      
                      {/* Line 3: Scheduling Info (only when scheduled) */}
                      {interview.status === 'Scheduled' && (
                        <div className="text-sm text-gray-600">
                          {interview.interview_date && <span>Date: {formatDate(interview.interview_date)}</span>}
                          {interview.interview_time && <span> | Time: {formatTime(interview.interview_time)}</span>}
                          {interview.location && <span> | Location: {interview.location}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </CollapsibleSection>

            <CollapsibleSection title="Press Screenings" isEmpty={true}>
              {/* Will be populated from Press Screenings RSVP Module */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">RSVP&apos;d press screenings and events will appear here.</p>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>
      
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-transparent z-[60]">
          <div
            className="absolute bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto"
            style={{
              left: `${editModalPosition.x}px`,
              top: `${editModalPosition.y}px`,
            }}
          >
            <div
              className="flex justify-between items-center mb-4 p-6 pb-0 cursor-move bg-gray-50 border-b"
              onMouseDown={(e) => {
                setIsEditModalDragging(true)
                setEditModalDragStart({
                  x: e.clientX - editModalPosition.x,
                  y: e.clientY - editModalPosition.y
                })
              }}
            >
              <h2 className="text-xl font-semibold select-none">Edit Journalist</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Outlet *</label>
                  <input
                    type="text"
                    value={editFormData.media_outlet}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, media_outlet: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outlet Type</label>
                  <select
                    value={editFormData.outlet_type}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, outlet_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="Print/Online">Print/Online</option>
                    <option value="Magazine">Magazine</option>
                    <option value="TV">TV</option>
                    <option value="Radio">Radio</option>
                    <option value="College">College</option>
                    <option value="Trade">Trade</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accreditation Level</label>
                  <select
                    value={editFormData.accreditation_level}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, accreditation_level: e.target.value as AccreditationLevel }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Unassigned">Unassigned</option>
                    <option value="G">G - General Press</option>
                    <option value="P">P - Priority Press</option>
                    <option value="S">S - Social</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Outlets</label>
                <textarea
                  value={editFormData.secondary_outlets}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, secondary_outlets: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Comma-separated list of additional outlets"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Twitter Handle</label>
                <input
                  type="text"
                  value={editFormData.social_media.twitter}
                  onChange={(e) => setEditFormData(prev => ({ 
                    ...prev, 
                    social_media: { ...prev.social_media, twitter: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="@username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Critics Groups</label>
                <input
                  type="text"
                  value={editFormData.critics_groups}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, critics_groups: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Film critics organizations"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-rt-accredited"
                  checked={editFormData.rotten_tomatoes_accredited}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, rotten_tomatoes_accredited: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="edit-rt-accredited" className="ml-2 text-sm text-gray-700">
                  Rotten Tomatoes Accredited
                </label>
              </div>
              
              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors font-medium"
                >
                  🗑️ Delete Journalist
                </button>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}