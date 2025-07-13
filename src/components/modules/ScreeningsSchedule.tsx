import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Calendar, Clock, MapPin, Users, 
  Film, Star, Eye, ChevronDown, ChevronUp, Plus
} from 'lucide-react';

interface ScheduleEvent {
  id: number;
  type: 'screening' | 'red_carpet' | 'special_event' | 'interview' | 'photo_shoot';
  title: string;
  subtitle?: string;
  date: string;
  time: string;
  endTime?: string;
  venue: string;
  room?: string;
  capacity?: number;
  program?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'confirmed' | 'tentative' | 'cancelled';
  attendees?: number;
  publicEvent: boolean;
  notes?: string;
}

interface User {
  id: number;
  name: string;
  role: string;
  permissions: Record<string, string>;
}

interface ScreeningsScheduleProps {
  user: User;
}

const ScreeningsSchedule: React.FC<ScreeningsScheduleProps> = ({ user }) => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'list'>('day');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Helper function to convert 24-hour time to 12-hour AM/PM format
  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Mock data
  useEffect(() => {
    const mockEvents: ScheduleEvent[] = [
      {
        id: 1,
        type: 'screening',
        title: 'All We Imagine As Light',
        subtitle: 'International Feature Competition',
        date: '2024-10-17',
        time: '19:00',
        endTime: '21:00',
        venue: 'AMC River East 21',
        room: 'Theater 5',
        capacity: 250,
        program: 'International Feature Competition',
        priority: 'high',
        status: 'confirmed',
        attendees: 220,
        publicEvent: true
      },
      {
        id: 2,
        type: 'red_carpet',
        title: 'All We Imagine As Light Red Carpet',
        subtitle: 'Press and VIP arrivals',
        date: '2024-10-17',
        time: '18:30',
        endTime: '19:00',
        venue: 'AMC River East 21',
        room: 'Red Carpet Area',
        priority: 'high',
        status: 'confirmed',
        publicEvent: false
      },
      {
        id: 3,
        type: 'screening',
        title: 'Rita',
        subtitle: 'International Feature Competition',
        date: '2024-10-18',
        time: '14:30',
        endTime: '16:15',
        venue: 'Gene Siskel Film Center',
        room: 'Main Theater',
        capacity: 184,
        program: 'International Feature Competition',
        priority: 'high',
        status: 'confirmed',
        attendees: 150,
        publicEvent: true
      },
      {
        id: 4,
        type: 'interview',
        title: 'Paz Vega Interview',
        subtitle: 'Rita Q&A Session',
        date: '2024-10-18',
        time: '16:30',
        endTime: '17:00',
        venue: 'Gene Siskel Film Center',
        room: 'Green Room',
        priority: 'medium',
        status: 'confirmed',
        publicEvent: false
      },
      {
        id: 5,
        type: 'photo_shoot',
        title: 'Payal Kapadia Portrait Session',
        subtitle: 'Director portraits for press kit',
        date: '2024-10-17',
        time: '14:00',
        endTime: '14:45',
        venue: 'CIFF Portrait Studio',
        room: 'Palmer House',
        priority: 'medium',
        status: 'confirmed',
        publicEvent: false
      },
      {
        id: 6,
        type: 'special_event',
        title: 'Opening Night Gala',
        subtitle: 'Festival kickoff celebration',
        date: '2024-10-16',
        time: '20:00',
        endTime: '23:00',
        venue: 'Music Box Theatre',
        room: 'Main Auditorium',
        capacity: 750,
        priority: 'high',
        status: 'confirmed',
        attendees: 650,
        publicEvent: true
      },
      {
        id: 7,
        type: 'screening',
        title: 'Blitz',
        subtitle: 'Special Presentation',
        date: '2024-10-19',
        time: '21:00',
        endTime: '23:00',
        venue: 'AMC River East 21',
        room: 'Theater 3',
        capacity: 250,
        program: 'Special Presentation',
        priority: 'high',
        status: 'confirmed',
        attendees: 200,
        publicEvent: true
      }
    ];
    setEvents(mockEvents);
    setSelectedDate('2024-10-17'); // Default to first day with events
  }, []);

  const getEventTypeBadge = (type: string) => {
    const badges = {
      'screening': { color: 'bg-blue-100 text-blue-800', text: 'Screening', icon: Film },
      'red_carpet': { color: 'bg-red-100 text-red-800', text: 'Red Carpet', icon: Star },
      'special_event': { color: 'bg-purple-100 text-purple-800', text: 'Special Event', icon: Calendar },
      'interview': { color: 'bg-green-100 text-green-800', text: 'Interview', icon: Users },
      'photo_shoot': { color: 'bg-pink-100 text-pink-800', text: 'Photo Shoot', icon: Eye }
    };
    
    const badge = badges[type as keyof typeof badges] || badges['screening'];
    const IconComponent = badge.icon;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${badge.color}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {badge.text}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'confirmed': { color: 'bg-green-100 text-green-800', text: 'Confirmed' },
      'tentative': { color: 'bg-yellow-100 text-yellow-800', text: 'Tentative' },
      'cancelled': { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
    };
    
    const badge = badges[status as keyof typeof badges] || badges['confirmed'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.subtitle?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDate = !selectedDate || event.date === selectedDate;
    const matchesVenue = selectedVenue === 'all' || event.venue === selectedVenue;
    const matchesType = selectedType === 'all' || event.type === selectedType;
    
    return matchesSearch && matchesDate && matchesVenue && matchesType;
  });

  const sortedEvents = filteredEvents.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  const groupedByDate = sortedEvents.reduce((groups, event) => {
    const date = event.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, ScheduleEvent[]>);

  const venues = [...new Set(events.map(e => e.venue))];
  const eventTypes = [...new Set(events.map(e => e.type))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Public Screenings & Programs</h2>
          <p className="text-gray-600">Public festival screenings and program schedule</p>
        </div>
        {user.permissions.scheduleManagement === 'full_edit' && (
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </button>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg border border-gray-300 p-1">
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 rounded-md flex items-center ${
              viewMode === 'day' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Day View
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded-md flex items-center ${
              viewMode === 'week' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Week View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-md flex items-center ${
              viewMode === 'list' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Filter className="w-4 h-4 mr-1" />
            List View
          </button>
        </div>

        <div className="text-sm text-gray-600">
          {filteredEvents.length} events scheduled
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search events, venues, films..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
            />

            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Venues</option>
              {venues.map(venue => (
                <option key={venue} value={venue}>{venue}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Types</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Schedule Display */}
      {viewMode === 'list' ? (
        /* List View */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          {getEventTypeBadge(event.type)}
                          {!event.publicEvent && (
                            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                              Private
                            </span>
                          )}
                        </div>
                        <div className="font-medium text-gray-900">{event.title}</div>
                        {event.subtitle && (
                          <div className="text-sm text-gray-600">{event.subtitle}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {new Date(event.date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatTime(event.time)}
                          {event.endTime && ` - ${formatTime(event.endTime)}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{event.venue}</div>
                        {event.room && (
                          <div className="text-sm text-gray-600">{event.room}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(event.status)}
                    </td>
                    <td className="px-4 py-4">
                      {event.attendees && event.capacity ? (
                        <div className="text-sm">
                          <div className="font-medium">{event.attendees} / {event.capacity}</div>
                          <div className="text-gray-600">
                            {Math.round((event.attendees / event.capacity) * 100)}% full
                          </div>
                        </div>
                      ) : event.attendees ? (
                        <div className="text-sm font-medium">{event.attendees} attendees</div>
                      ) : (
                        <span className="text-gray-400 text-sm">TBD</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Day/Week View */
        <div className="space-y-4">
          {Object.entries(groupedByDate).map(([date, dayEvents]) => (
            <div key={date} className="bg-white rounded-lg shadow">
              <div 
                className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedDay(expandedDay === date ? null : date)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h3>
                    <p className="text-sm text-gray-600">{dayEvents.length} events scheduled</p>
                  </div>
                  {expandedDay === date ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>
              
              {expandedDay === date && (
                <div className="p-4 space-y-3">
                  {dayEvents.map((event) => (
                    <div key={event.id} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900 min-w-[80px]">
                        {formatTime(event.time)}
                        {event.endTime && (
                          <div className="text-xs text-gray-500">
                            to {formatTime(event.endTime)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {getEventTypeBadge(event.type)}
                          {getStatusBadge(event.status)}
                          {!event.publicEvent && (
                            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                              Private
                            </span>
                          )}
                        </div>
                        <div className="font-medium text-gray-900">{event.title}</div>
                        {event.subtitle && (
                          <div className="text-sm text-gray-600">{event.subtitle}</div>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {event.venue}
                            {event.room && ` - ${event.room}`}
                          </div>
                          {event.attendees && event.capacity && (
                            <div className="flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              {event.attendees}/{event.capacity}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScreeningsSchedule;