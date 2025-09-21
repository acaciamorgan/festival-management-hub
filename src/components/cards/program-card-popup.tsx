'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProgramCard, FilmCard, InterviewCard } from '@/types'
import { FilmCardPopup } from './film-card-popup'
import { GuestCardPopup } from './guest-card-popup'

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
        <div className="p-6 pt-0">
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
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null)
  const [films, setFilms] = useState<FilmCard[]>([])
  const [interviews, setInterviews] = useState<InterviewCard[]>([])
  const [guests, setGuests] = useState<any[]>([])
  const [photoShoots, setPhotoShoots] = useState<any[]>([])
  const [redCarpets, setRedCarpets] = useState<any[]>([])
  const [pressScreenings, setPressScreenings] = useState<any[]>([])
  const [screenings, setScreenings] = useState<any[]>([])
  const supabase = createClient()

  // Load all related data
  useEffect(() => {
    const loadRelatedData = async () => {
      try {
        // Load films for this program
        const { data: filmsData } = await supabase
          .from('feature_films')
          .select('*')
          .or(`program_1.eq.${program.title},program_2.eq.${program.title},program_3.eq.${program.title},program_4.eq.${program.title}`)

        setFilms(filmsData || [])

        // Load interviews
        const { data: interviewsData } = await supabase
          .from('interviews')
          .select('*')
          .eq('program_title', program.title)

        setInterviews(interviewsData || [])

        // Load guests
        const { data: guestsData } = await supabase
          .from('guests')
          .select('*')
          .ilike('films_display', `%${program.title}%`)

        setGuests(guestsData || [])

        // Load photo shoots
        const { data: shootsData } = await supabase
          .from('photo_shoots')
          .select('*, venues(name)')
          .ilike('film_program_display', `%${program.title}%`)

        setPhotoShoots(shootsData || [])

        // Load red carpets
        const { data: carpetsData } = await supabase
          .from('red_carpets')
          .select('*, venues(name)')
          .ilike('film_program_display', `%${program.title}%`)

        setRedCarpets(carpetsData || [])

        // Load press screenings
        const { data: pressData } = await supabase
          .from('press_screenings')
          .select('*, venues(name)')
          .eq('title', program.title)

        setPressScreenings(pressData || [])

        // Load ticketing screenings
        const { data: screeningsData } = await supabase
          .from('published_screenings')
          .select('*')
          .eq('film_title', program.title)

        setScreenings(screeningsData || [])

      } catch (error) {
        console.error('Error loading program data:', error)
      }
    }

    loadRelatedData()
  }, [program.id, program.title])

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

  const openGuestCard = (guest: any) => {
    setSelectedGuest(guest)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Program Details</h2>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="text-gray-400 hover:text-gray-600 text-xl no-drag"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Basic Information */}
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{program.title}</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Date</h4>
                  <p className="text-gray-900">{program.event_date || '—'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Time</h4>
                  <p className="text-gray-900">{program.start_time || '—'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Venue</h4>
                  <p className="text-gray-900">{program.venue_name || '—'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Type</h4>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-900">—</p>
                    {program.is_industry_days && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Industry Days
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {program.description && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Description</h4>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{program.description}</p>
                </div>
              )}
            </div>

            {/* Collapsible Sections */}
            <div className="space-y-0">
              <CollapsibleSection title="Screenings" isEmpty={screenings.length === 0}>
                {screenings.length === 0 ? (
                  <p className="text-sm text-gray-500">No public screenings scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {screenings.map((screening) => (
                      <div key={screening.id} className="border-l-4 border-blue-400 pl-4 py-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {screening.screening_date} at {screening.start_time}
                            </p>
                            <p className="text-sm text-gray-600">{screening.venue_name}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Press Screenings & Links" isEmpty={pressScreenings.length === 0}>
                {pressScreenings.length === 0 ? (
                  <p className="text-sm text-gray-500">No press screenings scheduled for this program.</p>
                ) : (
                  <div className="space-y-3">
                    {pressScreenings.map((screening) => (
                      <div key={screening.id} className="p-3 bg-gray-50 rounded-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {screening.screening_date} at {screening.screening_time}
                            </p>
                            <p className="text-sm text-gray-600">{screening.venues?.name}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Red Carpets & Photo Shoots" isEmpty={redCarpets.length === 0 && photoShoots.length === 0}>
                {redCarpets.length === 0 && photoShoots.length === 0 ? (
                  <p className="text-sm text-gray-500">No red carpet events or photo shoots scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {redCarpets.map((carpet) => (
                      <div key={carpet.id} className="border-l-4 border-red-400 pl-4 py-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Red Carpet</p>
                            <p className="text-sm text-gray-600">
                              {carpet.carpet_date} at {carpet.carpet_start_time}
                            </p>
                            <p className="text-sm text-gray-600">{carpet.venues?.name}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {photoShoots.map((shoot) => (
                      <div key={shoot.id} className="border-l-4 border-purple-400 pl-4 py-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Photo Shoot</p>
                            <p className="text-sm text-gray-600">
                              {shoot.shoot_date} at {shoot.shoot_time}
                            </p>
                            <p className="text-sm text-gray-600">{shoot.venues?.name}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Interviews" isEmpty={interviews.length === 0}>
                {interviews.length === 0 ? (
                  <p className="text-sm text-gray-500">No interviews scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {interviews.map((interview) => (
                      <div key={interview.id} className="border-l-4 border-green-400 pl-4 py-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{interview.subject_name}</p>
                            <p className="text-sm text-gray-600">{interview.film_title}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-900">
                              {interview.interview_date} at {interview.interview_time}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">{interview.status}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="In Attendance" isEmpty={guests.length === 0}>
                {guests.length === 0 ? (
                  <p className="text-sm text-gray-500">No guests associated with this program.</p>
                ) : (
                  <div className="space-y-3">
                    {guests.map((guest) => (
                      <div key={guest.id} className="border-l-4 border-green-400 pl-4 py-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openGuestCard(guest)}
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                              >
                                {guest.name}
                              </button>
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                                guest.confirmed
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {guest.confirmed ? 'Confirmed' : 'Pending'}
                              </span>
                              {guest.checked_in && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  Checked In
                                </span>
                              )}
                            </div>
                            {guest.role && (
                              <p className="text-sm text-gray-600 mt-1">{guest.role}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Contact Information" isEmpty={true}>
                <p className="text-sm text-gray-500">No contact information available.</p>
              </CollapsibleSection>
            </div>
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

      {/* Guest Card Popup */}
      {selectedGuest && (
        <GuestCardPopup
          guest={selectedGuest}
          onClose={() => setSelectedGuest(null)}
        />
      )}
    </>
  )
}