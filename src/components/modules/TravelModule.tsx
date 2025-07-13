import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Edit3, Mail, Phone, Calendar, Clock,
  Plane, Building, User, MapPin, AlertCircle, CheckCircle, 
  Upload, Download, Users, Film, Star, Globe, Save, X
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';

interface Flight {
  date: string;
  time: string;
  originAirport: string;
  arrivalAirport: string;
}

interface Hotel {
  name: string;
  address: string;
  checkInDate: string;
  checkOutDate: string;
  roomDetails?: string;
  specialRequests?: string;
}

interface ContactInfo {
  primary: {
    email: string;
    phone?: string;
  };
  publicistManager?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

interface Traveler {
  id: number;
  name: string;
  role: string;
  filmTitle?: string;
  programPurpose: string;
  contactInfo: ContactInfo;
  travelStatus: 'local' | 'distributor_handling' | 'festival_arranged';
  arrivalFlight?: Flight;
  departureFlight?: Flight;
  hotel?: Hotel;
  upcomingInterviews: Array<{
    id: number;
    journalistName: string;
    date: string;
    time: string;
    status: string;
  }>;
  notes?: string;
  createdFromFilm?: boolean;
}

interface User {
  id: number;
  name: string;
  role: string;
  permissions: Record<string, string>;
}

interface TravelModuleProps {
  user: User;
}

const TravelModule: React.FC<TravelModuleProps> = ({ user }) => {
  const { films, people } = useData();
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [selectedTraveler, setSelectedTraveler] = useState<Traveler | null>(null);
  const [showTravelerModal, setShowTravelerModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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
    const mockTravelers: Traveler[] = [
      {
        id: 1,
        name: 'Paz Vega',
        role: 'Director/Star',
        filmTitle: 'Rita',
        programPurpose: 'Rita film premiere and Q&A',
        contactInfo: {
          primary: {
            email: 'pzvega5@gmail.com',
            phone: '+34 123 456 789'
          },
          publicistManager: {
            name: 'Orson Martinez',
            email: 'orson@odafilms.com',
            phone: '+1 555 123 4567'
          }
        },
        travelStatus: 'festival_arranged',
        arrivalFlight: {
          date: '2024-10-15',
          time: '14:30',
          originAirport: 'MAD',
          arrivalAirport: 'ORD'
        },
        departureFlight: {
          date: '2024-10-19',
          time: '10:15',
          originAirport: 'ORD',
          arrivalAirport: 'MAD'
        },
        hotel: {
          name: 'The Chicago Hotel',
          address: '333 N Dearborn St, Chicago, IL 60654',
          checkInDate: '2024-10-15',
          checkOutDate: '2024-10-19',
          roomDetails: 'Suite with city view',
          specialRequests: 'Late checkout preferred'
        },
        upcomingInterviews: [
          {
            id: 1,
            journalistName: 'Sarah Johnson (Entertainment Weekly)',
            date: '2024-10-17',
            time: '14:30',
            status: 'scheduled'
          },
          {
            id: 2,
            journalistName: 'Mike Chen (The Hollywood Reporter)',
            date: '2024-10-18',
            time: '11:00',
            status: 'approved'
          }
        ],
        createdFromFilm: true
      },
      {
        id: 2,
        name: 'David Fortune',
        role: 'Director',
        filmTitle: 'Color Book',
        programPurpose: 'Color Book premiere and filmmaker discussion',
        contactInfo: {
          primary: {
            email: 'david@colorbook.com',
            phone: '+1 213 555 7890'
          }
        },
        travelStatus: 'distributor_handling',
        upcomingInterviews: [
          {
            id: 3,
            journalistName: 'Lisa Park (WGN News)',
            date: '2024-10-17',
            time: '16:00',
            status: 'pending'
          }
        ],
        notes: 'Distributor managing all arrangements - contact through sales agent',
        createdFromFilm: true
      },
      {
        id: 3,
        name: 'Jason Park',
        role: 'Director',
        filmTitle: 'Transplant',
        programPurpose: 'Transplant screening and industry panel',
        contactInfo: {
          primary: {
            email: 'jason@transplantfilm.com'
          }
        },
        travelStatus: 'local',
        upcomingInterviews: [],
        notes: 'Chicago-based filmmaker, arranging own logistics',
        createdFromFilm: true
      },
      {
        id: 4,
        name: 'Jane Smith',
        role: 'Industry Speaker',
        programPurpose: 'Lifetime Achievement Award ceremony and masterclass on film preservation',
        contactInfo: {
          primary: {
            email: 'jane.smith@preservation.org',
            phone: '+1 555 987 6543'
          }
        },
        travelStatus: 'festival_arranged',
        arrivalFlight: {
          date: '2024-10-16',
          time: '09:45',
          originAirport: 'LAX',
          arrivalAirport: 'ORD'
        },
        departureFlight: {
          date: '2024-10-20',
          time: '15:20',
          originAirport: 'ORD',
          arrivalAirport: 'LAX'
        },
        hotel: {
          name: 'Palmer House Hilton',
          address: '17 E Monroe St, Chicago, IL 60603',
          checkInDate: '2024-10-16',
          checkOutDate: '2024-10-20',
          roomDetails: 'Presidential suite',
          specialRequests: 'Quiet floor, early check-in'
        },
        upcomingInterviews: [],
        createdFromFilm: false
      }
    ];
    setTravelers(mockTravelers);
  }, []);

  const getStatusBadge = (status: string) => {
    const badges = {
      'festival_arranged': { color: 'bg-blue-100 text-blue-800', text: 'Festival Arranged' },
      'distributor_handling': { color: 'bg-purple-100 text-purple-800', text: 'Distributor Handling' },
      'local': { color: 'bg-green-100 text-green-800', text: 'Local' }
    };
    
    const badge = badges[status as keyof typeof badges] || badges['festival_arranged'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getInterviewStatusColor = (status: string) => {
    const colors = {
      'scheduled': 'text-green-600',
      'approved': 'text-blue-600',
      'pending': 'text-yellow-600',
      'pitched': 'text-gray-600'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  };

  const filteredTravelers = travelers.filter(traveler => {
    const matchesSearch = 
      traveler.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      traveler.filmTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      traveler.programPurpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      traveler.role.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || traveler.travelStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sortedTravelers = filteredTravelers.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'arrival':
        if (!a.arrivalFlight?.date || !b.arrivalFlight?.date) return 0;
        return new Date(a.arrivalFlight.date).getTime() - new Date(b.arrivalFlight.date).getTime();
      case 'film':
        return (a.filmTitle || '').localeCompare(b.filmTitle || '');
      case 'status':
        return a.travelStatus.localeCompare(b.travelStatus);
      default:
        return 0;
    }
  });

  const getStatusCounts = () => {
    return {
      total: travelers.length,
      festival_arranged: travelers.filter(t => t.travelStatus === 'festival_arranged').length,
      distributor_handling: travelers.filter(t => t.travelStatus === 'distributor_handling').length,
      local: travelers.filter(t => t.travelStatus === 'local').length
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Travel Management</h2>
          <p className="text-gray-600">Coordinate filmmaker and guest travel</p>
        </div>
        <div className="flex items-center space-x-4">
          {user.permissions.travelModule === 'full_edit' && (
            <>
              <button 
                onClick={() => setShowImportModal(true)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Traveler
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-gray-900">{statusCounts.total}</div>
          <div className="text-sm text-gray-600">Total Travelers</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400">
          <div className="text-2xl font-bold text-blue-600">{statusCounts.festival_arranged}</div>
          <div className="text-sm text-gray-600">Festival Arranged</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-400">
          <div className="text-2xl font-bold text-purple-600">{statusCounts.distributor_handling}</div>
          <div className="text-sm text-gray-600">Distributor Handling</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-400">
          <div className="text-2xl font-bold text-green-600">{statusCounts.local}</div>
          <div className="text-sm text-gray-600">Local</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search travelers, films, programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="festival_arranged">Festival Arranged</option>
              <option value="distributor_handling">Distributor Handling</option>
              <option value="local">Local</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Sort by Name</option>
              <option value="arrival">Sort by Arrival</option>
              <option value="film">Sort by Film</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Travelers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Traveler
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Film/Program
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Travel Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arrival
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Departure
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interviews
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTravelers.map((traveler) => (
                <tr key={traveler.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{traveler.name}</div>
                      <div className="text-sm text-gray-600">{traveler.role}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      {traveler.filmTitle && (
                        <div className="font-medium text-gray-900">{traveler.filmTitle}</div>
                      )}
                      <div className="text-sm text-gray-600">{traveler.programPurpose}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(traveler.travelStatus)}
                  </td>
                  <td className="px-4 py-4">
                    {traveler.arrivalFlight ? (
                      <div className="text-sm">
                        <div className="font-medium">{new Date(traveler.arrivalFlight.date).toLocaleDateString()}</div>
                        <div className="text-gray-600">{formatTime(traveler.arrivalFlight.time)}</div>
                        <div className="text-gray-500 text-xs">{traveler.arrivalFlight.originAirport} → {traveler.arrivalFlight.arrivalAirport}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {traveler.departureFlight ? (
                      <div className="text-sm">
                        <div className="font-medium">{new Date(traveler.departureFlight.date).toLocaleDateString()}</div>
                        <div className="text-gray-600">{formatTime(traveler.departureFlight.time)}</div>
                        <div className="text-gray-500 text-xs">{traveler.departureFlight.originAirport} → {traveler.departureFlight.arrivalAirport}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {traveler.upcomingInterviews.length > 0 ? (
                      <div className="text-sm">
                        <div className="font-medium">{traveler.upcomingInterviews.length} scheduled</div>
                        <div className="text-gray-600">
                          {traveler.upcomingInterviews.slice(0, 2).map((interview, index) => (
                            <div key={index} className={`text-xs ${getInterviewStatusColor(interview.status)}`}>
                              {interview.journalistName.split(' ')[0]} ({interview.status})
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">None</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => {
                        setSelectedTraveler(traveler);
                        setShowTravelerModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Traveler Details Modal */}
      {showTravelerModal && selectedTraveler && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTraveler.name}</h2>
                  <div className="flex items-center space-x-4 mt-1">
                    <p className="text-gray-600">{selectedTraveler.role}</p>
                    {getStatusBadge(selectedTraveler.travelStatus)}
                  </div>
                </div>
                <button
                  onClick={() => setShowTravelerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Program/Purpose</h3>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      {selectedTraveler.filmTitle && (
                        <div className="font-medium text-gray-900 mb-1">{selectedTraveler.filmTitle}</div>
                      )}
                      <div className="text-sm text-gray-600">{selectedTraveler.programPurpose}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Contact Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        <a href={`mailto:${selectedTraveler.contactInfo.primary.email}`} className="text-blue-600 hover:underline">
                          {selectedTraveler.contactInfo.primary.email}
                        </a>
                      </div>
                      {selectedTraveler.contactInfo.primary.phone && (
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{selectedTraveler.contactInfo.primary.phone}</span>
                        </div>
                      )}
                      
                      {selectedTraveler.contactInfo.publicistManager && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="font-medium text-gray-700 mb-1">Publicist/Manager</div>
                          {selectedTraveler.contactInfo.publicistManager.name && (
                            <div className="text-sm text-gray-600">{selectedTraveler.contactInfo.publicistManager.name}</div>
                          )}
                          {selectedTraveler.contactInfo.publicistManager.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="w-3 h-3 mr-1 text-gray-400" />
                              <a href={`mailto:${selectedTraveler.contactInfo.publicistManager.email}`} className="text-blue-600 hover:underline">
                                {selectedTraveler.contactInfo.publicistManager.email}
                              </a>
                            </div>
                          )}
                          {selectedTraveler.contactInfo.publicistManager.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              <span>{selectedTraveler.contactInfo.publicistManager.phone}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedTraveler.upcomingInterviews.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Upcoming Interviews</h3>
                      <div className="space-y-2">
                        {selectedTraveler.upcomingInterviews.map((interview) => (
                          <div key={interview.id} className="bg-blue-50 p-3 rounded-lg">
                            <div className="font-medium text-gray-900">{interview.journalistName}</div>
                            <div className="text-sm text-gray-600">
                              {new Date(interview.date).toLocaleDateString()} at {formatTime(interview.time)}
                            </div>
                            <div className={`text-xs ${getInterviewStatusColor(interview.status)} capitalize`}>
                              {interview.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTraveler.notes && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                      <div className="bg-yellow-50 p-3 rounded-lg text-sm text-gray-600">
                        {selectedTraveler.notes}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {selectedTraveler.travelStatus === 'festival_arranged' && (
                    <>
                      {selectedTraveler.arrivalFlight && (
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                            <Plane className="w-4 h-4 mr-2" />
                            Arrival Flight
                          </h3>
                          <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                            <div><span className="font-medium">Date:</span> {new Date(selectedTraveler.arrivalFlight.date).toLocaleDateString()}</div>
                            <div><span className="font-medium">Time:</span> {formatTime(selectedTraveler.arrivalFlight.time)}</div>
                            <div><span className="font-medium">Route:</span> {selectedTraveler.arrivalFlight.originAirport} → {selectedTraveler.arrivalFlight.arrivalAirport}</div>
                          </div>
                        </div>
                      )}

                      {selectedTraveler.departureFlight && (
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                            <Plane className="w-4 h-4 mr-2" />
                            Departure Flight
                          </h3>
                          <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                            <div><span className="font-medium">Date:</span> {new Date(selectedTraveler.departureFlight.date).toLocaleDateString()}</div>
                            <div><span className="font-medium">Time:</span> {formatTime(selectedTraveler.departureFlight.time)}</div>
                            <div><span className="font-medium">Route:</span> {selectedTraveler.departureFlight.originAirport} → {selectedTraveler.departureFlight.arrivalAirport}</div>
                          </div>
                        </div>
                      )}

                      {selectedTraveler.hotel && (
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                            <Building className="w-4 h-4 mr-2" />
                            Hotel Information
                          </h3>
                          <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                            <div className="font-medium">{selectedTraveler.hotel.name}</div>
                            <div>{selectedTraveler.hotel.address}</div>
                            <div><span className="font-medium">Check-in:</span> {new Date(selectedTraveler.hotel.checkInDate).toLocaleDateString()}</div>
                            <div><span className="font-medium">Check-out:</span> {new Date(selectedTraveler.hotel.checkOutDate).toLocaleDateString()}</div>
                            {selectedTraveler.hotel.roomDetails && (
                              <div><span className="font-medium">Room:</span> {selectedTraveler.hotel.roomDetails}</div>
                            )}
                            {selectedTraveler.hotel.specialRequests && (
                              <div><span className="font-medium">Special Requests:</span> {selectedTraveler.hotel.specialRequests}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedTraveler.travelStatus === 'distributor_handling' && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <AlertCircle className="w-4 h-4 mr-2 text-purple-600" />
                        <span className="font-medium text-purple-800">Distributor Handling</span>
                      </div>
                      <p className="text-sm text-purple-700">
                        Travel arrangements are being managed by the film's distributor. 
                        Contact the distributor directly for flight and hotel details.
                      </p>
                    </div>
                  )}

                  {selectedTraveler.travelStatus === 'local' && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                        <span className="font-medium text-green-800">Local Traveler</span>
                      </div>
                      <p className="text-sm text-green-700">
                        This person is local to the Chicago area and is arranging their own transportation.
                        No flight or hotel coordination needed.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {user.permissions.travelModule === 'full_edit' && (
                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                  <button 
                    onClick={() => {
                      setShowTravelerModal(false);
                      setShowAddModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Edit Traveler
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Traveler Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Add Traveler</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const newTraveler: Traveler = {
                  id: travelers.length + 1,
                  name: formData.get('name') as string,
                  role: formData.get('role') as string,
                  filmTitle: formData.get('filmTitle') as string || undefined,
                  programPurpose: formData.get('programPurpose') as string,
                  contactInfo: {
                    primary: {
                      email: formData.get('email') as string,
                      phone: formData.get('phone') as string || undefined
                    }
                  },
                  travelStatus: formData.get('travelStatus') as any,
                  upcomingInterviews: [],
                  notes: formData.get('notes') as string || undefined,
                  createdFromFilm: false
                };
                setTravelers(prev => [...prev, newTraveler]);
                setShowAddModal(false);
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input type="text" name="name" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                    <input type="text" name="role" required className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Director, Actor, etc." />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Film Title</label>
                    <select name="filmTitle" className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="">Select Film (optional)</option>
                      {films.map(film => (
                        <option key={film.id} value={film.title}>{film.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Travel Status *</label>
                    <select name="travelStatus" required className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="festival_arranged">Festival Arranged</option>
                      <option value="distributor_handling">Distributor Handling</option>
                      <option value="local">Local</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program Purpose *</label>
                  <textarea name="programPurpose" required rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Premiere, Q&A, panel discussion, etc."></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" name="email" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" name="phone" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea name="notes" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Special requirements, distributor contact info, etc."></textarea>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Add Traveler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import Data Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Import Traveler Data</h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
                  <input 
                    type="file" 
                    accept=".csv"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Expected columns: Name, Role, Film Title, Email, Phone, Travel Status, Purpose
                  </p>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Here you would handle the CSV import
                      setShowImportModal(false);
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600 text-center">
        Showing {sortedTravelers.length} of {travelers.length} travelers
      </div>
    </div>
  );
};

export default TravelModule;