import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Edit3, Mail, Phone, Calendar, Clock,
  MapPin, Users, CheckCircle, XCircle, Download, Upload, 
  Eye, Settings, UserCheck, AlertCircle, Camera, Star,
  Film, Mic, User, Image, Archive, CameraOff
} from 'lucide-react';

interface PhotoShoot {
  id: number;
  eventName: string;
  eventType: 'interview_portrait' | 'filmmaker_portrait' | 'group_photo' | 'event_coverage' | 'behind_scenes' | 'promotional';
  date: string;
  time: string;
  location: string;
  photographer: {
    name: string;
    email: string;
    phone?: string;
    speciality: string;
  };
  subjects: Array<{
    id: number;
    name: string;
    role: string;
    filmTitle?: string;
    arrivalTime?: string;
    wardrobe?: string;
    notes?: string;
  }>;
  shotList: Array<{
    id: number;
    description: string;
    priority: 'must_have' | 'nice_to_have' | 'time_permitting';
    completed: boolean;
    notes?: string;
  }>;
  deliverables: {
    dueDate: string;
    formats: string[];
    destination: string;
    specialRequests?: string;
  };
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'post_processing';
  equipment: Array<{
    item: string;
    confirmed: boolean;
    notes?: string;
  }>;
  coverage: {
    estimatedShots: number;
    actualShots?: number;
    duration: string;
    backup: boolean;
  };
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
  const [photoShoots, setPhotoShoots] = useState<PhotoShoot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedShoot, setSelectedShoot] = useState<PhotoShoot | null>(null);
  const [showShootModal, setShowShootModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'shotlist' | 'logistics'>('overview');

  // Mock data
  useEffect(() => {
    const mockPhotoShoots: PhotoShoot[] = [
      {
        id: 1,
        eventName: "Payal Kapadia Portrait Session",
        eventType: 'filmmaker_portrait',
        date: "2024-10-17",
        time: "14:00",
        location: "CIFF Portrait Studio - Palmer House",
        photographer: {
          name: "Maria Rodriguez",
          email: "maria@photostudio.com",
          phone: "+1 312 555 0123",
          speciality: "Portrait Photography"
        },
        subjects: [
          {
            id: 1,
            name: "Payal Kapadia",
            role: "Director",
            filmTitle: "All We Imagine As Light",
            arrivalTime: "13:45",
            wardrobe: "Professional attire, bring 2-3 options",
            notes: "Winner of Grand Prix at Cannes"
          }
        ],
        shotList: [
          {
            id: 1,
            description: "Classic headshot against neutral background",
            priority: 'must_have',
            completed: true
          },
          {
            id: 2,
            description: "Environmental portrait with film equipment",
            priority: 'must_have',
            completed: true
          },
          {
            id: 3,
            description: "Casual shot for social media",
            priority: 'nice_to_have',
            completed: false
          },
          {
            id: 4,
            description: "Group shot if available with crew",
            priority: 'time_permitting',
            completed: false
          }
        ],
        deliverables: {
          dueDate: "2024-10-18",
          formats: ["High-res JPEG", "Print-ready TIFF", "Web-optimized"],
          destination: "Festival marketing team",
          specialRequests: "Black and white versions for press kit"
        },
        status: 'completed',
        equipment: [
          { item: "Professional lighting kit", confirmed: true },
          { item: "Backdrop stand", confirmed: true },
          { item: "Reflectors", confirmed: true },
          { item: "Multiple lenses", confirmed: true }
        ],
        coverage: {
          estimatedShots: 50,
          actualShots: 73,
          duration: "45 minutes",
          backup: true
        }
      },
      {
        id: 2,
        eventName: "Red Carpet Event Coverage",
        eventType: 'event_coverage',
        date: "2024-10-18",
        time: "18:30",
        location: "AMC River East 21 - Red Carpet",
        photographer: {
          name: "David Chen",
          email: "david@eventphoto.com",
          phone: "+1 312 555 0456",
          speciality: "Event Photography"
        },
        subjects: [
          {
            id: 2,
            name: "Payal Kapadia",
            role: "Director",
            filmTitle: "All We Imagine As Light",
            arrivalTime: "18:15"
          },
          {
            id: 3,
            name: "Kani Kusruti",
            role: "Lead Actress", 
            filmTitle: "All We Imagine As Light",
            arrivalTime: "18:20"
          },
          {
            id: 4,
            name: "Festival VIPs",
            role: "Various",
            notes: "Board members and special guests"
          }
        ],
        shotList: [
          {
            id: 5,
            description: "Individual red carpet arrivals",
            priority: 'must_have',
            completed: false
          },
          {
            id: 6,
            description: "Group shots at step and repeat",
            priority: 'must_have',
            completed: false
          },
          {
            id: 7,
            description: "Candid interaction shots",
            priority: 'nice_to_have',
            completed: false
          },
          {
            id: 8,
            description: "Wide shots of red carpet atmosphere",
            priority: 'nice_to_have',
            completed: false
          }
        ],
        deliverables: {
          dueDate: "2024-10-19",
          formats: ["High-res JPEG", "Web-ready", "Social media crops"],
          destination: "Marketing and Press",
          specialRequests: "Rush delivery for social media posts"
        },
        status: 'scheduled',
        equipment: [
          { item: "Multiple camera bodies", confirmed: true },
          { item: "70-200mm lens", confirmed: true },
          { item: "24-70mm lens", confirmed: true },
          { item: "External flash", confirmed: true, notes: "For low light backup" },
          { item: "Memory cards (backup)", confirmed: true }
        ],
        coverage: {
          estimatedShots: 200,
          duration: "2 hours",
          backup: true
        }
      },
      {
        id: 3,
        eventName: "Paz Vega Interview Setup",
        eventType: 'interview_portrait',
        date: "2024-10-19",
        time: "15:30",
        location: "Gene Siskel Film Center - Green Room",
        photographer: {
          name: "Sarah Kim",
          email: "sarah@portraitpro.com",
          speciality: "Interview Photography"
        },
        subjects: [
          {
            id: 5,
            name: "Paz Vega",
            role: "Director/Star",
            filmTitle: "Rita",
            arrivalTime: "15:15",
            notes: "Spanish interviews, may need translator present"
          }
        ],
        shotList: [
          {
            id: 9,
            description: "Interview setup shots",
            priority: 'must_have',
            completed: false
          },
          {
            id: 10,
            description: "Portrait between interviews",
            priority: 'must_have',
            completed: false
          },
          {
            id: 11,
            description: "Behind the scenes candids",
            priority: 'nice_to_have',
            completed: false
          }
        ],
        deliverables: {
          dueDate: "2024-10-20",
          formats: ["High-res JPEG", "Web-optimized"],
          destination: "Press and social media"
        },
        status: 'scheduled',
        equipment: [
          { item: "Portrait lens 85mm", confirmed: true },
          { item: "Portable lighting", confirmed: false, notes: "Checking availability" },
          { item: "Reflector", confirmed: true }
        ],
        coverage: {
          estimatedShots: 30,
          duration: "30 minutes",
          backup: false
        }
      },
      {
        id: 4,
        eventName: "Festival Archive Documentation",
        eventType: 'behind_scenes',
        date: "2024-10-20",
        time: "10:00",
        location: "Various festival locations",
        photographer: {
          name: "Mike Johnson",
          email: "mike@docphoto.com",
          speciality: "Documentary Photography"
        },
        subjects: [
          {
            id: 6,
            name: "Festival Staff",
            role: "Operations",
            notes: "Capture festival operations and behind-scenes"
          },
          {
            id: 7,
            name: "Venue Setup",
            role: "Logistics",
            notes: "Document venue preparations and breakdown"
          }
        ],
        shotList: [
          {
            id: 12,
            description: "Staff coordinating events",
            priority: 'must_have',
            completed: false
          },
          {
            id: 13,
            description: "Technical setup and operations",
            priority: 'must_have',
            completed: false
          },
          {
            id: 14,
            description: "Audience and atmosphere shots",
            priority: 'nice_to_have',
            completed: false
          },
          {
            id: 15,
            description: "Detail shots of festival branding",
            priority: 'time_permitting',
            completed: false
          }
        ],
        deliverables: {
          dueDate: "2024-10-25",
          formats: ["Archive quality TIFF", "Web-ready JPEG"],
          destination: "Festival archives and future marketing",
          specialRequests: "Focus on documenting operational excellence"
        },
        status: 'scheduled',
        equipment: [
          { item: "Documentary camera setup", confirmed: true },
          { item: "Wide angle lens", confirmed: true },
          { item: "Telephoto for candids", confirmed: true }
        ],
        coverage: {
          estimatedShots: 150,
          duration: "Full day",
          backup: true
        }
      }
    ];
    setPhotoShoots(mockPhotoShoots);
  }, []);

  const getEventTypeBadge = (type: string) => {
    const badges = {
      'interview_portrait': { color: 'bg-blue-100 text-blue-800', text: 'Interview Portrait' },
      'filmmaker_portrait': { color: 'bg-purple-100 text-purple-800', text: 'Filmmaker Portrait' },
      'group_photo': { color: 'bg-green-100 text-green-800', text: 'Group Photo' },
      'event_coverage': { color: 'bg-red-100 text-red-800', text: 'Event Coverage' },
      'behind_scenes': { color: 'bg-yellow-100 text-yellow-800', text: 'Behind Scenes' },
      'promotional': { color: 'bg-pink-100 text-pink-800', text: 'Promotional' }
    };
    
    const badge = badges[type as keyof typeof badges] || badges['promotional'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'scheduled': { color: 'bg-blue-100 text-blue-800', text: 'Scheduled' },
      'in_progress': { color: 'bg-yellow-100 text-yellow-800', text: 'In Progress' },
      'completed': { color: 'bg-green-100 text-green-800', text: 'Completed' },
      'cancelled': { color: 'bg-red-100 text-red-800', text: 'Cancelled' },
      'post_processing': { color: 'bg-purple-100 text-purple-800', text: 'Post Processing' }
    };
    
    const badge = badges[status as keyof typeof badges] || badges['scheduled'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const badges = {
      'must_have': { color: 'bg-red-100 text-red-800', text: 'Must Have' },
      'nice_to_have': { color: 'bg-yellow-100 text-yellow-800', text: 'Nice to Have' },
      'time_permitting': { color: 'bg-gray-100 text-gray-800', text: 'Time Permitting' }
    };
    
    const badge = badges[priority as keyof typeof badges] || badges['nice_to_have'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const filteredPhotoShoots = photoShoots.filter(shoot => {
    const matchesSearch = 
      shoot.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shoot.photographer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shoot.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shoot.subjects.some(subject => subject.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || shoot.eventType === typeFilter;
    const matchesStatus = statusFilter === 'all' || shoot.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const sortedPhotoShoots = filteredPhotoShoots.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  const eventTypes = [...new Set(photoShoots.map(s => s.eventType))];
  const statuses = [...new Set(photoShoots.map(s => s.status))];

  const updateShotCompletion = (shootId: number, shotId: number, completed: boolean) => {
    setPhotoShoots(prev => prev.map(shoot => 
      shoot.id === shootId 
        ? {
            ...shoot,
            shotList: shoot.shotList.map(shot =>
              shot.id === shotId ? { ...shot, completed } : shot
            )
          }
        : shoot
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Photo Coordination</h2>
          <p className="text-gray-600">Manage festival photography and coverage</p>
        </div>
        {user.permissions.photoCoordination === 'full_edit' && (
          <button className="bg-pink-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-pink-700">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Shoot
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
                placeholder="Search shoots, photographers, subjects..."
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
              {eventTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                  Event
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Photographer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subjects
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPhotoShoots.map((shoot) => {
                return (
                  <tr key={shoot.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{shoot.eventName}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          {getEventTypeBadge(shoot.eventType)}
                          {getStatusBadge(shoot.status)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {new Date(shoot.date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600">{shoot.time}</div>
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {shoot.location}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{shoot.photographer.name}</div>
                        <div className="text-sm text-gray-600">{shoot.photographer.speciality}</div>
                        <div className="text-xs text-gray-500">{shoot.photographer.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <div className="font-medium">{shoot.subjects.length} subjects</div>
                        <div className="text-gray-600">
                          {shoot.subjects.slice(0, 2).map((subject, index) => (
                            <div key={index} className="text-xs">
                              {subject.name} ({subject.role})
                            </div>
                          ))}
                          {shoot.subjects.length > 2 && (
                            <div className="text-xs text-gray-400">
                              +{shoot.subjects.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        {getStatusBadge(shoot.status)}
                        <div className="text-xs text-gray-600 mt-1">
                          Due: {new Date(shoot.deliverables.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => {
                          setSelectedShoot(shoot);
                          setShowShootModal(true);
                        }}
                        className="text-pink-600 hover:text-pink-800 text-sm"
                      >
                        Manage Shoot
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shoot Details Modal */}
      {showShootModal && selectedShoot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedShoot.eventName}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    {getEventTypeBadge(selectedShoot.eventType)}
                    {getStatusBadge(selectedShoot.status)}
                    <span className="text-gray-600">
                      {new Date(selectedShoot.date).toLocaleDateString()} at {selectedShoot.time}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowShootModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-4 border-b border-gray-200 mb-6">
                {[
                  { id: 'overview', label: 'Overview', icon: Eye },
                  { id: 'subjects', label: 'Subjects', icon: Users },
                  { id: 'shotlist', label: 'Shot List', icon: Camera },
                  { id: 'logistics', label: 'Logistics', icon: Settings }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center px-4 py-2 border-b-2 ${
                      activeTab === tab.id
                        ? 'border-pink-500 text-pink-600'
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
                      <h3 className="font-semibold text-gray-900 mb-2">Shoot Details</h3>
                      <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                        <div><span className="font-medium">Location:</span> {selectedShoot.location}</div>
                        <div><span className="font-medium">Duration:</span> {selectedShoot.coverage.duration}</div>
                        <div><span className="font-medium">Estimated Shots:</span> {selectedShoot.coverage.estimatedShots}</div>
                        {selectedShoot.coverage.actualShots && (
                          <div><span className="font-medium">Actual Shots:</span> {selectedShoot.coverage.actualShots}</div>
                        )}
                        <div><span className="font-medium">Backup Required:</span> {selectedShoot.coverage.backup ? 'Yes' : 'No'}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Photographer</h3>
                      <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                        <div className="font-medium">{selectedShoot.photographer.name}</div>
                        <div>{selectedShoot.photographer.speciality}</div>
                        <div className="flex items-center">
                          <Mail className="w-3 h-3 mr-1 text-gray-400" />
                          <a href={`mailto:${selectedShoot.photographer.email}`} className="text-blue-600 hover:underline">
                            {selectedShoot.photographer.email}
                          </a>
                        </div>
                        {selectedShoot.photographer.phone && (
                          <div className="flex items-center">
                            <Phone className="w-3 h-3 mr-1 text-gray-400" />
                            <span>{selectedShoot.photographer.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Deliverables</h3>
                    <div className="bg-blue-50 p-3 rounded-lg space-y-2 text-sm">
                      <div><span className="font-medium">Due Date:</span> {new Date(selectedShoot.deliverables.dueDate).toLocaleDateString()}</div>
                      <div><span className="font-medium">Formats:</span> {selectedShoot.deliverables.formats.join(', ')}</div>
                      <div><span className="font-medium">Destination:</span> {selectedShoot.deliverables.destination}</div>
                      {selectedShoot.deliverables.specialRequests && (
                        <div><span className="font-medium">Special Requests:</span> {selectedShoot.deliverables.specialRequests}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'subjects' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">
                      Subjects ({selectedShoot.subjects.length})
                    </h3>
                    {user.permissions.photoCoordination === 'full_edit' && (
                      <button className="bg-pink-600 text-white px-3 py-1 rounded text-sm hover:bg-pink-700">
                        Add Subject
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {selectedShoot.subjects.map((subject) => (
                      <div key={subject.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{subject.name}</div>
                            <div className="text-sm text-gray-600">{subject.role}</div>
                            {subject.filmTitle && (
                              <div className="text-sm text-gray-600">Film: {subject.filmTitle}</div>
                            )}
                            {subject.arrivalTime && (
                              <div className="text-xs text-gray-500 mt-1">
                                Arrival: {subject.arrivalTime}
                              </div>
                            )}
                            {subject.wardrobe && (
                              <div className="text-xs text-blue-600 mt-1">
                                Wardrobe: {subject.wardrobe}
                              </div>
                            )}
                            {subject.notes && (
                              <div className="text-xs text-yellow-600 mt-1">
                                Notes: {subject.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'shotlist' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">
                      Shot List ({selectedShoot.shotList.filter(s => s.completed).length}/{selectedShoot.shotList.length} completed)
                    </h3>
                    {user.permissions.photoCoordination === 'full_edit' && (
                      <button className="bg-pink-600 text-white px-3 py-1 rounded text-sm hover:bg-pink-700">
                        Add Shot
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {selectedShoot.shotList.map((shot) => (
                      <div key={shot.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="font-medium text-gray-900">{shot.description}</div>
                              {getPriorityBadge(shot.priority)}
                            </div>
                            {shot.notes && (
                              <div className="text-xs text-gray-600">{shot.notes}</div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {shot.completed ? (
                              <span className="flex items-center text-green-600 text-sm">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Complete
                              </span>
                            ) : (
                              <>
                                <span className="text-gray-400 text-sm">Pending</span>
                                {user.permissions.photoCoordination === 'full_edit' && (
                                  <button
                                    onClick={() => updateShotCompletion(selectedShoot.id, shot.id, true)}
                                    className="text-green-600 hover:text-green-800 text-xs"
                                  >
                                    Mark Complete
                                  </button>
                                )}
                              </>
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
                  <h3 className="font-semibold text-gray-900">Equipment & Logistics</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Equipment Checklist</h4>
                      <div className="space-y-2">
                        {selectedShoot.equipment.map((item, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{item.item}</div>
                                {item.notes && (
                                  <div className="text-xs text-gray-600">{item.notes}</div>
                                )}
                              </div>
                              <div className="flex items-center">
                                {item.confirmed ? (
                                  <span className="flex items-center text-green-600 text-sm">
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Confirmed
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
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Coverage Details</h4>
                        <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                          <div><span className="font-medium">Duration:</span> {selectedShoot.coverage.duration}</div>
                          <div><span className="font-medium">Estimated Shots:</span> {selectedShoot.coverage.estimatedShots}</div>
                          {selectedShoot.coverage.actualShots && (
                            <div><span className="font-medium">Actual Shots:</span> {selectedShoot.coverage.actualShots}</div>
                          )}
                          <div><span className="font-medium">Backup Equipment:</span> {selectedShoot.coverage.backup ? 'Required' : 'Not required'}</div>
                        </div>
                      </div>
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
        Showing {sortedPhotoShoots.length} of {photoShoots.length} photo shoots
      </div>
    </div>
  );
};

export default PhotoCoordination;