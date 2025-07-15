import React, { useState, useEffect } from 'react';
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, Edit3, 
  MapPin, Clock, Users, Star, Wine, Music, Camera,
  Utensils, Gift, Award, Mic, Theater
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';

interface SpecialEvent {
  id: number;
  title: string;
  description: string;
  category: 'gala' | 'party' | 'reception' | 'awards' | 'workshop' | 'networking' | 'ceremony' | 'launch';
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  capacity?: number;
  expectedAttendees?: number;
  inviteOnly: boolean;
  status: 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  organizer: string;
  budget?: number;
  requirements: string[];
  vipGuests?: string[];
  notes?: string;
}

interface User {
  id: number;
  name: string;
  role: string;
  permissions: Record<string, string>;
}

interface SpecialEventsProps {
  user: User;
}

const SpecialEvents: React.FC<SpecialEventsProps> = ({ user }) => {
  const { venues } = useData();
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<SpecialEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Helper function to convert 24-hour time to 12-hour AM/PM format
  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // WAITING FOR HUMAN TO PROVIDE APPROVED MOCK DATA
  // CLAUDE IS FORBIDDEN FROM CREATING MOCK DATA
  useEffect(() => {
    setEvents([]);
  }, []);

  const getCategoryIcon = (category: string) => {
    const icons = {
      'gala': Star,
      'party': Music,
      'reception': Wine,
      'awards': Award,
      'workshop': Mic,
      'networking': Users,
      'ceremony': Theater,
      'launch': Gift
    };
    return icons[category as keyof typeof icons] || Calendar;
  };

  const getCategoryBadge = (category: string) => {
    const badges = {
      'gala': { color: 'bg-purple-100 text-purple-800', text: 'Gala' },
      'party': { color: 'bg-pink-100 text-pink-800', text: 'Party' },
      'reception': { color: 'bg-blue-100 text-blue-800', text: 'Reception' },
      'awards': { color: 'bg-yellow-100 text-yellow-800', text: 'Awards' },
      'workshop': { color: 'bg-green-100 text-green-800', text: 'Workshop' },
      'networking': { color: 'bg-indigo-100 text-indigo-800', text: 'Networking' },
      'ceremony': { color: 'bg-red-100 text-red-800', text: 'Ceremony' },
      'launch': { color: 'bg-orange-100 text-orange-800', text: 'Launch' }
    };
    
    const badge = badges[category as keyof typeof badges] || badges['networking'];
    const IconComponent = getCategoryIcon(category);
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${badge.color}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {badge.text}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'planning': { color: 'bg-yellow-100 text-yellow-800', text: 'Planning' },
      'confirmed': { color: 'bg-green-100 text-green-800', text: 'Confirmed' },
      'in_progress': { color: 'bg-blue-100 text-blue-800', text: 'In Progress' },
      'completed': { color: 'bg-gray-100 text-gray-800', text: 'Completed' },
      'cancelled': { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
    };
    
    const badge = badges[status as keyof typeof badges] || badges['planning'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  // Calendar functionality
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateString);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div key={day} className={`h-32 border border-gray-200 p-1 ${isToday ? 'bg-blue-50' : 'bg-white'}`}>
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event, index) => (
              <div
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event);
                  setShowEventModal(true);
                }}
                className="text-xs p-1 rounded cursor-pointer hover:opacity-80 truncate"
                style={{
                  backgroundColor: event.category === 'gala' ? '#fef3c7' :
                                  event.category === 'party' ? '#fce7f3' :
                                  event.category === 'reception' ? '#dbeafe' :
                                  event.category === 'awards' ? '#fef9c3' :
                                  event.category === 'workshop' ? '#d1fae5' :
                                  '#e0e7ff',
                  color: event.category === 'gala' ? '#92400e' :
                         event.category === 'party' ? '#be185d' :
                         event.category === 'reception' ? '#1e40af' :
                         event.category === 'awards' ? '#a16207' :
                         event.category === 'workshop' ? '#065f46' :
                         '#3730a3'
                }}
                title={event.title}
              >
                {formatTime(event.startTime)} {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Special Events</h2>
          <p className="text-gray-600">Festival special events and celebrations</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-300 p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded-md flex items-center ${
                viewMode === 'calendar' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md flex items-center ${
                viewMode === 'list' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 mr-1" />
              List
            </button>
          </div>
          
          {user.permissions.specialEvents === 'full_edit' && (
            <button 
              type="button"
              onClick={() => setShowAddModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </button>
          )}
        </div>
      </div>

      {viewMode === 'calendar' ? (
        /* Calendar View */
        <div className="bg-white rounded-lg shadow">
          {/* Calendar Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50 border-b border-gray-200">
                {day}
              </div>
            ))}
            {/* Calendar days */}
            {renderCalendar()}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getCategoryBadge(event.category)}
                    {getStatusBadge(event.status)}
                    {event.inviteOnly && (
                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                        Invite Only
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{event.title}</h3>
                  <p className="text-gray-600 mb-3">{event.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      {formatTime(event.startTime)} - {formatTime(event.endTime)}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {event.venue}
                    </div>
                  </div>

                  {event.expectedAttendees && (
                    <div className="flex items-center mt-2 text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      Expected: {event.expectedAttendees}
                      {event.capacity && ` / ${event.capacity} capacity`}
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedEvent(event);
                      setShowEventModal(true);
                    }}
                    className="text-purple-600 hover:text-purple-800 text-sm"
                  >
                    View Details
                  </button>
                  {user.permissions.specialEvents === 'full_edit' && (
                    <button className="text-gray-600 hover:text-gray-800 text-sm flex items-center">
                      <Edit3 className="w-3 h-3 mr-1" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h2>
                  <div className="flex items-center space-x-2 mt-2">
                    {getCategoryBadge(selectedEvent.category)}
                    {getStatusBadge(selectedEvent.status)}
                    {selectedEvent.inviteOnly && (
                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                        Invite Only
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Event Details</h3>
                    <div className="space-y-2 text-sm">
                      <p>{selectedEvent.description}</p>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {new Date(selectedEvent.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        {selectedEvent.venue}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2 text-gray-400" />
                        Expected: {selectedEvent.expectedAttendees}
                        {selectedEvent.capacity && ` / ${selectedEvent.capacity} capacity`}
                      </div>
                    </div>
                  </div>

                  {selectedEvent.budget && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Budget</h3>
                      <p className="text-sm text-gray-600">
                        ${selectedEvent.budget.toLocaleString()}
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Organizer</h3>
                    <p className="text-sm text-gray-600">{selectedEvent.organizer}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedEvent.requirements.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Requirements</h3>
                      <ul className="space-y-1">
                        {selectedEvent.requirements.map((req, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <span className="mr-2">•</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedEvent.vipGuests && selectedEvent.vipGuests.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">VIP Guests</h3>
                      <div className="flex flex-wrap gap-1">
                        {selectedEvent.vipGuests.map((guest, index) => (
                          <span key={index} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                            {guest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEvent.notes && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                      <p className="text-sm text-gray-600">{selectedEvent.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialEvents;