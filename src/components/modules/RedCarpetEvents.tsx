import React, { useState, useEffect } from 'react';

// 🚨 CLAUDE IS ABSOLUTELY FORBIDDEN FROM CREATING MOCK DATA 🚨
// CLAUDE MUST NEVER CREATE, MODIFY, OR ADD ANY MOCK DATA
import { 
  Search, Filter, Plus, Edit3, Mail, Phone, Calendar, Clock,
  MapPin, Users, CheckCircle, XCircle, Download, Upload, 
  Eye, Settings, UserCheck, AlertCircle, Camera, Star,
  Film, Mic, User
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import FilmDetailModal from '../shared/FilmDetailModal';
import TalentName from '../shared/TalentName';
import TalentCardModal from '../shared/TalentCardModal';

interface RedCarpetFilm {
  filmId: number;
  screeningTime: string;
  talentIds: number[]; // References Person cards from Travel/Guest system
}

interface RedCarpetEvent {
  id: number;
  date: string; // Date serves as the event identifier
  pressCallTime: string; // When press should arrive
  carpetStartTime: string; // When carpet activities begin
  venueId: number; // References Venue card
  carpetSize: string;
  description?: string;
  films: RedCarpetFilm[];
  rsvps: Array<{
    id: number;
    personId?: number; // References Person card (journalist) - optional for manual entries
    manualEntry?: {
      name: string;
      outlet: string;
      email: string;
    };
    rsvpDate: string;
    attended?: boolean; // Track who actually attended
  }>;
  mediaAccreditation: Array<{
    id: number;
    personId: number; // References Person card (photographer)
    accreditationType: 'photo' | 'video' | 'print' | 'digital';
    approved: boolean;
    notes?: string;
  }>;
  logistics: {
    carpetLength?: string;
    photoPositions?: number;
    stepRepeatLocation?: string;
    securityRequirements?: string;
    weatherBackup?: string;
  };
  staffAssigned: number[]; // References StaffMember IDs
}

interface User {
  id: number;
  name: string;
  role: string;
  permissions: Record<string, string>;
}

interface RedCarpetEventsProps {
  user: User;
}

const RedCarpetEvents: React.FC<RedCarpetEventsProps> = ({ user }) => {
  const { venues, films, people, getFilmByTitle } = useData();
  const [events, setEvents] = useState<RedCarpetEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<RedCarpetEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showRSVPListModal, setShowRSVPListModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'media' | 'logistics'>('overview');
  
  // Film search and modal states
  const [filmSearchQuery, setFilmSearchQuery] = useState('');
  const [filmSearchResults, setFilmSearchResults] = useState<any[]>([]);
  const [showFilmSuggestions, setShowFilmSuggestions] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState<any>(null);
  const [showFilmModal, setShowFilmModal] = useState(false);
  
  // Talent card modal state
  const [selectedTalent, setSelectedTalent] = useState<any>(null);
  const [showTalentModal, setShowTalentModal] = useState(false);
  
  // New event form state
  const [newEventForm, setNewEventForm] = useState({
    date: '',
    pressCallTime: '',
    carpetStartTime: '',
    venueId: '',
    carpetSize: '',
    description: ''
  });
  
  // Event films and talent management
  const [eventFilms, setEventFilms] = useState<Array<{
    filmId: number;
    screeningTime: string;
    talentIds: number[];
  }>>([]);
  
  // Edit event state
  const [editEventForm, setEditEventForm] = useState<RedCarpetEvent | null>(null);
  const [editEventFilms, setEditEventFilms] = useState<Array<{
    filmId: number;
    screeningTime: string;
    talentIds: number[];
  }>>([]);
  
  // Manual RSVP state
  const [showManualRSVPModal, setShowManualRSVPModal] = useState(false);
  const [manualRSVPForm, setManualRSVPForm] = useState({
    name: '',
    outlet: '',
    email: ''
  });

  // WAITING FOR HUMAN TO PROVIDE APPROVED MOCK DATA
  // CLAUDE IS FORBIDDEN FROM CREATING MOCK DATA
  useEffect(() => {
    setEvents([]);
  }, []);

  // Handle film search for add event modal
  const handleFilmSearch = (searchTerm: string) => {
    setFilmSearchQuery(searchTerm);
    
    if (searchTerm.length > 0) {
      const matchingFilms = films.filter(film => 
        film.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilmSearchResults(matchingFilms);
      setShowFilmSuggestions(matchingFilms.length > 0);
    } else {
      setFilmSearchResults([]);
      setShowFilmSuggestions(false);
    }
  };

  const selectFilm = (film: any) => {
    // This will be handled differently in the new structure
    // Films are added to events after event creation
    setFilmSearchQuery(film.title);
    setShowFilmSuggestions(false);
  };

  const openFilmModal = (filmTitle: string) => {
    const film = getFilmByTitle(filmTitle);
    if (film) {
      setSelectedFilm(film);
      setShowFilmModal(true);
    }
  };
  
  const openTalentModal = (person: any) => {
    setSelectedTalent(person);
    setShowTalentModal(true);
  };

  const getEventTypeBadge = (type: string) => {
    const badges = {
      'premiere': { color: 'bg-blue-100 text-blue-800', text: 'Premiere' },
      'gala': { color: 'bg-purple-100 text-purple-800', text: 'Gala' },
      'opening_night': { color: 'bg-green-100 text-green-800', text: 'Opening Night' },
      'closing_night': { color: 'bg-red-100 text-red-800', text: 'Closing Night' },
      'awards': { color: 'bg-yellow-100 text-yellow-800', text: 'Awards' },
      'special_event': { color: 'bg-pink-100 text-pink-800', text: 'Special Event' }
    };
    
    const badge = badges[type as keyof typeof badges] || badges['special_event'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const filteredEvents = events.filter(event => {
    const venue = venues.find(v => v.id === event.venueId);
    const eventFilms = event.films.map(f => films.find(film => film.id === f.filmId)).filter(Boolean);
    
    const matchesSearch = 
      venue?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eventFilms.some(film => film?.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      new Date(event.date).toLocaleDateString().toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDate = dateFilter === 'all' || event.date === dateFilter;
    
    return matchesSearch && matchesDate;
  });

  // Helper function to convert 24-hour time to 12-hour AM/PM format
  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Events are already properly grouped as individual red carpet events
  const groupedEvents = filteredEvents;

  // Remove unused color palette

  const sortedEvents = filteredEvents.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.pressCallTime}`);
    const dateB = new Date(`${b.date} ${b.pressCallTime}`);
    return dateA.getTime() - dateB.getTime();
  });

  const dates = [...new Set(events.map(e => e.date))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Red Carpet Events</h2>
          <p className="text-gray-600">Manage red carpet events and press coordination</p>
        </div>
        {user.permissions.redCarpetEvents === 'full_edit' && (
          <button 
            type="button"
            onClick={() => setShowAddEventModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search events, films, venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-4">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Dates</option>
              {dates.map(date => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Event
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Times
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Venue
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Films
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RSVPs
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupedEvents.map((event, index) => {
                const venue = venues.find(v => v.id === event.venueId);
                const eventFilms = event.films.map(f => {
                  const film = films.find(film => film.id === f.filmId);
                  return film ? { ...film, screeningTime: f.screeningTime, talentIds: f.talentIds } : null;
                }).filter(Boolean);
                
                const totalTalent = event.films.reduce((sum, film) => sum + film.talentIds.length, 0);
                
                return (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">
                        {new Date(event.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'numeric', 
                          day: 'numeric', 
                          year: '2-digit' 
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        <div><span className="font-medium">Call:</span> {formatTime(event.pressCallTime)}</div>
                        <div><span className="font-medium">Start:</span> {formatTime(event.carpetStartTime)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{venue?.name}</div>
                        <div className="text-xs text-gray-500">{event.carpetSize}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-3">
                        {eventFilms.map((film, idx) => {
                          const talent = film.talentIds.map(id => people.find(p => p.id === id)).filter(Boolean);
                          return (
                            <div key={idx} className="border-l-2 border-blue-200 pl-3">
                              <div className="flex items-center space-x-2 mb-1">
                                <button 
                                  onClick={() => openFilmModal(film.title)}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                >
                                  {film.title}
                                </button>
                                <span className="text-gray-500 text-sm">
                                  {formatTime(film.screeningTime)}
                                </span>
                              </div>
                              {talent.length > 0 && (
                                <div className="text-xs text-gray-700">
                                  <div className="font-medium mb-1">Walking:</div>
                                  <div className="space-y-0.5">
                                    {talent.map((person, personIdx) => (
                                      <div key={personIdx} className="text-gray-600">
                                        <TalentName
                                          name={person.name}
                                          onTalentClick={openTalentModal}
                                          className="text-xs"
                                        /> ({person.role})
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <button
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowRSVPListModal(true);
                        }}
                        className="flex items-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        {event.rsvps.length}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowRSVPListModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {user.permissions.redCarpetEvents === 'full_edit' && (
                          <button 
                            onClick={() => {
                              setEditEventForm(event);
                              setEditEventFilms([...event.films]);
                              setShowEventModal(true);
                            }}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RSVP List Modal */}
      {showRSVPListModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">RSVP List</h2>
                  <p className="text-gray-600">
                    {new Date(selectedEvent.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'numeric', 
                      day: 'numeric', 
                      year: '2-digit' 
                    })}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowManualRSVPModal(true)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Manual RSVP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Export to Excel functionality
                      const csvContent = selectedEvent.rsvps.map(rsvp => {
                        const journalist = rsvp.personId ? people.find(p => p.id === rsvp.personId) : null;
                        const name = journalist ? journalist.name : rsvp.manualEntry?.name || '';
                        const outlet = journalist ? journalist.outlet : rsvp.manualEntry?.outlet || '';
                        const email = journalist ? journalist.email : rsvp.manualEntry?.email || '';
                        return `${name},${outlet},${email},${rsvp.rsvpDate},${rsvp.attended ? 'Yes' : 'No'}`;
                      }).join('\n');
                      const header = 'Name,Outlet,Email,RSVP Date,Attended\n';
                      const blob = new Blob([header + csvContent], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `rsvp-list-${selectedEvent.date}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRSVPListModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {selectedEvent.rsvps.length > 0 ? (
                  selectedEvent.rsvps.map((rsvp) => {
                    const journalist = rsvp.personId ? people.find(p => p.id === rsvp.personId) : null;
                    const name = journalist ? journalist.name : rsvp.manualEntry?.name || '';
                    const outlet = journalist ? journalist.outlet : rsvp.manualEntry?.outlet || '';
                    const email = journalist ? journalist.email : rsvp.manualEntry?.email || '';
                    
                    return (
                      <div key={rsvp.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{name}</div>
                            <div className="text-sm text-gray-600">{outlet}</div>
                            <div className="text-sm text-gray-500">{email}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              RSVP: {new Date(rsvp.rsvpDate).toLocaleDateString()}
                              {!journalist && <span className="ml-2 text-blue-600">(Manual Entry)</span>}
                            </div>
                          </div>
                          <div className="ml-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={rsvp.attended || false}
                                onChange={(e) => {
                                  const updatedEvent = {
                                    ...selectedEvent,
                                    rsvps: selectedEvent.rsvps.map(r => 
                                      r.id === rsvp.id ? { ...r, attended: e.target.checked } : r
                                    )
                                  };
                                  setSelectedEvent(updatedEvent);
                                  setEvents(prev => prev.map(e => e.id === selectedEvent.id ? updatedEvent : e));
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">Attended?</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No RSVPs for this event
                  </div>
                )}
              </div>

              {/* Film breakdown */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Films in this Event</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedEvent.films.map((filmRef) => {
                    const film = films.find(f => f.id === filmRef.filmId);
                    const talent = filmRef.talentIds.map(id => people.find(p => p.id === id)).filter(Boolean);
                    
                    return film ? (
                      <div key={filmRef.filmId} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <button 
                            onClick={() => openFilmModal(film.title)}
                            className="font-medium text-blue-600 hover:text-blue-800 text-left text-sm"
                          >
                            {film.title}
                          </button>
                          <span className="text-xs text-gray-500">
                            {formatTime(filmRef.screeningTime)}
                          </span>
                        </div>
                        
                        {talent.length > 0 && (
                          <div className="text-xs">
                            <span className="font-medium text-gray-700">Talent:</span>
                            <div className="text-gray-600">
                              {talent.slice(0, 2).map(t => `${t.name} (${t.role})`).join(', ')}
                              {talent.length > 2 && ` +${talent.length - 2} more`}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add Red Carpet Event</h2>
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Event Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Event Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                      <input 
                        type="date" 
                        value={newEventForm.date}
                        onChange={(e) => setNewEventForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Press Call Time *</label>
                      <input 
                        type="time" 
                        value={newEventForm.pressCallTime}
                        onChange={(e) => setNewEventForm(prev => ({ ...prev, pressCallTime: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Carpet Start Time *</label>
                      <input 
                        type="time" 
                        value={newEventForm.carpetStartTime}
                        onChange={(e) => setNewEventForm(prev => ({ ...prev, carpetStartTime: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
                      <select 
                        value={newEventForm.venueId}
                        onChange={(e) => setNewEventForm(prev => ({ ...prev, venueId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">Select Venue</option>
                        {venues.filter(v => !v.isTBD).map(venue => (
                          <option key={venue.id} value={venue.id}>{venue.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Carpet Size</label>
                      <input 
                        type="text" 
                        value={newEventForm.carpetSize}
                        onChange={(e) => setNewEventForm(prev => ({ ...prev, carpetSize: e.target.value }))}
                        placeholder="e.g., 50 feet"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea 
                      value={newEventForm.description}
                      onChange={(e) => setNewEventForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" 
                      rows={2} 
                      placeholder="Brief event description"
                    />
                  </div>
                </div>

                {/* Films Section */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Films</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEventFilms(prev => [...prev, {
                          filmId: 0,
                          screeningTime: '',
                          talentIds: []
                        }]);
                      }}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add Film
                    </button>
                  </div>
                  
                  {eventFilms.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No films added yet. Click "Add Film" to get started.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {eventFilms.map((film, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="text-sm font-medium text-gray-900">Film {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => {
                                setEventFilms(prev => prev.filter((_, i) => i !== index));
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Film *</label>
                              <select 
                                value={film.filmId}
                                onChange={(e) => {
                                  const newFilms = [...eventFilms];
                                  newFilms[index].filmId = parseInt(e.target.value);
                                  setEventFilms(newFilms);
                                }}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                              >
                                <option value={0}>Select Film</option>
                                {films.map(f => (
                                  <option key={f.id} value={f.id}>{f.title}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Screening Time *</label>
                              <input 
                                type="time" 
                                value={film.screeningTime}
                                onChange={(e) => {
                                  const newFilms = [...eventFilms];
                                  newFilms[index].screeningTime = e.target.value;
                                  setEventFilms(newFilms);
                                }}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" 
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Walking Talent</label>
                            <div className="space-y-2">
                              {film.talentIds.map((talentId, talentIndex) => {
                                const talent = people.find(p => p.id === talentId);
                                return (
                                  <div key={talentIndex} className="flex items-center space-x-2">
                                    <select 
                                      value={talentId}
                                      onChange={(e) => {
                                        const newFilms = [...eventFilms];
                                        newFilms[index].talentIds[talentIndex] = parseInt(e.target.value);
                                        setEventFilms(newFilms);
                                      }}
                                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value={0}>Select Talent</option>
                                      {people.filter(p => p.role && !['Journalist', 'Press'].includes(p.role)).map(person => (
                                        <option key={person.id} value={person.id}>
                                          {person.name} ({person.role})
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newFilms = [...eventFilms];
                                        newFilms[index].talentIds = newFilms[index].talentIds.filter((_, i) => i !== talentIndex);
                                        setEventFilms(newFilms);
                                      }}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => {
                                  const newFilms = [...eventFilms];
                                  newFilms[index].talentIds.push(0);
                                  setEventFilms(newFilms);
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                <Plus className="w-4 h-4 inline mr-1" />
                                Add Talent
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Basic validation
                    if (!newEventForm.date || !newEventForm.pressCallTime || !newEventForm.carpetStartTime || !newEventForm.venueId) {
                      alert('Please fill in all required fields');
                      return;
                    }
                    
                    // Validate films
                    const validFilms = eventFilms.filter(f => f.filmId > 0 && f.screeningTime);
                    if (validFilms.length === 0) {
                      alert('Please add at least one film with screening time');
                      return;
                    }
                    
                    // Clean up talent IDs (remove zeros)
                    const cleanedFilms = validFilms.map(f => ({
                      ...f,
                      talentIds: f.talentIds.filter(id => id > 0)
                    }));
                    
                    // Create new event
                    const newEvent: RedCarpetEvent = {
                      id: events.length + 1,
                      date: newEventForm.date,
                      pressCallTime: newEventForm.pressCallTime,
                      carpetStartTime: newEventForm.carpetStartTime,
                      venueId: parseInt(newEventForm.venueId),
                      carpetSize: newEventForm.carpetSize || '50 feet',
                      description: newEventForm.description,
                      films: cleanedFilms,
                      rsvps: [],
                      mediaAccreditation: [],
                      logistics: {
                        carpetLength: newEventForm.carpetSize || '50 feet',
                        photoPositions: 8,
                        stepRepeatLocation: 'Main entrance',
                        securityRequirements: 'Standard protocol',
                        weatherBackup: 'Indoor backup available'
                      },
                      staffAssigned: [1] // Default to current user
                    };
                    
                    setEvents(prev => [...prev, newEvent]);
                    setShowAddEventModal(false);
                    
                    // Reset form
                    setNewEventForm({
                      date: '',
                      pressCallTime: '',
                      carpetStartTime: '',
                      venueId: '',
                      carpetSize: '',
                      description: ''
                    });
                    setEventFilms([]);
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Create Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEventModal && editEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Edit Red Carpet Event</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowEventModal(false);
                    setEditEventForm(null);
                    setEditEventFilms([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Event Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Event Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                      <input 
                        type="date" 
                        value={editEventForm.date}
                        onChange={(e) => setEditEventForm(prev => prev ? { ...prev, date: e.target.value } : null)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Press Call Time *</label>
                      <input 
                        type="time" 
                        value={editEventForm.pressCallTime}
                        onChange={(e) => setEditEventForm(prev => prev ? { ...prev, pressCallTime: e.target.value } : null)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Carpet Start Time *</label>
                      <input 
                        type="time" 
                        value={editEventForm.carpetStartTime}
                        onChange={(e) => setEditEventForm(prev => prev ? { ...prev, carpetStartTime: e.target.value } : null)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
                      <select 
                        value={editEventForm.venueId}
                        onChange={(e) => setEditEventForm(prev => prev ? { ...prev, venueId: parseInt(e.target.value) } : null)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">Select Venue</option>
                        {venues.filter(v => !v.isTBD).map(venue => (
                          <option key={venue.id} value={venue.id}>{venue.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Carpet Size</label>
                      <input 
                        type="text" 
                        value={editEventForm.carpetSize}
                        onChange={(e) => setEditEventForm(prev => prev ? { ...prev, carpetSize: e.target.value } : null)}
                        placeholder="e.g., 50 feet"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea 
                      value={editEventForm.description || ''}
                      onChange={(e) => setEditEventForm(prev => prev ? { ...prev, description: e.target.value } : null)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" 
                      rows={2} 
                      placeholder="Brief event description"
                    />
                  </div>
                </div>

                {/* Films Section */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Films</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditEventFilms(prev => [...prev, {
                          filmId: 0,
                          screeningTime: '',
                          talentIds: []
                        }]);
                      }}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add Film
                    </button>
                  </div>
                  
                  {editEventFilms.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No films added yet. Click "Add Film" to get started.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editEventFilms.map((film, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="text-sm font-medium text-gray-900">Film {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => {
                                setEditEventFilms(prev => prev.filter((_, i) => i !== index));
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Film *</label>
                              <select 
                                value={film.filmId}
                                onChange={(e) => {
                                  const newFilms = [...editEventFilms];
                                  newFilms[index].filmId = parseInt(e.target.value);
                                  setEditEventFilms(newFilms);
                                }}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                              >
                                <option value={0}>Select Film</option>
                                {films.map(f => (
                                  <option key={f.id} value={f.id}>{f.title}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Screening Time *</label>
                              <input 
                                type="time" 
                                value={film.screeningTime}
                                onChange={(e) => {
                                  const newFilms = [...editEventFilms];
                                  newFilms[index].screeningTime = e.target.value;
                                  setEditEventFilms(newFilms);
                                }}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" 
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Walking Talent</label>
                            <div className="space-y-2">
                              {film.talentIds.map((talentId, talentIndex) => (
                                <div key={talentIndex} className="flex items-center space-x-2">
                                  <select 
                                    value={talentId}
                                    onChange={(e) => {
                                      const newFilms = [...editEventFilms];
                                      newFilms[index].talentIds[talentIndex] = parseInt(e.target.value);
                                      setEditEventFilms(newFilms);
                                    }}
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value={0}>Select Talent</option>
                                    {people.filter(p => p.role && !['Journalist', 'Press'].includes(p.role)).map(person => (
                                      <option key={person.id} value={person.id}>
                                        {person.name} ({person.role})
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newFilms = [...editEventFilms];
                                      newFilms[index].talentIds = newFilms[index].talentIds.filter((_, i) => i !== talentIndex);
                                      setEditEventFilms(newFilms);
                                    }}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  const newFilms = [...editEventFilms];
                                  newFilms[index].talentIds.push(0);
                                  setEditEventFilms(newFilms);
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                <Plus className="w-4 h-4 inline mr-1" />
                                Add Talent
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEventModal(false);
                    setEditEventForm(null);
                    setEditEventFilms([]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!editEventForm) return;
                    
                    // Validate films
                    const validFilms = editEventFilms.filter(f => f.filmId > 0 && f.screeningTime);
                    if (validFilms.length === 0) {
                      alert('Please add at least one film with screening time');
                      return;
                    }
                    
                    // Clean up talent IDs
                    const cleanedFilms = validFilms.map(f => ({
                      ...f,
                      talentIds: f.talentIds.filter(id => id > 0)
                    }));
                    
                    // Update event
                    const updatedEvent = {
                      ...editEventForm,
                      films: cleanedFilms
                    };
                    
                    setEvents(prev => prev.map(e => e.id === editEventForm.id ? updatedEvent : e));
                    setShowEventModal(false);
                    setEditEventForm(null);
                    setEditEventFilms([]);
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual RSVP Modal */}
      {showManualRSVPModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Manual RSVP</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowManualRSVPModal(false);
                    setManualRSVPForm({ name: '', outlet: '', email: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={manualRSVPForm.name}
                    onChange={(e) => setManualRSVPForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Journalist name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outlet *</label>
                  <input
                    type="text"
                    value={manualRSVPForm.outlet}
                    onChange={(e) => setManualRSVPForm(prev => ({ ...prev, outlet: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="News outlet or publication"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={manualRSVPForm.email}
                    onChange={(e) => setManualRSVPForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="journalist@outlet.com"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualRSVPModal(false);
                    setManualRSVPForm({ name: '', outlet: '', email: '' });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!manualRSVPForm.name || !manualRSVPForm.outlet || !manualRSVPForm.email) {
                      alert('Please fill in all fields');
                      return;
                    }
                    
                    const newRSVP = {
                      id: Date.now(), // Simple ID generation
                      manualEntry: {
                        name: manualRSVPForm.name,
                        outlet: manualRSVPForm.outlet,
                        email: manualRSVPForm.email
                      },
                      rsvpDate: new Date().toISOString().split('T')[0],
                      attended: false
                    };
                    
                    const updatedEvent = {
                      ...selectedEvent,
                      rsvps: [...selectedEvent.rsvps, newRSVP]
                    };
                    
                    setSelectedEvent(updatedEvent);
                    setEvents(prev => prev.map(e => e.id === selectedEvent.id ? updatedEvent : e));
                    setShowManualRSVPModal(false);
                    setManualRSVPForm({ name: '', outlet: '', email: '' });
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add RSVP
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
      
      {/* Talent Card Modal */}
      <TalentCardModal 
        person={selectedTalent}
        isOpen={showTalentModal}
        onClose={() => setShowTalentModal(false)}
      />

      {/* Results Summary */}
      <div className="text-sm text-gray-600 text-center">
        Showing {sortedEvents.length} of {events.length} events
      </div>
    </div>
  );
};

export default RedCarpetEvents;