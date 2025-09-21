'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FilmDetailModalProps {
  filmTitle: string
  isOpen: boolean
  onClose: () => void
}

interface Film {
  id: string
  title: string
  director: string
  countries: string
  run_time: number
  language: string
  subtitles: string
  program_1: string
  program_2: string
  program_3: string
  program_4: string
  genre_1: string
  genre_2: string
  genre_3: string
  genre_4: string
  principal_cast: string
  screenwriter: string
  cinematographer: string
  editor: string
  producer: string
  executive_producer: string
  production_companies: string
  premiere_status: string
  content_considerations: string
  trailer_url: string
  film_website: string
}

interface ShortsProgram {
  id: string
  program_name: string
  program_number: number
}

interface ShortFilm {
  id: string
  title: string
  director: string
  countries: string
  run_time: number
  language: string
  program_1: string
  program_2: string
  program_3: string
  shorts_program_id?: string
}

export default function FilmDetailModal({ filmTitle, isOpen, onClose }: FilmDetailModalProps) {
  const [film, setFilm] = useState<Film | null>(null)
  const [shortsProgram, setShortsProgram] = useState<ShortsProgram | null>(null)
  const [shortFilms, setShortFilms] = useState<ShortFilm[]>([])
  const [loading, setLoading] = useState(false)
  const [isShortsProgramModal, setIsShortsProgramModal] = useState(false)
  const [isShortFilmModal, setIsShortFilmModal] = useState(false)
  const [shortFilmData, setShortFilmData] = useState<ShortFilm | null>(null)
  const [inheritedGuests, setInheritedGuests] = useState<any[]>([])
  const [inheritedScreenings, setInheritedScreenings] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (isOpen && filmTitle) {
      loadFilmDetails()
    }
  }, [isOpen, filmTitle])

  const loadFilmDetails = async () => {
    setLoading(true)
    setFilm(null)
    setShortsProgram(null)
    setShortFilms([])
    setIsShortsProgramModal(false)
    setIsShortFilmModal(false)
    setShortFilmData(null)
    setInheritedGuests([])
    setInheritedScreenings([])

    try {
      // First, check if this is a shorts program
      const { data: programData } = await supabase
        .from('shorts_programs')
        .select('*')
        .eq('program_name', filmTitle)
        .single()

      if (programData) {
        // This is a shorts program
        setIsShortsProgramModal(true)
        setShortsProgram(programData)

        // Get all short films in this program
        const { data: shorts } = await supabase
          .from('short_films')
          .select('id, title, director, countries, run_time, language, program_1, program_2, program_3')
          .eq('shorts_program_id', programData.id)
          .order('title')

        setShortFilms(shorts || [])
      } else {
        // Check if this is an individual short film
        const { data: shortFilmData, error: shortFilmError } = await supabase
          .from('short_films')
          .select('*')
          .eq('title', filmTitle)
          .single()

        if (!shortFilmError && shortFilmData && shortFilmData.shorts_program_id) {
          // This is an individual short film
          setIsShortFilmModal(true)
          setShortFilmData(shortFilmData)

          // Get the shorts program data
          const { data: shortsProgram } = await supabase
            .from('shorts_programs')
            .select('*')
            .eq('id', shortFilmData.shorts_program_id)
            .single()

          if (shortsProgram) {
            setShortsProgram(shortsProgram)

            // Get guests associated with this specific short film
            const { data: guestFilms } = await supabase
              .from('guest_films')
              .select(`
                guest_id,
                guests (
                  id,
                  name,
                  role,
                  arrival_date,
                  departure_date,
                  confirmed,
                  checked_in
                )
              `)
              .eq('film_id', shortFilmData.id)

            if (guestFilms) {
              const guests = guestFilms.map((gf: any) => gf.guests).filter(Boolean)
              setInheritedGuests(guests)
            }

            // Get screenings for the shorts program by program name
            const { data: screenings } = await supabase
              .from('ticketing_screenings')
              .select(`
                id,
                film_title,
                screening_date,
                day_of_week,
                start_time,
                venue_short_code,
                is_cancelled,
                notes
              `)
              .eq('film_title', shortsProgram.program_name)
              .order('screening_date', { ascending: true })
              .order('start_time', { ascending: true })

            if (screenings) {
              // Resolve venue names
              const screeningsWithVenues = await Promise.all(
                screenings.map(async (screening) => {
                  if (screening.venue_short_code) {
                    const { data: houseData } = await supabase
                      .from('theater_houses')
                      .select(`
                        venue_id,
                        venues!inner(name)
                      `)
                      .eq('short_code', screening.venue_short_code)
                      .single()

                    if (houseData?.venues?.name) {
                      return { ...screening, venue_name: houseData.venues.name }
                    }
                  }
                  return { ...screening, venue_name: screening.venue_short_code }
                })
              )
              setInheritedScreenings(screeningsWithVenues)
            }
          }
        } else {
          // This is a feature film
          setIsShortsProgramModal(false)
          setIsShortFilmModal(false)
          const { data: filmData } = await supabase
            .from('feature_films')
            .select('*')
            .eq('title', filmTitle)
            .single()

          setFilm(filmData)
        }
      }
    } catch (error) {
      console.error('Error loading film details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isShortsProgramModal ? 'Shorts Program Details' : isShortFilmModal ? 'Short Film Details' : 'Film Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading details...</p>
            </div>
          ) : isShortsProgramModal ? (
            // Shorts Program Modal Content
            <div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{shortsProgram?.program_name}</h3>
                <p className="text-gray-600">Program #{shortsProgram?.program_number}</p>
                <p className="text-gray-600">
                  {shortFilms.length} short film{shortFilms.length !== 1 ? 's' : ''}
                </p>
                <p className="text-gray-600">
                  Total runtime: {shortFilms.reduce((sum, film) => sum + (film.run_time || 0), 0)} minutes
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Short Films in this Program:</h4>
                {shortFilms.length > 0 ? (
                  <div className="grid gap-4">
                    {shortFilms.map((short) => (
                      <div key={short.id} className="border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">{short.title}</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <strong>Director:</strong> {short.director || 'N/A'}
                          </div>
                          <div>
                            <strong>Runtime:</strong> {short.run_time || 'N/A'} min
                          </div>
                          <div>
                            <strong>Countries:</strong> {short.countries || 'N/A'}
                          </div>
                          <div>
                            <strong>Language:</strong> {short.language || 'N/A'}
                          </div>
                          {short.program_1 && (
                            <div className="col-span-2">
                              <strong>Programs:</strong> {[short.program_1, short.program_2, short.program_3].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No short films found in this program.</p>
                )}
              </div>
            </div>
          ) : isShortFilmModal && shortFilmData ? (
            // Individual Short Film Modal Content
            <div className="space-y-6">
              {/* Short Film Basic Info */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{shortFilmData.title}</h3>
                {shortFilmData.director && <p className="text-lg text-gray-700">Directed by {shortFilmData.director}</p>}
                <p className="text-sm text-blue-600 mt-2">
                  Part of {shortsProgram?.program_name} (Program #{shortsProgram?.program_number})
                </p>
              </div>

              {/* Short Film Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Film Information</h4>
                    <div className="space-y-2 text-sm">
                      {shortFilmData.countries && <div><strong>Countries:</strong> {shortFilmData.countries}</div>}
                      {shortFilmData.run_time && <div><strong>Runtime:</strong> {shortFilmData.run_time} minutes</div>}
                      {shortFilmData.language && <div><strong>Language:</strong> {shortFilmData.language}</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Screenings Section */}
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">Screenings</h4>
                  <p className="text-sm text-gray-600">Inherited from {shortsProgram?.program_name}</p>
                </div>
                <div className="p-4">
                  {inheritedScreenings.length > 0 ? (
                    <div className="space-y-3">
                      {inheritedScreenings.map((screening) => (
                        <div key={screening.id} className="border-l-4 border-blue-400 pl-4 py-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {screening.screening_date} at {screening.start_time}
                              </p>
                              <p className="text-sm text-gray-600">{screening.venue_name}</p>
                              {screening.is_cancelled && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 mt-1">
                                  Cancelled
                                </span>
                              )}
                            </div>
                          </div>
                          {screening.notes && (
                            <p className="text-sm text-gray-500 mt-1">{screening.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No screening information available.</p>
                  )}
                </div>
              </div>

              {/* In Attendance Section */}
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">In Attendance</h4>
                  <p className="text-sm text-gray-600">Inherited from {shortsProgram?.program_name}</p>
                </div>
                <div className="p-4">
                  {inheritedGuests.length > 0 ? (
                    <div className="space-y-3">
                      {inheritedGuests.map((guest) => (
                        <div key={guest.id} className="border-l-4 border-green-400 pl-4 py-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{guest.name}</span>
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
                  ) : (
                    <p className="text-gray-500 text-sm">No guests associated with this program.</p>
                  )}
                </div>
              </div>
            </div>
          ) : film ? (
            // Feature Film Modal Content
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{film.title}</h3>
                {film.director && <p className="text-lg text-gray-700">Directed by {film.director}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      {film.countries && <div><strong>Countries:</strong> {film.countries}</div>}
                      {film.run_time && <div><strong>Runtime:</strong> {film.run_time} minutes</div>}
                      {film.language && <div><strong>Language:</strong> {film.language}</div>}
                      {film.subtitles && <div><strong>Subtitles:</strong> {film.subtitles}</div>}
                      {film.premiere_status && <div><strong>Premiere Status:</strong> {film.premiere_status}</div>}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Programs & Genres</h4>
                    <div className="space-y-2 text-sm">
                      {film.program_1 && <div><strong>Programs:</strong> {[film.program_1, film.program_2, film.program_3, film.program_4].filter(Boolean).join(', ')}</div>}
                      {film.genre_1 && <div><strong>Genres:</strong> {[film.genre_1, film.genre_2, film.genre_3, film.genre_4].filter(Boolean).join(', ')}</div>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Crew</h4>
                    <div className="space-y-2 text-sm">
                      {film.screenwriter && <div><strong>Screenwriter:</strong> {film.screenwriter}</div>}
                      {film.cinematographer && <div><strong>Cinematographer:</strong> {film.cinematographer}</div>}
                      {film.editor && <div><strong>Editor:</strong> {film.editor}</div>}
                      {film.producer && <div><strong>Producer:</strong> {film.producer}</div>}
                      {film.executive_producer && <div><strong>Executive Producer:</strong> {film.executive_producer}</div>}
                    </div>
                  </div>

                  {film.principal_cast && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Cast</h4>
                      <p className="text-sm text-gray-700">{film.principal_cast}</p>
                    </div>
                  )}
                </div>
              </div>

              {film.production_companies && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Production</h4>
                  <p className="text-sm text-gray-700">{film.production_companies}</p>
                </div>
              )}

              {film.content_considerations && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Content Considerations</h4>
                  <p className="text-sm text-red-600">{film.content_considerations}</p>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-200">
                {film.film_website && (
                  <a
                    href={film.film_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                  >
                    🌐 Website
                  </a>
                )}
                {film.trailer_url && (
                  <a
                    href={film.trailer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                  >
                    🎬 Trailer
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Film details not found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}