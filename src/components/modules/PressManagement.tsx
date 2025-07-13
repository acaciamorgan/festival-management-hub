import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Edit3, Mail, Phone, ExternalLink, 
  User, Building, Check, Clock, AlertCircle, Globe, Twitter,
  ChevronDown, ChevronUp, MessageSquare, Calendar
} from 'lucide-react';

interface Journalist {
  id: number;
  name: string;
  primaryOutlet: string;
  secondaryOutlets?: string[];
  type: 'TV' | 'Print/Online' | 'Radio' | 'Trade' | 'College';
  beatSpecialty: string;
  accreditationLevel: 'P' | 'G' | 'Unaccredited';
  email: string;
  phone?: string;
  primaryOutletUrl?: string;
  secondaryOutletUrls?: string[];
  socialMedia: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  credentialsPickedUp: boolean;
  specialNotes?: string;
  interviewActivity: {
    currentPitches: number;
    scheduledInterviews: number;
    completedInterviews: number;
  };
}

interface User {
  id: number;
  name: string;
  role: string;
  permissions: Record<string, string>;
}

interface PressManagementProps {
  user: User;
}

const PressManagement: React.FC<PressManagementProps> = ({ user }) => {
  const [journalists, setJournalists] = useState<Journalist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState('all');
  const [filterAccreditation, setFilterAccreditation] = useState('all');
  const [selectedJournalist, setSelectedJournalist] = useState<Journalist | null>(null);
  const [showJournalistModal, setShowJournalistModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Mock data
  useEffect(() => {
    const mockJournalists: Journalist[] = [
      {
        id: 1,
        name: 'Sarah Johnson',
        primaryOutlet: 'Entertainment Weekly',
        type: 'Print/Online',
        beatSpecialty: 'Film Critics',
        accreditationLevel: 'P',
        email: 'sarah@ew.com',
        phone: '(555) 123-4567',
        primaryOutletUrl: 'https://ew.com',
        socialMedia: {
          twitter: '@sarahjohnsonEW',
          linkedin: 'sarah-johnson-ew'
        },
        credentialsPickedUp: true,
        specialNotes: 'VIP access requested',
        interviewActivity: {
          currentPitches: 3,
          scheduledInterviews: 2,
          completedInterviews: 5
        }
      },
      {
        id: 2,
        name: 'Mike Chen',
        primaryOutlet: 'The Hollywood Reporter',
        secondaryOutlets: ['Variety (Freelance)'],
        type: 'Trade',
        beatSpecialty: 'Entertainment Business',
        accreditationLevel: 'P',
        email: 'mike@thr.com',
        phone: '(555) 234-5678',
        socialMedia: {
          twitter: '@mikechenthr'
        },
        credentialsPickedUp: false,
        interviewActivity: {
          currentPitches: 1,
          scheduledInterviews: 1,
          completedInterviews: 8
        }
      },
      {
        id: 3,
        name: 'Lisa Park',
        primaryOutlet: 'WGN News',
        type: 'TV',
        beatSpecialty: 'Local Entertainment',
        accreditationLevel: 'G',
        email: 'lisa@wgn.com',
        phone: '(555) 345-6789',
        credentialsPickedUp: true,
        specialNotes: 'Dietary restrictions: vegetarian',
        interviewActivity: {
          currentPitches: 2,
          scheduledInterviews: 0,
          completedInterviews: 3
        }
      },
      {
        id: 4,
        name: 'David Rodriguez',
        primaryOutlet: 'Columbia College Chicago',
        type: 'College',
        beatSpecialty: 'Student Media',
        accreditationLevel: 'G',
        email: 'drodriguez@colum.edu',
        credentialsPickedUp: false,
        interviewActivity: {
          currentPitches: 0,
          scheduledInterviews: 1,
          completedInterviews: 0
        }
      },
      {
        id: 5,
        name: 'Jennifer Walsh',
        primaryOutlet: 'Film Independent Blog',
        type: 'Print/Online',
        beatSpecialty: 'Independent Films',
        accreditationLevel: 'Unaccredited',
        email: 'jen@filmindependent.com',
        interviewActivity: {
          currentPitches: 1,
          scheduledInterviews: 0,
          completedInterviews: 0
        }
      }
    ];
    setJournalists(mockJournalists);
  }, []);

  const getAccreditationBadge = (level: string) => {
    const badges = {
      'P': { color: 'bg-purple-100 text-purple-800', text: 'Premium Press' },
      'G': { color: 'bg-green-100 text-green-800', text: 'General Press' },
      'Unaccredited': { color: 'bg-gray-100 text-gray-800', text: 'Unaccredited' }
    };
    
    const badge = badges[level as keyof typeof badges] || badges['Unaccredited'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      'TV': 'bg-blue-100 text-blue-800',
      'Print/Online': 'bg-green-100 text-green-800',
      'Radio': 'bg-yellow-100 text-yellow-800',
      'Trade': 'bg-purple-100 text-purple-800',
      'College': 'bg-orange-100 text-orange-800'
    };
    
    const color = colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {type}
      </span>
    );
  };

  const filteredJournalists = journalists.filter(journalist => {
    const matchesSearch = 
      journalist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      journalist.primaryOutlet.toLowerCase().includes(searchQuery.toLowerCase()) ||
      journalist.beatSpecialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      journalist.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || journalist.type === filterType;
    const matchesAccreditation = filterAccreditation === 'all' || journalist.accreditationLevel === filterAccreditation;
    
    return matchesSearch && matchesType && matchesAccreditation;
  });

  const sortedJournalists = filteredJournalists.sort((a, b) => {
    let valueA, valueB;
    
    switch (sortBy) {
      case 'name':
        const lastNameA = a.name.split(' ').pop() || '';
        const lastNameB = b.name.split(' ').pop() || '';
        valueA = lastNameA.toLowerCase();
        valueB = lastNameB.toLowerCase();
        break;
      case 'outlet':
        valueA = a.primaryOutlet.toLowerCase();
        valueB = b.primaryOutlet.toLowerCase();
        break;
      case 'type':
        valueA = a.type.toLowerCase();
        valueB = b.type.toLowerCase();
        break;
      case 'accreditation':
        const accreditationOrder = { 'P': 3, 'G': 2, 'Unaccredited': 1 };
        valueA = accreditationOrder[a.accreditationLevel as keyof typeof accreditationOrder];
        valueB = accreditationOrder[b.accreditationLevel as keyof typeof accreditationOrder];
        break;
      default:
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
    }
    
    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Press Management</h2>
          <p className="text-gray-600">Manage journalists and media contacts</p>
        </div>
        {user.permissions.pressManagement === 'full_edit' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Journalist
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
                placeholder="Search journalists, outlets, beats, emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="TV">TV</option>
              <option value="Print/Online">Print/Online</option>
              <option value="Radio">Radio</option>
              <option value="Trade">Trade</option>
              <option value="College">College</option>
            </select>

            <select
              value={filterAccreditation}
              onChange={(e) => setFilterAccreditation(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Accreditation</option>
              <option value="P">Premium Press</option>
              <option value="G">General Press</option>
              <option value="Unaccredited">Unaccredited</option>
            </select>
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex gap-2 mt-4">
          <span className="text-sm text-gray-600 py-2">Sort by:</span>
          {[
            { key: 'name', label: 'Last Name' },
            { key: 'outlet', label: 'Outlet' },
            { key: 'type', label: 'Type' },
            { key: 'accreditation', label: 'Accreditation' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={`flex items-center px-3 py-1 rounded-lg text-sm ${
                sortBy === key ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
              }`}
            >
              {label}
              {getSortIcon(key)}
            </button>
          ))}
        </div>
      </div>

      {/* Journalists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedJournalists.map((journalist) => (
          <div
            key={journalist.id}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedJournalist(journalist);
              setShowJournalistModal(true);
            }}
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">{journalist.name}</h3>
                  <p className="text-gray-600 text-sm">{journalist.primaryOutlet}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {getAccreditationBadge(journalist.accreditationLevel)}
                  {getTypeBadge(journalist.type)}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{journalist.email}</span>
                </div>
                
                {journalist.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{journalist.phone}</span>
                  </div>
                )}

                <div className="flex items-center text-gray-600">
                  <Building className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{journalist.beatSpecialty}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {journalist.interviewActivity.currentPitches} pitches
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {journalist.interviewActivity.scheduledInterviews} scheduled
                  </span>
                  <span className="flex items-center">
                    {journalist.credentialsPickedUp ? (
                      <Check className="w-3 h-3 mr-1 text-green-600" />
                    ) : (
                      <Clock className="w-3 h-3 mr-1 text-yellow-600" />
                    )}
                    Credentials
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Journalist Details Modal */}
      {showJournalistModal && selectedJournalist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedJournalist.name}</h2>
                  <p className="text-gray-600">{selectedJournalist.primaryOutlet}</p>
                </div>
                <button
                  onClick={() => setShowJournalistModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Contact Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        <a href={`mailto:${selectedJournalist.email}`} className="text-blue-600 hover:underline">
                          {selectedJournalist.email}
                        </a>
                      </div>
                      {selectedJournalist.phone && (
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <a href={`tel:${selectedJournalist.phone}`} className="text-blue-600 hover:underline">
                            {selectedJournalist.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Professional Details</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Type:</span> {getTypeBadge(selectedJournalist.type)}</p>
                      <p><span className="font-medium">Beat/Specialty:</span> {selectedJournalist.beatSpecialty}</p>
                      <p><span className="font-medium">Accreditation:</span> {getAccreditationBadge(selectedJournalist.accreditationLevel)}</p>
                      <div className="flex items-center">
                        <span className="font-medium mr-2">Credentials:</span>
                        {selectedJournalist.credentialsPickedUp ? (
                          <span className="flex items-center text-green-600">
                            <Check className="w-4 h-4 mr-1" />
                            Picked Up
                          </span>
                        ) : (
                          <span className="flex items-center text-yellow-600">
                            <Clock className="w-4 h-4 mr-1" />
                            Pending Pickup
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedJournalist.specialNotes && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Special Notes</h3>
                      <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                        {selectedJournalist.specialNotes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Outlets & Digital Presence</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Primary Outlet:</span>
                        <div className="ml-4">
                          <p>{selectedJournalist.primaryOutlet}</p>
                          {selectedJournalist.primaryOutletUrl && (
                            <a 
                              href={selectedJournalist.primaryOutletUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Visit Website
                            </a>
                          )}
                        </div>
                      </div>
                      
                      {selectedJournalist.secondaryOutlets && selectedJournalist.secondaryOutlets.length > 0 && (
                        <div>
                          <span className="font-medium">Secondary Outlets:</span>
                          <ul className="ml-4">
                            {selectedJournalist.secondaryOutlets.map((outlet, index) => (
                              <li key={index}>{outlet}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(selectedJournalist.socialMedia.twitter || selectedJournalist.socialMedia.instagram || selectedJournalist.socialMedia.linkedin) && (
                        <div>
                          <span className="font-medium">Social Media:</span>
                          <div className="ml-4 space-y-1">
                            {selectedJournalist.socialMedia.twitter && (
                              <div className="flex items-center">
                                <Twitter className="w-4 h-4 mr-2 text-blue-400" />
                                <span>{selectedJournalist.socialMedia.twitter}</span>
                              </div>
                            )}
                            {selectedJournalist.socialMedia.instagram && (
                              <div className="flex items-center">
                                <span className="w-4 h-4 mr-2 text-pink-500">📷</span>
                                <span>{selectedJournalist.socialMedia.instagram}</span>
                              </div>
                            )}
                            {selectedJournalist.socialMedia.linkedin && (
                              <div className="flex items-center">
                                <span className="w-4 h-4 mr-2 text-blue-600">💼</span>
                                <span>{selectedJournalist.socialMedia.linkedin}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Interview Activity</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedJournalist.interviewActivity.currentPitches}
                        </div>
                        <div className="text-xs text-gray-600">Current Pitches</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedJournalist.interviewActivity.scheduledInterviews}
                        </div>
                        <div className="text-xs text-gray-600">Scheduled</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-gray-600">
                          {selectedJournalist.interviewActivity.completedInterviews}
                        </div>
                        <div className="text-xs text-gray-600">Completed</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {user.permissions.pressManagement === 'full_edit' && (
                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Edit Journalist
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600 text-center">
        Showing {sortedJournalists.length} of {journalists.length} journalists
      </div>
    </div>
  );
};

export default PressManagement;