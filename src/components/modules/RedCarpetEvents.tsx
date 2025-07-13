import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Edit3, Mail, Phone, Calendar, Clock,
  MapPin, Users, CheckCircle, XCircle, Download, Upload, 
  Eye, Settings, UserCheck, AlertCircle, Camera, Star,
  Film, Mic, User
} from 'lucide-react';

interface RedCarpetEvent {
  id: number;
  eventName: string;
  eventType: 'premiere' | 'gala' | 'opening_night' | 'closing_night' | 'awards' | 'special_event';
  date: string;
  time: string;
  venue: string;
  redCarpetStart: string;
  filmTitle?: string;
  description: string;
  expectedAttendees: number;
  confirmedAttendees: Array<{
    id: number;
    name: string;
    role: string;
    filmTitle?: string;
    rsvpStatus: 'confirmed' | 'pending' | 'declined';
    arrivalTime?: string;
    specialRequests?: string;
    publicityLevel: 'high' | 'medium' | 'low';
  }>;
  mediaAccreditation: Array<{
    id: number;
    outletName: string;
    photographerName: string;
    email: string;
    accreditationType: 'photo' | 'video' | 'print' | 'digital';
    approved: boolean;
    notes?: string;
  }>;
  logistics: {
    redCarpetLength?: string;
    photoPositions?: number;
    stepRepeatLocation?: string;
    securityRequirements?: string;
    weatherBackup?: string;
  };
  staffAssigned: Array<{
    name: string;
    role: string;
    contact: string;
  }>;
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
  const [events, setEvents] = useState<RedCarpetEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<RedCarpetEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendees' | 'media' | 'logistics'>('overview');

  // Mock data
  useEffect(() => {
    const mockEvents: RedCarpetEvent[] = [
      {
        id: 1,
        eventName: "All We Imagine As Light - Chicago Premiere",
        eventType: 'premiere',
        date: "2024-10-18",
        time: "19:00",
        venue: "AMC River East 21",
        redCarpetStart: "18:30",
        filmTitle: "All We Imagine As Light",
        description: "Chicago premiere of Payal Kapadia's acclaimed drama with director and cast in attendance",
        expectedAttendees: 150,
        confirmedAttendees: [
          {
            id: 1,
            name: "Payal Kapadia",
            role: "Director",
            filmTitle: "All We Imagine As Light",
            rsvpStatus: 'confirmed',
            arrivalTime: "18:15",
            publicityLevel: 'high'
          },
          {
            id: 2,
            name: "Kani Kusruti",
            role: "Lead Actress",
            filmTitle: "All We Imagine As Light",
            rsvpStatus: 'confirmed',
            arrivalTime: "18:20",
            publicityLevel: 'high'
          },
          {
            id: 3,
            name: "Thomas Hakim",
            role: "Producer",
            filmTitle: "All We Imagine As Light",
            rsvpStatus: 'pending',
            publicityLevel: 'medium'
          }
        ],
        mediaAccreditation: [
          {
            id: 1,
            outletName: "Chicago Tribune",
            photographerName: "Sarah Martinez",
            email: "sarah@chicagotribune.com",
            accreditationType: 'photo',
            approved: true
          },
          {
            id: 2,
            outletName: "WGN News",
            photographerName: "Mike Johnson",
            email: "mike@wgn.com",
            accreditationType: 'video',
            approved: true
          },
          {
            id: 3,
            outletName: "The Hollywood Reporter",
            photographerName: "Lisa Chen",
            email: "lisa@thr.com",
            accreditationType: 'photo',
            approved: false,
            notes: "Pending venue capacity approval"
          }
        ],
        logistics: {
          redCarpetLength: "50 feet",
          photoPositions: 8,
          stepRepeatLocation: "Theater entrance",
          securityRequirements: "VIP escort required for talent",
          weatherBackup: "Interior lobby setup available"
        },
        staffAssigned: [
          { name: "Morgan Harris", role: "Event Coordinator", contact: "morgan@ciff.org" },
          { name: "Sarah Chen", role: "Talent Liaison", contact: "sarah@ciff.org" },
          { name: "Mike Rodriguez", role: "Media Coordinator", contact: "mike@ciff.org" }
        ]
      },
      {
        id: 2,
        eventName: "CIFF Opening Night Gala",
        eventType: 'opening_night',
        date: "2024-10-16",
        time: "20:00",
        venue: "Music Box Theatre",
        redCarpetStart: "19:30",
        description: "Official opening night ceremony and gala reception",
        expectedAttendees: 200,
        confirmedAttendees: [
          {
            id: 4,
            name: "Festival Director",
            role: "Festival Director",
            rsvpStatus: 'confirmed',
            arrivalTime: "19:15",
            publicityLevel: 'high'
          },
          {
            id: 5,
            name: "Board Chair",
            role: "Board Chair",
            rsvpStatus: 'confirmed',
            arrivalTime: "19:20",
            publicityLevel: 'medium'
          }
        ],
        mediaAccreditation: [
          {
            id: 4,
            outletName: "Chicago Sun-Times",
            photographerName: "David Park",
            email: "david@suntimes.com",
            accreditationType: 'photo',
            approved: true
          }
        ],
        logistics: {
          redCarpetLength: "75 feet",
          photoPositions: 12,
          stepRepeatLocation: "Main entrance",
          securityRequirements: "Full security detail, VIP entrance",
          weatherBackup: "Grand lobby setup"
        },
        staffAssigned: [
          { name: "Morgan Harris", role: "Event Director", contact: "morgan@ciff.org" },
          { name: "Team Lead", role: "Operations", contact: "ops@ciff.org" }
        ]
      },
      {
        id: 3,
        eventName: "Rita Premiere",
        eventType: 'premiere',
        date: "2024-10-20",
        time: "18:30",
        venue: "Gene Siskel Film Center",
        redCarpetStart: "18:00",
        filmTitle: "Rita",
        description: "Chicago premiere with director Paz Vega in attendance",
        expectedAttendees: 80,
        confirmedAttendees: [
          {
            id: 6,
            name: "Paz Vega",
            role: "Director/Star",
            filmTitle: "Rita",
            rsvpStatus: 'confirmed',
            arrivalTime: "17:45",
            publicityLevel: 'high',
            specialRequests: "Spanish interpreter for interviews"
          }
        ],
        mediaAccreditation: [
          {
            id: 5,
            outletName: "Film Independent",
            photographerName: "Jennifer Walsh",
            email: "jen@filmindependent.com",
            accreditationType: 'digital',
            approved: true
          }
        ],
        logistics: {
          redCarpetLength: "30 feet",
          photoPositions: 6,
          stepRepeatLocation: "Theater lobby",
          securityRequirements: "Standard venue security"
        },
        staffAssigned: [
          { name: "Sarah Chen", role: "Event Coordinator", contact: "sarah@ciff.org" }
        ]
      }
    ];
    setEvents(mockEvents);
  }, []);

  const getEventTypeBadge = (type: string) => {
    const badges = {
      'premiere': { color: 'bg-purple-100 text-purple-800', text: 'Premiere' },
      'gala': { color: 'bg-gold-100 text-gold-800', text: 'Gala' },
      'opening_night': { color: 'bg-red-100 text-red-800', text: 'Opening Night' },
      'closing_night': { color: 'bg-blue-100 text-blue-800', text: 'Closing Night' },
      'awards': { color: 'bg-yellow-100 text-yellow-800', text: 'Awards' },
      'special_event': { color: 'bg-green-100 text-green-800', text: 'Special Event' }
    };
    
    const badge = badges[type as keyof typeof badges] || badges['special_event'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getRSVPStatusBadge = (status: string) => {
    const badges = {
      'confirmed': { color: 'bg-green-100 text-green-800', text: 'Confirmed' },
      'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      'declined': { color: 'bg-red-100 text-red-800', text: 'Declined' }
    };
    
    const badge = badges[status as keyof typeof badges] || badges['pending'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getPublicityLevelBadge = (level: string) => {
    const badges = {
      'high': { color: 'bg-red-100 text-red-800', text: 'High Priority' },
      'medium': { color: 'bg-yellow-100 text-yellow-800', text: 'Medium Priority' },
      'low': { color: 'bg-gray-100 text-gray-800', text: 'Low Priority' }
    };
    
    const badge = badges[level as keyof typeof badges] || badges['medium'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.filmTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = eventTypeFilter === 'all' || event.eventType === eventTypeFilter;
    const matchesDate = dateFilter === 'all' || event.date === dateFilter;
    
    return matchesSearch && matchesType && matchesDate;
  });

  const sortedEvents = filteredEvents.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  const eventTypes = [...new Set(events.map(e => e.eventType))];
  const dates = [...new Set(events.map(e => e.date))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Red Carpet Events</h2>
          <p className="text-gray-600">Manage red carpet premieres and special events</p>
        </div>
        {user.permissions.redCarpetEvents === 'full_edit' && (
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-red-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
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
          </div>
          
          <div className="flex gap-4">
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Event Types</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>

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
                  Event
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Venue
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendees
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Media
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{event.eventName}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        {getEventTypeBadge(event.eventType)}
                        {event.filmTitle && (
                          <div className="text-sm text-gray-600 flex items-center">
                            <Film className="w-3 h-3 mr-1" />
                            {event.filmTitle}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-900">
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        Red Carpet: {event.redCarpetStart}
                      </div>
                      <div className="text-sm text-gray-600">
                        Event: {event.time}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-sm text-gray-900">{event.venue}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <div className="font-medium">
                        {event.confirmedAttendees.filter(a => a.rsvpStatus === 'confirmed').length} confirmed
                      </div>
                      <div className="text-gray-600">
                        {event.confirmedAttendees.length} total / {event.expectedAttendees} expected
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <div className="font-medium">
                        {event.mediaAccreditation.filter(m => m.approved).length} approved
                      </div>
                      <div className="text-gray-600">
                        {event.mediaAccreditation.length} total requests
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventModal(true);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Manage Event
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.eventName}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    {getEventTypeBadge(selectedEvent.eventType)}
                    <span className="text-gray-600">
                      {new Date(selectedEvent.date).toLocaleDateString()} at {selectedEvent.time}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-4 border-b border-gray-200 mb-6">
                {[
                  { id: 'overview', label: 'Overview', icon: Eye },
                  { id: 'attendees', label: 'Attendees', icon: Users },
                  { id: 'media', label: 'Media', icon: Camera },
                  { id: 'logistics', label: 'Logistics', icon: Settings }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center px-4 py-2 border-b-2 ${
                      activeTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Event Details</h3>
                      <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                        <div><span className="font-medium">Venue:</span> {selectedEvent.venue}</div>
                        <div><span className="font-medium">Red Carpet Start:</span> {selectedEvent.redCarpetStart}</div>
                        <div><span className="font-medium">Event Start:</span> {selectedEvent.time}</div>
                        <div><span className="font-medium">Expected Attendees:</span> {selectedEvent.expectedAttendees}</div>
                        {selectedEvent.filmTitle && (
                          <div><span className="font-medium">Film:</span> {selectedEvent.filmTitle}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                      <div className="bg-gray-50 p-3 rounded-lg text-sm">
                        {selectedEvent.description}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Staff Assigned</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedEvent.staffAssigned.map((staff, index) => (
                        <div key={index} className="bg-blue-50 p-3 rounded-lg">
                          <div className="font-medium text-gray-900">{staff.name}</div>
                          <div className="text-sm text-gray-600">{staff.role}</div>
                          <div className="text-xs text-gray-500">{staff.contact}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'attendees' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">
                      Confirmed Attendees ({selectedEvent.confirmedAttendees.length})
                    </h3>
                    {user.permissions.redCarpetEvents === 'full_edit' && (
                      <button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                        Add Attendee
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {selectedEvent.confirmedAttendees.map((attendee) => (
                      <div key={attendee.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{attendee.name}</div>
                            <div className="text-sm text-gray-600">{attendee.role}</div>
                            {attendee.filmTitle && (
                              <div className="text-sm text-gray-600">Film: {attendee.filmTitle}</div>
                            )}
                            {attendee.arrivalTime && (
                              <div className="text-xs text-gray-500 mt-1">
                                Arrival: {attendee.arrivalTime}
                              </div>
                            )}
                            {attendee.specialRequests && (
                              <div className="text-xs text-blue-600 mt-1">
                                Special: {attendee.specialRequests}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            {getRSVPStatusBadge(attendee.rsvpStatus)}
                            {getPublicityLevelBadge(attendee.publicityLevel)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'media' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">
                      Media Accreditation ({selectedEvent.mediaAccreditation.length})
                    </h3>
                    {user.permissions.redCarpetEvents === 'full_edit' && (
                      <button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                        Add Media
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {selectedEvent.mediaAccreditation.map((media) => (
                      <div key={media.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{media.outletName}</div>
                            <div className="text-sm text-gray-600">{media.photographerName}</div>
                            <div className="text-xs text-gray-500">{media.email}</div>
                            <div className="text-xs text-blue-600 capitalize mt-1">
                              {media.accreditationType}
                            </div>
                            {media.notes && (
                              <div className="text-xs text-yellow-600 mt-1">{media.notes}</div>
                            )}
                          </div>
                          <div className="flex items-center">
                            {media.approved ? (
                              <span className="flex items-center text-green-600 text-sm">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approved
                              </span>
                            ) : (
                              <span className="flex items-center text-yellow-600 text-sm">
                                <Clock className="w-4 h-4 mr-1" />
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'logistics' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Event Logistics</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Red Carpet Setup</h4>
                        <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                          {selectedEvent.logistics.redCarpetLength && (
                            <div><span className="font-medium">Length:</span> {selectedEvent.logistics.redCarpetLength}</div>
                          )}
                          {selectedEvent.logistics.photoPositions && (
                            <div><span className="font-medium">Photo Positions:</span> {selectedEvent.logistics.photoPositions}</div>
                          )}
                          {selectedEvent.logistics.stepRepeatLocation && (
                            <div><span className="font-medium">Step & Repeat:</span> {selectedEvent.logistics.stepRepeatLocation}</div>
                          )}
                        </div>
                      </div>
                      
                      {selectedEvent.logistics.securityRequirements && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Security</h4>
                          <div className="bg-yellow-50 p-3 rounded-lg text-sm">
                            {selectedEvent.logistics.securityRequirements}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {selectedEvent.logistics.weatherBackup && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Weather Backup Plan</h4>
                          <div className="bg-blue-50 p-3 rounded-lg text-sm">
                            {selectedEvent.logistics.weatherBackup}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600 text-center">
        Showing {sortedEvents.length} of {events.length} events
      </div>
    </div>
  );
};

export default RedCarpetEvents;