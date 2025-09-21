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
  const [inheritedGuests, setInheritedGuests] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (isOpen && filmTitle) {
      loadFilmDetails()
    }
  }, [isOpen, filmTitle])


  const loadFilmDetails = async () => {
    console.log('DEBUG: loadFilmDetails called for', filmTitle)
    setLoading(true)
    setFilm(null)
    setShortsProgram(null)
    setShortFilms([])
    setIsShortsProgramModal(false)
    setInheritedGuests([])

    try {
      // First, check if this is a shorts program
      const { data: programData } = await supabase
        .from('shorts_programs')
        .select('*')
        .eq('program_name', filmTitle)
        .single()

      console.log('DEBUG: Shorts program check result:', programData)

      if (programData) {
        console.log('DEBUG: Taking shorts program path')
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

        console.log('DEBUG: Short film check for', filmTitle, shortFilmData, shortFilmError)

        if (!shortFilmError && shortFilmData && shortFilmData.shorts_program_id) {
          console.log('DEBUG: This is a short film, treating as feature film')
          // Convert short film to feature film format
          const filmAsFeature = {
            id: shortFilmData.id,
            title: shortFilmData.title,
            director: shortFilmData.director,
            countries: shortFilmData.countries,
            run_time: shortFilmData.run_time,
            language: shortFilmData.language,
            subtitles: '',
            program_1: shortFilmData.program_1,
            program_2: shortFilmData.program_2,
            program_3: shortFilmData.program_3,
            program_4: '',
            genre_1: '',
            genre_2: '',
            genre_3: '',
            genre_4: '',
            principal_cast: '',
            screenwriter: '',
            cinematographer: '',
            editor: '',
            producer: '',
            executive_producer: '',
            production_companies: '',
            premiere_status: '',
            content_considerations: '',
            trailer_url: '',
            film_website: ''
          }

          setFilm(filmAsFeature)

          // Load guests for short film using films_display
          const { data: shortGuests } = await supabase
            .from('guests')
            .select(`
              id,
              name,
              role,
              arrival_date,
              departure_date,
              confirmed,
              checked_in
            `)
            .ilike('films_display', `%${shortFilmData.title}%`)

          if (shortGuests) {
            setInheritedGuests(shortGuests)
            console.log('DEBUG: Found short film guests:', shortGuests)
          }
        } else {
          console.log('DEBUG: Taking feature film path')
          // This is a feature film
          setIsShortsProgramModal(false)
          const { data: filmData } = await supabase
            .from('feature_films')
            .select('*')
            .eq('title', filmTitle)
            .single()

          console.log('DEBUG: Feature film data:', filmData)
          setFilm(filmData)

          // Load guests for feature film using films_display
          const { data: featureGuests } = await supabase
            .from('guests')
            .select(`
              id,
              name,
              role,
              arrival_date,
              departure_date,
              confirmed,
              checked_in
            `)
            .ilike('films_display', `%${filmTitle}%`)

          if (featureGuests) {
            setInheritedGuests(featureGuests)
            console.log('DEBUG: Found feature film guests:', featureGuests)
          }
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
      <div key={`${filmTitle}-${isShortsProgramModal}`} className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isShortsProgramModal ? 'Shorts Program Details' : 'Film Details'}
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

              {/* In Attendance Section for Feature Films */}
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">In Attendance</h4>
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
                    <p className="text-gray-500 text-sm">No guests associated with this film.</p>
                  )}
                </div>
              </div>

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