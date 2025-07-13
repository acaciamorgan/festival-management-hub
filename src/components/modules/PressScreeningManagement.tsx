import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Edit3, Mail, Phone, Calendar, Clock,
  MapPin, Users, CheckCircle, XCircle, Download, Upload, 
  Eye, Settings, UserCheck, AlertCircle, Save, X
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';

interface PressScreening {
  id: number;
  filmTitle: string;
  runtime: number;
  date: string;
  time: string;
  venue: string;
  houseNumber: string;
  staffAssigned: string;
  rsvpCount: number;
  capacity?: number;
  rsvps: Array<{
    id: number;
    journalistName: string;
    journalistOutlet: string;
    journalistEmail: string;
    rsvpDate: string;
    attended?: boolean;
    checkedIn?: boolean;
    addedManually?: boolean;
  }>;
  calendarInvitesSent?: boolean;
}

interface User {
  id: number;
  name: string;
  role: string;
  permissions: Record<string, string>;
}

interface PressScreeningManagementProps {
  user: User;
}

const PressScreeningManagement: React.FC<PressScreeningManagementProps> = ({ user }) => {
  const { films, staff } = useData();
  const [screenings, setScreenings] = useState<PressScreening[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState('all');
  const [selectedScreening, setSelectedScreening] = useState<PressScreening | null>(null);
  const [showScreeningModal, setShowScreeningModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [showRSVPListModal, setShowRSVPListModal] = useState(false);
  const [editingScreening, setEditingScreening] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    date: string;
    time: string;
    staffAssigned: string;
  }>({ date: '', time: '', staffAssigned: '' });

  // Mock data
  useEffect(() => {
    const mockScreenings: PressScreening[] = [
      {
        id: 1,
        filmTitle: "All We Imagine As Light",
        runtime: 118,
        date: "2024-10-10",
        time: "13:00",
        venue: "AMC River East 21",
        houseNumber: "Theater 5",
        staffAssigned: "Morgan Harris",
        rsvpCount: 12,
        capacity: 50,
        calendarInvitesSent: true,
        rsvps: [
          {
            id: 1,
            journalistName: "Sarah Johnson",
            journalistOutlet: "Entertainment Weekly",
            journalistEmail: "sarah@ew.com",
            rsvpDate: "2024-10-01",
            attended: true,
            checkedIn: true
          },
          {
            id: 2,
            journalistName: "Mike Chen", 
            journalistOutlet: "The Hollywood Reporter",
            journalistEmail: "mike@thr.com",
            rsvpDate: "2024-10-02",
            attended: true,
            checkedIn: true
          },
          {
            id: 3,
            journalistName: "Lisa Park",
            journalistOutlet: "WGN News", 
            journalistEmail: "lisa@wgn.com",
            rsvpDate: "2024-10-03",
            checkedIn: false
          }
        ]
      },
      {
        id: 2,
        filmTitle: "Blitz",
        runtime: 120,
        date: "2024-10-12",
        time: "14:30",
        venue: "AMC River East 21",
        houseNumber: "Theater 3",
        staffAssigned: "Sarah Chen",
        rsvpCount: 8,
        capacity: 50,
        calendarInvitesSent: false,
        rsvps: [
          {
            id: 4,
            journalistName: "David Rodriguez",
            journalistOutlet: "Columbia College Chicago",
            journalistEmail: "drodriguez@colum.edu", 
            rsvpDate: "2024-10-05",
            checkedIn: false
          },
          {
            id: 5,
            journalistName: "Jennifer Walsh",
            journalistOutlet: "Film Independent Blog",
            journalistEmail: "jen@filmindependent.com",
            rsvpDate: "2024-10-06",
            addedManually: true,
            checkedIn: false
          }
        ]
      },
      {
        id: 3,
        filmTitle: "Rita", 
        runtime: 95,
        date: "2024-10-15",
        time: "10:00",
        venue: "Music Box Theatre",
        houseNumber: "Main Screen",
        staffAssigned: "Mike Johnson",
        rsvpCount: 15,
        capacity: 40,
        calendarInvitesSent: true,
        rsvps: [
          {
            id: 6,
            journalistName: "Alex Rivera",
            journalistOutlet: "Local News 5",
            journalistEmail: "alex@news5.com",
            rsvpDate: "2024-10-07",
            checkedIn: false
          }
        ]
      },
      {
        id: 4,
        filmTitle: "Color Book",
        runtime: 102,
        date: "2024-10-17",
        time: "11:15",
        venue: "Gene Siskel Film Center",
        houseNumber: "Theater 1",
        staffAssigned: "Morgan Harris",
        rsvpCount: 6,
        capacity: 30,
        calendarInvitesSent: false,
        rsvps: []
      }
    ];
    setScreenings(mockScreenings);
  }, []);

  const getCapacityStatus = (rsvpCount: number, capacity?: number) => {
    if (!capacity) return null;
    
    const percentage = (rsvpCount / capacity) * 100;
    
    if (percentage >= 90) {
      return { color: 'text-red-600', text: 'Nearly Full', icon: AlertCircle };
    } else if (percentage >= 70) {
      return { color: 'text-yellow-600', text: 'Good Attendance', icon: Users };
    } else {
      return { color: 'text-green-600', text: 'Available', icon: CheckCircle };
    }
  };

  const filteredScreenings = screenings.filter(screening => {
    const matchesSearch = 
      screening.filmTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screening.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screening.staffAssigned.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDate = dateFilter === 'all' || screening.date === dateFilter;
    const matchesVenue = venueFilter === 'all' || screening.venue === venueFilter;
    
    return matchesSearch && matchesDate && matchesVenue;
  });

  const sortedScreenings = filteredScreenings.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  const venues = [...new Set(screenings.map(s => s.venue))];
  const dates = [...new Set(screenings.map(s => s.date))].sort();

  const updateAttendance = (screeningId: number, rsvpId: number, attended: boolean) => {
    setScreenings(prev => prev.map(screening => 
      screening.id === screeningId 
        ? {
            ...screening,
            rsvps: screening.rsvps.map(rsvp =>
              rsvp.id === rsvpId ? { ...rsvp, attended, checkedIn: attended } : rsvp
            )
          }
        : screening
    ));
  };

  const sendCalendarInvites = (screeningId: number) => {
    setScreenings(prev => prev.map(screening =>
      screening.id === screeningId 
        ? { ...screening, calendarInvitesSent: true }
        : screening
    ));
  };

  // Helper function to convert 24-hour time to 12-hour AM/PM format
  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const startEditing = (screening: PressScreening) => {
    setEditingScreening(screening.id);
    setEditValues({
      date: screening.date,
      time: screening.time,
      staffAssigned: screening.staffAssigned
    });
  };

  const saveEditing = () => {
    if (editingScreening) {
      setScreenings(prev => prev.map(screening =>
        screening.id === editingScreening
          ? { ...screening, ...editValues }
          : screening
      ));
      setEditingScreening(null);
    }
  };

  const cancelEditing = () => {
    setEditingScreening(null);
    setEditValues({ date: '', time: '', staffAssigned: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Press Screening Management</h2>
          <p className="text-gray-600">Manage press screening events and RSVPs</p>
        </div>
        {user.permissions.pressScreeningManagement === 'full_edit' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Screening
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
                placeholder="Search films, venues, staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Dates</option>
              {dates.map(date => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString()}
                </option>
              ))}
            </select>

            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Venues</option>
              {venues.map(venue => (
                <option key={venue} value={venue}>{venue}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Screenings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Film
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Venue
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff
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
              {sortedScreenings.map((screening) => {
                const capacityStatus = getCapacityStatus(screening.rsvpCount, screening.capacity);
                
                return (
                  <tr key={screening.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <button 
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                          onClick={() => {
                            // This would navigate to film card - placeholder for now
                            console.log('Navigate to film card:', screening.filmTitle);
                          }}
                        >
                          {screening.filmTitle}
                        </button>
                        <div className="text-sm text-gray-600">{screening.runtime} minutes</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {editingScreening === screening.id ? (
                        <div className="space-y-2">
                          <input
                            type="date"
                            value={editValues.date}
                            onChange={(e) => setEditValues(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          />
                          <input
                            type="time"
                            value={editValues.time}
                            onChange={(e) => setEditValues(prev => ({ ...prev, time: e.target.value }))}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-gray-900">
                            {new Date(screening.date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600">{formatTime(screening.time)}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{screening.venue}</div>
                        <div className="text-sm text-gray-600">{screening.houseNumber}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {editingScreening === screening.id ? (
                        <select
                          value={editValues.staffAssigned}
                          onChange={(e) => setEditValues(prev => ({ ...prev, staffAssigned: e.target.value }))}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">Select Staff Member</option>
                          {staff.map(member => (
                            <option key={member.id} value={member.name}>
                              {member.name} - {member.title}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm text-gray-900">{screening.staffAssigned}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        onClick={() => {
                          setSelectedScreening(screening);
                          setShowRSVPListModal(true);
                        }}
                      >
                        {screening.rsvpCount}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        {editingScreening === screening.id ? (
                          <>
                            <button
                              onClick={saveEditing}
                              className="text-green-600 hover:text-green-800 text-sm flex items-center"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-gray-600 hover:text-gray-800 text-sm flex items-center"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setSelectedScreening(screening);
                                setShowScreeningModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Manage RSVPs
                            </button>
                            {user.permissions.pressScreeningManagement === 'full_edit' && (
                              <button
                                onClick={() => startEditing(screening)}
                                className="text-gray-600 hover:text-gray-800 text-sm flex items-center"
                              >
                                <Edit3 className="w-3 h-3 mr-1" />
                                Edit
                              </button>
                            )}
                          </>
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

      {/* Screening Details Modal */}
      {showScreeningModal && selectedScreening && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedScreening.filmTitle}</h2>
                  <p className="text-gray-600">
                    {new Date(selectedScreening.date).toLocaleDateString()} at {formatTime(selectedScreening.time)}
                  </p>
                  <p className="text-gray-600">
                    {selectedScreening.venue} - {selectedScreening.houseNumber}
                  </p>
                </div>
                <button
                  onClick={() => setShowScreeningModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Screening Details</h3>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                      <div><span className="font-medium">Runtime:</span> {selectedScreening.runtime} minutes</div>
                      <div><span className="font-medium">Staff Assigned:</span> {selectedScreening.staffAssigned}</div>
                      <div><span className="font-medium">Capacity:</span> {selectedScreening.capacity || 'Not set'}</div>
                      <div>
                        <span className="font-medium">Calendar Invites:</span> 
                        {selectedScreening.calendarInvitesSent ? (
                          <span className="text-green-600 ml-1">Sent</span>
                        ) : (
                          <span className="text-gray-500 ml-1">Not sent</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {user.permissions.pressScreeningManagement === 'full_edit' && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Quick Actions</h3>
                      <div className="space-y-2">
                        <button 
                          onClick={() => setShowRSVPModal(true)}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                          Add Manual RSVP
                        </button>
                        {!selectedScreening.calendarInvitesSent && (
                          <button 
                            onClick={() => sendCalendarInvites(selectedScreening.id)}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                          >
                            Send Calendar Invites
                          </button>
                        )}
                        <button className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                          Export RSVP List
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      RSVPs ({selectedScreening.rsvps.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedScreening.rsvps.length > 0 ? (
                        selectedScreening.rsvps.map((rsvp) => (
                          <div key={rsvp.id} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <div className="font-medium text-gray-900">{rsvp.journalistName}</div>
                                <div className="text-sm text-gray-600">{rsvp.journalistOutlet}</div>
                                <div className="text-xs text-gray-500">
                                  RSVP: {new Date(rsvp.rsvpDate).toLocaleDateString()}
                                  {rsvp.addedManually && <span className="ml-2 text-blue-600">(Manual)</span>}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {rsvp.attended !== undefined && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    rsvp.attended ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {rsvp.attended ? 'Attended' : 'No Show'}
                                  </span>
                                )}
                                {user.permissions.pressScreeningManagement === 'full_edit' && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => updateAttendance(selectedScreening.id, rsvp.id, true)}
                                      className="text-green-600 hover:text-green-800 text-xs"
                                    >
                                      ✓ Attended
                                    </button>
                                    <button
                                      onClick={() => updateAttendance(selectedScreening.id, rsvp.id, false)}
                                      className="text-red-600 hover:text-red-800 text-xs"
                                    >
                                      ✗ No Show
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          No RSVPs yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Screening Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add Press Screening</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Film Title</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="">Select Film</option>
                      {films.map(film => (
                        <option key={film.id} value={film.title}>{film.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Runtime (minutes)</label>
                    <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input type="time" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">House/Theater Number</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Staff Assigned</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="">Select Staff Member</option>
                      {staff.map(member => (
                        <option key={member.id} value={member.name}>
                          {member.name} - {member.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (optional)</label>
                    <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Here you would save the screening
                    setShowAddModal(false);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Screening
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RSVP List Modal */}
      {showRSVPListModal && selectedScreening && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">RSVP List</h2>
                  <p className="text-gray-600">
                    {selectedScreening.filmTitle} - {new Date(selectedScreening.date).toLocaleDateString()} at {formatTime(selectedScreening.time)}
                  </p>
                </div>
                <button
                  onClick={() => setShowRSVPListModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {selectedScreening.rsvps.length > 0 ? (
                  selectedScreening.rsvps.map((rsvp) => (
                    <div key={rsvp.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{rsvp.journalistName}</div>
                          <div className="text-sm text-gray-600">{rsvp.journalistOutlet}</div>
                          <div className="text-sm text-gray-500">{rsvp.journalistEmail}</div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={rsvp.attended || false}
                              onChange={(e) => updateAttendance(selectedScreening.id, rsvp.id, e.target.checked)}
                              className="mr-2"
                              disabled={user.permissions.pressScreeningManagement !== 'full_edit'}
                            />
                            <span className="text-sm text-gray-700">Attended</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No RSVPs for this screening
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600 text-center">
        Showing {sortedScreenings.length} of {screenings.length} screenings
      </div>
    </div>
  );
};

export default PressScreeningManagement;