'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProgramCard, FilmCard, InterviewCard } from '@/types'
import { FilmCardPopup } from './film-card-popup'

interface ProgramCardPopupProps {
  program: ProgramCard
  onClose: () => void
  onEdit?: (program: ProgramCard) => void
  onUpdate?: (updatedProgram: ProgramCard) => void
  onDelete?: (programId: string) => void
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  isEmpty?: boolean
  defaultExpanded?: boolean
}

function CollapsibleSection({ title, children, isEmpty = false, defaultExpanded = false }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg flex justify-between items-center"
      >
        <h3 className="font-medium text-gray-900">{title}</h3>
        <span className="text-gray-400">
          {isExpanded ? '−' : '+'}
        </span>
      </button>
      {isExpanded && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  )
}

export function ProgramCardPopup({ program, onClose, onEdit, onUpdate, onDelete }: ProgramCardPopupProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedFilm, setSelectedFilm] = useState<FilmCard | null>(null)
  const [films, setFilms] = useState<FilmCard[]>([])
  const [interviews, setInterviews] = useState<InterviewCard[]>([])
  const supabase = createClient()

  // Load related films and interviews
  useEffect(() => {
    const loadRelatedData = async () => {
      try {
        // Load films for this program
        const { data: filmsData, error: filmsError } = await supabase
          .from('films')
          .select('*')
          .or(`program_1.eq.${program.title},program_2.eq.${program.title},program_3.eq.${program.title},program_4.eq.${program.title}`)

        if (filmsError) throw filmsError
        setFilms(filmsData || [])

        // Load interviews for this program
        const { data: interviewsData, error: interviewsError } = await supabase
          .from('interview_cards')
          .select('*')
          .eq('program_title', program.title)

        if (interviewsError) throw interviewsError
        setInterviews(interviewsData || [])
      } catch (error) {
        console.error('Error loading program data:', error)
      }
    }

    loadRelatedData()
  }, [program.id])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea, .no-drag')) return
    
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }, [position])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
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

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—'
    const parts = dateString.split('-')
    if (parts.length !== 3) return dateString
    
    const year = parseInt(parts[0])
    const month = parseInt(parts[1])
    const day = parseInt(parts[2])
    
    // Zeller's congruence algorithm
    let q = day
    let m = month
    let y = year
    
    if (m < 3) {
      m += 12
      y -= 1
    }
    
    const h = (q + Math.floor((13 * (m + 1)) / 5) + y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)) % 7
    const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    return `${dayNames[h]}, ${monthNames[month - 1]} ${day}`
  }

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '—'
    
    const [hours, minutes] = timeString.split(':')
    const hour24 = parseInt(hours)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    
    return `${hour12}:${minutes} ${ampm}`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-[calc(100vh-4rem)] overflow-y-auto cursor-move"
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div className="bg-purple-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">{program.title}</h2>
            <p className="text-purple-100 text-sm">Program Card</p>
          </div>
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(program)
                }}
                className="px-3 py-1 bg-purple-500 hover:bg-purple-400 text-white rounded text-sm no-drag"
              >
                Edit
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="text-purple-200 hover:text-white text-2xl no-drag"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <div className="text-sm text-gray-900">{formatDate(program.event_date)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <div className="text-sm text-gray-900">{formatTime(program.event_time)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <div className="text-sm text-gray-900">{program.venue || '—'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-900">{program.event_type || '—'}</span>
                  {program.is_industry_days && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Industry Days
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {program.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {program.description}
                </div>
              </div>
            )}

            {/* Films */}
            <CollapsibleSection 
              title={`Films (${films.length})`}
              defaultExpanded={true}
              isEmpty={films.length === 0}
            >
              {films.length === 0 ? (
                <p className="text-gray-500 text-sm">No films assigned to this program</p>
              ) : (
                <div className="space-y-2">
                  {films.map((film) => (
                    <div 
                      key={film.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer"
                      onClick={() => setSelectedFilm(film)}
                    >
                      <div>
                        <div className="font-medium text-gray-900">{film.title}</div>
                        <div className="text-sm text-gray-600">{film.director}</div>
                      </div>
                      <div className="text-sm text-gray-500">{film.run_time} min</div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {/* Interviews */}
            <CollapsibleSection 
              title={`Interviews (${interviews.length})`}
              defaultExpanded={interviews.length > 0}
              isEmpty={interviews.length === 0}
            >
              {interviews.length === 0 ? (
                <p className="text-gray-500 text-sm">No interviews scheduled for this program</p>
              ) : (
                <div className="space-y-2">
                  {interviews.map((interview) => (
                    <div key={interview.id} className="p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{interview.subject_name}</div>
                          <div className="text-sm text-gray-600">{interview.film_title}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-900">
                            {formatDate(interview.interview_date)} at {formatTime(interview.interview_time)}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">{interview.status}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Film Card Popup */}
      {selectedFilm && (
        <FilmCardPopup
          film={selectedFilm}
          onClose={() => setSelectedFilm(null)}
        />
      )}
    </div>
  )
}