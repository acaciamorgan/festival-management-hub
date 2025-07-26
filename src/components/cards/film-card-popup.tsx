'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FilmCardProps {
  film: {
    id: string
    title: string
    original_language_title?: string
    director?: string
    countries?: string
    programs: string // combined programs
    premiere_status?: string
  }
  onClose: () => void
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

export function FilmCardPopup({ film, onClose }: FilmCardProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [filmPhotoShoots, setFilmPhotoShoots] = useState<any[]>([])
  const [filmRedCarpets, setFilmRedCarpets] = useState<any[]>([])

  const supabase = createClient()

  const formatTimeForDisplay = (timeString: string | undefined): string => {
    if (!timeString) return 'TBD'
    
    // Convert 24-hour format to 12-hour AM/PM format
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    
    return `${hour12}:${minutes} ${ampm}`
  }

  const formatDateForDisplay = (dateString: string | undefined): string => {
    if (!dateString) return 'TBD'
    const date = new Date(dateString)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
    return `${month}/${day}/${year}`
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

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove])

  // Load photo shoots and red carpets for this film
  useEffect(() => {
    const loadEvents = async () => {
      try {
        // Load photo shoots
        const { data: shootsData, error: shootsError } = await supabase
          .from('photo_shoots')
          .select(`
            id,
            shoot_date,
            shoot_time,
            subjects_display,
            venues(name)
          `)
          .or(`film_program_display.ilike.%${film.title}%`)
          .order('shoot_date', { ascending: false })

        if (shootsError) {
          console.error('Error loading photo shoots:', shootsError)
        } else {
          // Filter to only include shoots where this film is actually mentioned
          const relevantShoots = (shootsData || []).filter(shoot => {
            if (!shoot.film_program_display) return false
            const titles = shoot.film_program_display.split(',').map((s: string) => s.trim())
            return titles.includes(film.title)
          })
          setFilmPhotoShoots(relevantShoots)
        }

        // Load red carpets
        const { data: carpetsData, error: carpetsError } = await supabase
          .from('red_carpets')
          .select(`
            id,
            carpet_date,
            carpet_start_time,
            subjects_display,
            film_program_display,
            venues(name)
          `)
          .or(`film_program_display.ilike.%${film.title}%`)
          .order('carpet_date', { ascending: false })

        if (carpetsError) {
          console.error('Error loading red carpets:', carpetsError)
        } else {
          // Filter to only include carpets where this film is actually mentioned
          const relevantCarpets = (carpetsData || []).filter(carpet => {
            if (!carpet.film_program_display) return false
            const titles = carpet.film_program_display.split(',').map((s: string) => s.trim())
            return titles.includes(film.title)
          })
          setFilmRedCarpets(relevantCarpets)
        }
      } catch (error) {
        console.error('Error loading events:', error)
      }
    }

    loadEvents()
  }, [film.title, supabase])

  return (
    <div 
      className="fixed bg-white rounded-lg shadow-2xl border border-gray-300 z-50 max-w-4xl w-[800px] max-h-[80vh] overflow-hidden"
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
        <h1 className="text-lg font-semibold text-gray-900">Film Details</h1>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl font-bold w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
          aria-label="Close"
        >
          ×
        </button>
      </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Top-level info */}
          <div className="p-6 bg-blue-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {film.title}
                  </h2>
                  {film.original_language_title && film.original_language_title !== film.title && (
                    <p className="text-lg text-gray-600 italic">
                      {film.original_language_title}
                    </p>
                  )}
                </div>
                
                {film.director && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Director</span>
                    <p className="text-lg text-gray-900 mt-1">{film.director}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {film.countries && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Countries</span>
                    <p className="text-lg text-gray-900 mt-1">{film.countries}</p>
                  </div>
                )}
                
                {film.programs && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Programs</span>
                    <p className="text-lg text-gray-900 mt-1">{film.programs}</p>
                  </div>
                )}
                
                {film.premiere_status && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Premiere Status</span>
                    <p className="text-lg text-gray-900 mt-1">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        {film.premiere_status}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible sections */}
          <div className="divide-y divide-gray-200">
            <CollapsibleSection title="Press Screenings & Links" isEmpty={true}>
              {/* Will be populated from Press Screenings and Screener Access Modules */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Press screenings, media events, and screener access information will appear here.</p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Red Carpets & Photo Shoots" isEmpty={filmPhotoShoots.length === 0 && filmRedCarpets.length === 0}>
              {(filmPhotoShoots.length > 0 || filmRedCarpets.length > 0) ? (
                <div className="space-y-2">
                  {/* Photo Shoots */}
                  {filmPhotoShoots.map((shoot) => {
                    const date = formatDateForDisplay(shoot.shoot_date)
                    const time = formatTimeForDisplay(shoot.shoot_time)
                    const venue = shoot.venues?.name || 'TBD'
                    const subjects = shoot.subjects_display || 'TBD'
                    
                    return (
                      <div key={`shoot-${shoot.id}`} className="text-sm text-gray-900">
                        📸 Photo Shoot - {date}, {time} at {venue} ({subjects})
                      </div>
                    )
                  })}
                  
                  {/* Red Carpets */}
                  {filmRedCarpets.map((carpet) => {
                    const date = carpet.carpet_date ? (() => {
                      const d = new Date(carpet.carpet_date)
                      const month = (d.getMonth() + 1).toString().padStart(2, '0')
                      const day = d.getDate().toString().padStart(2, '0')
                      const year = d.getFullYear().toString().slice(-2)
                      return `${month}/${day}/${year}`
                    })() : 'TBD'
                    
                    const time = carpet.carpet_start_time ? (() => {
                      const [hours, minutes] = carpet.carpet_start_time.split(':')
                      const hour24 = parseInt(hours, 10)
                      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
                      const ampm = hour24 >= 12 ? 'PM' : 'AM'
                      return `${hour12}:${minutes} ${ampm}`
                    })() : 'TBD'
                    
                    const venue = carpet.venues?.name || 'TBD'
                    const subjects = carpet.subjects_display || 'TBD'
                    
                    return (
                      <div key={`carpet-${carpet.id}`} className="text-sm text-gray-900">
                        🎭 Red Carpet - {date}, {time} at {venue} ({subjects})
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No red carpets or photo shoots found for this film.</p>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Interviews" isEmpty={true}>
              {/* Will be populated from Interview Management Module */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Interview schedules and media appointments will appear here.</p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="In Attendance" isEmpty={true}>
              {/* Will be populated from In Attendance Module and Guest Cards */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Guest attendance information and travel details will appear here.</p>
              </div>
            </CollapsibleSection>
          </div>
        </div>
    </div>
  )
}