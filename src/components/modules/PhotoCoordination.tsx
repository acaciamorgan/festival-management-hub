import React, { useState, useEffect } from 'react';

// 🚨 CLAUDE IS ABSOLUTELY FORBIDDEN FROM CREATING MOCK DATA 🚨
// CLAUDE MUST NEVER CREATE, MODIFY, OR ADD ANY MOCK DATA
import { 
  Search, Filter, Plus, Calendar, Clock,
  MapPin, Users, CheckCircle, XCircle, Camera,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import FilmDetailModal from '../shared/FilmDetailModal';
import TalentName from '../shared/TalentName';
import TalentCardModal from '../shared/TalentCardModal';
import { validateMockData } from '../../utils/dataValidation';
import { useDevDataLogger } from '../../utils/devHelpers';

interface PhotoShoot {
  id: number;
  filmTitle?: string;
  eventName?: string;
  type: 'Main Carpet' | 'Carpet' | 'Q&A' | 'Panel' | 'Event';
  subjectIds: number[]; // References Person IDs from DataContext
  date: string;
  time: string;
  venue: string;
  photographer: {
    name: string;
    contact: string; // cell/email
  };
  videographer?: {
    name: string;
    contact: string; // cell/email
  };
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface User {
  id: number;
  name: string;
  role: string;
  permissions: Record<string, string>;
}

interface PhotoCoordinationProps {
  user: User;
}

const PhotoCoordination: React.FC<PhotoCoordinationProps> = ({ user }) => {
  const { films, venues, getFilmByTitle, people, getPersonById } = useData();
  
  // Development helper - shows available data in console
  useDevDataLogger();
  const [photoShoots, setPhotoShoots] = useState<PhotoShoot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedShoot, setSelectedShoot] = useState<PhotoShoot | null>(null);
  const [showShootModal, setShowShootModal] = useState(false);
  const [showAddShootModal, setShowAddShootModal] = useState(false);
  const [showFilmModal, setShowFilmModal] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState<any>(null);
  const [selectedFilmForAdd, setSelectedFilmForAdd] = useState<any>(null);
  const [selectedTalent, setSelectedTalent] = useState<any>(null);
  const [showTalentModal, setShowTalentModal] = useState(false);
  const [sortBy, setSortBy] = useState<'title' | 'subject' | 'photographer' | 'date' | 'venue'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // WAITING FOR HUMAN TO PROVIDE APPROVED MOCK DATA
  // CLAUDE IS FORBIDDEN FROM CREATING MOCK DATA
  useEffect(() => {
    setPhotoShoots([]);
  }, [people, films, venues]);

  const getTypeBadge = (type: string) => {
    const badges = {
      'Main Carpet': { color: 'bg-red-100 text-red-800', text: 'Main Carpet' },
      'Carpet': { color: 'bg-orange-100 text-orange-800', text: 'Carpet' },
      'Q&A': { color: 'bg-blue-100 text-blue-800', text: 'Q&A' },
      'Panel': { color: 'bg-green-100 text-green-800', text: 'Panel' },
      'Event': { color: 'bg-purple-100 text-purple-800', text: 'Event' }
    };
    
    const badge = badges[type as keyof typeof badges] || badges['Event'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'scheduled': { color: 'bg-blue-100 text-blue-800', text: 'Scheduled' },
      'completed': { color: 'bg-green-100 text-green-800', text: 'Completed' },
      'cancelled': { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
    };
    
    const badge = badges[status as keyof typeof badges] || badges['scheduled'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const filteredPhotoShoots = photoShoots.filter(shoot => {
    const searchTerm = searchQuery.toLowerCase();
    const subjectNames = getSubjectNames(shoot.subjectIds).toLowerCase();
    const matchesSearch = 
      (shoot.filmTitle && shoot.filmTitle.toLowerCase().includes(searchTerm)) ||
      (shoot.eventName && shoot.eventName.toLowerCase().includes(searchTerm)) ||
      shoot.photographer.name.toLowerCase().includes(searchTerm) ||
      shoot.venue.toLowerCase().includes(searchTerm) ||
      subjectNames.includes(searchTerm);
    
    const matchesType = typeFilter === 'all' || shoot.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || shoot.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Helper function to convert 24-hour time to 12-hour AM/PM format
  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const openTalentModal = (person: any) => {
    setSelectedTalent(person);
    setShowTalentModal(true);
  };

  const getSubjectNames = (subjectIds: number[]): string => {
    return subjectIds
      .map(id => getPersonById(id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const handleSort = (field: 'title' | 'subject' | 'photographer' | 'date' | 'venue') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: 'title' | 'subject' | 'photographer' | 'date' | 'venue') => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-gray-600" /> : 
      <ArrowDown className="w-4 h-4 text-gray-600" />;
  };

  const sortedPhotoShoots = filteredPhotoShoots.sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;
    
    switch (sortBy) {
      case 'title':
        aValue = (a.filmTitle || a.eventName || '').toLowerCase();
        bValue = (b.filmTitle || b.eventName || '').toLowerCase();
        break;
      case 'subject':
        aValue = getSubjectNames(a.subjectIds).toLowerCase();
        bValue = getSubjectNames(b.subjectIds).toLowerCase();
        break;
      case 'photographer':
        aValue = a.photographer.name.toLowerCase();
        bValue = b.photographer.name.toLowerCase();
        break;
      case 'venue':
        aValue = a.venue.toLowerCase();
        bValue = b.venue.toLowerCase();
        break;
      case 'date':
      default:
        aValue = new Date(`${a.date} ${a.time}`).getTime();
        bValue = new Date(`${b.date} ${b.time}`).getTime();
        break;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === 'asc' ? comparison : -comparison;
    } else {
      const comparison = (aValue as number) - (bValue as number);
      return sortOrder === 'asc' ? comparison : -comparison;
    }
  });

  const shootTypes = [...new Set(photoShoots.map(s => s.type))];
  const statuses = [...new Set(photoShoots.map(s => s.status))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Photo Coordination</h2>
          <p className="text-gray-600">Manage festival photography assignments</p>
        </div>
        {user.permissions.photoCoordination === 'full_edit' && (
          <button 
            type="button"
            onClick={() => setShowAddShootModal(true)}
            className="bg-pink-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Shoot
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleSort('title')}
                className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 ${
                  sortBy === 'title' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Title {getSortIcon('title')}
              </button>
              <button
                onClick={() => handleSort('subject')}
                className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 ${
                  sortBy === 'subject' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Subject {getSortIcon('subject')}
              </button>
              <button
                onClick={() => handleSort('photographer')}
                className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 ${
                  sortBy === 'photographer' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Photographer {getSortIcon('photographer')}
              </button>
              <button
                onClick={() => handleSort('date')}
                className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 ${
                  sortBy === 'date' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Date {getSortIcon('date')}
              </button>
              <button
                onClick={() => handleSort('venue')}
                className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 ${
                  sortBy === 'venue' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Venue {getSortIcon('venue')}
              </button>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search films, events, photographers, venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">All Types</option>
              {shootTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">All Status</option>
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Photo Shoots Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Film / Event
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Venue
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Photographer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Videographer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subjects
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPhotoShoots.map((shoot) => {
                return (
                  <tr key={shoot.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        {shoot.filmTitle ? (
                          <button 
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                            onClick={() => {
                              const film = getFilmByTitle(shoot.filmTitle!);
                              if (film) {
                                setSelectedFilm(film);
                                setShowFilmModal(true);
                              }
                            }}
                          >
                            {shoot.filmTitle}
                          </button>
                        ) : (
                          <div className="font-medium text-gray-900">{shoot.eventName}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getTypeBadge(shoot.type)}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {new Date(shoot.date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600">{formatTime(shoot.time)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{shoot.venue}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{shoot.photographer.name}</div>
                        <div className="text-xs text-gray-500">{shoot.photographer.contact}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {shoot.videographer ? (
                        <div>
                          <div className="font-medium text-gray-900">{shoot.videographer.name}</div>
                          <div className="text-xs text-gray-500">{shoot.videographer.contact}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 italic">No videographer</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {shoot.subjectIds.map((personId, index) => {
                          const person = getPersonById(personId);
                          return person ? (
                            <span key={personId}>
                              <TalentName name={person.name} onTalentClick={openTalentModal} />
                              {index < shoot.subjectIds.length - 1 && ', '}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(shoot.status)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Shoot Modal */}
      {showAddShootModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Schedule Photo Shoot</h2>
                <button
                  type="button"
                  onClick={() => setShowAddShootModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Film</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      onChange={(e) => {
                        const filmTitle = e.target.value;
                        const film = getFilmByTitle(filmTitle);
                        setSelectedFilmForAdd(film);
                      }}
                    >
                      <option value="">Select Film</option>
                      {films.map(film => (
                        <option key={film.id} value={film.title}>{film.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">OR Event Name</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Opening Night Gala, Special Event..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="Main Carpet">Main Carpet</option>
                      <option value="Carpet">Carpet</option>
                      <option value="Q&A">Q&A</option>
                      <option value="Panel">Panel</option>
                      <option value="Event">Event</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input type="time" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="">Select Venue</option>
                    {venues.filter(v => !v.isTBD).map(venue => (
                      <option key={venue.id} value={venue.name}>{venue.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Photographer Name</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Photographer Contact</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="email / phone" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Videographer Name (Optional)</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Leave blank if no videographer" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Videographer Contact (Optional)</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="email / phone" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subjects</label>
                  <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2" rows={2} placeholder="Names and roles of people being photographed"></textarea>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddShootModal(false);
                    setSelectedFilmForAdd(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Here you would add the photo shoot
                    setShowAddShootModal(false);
                    setSelectedFilmForAdd(null);
                  }}
                  className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700"
                >
                  Schedule Shoot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Film Detail Modal */}
      <FilmDetailModal 
        film={selectedFilm}
        isOpen={showFilmModal}
        onClose={() => setShowFilmModal(false)}
      />

      {/* Talent Detail Modal */}
      <TalentCardModal 
        person={selectedTalent}
        isOpen={showTalentModal}
        onClose={() => setShowTalentModal(false)}
      />

      {/* Results Summary */}
      <div className="text-sm text-gray-600 text-center">
        Showing {sortedPhotoShoots.length} of {photoShoots.length} photo shoots
      </div>
    </div>
  );
};

export default PhotoCoordination;