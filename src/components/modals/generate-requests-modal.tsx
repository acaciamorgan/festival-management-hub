'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PressRequest {
  id: string
  requester_name: string
  requester_outlet: string
  requester_email: string
  request_type: 'screener_link' | 'screening_ticket'
  film_titles: string
  status: 'new' | 'requested' | 'fulfilled'
}

interface FilmContact {
  film_title: string
  contact_name: string
  contact_email: string
  contact_company: string
}

interface GenerateRequestsModalProps {
  isOpen: boolean
  onClose: () => void
  newRequests: PressRequest[]
  filmContacts: FilmContact[]
  onMarkRequested: (requestIds: string[]) => void
}

export function GenerateRequestsModal({
  isOpen,
  onClose,
  newRequests,
  filmContacts,
  onMarkRequested
}: GenerateRequestsModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  const [groupedRequests, setGroupedRequests] = useState<Map<string, {
    contact: FilmContact
    requests: Array<{
      film: string
      journalist: string
      outlet: string
      email: string
      requestId: string
    }>
  }>>(new Map())

  // Drag handlers
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

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove])

  useEffect(() => {
    if (!isOpen) return

    console.log('Generate modal - processing requests:', {
      totalNewRequests: newRequests.length,
      filmContacts: filmContacts.length
    })

    // Group requests by contact
    const grouped = new Map<string, {
      contact: FilmContact
      requests: Array<{
        film: string
        journalist: string
        outlet: string
        email: string
        requestId: string
      }>
    }>()

    // Only process new screener link requests
    const screenerRequests = newRequests.filter(
      req => req.request_type === 'screener_link'
    )
    
    console.log('Screener requests found:', screenerRequests.length)

    screenerRequests.forEach(request => {
      // Handle the individual_film_title from expanded requests
      const filmTitle = (request as any).individual_film_title || request.film_titles
      console.log('Processing request for film:', filmTitle)
      
      // Find the contact for this film
      const contact = filmContacts.find(c => 
        c.film_title.toLowerCase() === filmTitle.toLowerCase()
      )
      
      if (contact) {
        console.log('Found contact for film:', contact)
        const key = contact.contact_email
        if (!grouped.has(key)) {
          grouped.set(key, {
            contact,
            requests: []
          })
        }
        
        const entry = grouped.get(key)!
        entry.requests.push({
          film: filmTitle,
          journalist: request.requester_name,
          outlet: request.requester_outlet,
          email: request.requester_email,
          requestId: request.id
        })
      } else {
        console.log('No contact found for film:', filmTitle)
      }
    })

    console.log('Grouped requests:', grouped.size)
    setGroupedRequests(grouped)
  }, [isOpen, newRequests, filmContacts])

  const handleCopyContact = (contactEmail: string) => {
    const entry = groupedRequests.get(contactEmail)
    if (!entry) return

    const requestList = entry.requests
      .map(r => `${r.journalist} | ${r.outlet} | ${r.email}`)
      .join('\n')

    const text = `${entry.contact.contact_name}\n${entry.contact.contact_email}\n\nRequests for ${entry.contact.film_title}:\n${requestList}`
    
    navigator.clipboard.writeText(text)
  }

  const handleMarkAllRequested = () => {
    const requestIds: string[] = []
    groupedRequests.forEach(entry => {
      entry.requests.forEach(r => requestIds.push(r.requestId))
    })
    
    if (requestIds.length > 0) {
      onMarkRequested(requestIds)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] overflow-hidden flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          position: 'fixed',
          left: `${position.x}px`, 
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default',
          width: '90vw',
          maxWidth: '900px'
        }}
      >
        <div 
          className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Generate Requests</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
          {groupedRequests.size > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              {groupedRequests.size} contact{groupedRequests.size !== 1 ? 's' : ''} need to be emailed
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {groupedRequests.size === 0 ? (
            <p className="text-gray-500">No new screener link requests to process.</p>
          ) : (
            <div className="space-y-6">
              {Array.from(groupedRequests.entries()).map(([contactEmail, entry]) => (
                <div key={contactEmail} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{entry.contact.contact_name}</h3>
                        <p className="text-sm text-gray-600">{entry.contact.contact_email}</p>
                        <p className="text-sm text-gray-500">{entry.contact.contact_company}</p>
                      </div>
                      <button
                        onClick={() => handleCopyContact(contactEmail)}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Requests for "{entry.contact.film_title}":
                    </p>
                    <div className="space-y-1">
                      {entry.requests.map((req, idx) => (
                        <div key={idx} className="text-sm text-gray-600 pl-4">
                          {req.journalist} | {req.outlet} | {req.email}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          {groupedRequests.size > 0 && (
            <button
              onClick={handleMarkAllRequested}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Mark All as Requested
            </button>
          )}
        </div>
      </div>
    </div>
  )
}