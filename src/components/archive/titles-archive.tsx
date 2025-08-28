'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TitlesArchiveProps {
  archiveYear: number
}

type ViewMode = 'features' | 'shorts'

export default function TitlesArchive({ archiveYear }: TitlesArchiveProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('features')
  const [featureFilms, setFeatureFilms] = useState<any[]>([])
  const [shortFilms, setShortFilms] = useState<any[]>([])
  const [shortsPrograms, setShortsPrograms] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadArchiveData()
  }, [archiveYear])

  const loadArchiveData = async () => {
    setLoading(true)
    setError('')

    try {
      // Load shorts programs for ID-to-name lookup
      const { data: programs, error: programsError } = await supabase
        .from(`archive_${archiveYear}_shorts_programs`)
        .select('id, program_name')

      if (programsError) {
        console.warn('Could not load shorts programs from archive:', programsError)
        // Try current shorts programs as fallback
        const { data: currentPrograms } = await supabase
          .from('shorts_programs')
          .select('id, program_name')
        if (currentPrograms) {
          const programLookup: Record<string, string> = {}
          currentPrograms.forEach(program => {
            programLookup[program.id] = program.program_name || 'Unknown Program'
          })
          setShortsPrograms(programLookup)
        }
      } else if (programs) {
        const programLookup: Record<string, string> = {}
        programs.forEach(program => {
          programLookup[program.id] = program.program_name || 'Unknown Program'
        })
        setShortsPrograms(programLookup)
      }

      // Load feature films
      const { data: features, error: featuresError } = await supabase
        .from(`archive_${archiveYear}_feature_films`)
        .select('*')
        .order('title')

      if (featuresError) throw featuresError

      // Load short films
      const { data: shorts, error: shortsError } = await supabase
        .from(`archive_${archiveYear}_short_films`)
        .select('*')
        .order('title')

      if (shortsError) throw shortsError

      setFeatureFilms(features || [])
      setShortFilms(shorts || [])
    } catch (err: any) {
      console.error('Error loading archive titles:', err)
      setError(err.message || 'Failed to load archived titles')
    } finally {
      setLoading(false)
    }
  }

  const currentData = viewMode === 'features' ? featureFilms : shortFilms
  const filteredData = currentData.filter(film => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      film.title?.toLowerCase().includes(term) ||
      film.director?.toLowerCase().includes(term) ||
      film.producer?.toLowerCase().includes(term) ||
      film.countries?.toLowerCase().includes(term)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-2xl mb-4">🎬</div>
          <div className="text-lg text-gray-600">Loading archived titles...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-2xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Archive</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Archive Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗄️</span>
          <div className="text-amber-800">
            <strong>Archived Titles & Programs from {archiveYear}</strong>
            <div className="text-sm text-amber-700 mt-1">
              This is a read-only view of film titles from the {archiveYear} festival archive.
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setViewMode('features')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'features'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Feature Films ({featureFilms.length})
          </button>
          <button
            onClick={() => setViewMode('shorts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'shorts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Short Films ({shortFilms.length})
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`Search ${viewMode === 'features' ? 'feature films' : 'short films'}...`}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <div className="text-sm text-gray-600 mt-2">
          Showing {filteredData.length} of {currentData.length} {viewMode === 'features' ? 'feature films' : 'short films'}
        </div>
      </div>

      {/* Films Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Films Found</h3>
            <p className="text-gray-600">
              {currentData.length === 0 
                ? `No ${viewMode === 'features' ? 'feature films' : 'short films'} were archived from ${archiveYear}.`
                : "No films match your search."
              }
            </p>
          </div>
        ) : (
          <div className="h-96 overflow-auto border border-gray-300">
            <table className="min-w-full table-fixed divide-y divide-gray-200" style={{ width: viewMode === 'features' ? '2000px' : '4200px' }}>
              <thead className="bg-gray-50 sticky top-0">
                <tr>
{viewMode === 'features' ? (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '200px' }}>
                        <div className="truncate">Title</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Director</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Producer</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Executive Producer</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Screenwriter</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Cinematographer</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Editor</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '200px' }}>
                        <div className="truncate">Principal Cast</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '120px' }}>
                        <div className="truncate">Countries</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '80px' }}>
                        <div className="truncate">Year</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '80px' }}>
                        <div className="truncate">Runtime</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '120px' }}>
                        <div className="truncate">Language</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '180px' }}>
                        <div className="truncate">Production Companies</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider resize-x overflow-hidden" style={{ width: '120px' }}>
                        <div className="truncate">Premiere Status</div>
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '60px' }}>
                        <div className="truncate">Order</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '200px' }}>
                        <div className="truncate">Title</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '100px' }}>
                        <div className="truncate">Source</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '180px' }}>
                        <div className="truncate">Original Title</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Director</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Countries</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '200px' }}>
                        <div className="truncate">Shorts Program</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Programs</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '120px' }}>
                        <div className="truncate">Genres</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '80px' }}>
                        <div className="truncate">Runtime</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '100px' }}>
                        <div className="truncate">Language</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '80px' }}>
                        <div className="truncate">Subtitles</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '80px' }}>
                        <div className="truncate">Captions</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '70px' }}>
                        <div className="truncate">Year</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Screenwriter</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Cinematographer</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '120px' }}>
                        <div className="truncate">Art Director</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '100px' }}>
                        <div className="truncate">Editor</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '200px' }}>
                        <div className="truncate">Principal Cast</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '120px' }}>
                        <div className="truncate">Sound Designer</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '120px' }}>
                        <div className="truncate">Music/Score</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Producer</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Executive Producer</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '180px' }}>
                        <div className="truncate">Production Companies</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Film Website</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Trailer URL</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 resize-x overflow-hidden" style={{ width: '120px' }}>
                        <div className="truncate">Premiere Status</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider resize-x overflow-hidden" style={{ width: '150px' }}>
                        <div className="truncate">Content Warnings</div>
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((film) => (
                  <tr key={film.id} className="hover:bg-gray-50">
                    {viewMode === 'features' ? (
                      <>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '200px' }}>
                          <div className="truncate" title={film.title}>{film.title}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.director}>{film.director}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.producer}>{film.producer}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.executive_producer}>{film.executive_producer}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.screenwriter}>{film.screenwriter}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.cinematographer}>{film.cinematographer}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.editor}>{film.editor}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '200px' }}>
                          <div className="truncate" title={film.principal_cast}>{film.principal_cast}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '120px' }}>
                          <div className="truncate" title={film.countries}>{film.countries}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '80px' }}>
                          <div className="truncate">{film.original_release_year}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '80px' }}>
                          <div className="truncate">{film.run_time}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '120px' }}>
                          <div className="truncate" title={film.language}>{film.language}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '180px' }}>
                          <div className="truncate" title={film.production_companies}>{film.production_companies}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 overflow-hidden" style={{ width: '120px' }}>
                          <div className="truncate" title={film.premiere_status}>{film.premiere_status}</div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '60px' }}>
                          <div className="truncate">{film.program_order}</div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '200px' }}>
                          <div className="truncate" title={film.title}>{film.title}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '100px' }}>
                          <div className="truncate" title={film.source}>{film.source}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '180px' }}>
                          <div className="truncate" title={film.original_language_title}>{film.original_language_title}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.director}>{film.director}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.countries}>{film.countries}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '200px' }}>
                          <div className="truncate" title={shortsPrograms[film.shorts_program_id] || film.shorts_program_id}>
                            {shortsPrograms[film.shorts_program_id] || film.shorts_program_id || 'No Program'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={[film.program_1, film.program_2, film.program_3].filter(Boolean).join(', ')}>
                            {[film.program_1, film.program_2, film.program_3].filter(Boolean).join(', ')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '120px' }}>
                          <div className="truncate" title={[film.genre_1, film.genre_2, film.genre_3].filter(Boolean).join(', ')}>
                            {[film.genre_1, film.genre_2, film.genre_3].filter(Boolean).join(', ')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '80px' }}>
                          <div className="truncate">{film.run_time}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '100px' }}>
                          <div className="truncate" title={film.language}>{film.language}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '80px' }}>
                          <div className="truncate" title={film.subtitles}>{film.subtitles}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '80px' }}>
                          <div className="truncate" title={film.captions}>{film.captions}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '70px' }}>
                          <div className="truncate">{film.original_release_year}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.screenwriter}>{film.screenwriter}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.cinematographer}>{film.cinematographer}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '120px' }}>
                          <div className="truncate" title={film.art_director}>{film.art_director}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '100px' }}>
                          <div className="truncate" title={film.editor}>{film.editor}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '200px' }}>
                          <div className="truncate" title={film.principal_cast}>{film.principal_cast}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '120px' }}>
                          <div className="truncate" title={film.sound_designer}>{film.sound_designer}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '120px' }}>
                          <div className="truncate" title={film.music_score}>{film.music_score}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.producer}>{film.producer}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.executive_producer}>{film.executive_producer}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '180px' }}>
                          <div className="truncate" title={film.production_companies}>{film.production_companies}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.film_website}>{film.film_website}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.trailer_url}>{film.trailer_url}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 overflow-hidden" style={{ width: '120px' }}>
                          <div className="truncate" title={film.premiere_status}>{film.premiere_status}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 overflow-hidden" style={{ width: '150px' }}>
                          <div className="truncate" title={film.content_warnings}>{film.content_warnings}</div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Archive Footer */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="text-center text-sm text-gray-600">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span>🔒</span>
            <strong className="text-amber-700">READ-ONLY ARCHIVE</strong>
          </div>
          <p>This archived data cannot be modified. All film records are preserved as they were during the {archiveYear} festival.</p>
        </div>
      </div>
    </div>
  )
}