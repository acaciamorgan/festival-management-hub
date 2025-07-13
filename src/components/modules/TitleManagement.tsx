import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Edit3, ExternalLink, 
  Globe, Clock, Star, Film, Users, Calendar,
  Grid, List, Eye
} from 'lucide-react';
import { useData, Film as FilmType } from '../../contexts/DataContext';

interface User {
  id: number;
  name: string;
  role: string;
  permissions: Record<string, string>;
}

interface TitleManagementProps {
  user: User;
}

const TitleManagement: React.FC<TitleManagementProps> = ({ user }) => {
  const { films, addFilm } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [sortBy, setSortBy] = useState('title');
  const [selectedFilm, setSelectedFilm] = useState<FilmType | null>(null);
  const [showFilmModal, setShowFilmModal] = useState(false);
  const [showAddFilmModal, setShowAddFilmModal] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const programs = [...new Set(films.flatMap(film => film.programs))];
  const genres = [...new Set(films.flatMap(film => film.genres))];

  const filteredFilms = films.filter(film => {
    const matchesSearch = film.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         film.director.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         film.countries.some(country => country.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesProgram = selectedProgram === 'all' || film.programs.includes(selectedProgram);
    const matchesGenre = selectedGenre === 'all' || film.genres.includes(selectedGenre);
    
    return matchesSearch && matchesProgram && matchesGenre;
  });

  const sortedFilms = filteredFilms.sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'director':
        return a.director.localeCompare(b.director);
      case 'runtime':
        return a.runtime - b.runtime;
      case 'year':
        return b.originalReleaseYear - a.originalReleaseYear;
      default:
        return 0;
    }
  });

  const getScreenerAccessBadge = (type?: string) => {
    const badges = {
      'cinesend': { color: 'bg-green-100 text-green-800', text: 'Cinesend' },
      'direct_link': { color: 'bg-blue-100 text-blue-800', text: 'Direct Link' },
      'distributor_request': { color: 'bg-yellow-100 text-yellow-800', text: 'Distributor' },
      'screenings_only': { color: 'bg-gray-100 text-gray-800', text: 'Screenings Only' }
    };
    
    const badge = badges[type as keyof typeof badges] || badges['screenings_only'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Title Management</h2>
            <p className="text-gray-600">Manage festival films and programs</p>
          </div>
          
          {/* Search Bar - moved to header level */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search films, directors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-300 p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md flex items-center ${
                viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4 mr-1" />
              Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-md flex items-center ${
                viewMode === 'cards' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid className="w-4 h-4 mr-1" />
              Cards
            </button>
          </div>
          
          {user.permissions.titleManagement === 'full_edit' && (
            <button 
              onClick={() => setShowAddFilmModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Film
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Programs</option>
            {programs.map(program => (
              <option key={program} value={program}>{program}</option>
            ))}
          </select>

          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Genres</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="title">Sort by Title</option>
            <option value="director">Sort by Director</option>
            <option value="runtime">Sort by Runtime</option>
            <option value="year">Sort by Year</option>
          </select>
        </div>
      </div>

      {/* Films Display - Table or Cards */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-max w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                    Director
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Countries
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    Language
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                    Subtitles
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                    Programs
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Genres
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                    Runtime
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                    Year
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Premiere
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                    Principal Cast
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                    Screenwriter
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                    Cinematographer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                    Producer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                    Production Companies
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Screener Access
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedFilms.map((film) => (
                  <tr key={film.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 sticky left-0 bg-white z-10 min-w-[200px]">
                      <div>
                        <div className="font-medium text-gray-900">{film.title}</div>
                        {film.originalLanguageTitle && film.originalLanguageTitle !== film.title && (
                          <div className="text-sm text-gray-500 italic">{film.originalLanguageTitle}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 min-w-[150px]">
                      {film.director}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 min-w-[120px]">
                      {film.countries.join(', ')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 min-w-[100px]">
                      {film.language}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 min-w-[80px]">
                      {film.subtitles ? 'Yes' : 'No'}
                    </td>
                    <td className="px-4 py-4 min-w-[180px]">
                      <div className="flex flex-wrap gap-1">
                        {film.programs.map((program, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            {program}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 min-w-[120px]">
                      <div className="flex flex-wrap gap-1">
                        {film.genres.map((genre, index) => (
                          <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 min-w-[80px]">
                      {film.runtime} min
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 min-w-[80px]">
                      {film.originalReleaseYear}
                    </td>
                    <td className="px-4 py-4 min-w-[120px]">
                      {film.premiereStatus && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                          {film.premiereStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 min-w-[180px]">
                      {film.cast.slice(0, 3).join(', ')}
                      {film.cast.length > 3 && (
                        <span className="text-gray-500"> +{film.cast.length - 3} more</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 min-w-[150px]">
                      {film.crew.screenwriter || '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 min-w-[150px]">
                      {film.crew.cinematographer || '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 min-w-[150px]">
                      {film.crew.producer || '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 min-w-[180px]">
                      {film.production.companies?.join(', ') || '—'}
                    </td>
                    <td className="px-4 py-4 min-w-[120px]">
                      {getScreenerAccessBadge(film.screenerAccessType)}
                    </td>
                    <td className="px-4 py-4 min-w-[100px]">
                      <button
                        onClick={() => {
                          setSelectedFilm(film);
                          setShowFilmModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedFilms.map((film) => (
            <div
              key={film.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedFilm(film);
                setShowFilmModal(true);
              }}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">{film.title}</h3>
                  {film.premiereStatus && (
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium ml-2">
                      {film.premiereStatus}
                    </span>
                  )}
                </div>
                
                {film.originalLanguageTitle && film.originalLanguageTitle !== film.title && (
                  <p className="text-gray-600 text-sm mb-2 italic">{film.originalLanguageTitle}</p>
                )}

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{film.director}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Globe className="w-4 h-4 mr-2" />
                    <span>{film.countries.join(', ')}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{film.runtime} min • {film.originalReleaseYear}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {film.programs.map((program, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {program}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex justify-between items-center">
                  {getScreenerAccessBadge(film.screenerAccessType)}
                  <Edit3 className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Film Details Modal */}
      {showFilmModal && selectedFilm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedFilm.title}</h2>
                  {selectedFilm.originalLanguageTitle && (
                    <p className="text-gray-600 italic">{selectedFilm.originalLanguageTitle}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowFilmModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Basic Information</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Director:</span> {selectedFilm.director}</p>
                      <p><span className="font-medium">Countries:</span> {selectedFilm.countries.join(', ')}</p>
                      <p><span className="font-medium">Runtime:</span> {selectedFilm.runtime} minutes</p>
                      <p><span className="font-medium">Language:</span> {selectedFilm.language}</p>
                      <p><span className="font-medium">Year:</span> {selectedFilm.originalReleaseYear}</p>
                      {selectedFilm.premiereStatus && (
                        <p><span className="font-medium">Premiere:</span> {selectedFilm.premiereStatus}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Programs & Genres</h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {selectedFilm.programs.map((program, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          {program}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedFilm.genres.map((genre, index) => (
                        <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Cast & Crew</h3>
                    <div className="space-y-1 text-sm">
                      {selectedFilm.crew.screenwriter && (
                        <p><span className="font-medium">Screenwriter:</span> {selectedFilm.crew.screenwriter}</p>
                      )}
                      {selectedFilm.crew.cinematographer && (
                        <p><span className="font-medium">Cinematographer:</span> {selectedFilm.crew.cinematographer}</p>
                      )}
                      {selectedFilm.crew.editor && (
                        <p><span className="font-medium">Editor:</span> {selectedFilm.crew.editor}</p>
                      )}
                      {selectedFilm.crew.producer && (
                        <p><span className="font-medium">Producer:</span> {selectedFilm.crew.producer}</p>
                      )}
                    </div>
                    
                    {selectedFilm.cast.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium text-sm">Principal Cast:</p>
                        <p className="text-sm text-gray-600">{selectedFilm.cast.join(', ')}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Screener Access</h3>
                    {getScreenerAccessBadge(selectedFilm.screenerAccessType)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Film Modal */}
      {showAddFilmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Add New Film</h2>
                <button
                  onClick={() => setShowAddFilmModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const newFilm: FilmType = {
                  id: films.length + 1,
                  title: formData.get('title') as string,
                  originalLanguageTitle: formData.get('originalLanguageTitle') as string || undefined,
                  director: formData.get('director') as string,
                  countries: (formData.get('countries') as string).split(',').map(c => c.trim()),
                  programs: (formData.get('programs') as string).split(',').map(p => p.trim()),
                  runtime: parseInt(formData.get('runtime') as string),
                  language: formData.get('language') as string,
                  subtitles: formData.get('subtitles') === 'on',
                  originalReleaseYear: parseInt(formData.get('originalReleaseYear') as string),
                  genres: (formData.get('genres') as string).split(',').map(g => g.trim()),
                  premiereStatus: formData.get('premiereStatus') as string,
                  cast: (formData.get('cast') as string).split(',').map(c => c.trim()).filter(c => c),
                  crew: {
                    screenwriter: formData.get('screenwriter') as string || undefined,
                    cinematographer: formData.get('cinematographer') as string || undefined,
                    producer: formData.get('producer') as string || undefined
                  },
                  production: {
                    companies: (formData.get('companies') as string)?.split(',').map(c => c.trim()).filter(c => c) || undefined
                  },
                  screenerAccessType: formData.get('screenerAccessType') as any
                };
                addFilm(newFilm);
                setShowAddFilmModal(false);
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input type="text" name="title" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Original Language Title</label>
                    <input type="text" name="originalLanguageTitle" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Director *</label>
                    <input type="text" name="director" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Countries (comma-separated) *</label>
                    <input type="text" name="countries" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Runtime (minutes) *</label>
                    <input type="number" name="runtime" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language *</label>
                    <input type="text" name="language" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Release Year *</label>
                    <input type="number" name="originalReleaseYear" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Programs (comma-separated) *</label>
                    <input type="text" name="programs" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Genres (comma-separated) *</label>
                    <input type="text" name="genres" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Premiere Status</label>
                    <input type="text" name="premiereStatus" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Screener Access Type</label>
                    <select name="screenerAccessType" className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="cinesend">Cinesend</option>
                      <option value="direct_link">Direct Link</option>
                      <option value="distributor_request">Distributor Request</option>
                      <option value="screenings_only">Screenings Only</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="flex items-center">
                    <input type="checkbox" name="subtitles" className="mr-2" />
                    <span className="text-sm font-medium text-gray-700">Has Subtitles</span>
                  </label>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Principal Cast (comma-separated)</label>
                  <textarea name="cast" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2"></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Screenwriter</label>
                    <input type="text" name="screenwriter" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cinematographer</label>
                    <input type="text" name="cinematographer" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Producer</label>
                    <input type="text" name="producer" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Production Companies (comma-separated)</label>
                    <input type="text" name="companies" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowAddFilmModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Add Film
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600 text-center">
        Showing {sortedFilms.length} of {films.length} films
      </div>
    </div>
  );
};

export default TitleManagement;