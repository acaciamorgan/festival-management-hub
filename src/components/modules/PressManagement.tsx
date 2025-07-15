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
  pressScreenings: {
    rsvpCount: number;
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityType, setActivityType] = useState<'pitches' | 'scheduled' | 'screenings' | null>(null);
  const [newJournalist, setNewJournalist] = useState({
    name: '',
    email: '',
    primaryOutlet: '',
    secondaryOutlet: '',
    primaryOutletUrl: '',
    secondaryOutletUrl: '',
    phone: '',
    type: '',
    accreditationLevel: '',
    beatSpecialty: '',
    geography: '',
    specialNotes: '',
    twitter: '',
    instagram: '',
    linkedin: ''
  });
  const [editJournalist, setEditJournalist] = useState({
    id: 0,
    name: '',
    email: '',
    primaryOutlet: '',
    secondaryOutlet: '',
    primaryOutletUrl: '',
    secondaryOutletUrl: '',
    phone: '',
    type: '',
    accreditationLevel: '',
    beatSpecialty: '',
    geography: '',
    specialNotes: '',
    twitter: '',
    instagram: '',
    linkedin: ''
  });

  // Mock data
  // WAITING FOR HUMAN TO PROVIDE APPROVED MOCK DATA
  // CLAUDE IS FORBIDDEN FROM CREATING MOCK DATA
  useEffect(() => {
    setJournalists([]);
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

  const handleAddJournalist = () => {
    // Validate required fields
    if (!newJournalist.name || !newJournalist.email || !newJournalist.primaryOutlet) {
      alert('Please fill in all required fields (Name, Email, Primary Outlet)');
      return;
    }

    // Create complete journalist object with all required fields
    const journalistToAdd: Journalist = {
      id: Math.max(...journalists.map(j => j.id)) + 1,
      name: newJournalist.name.trim(),
      primaryOutlet: newJournalist.primaryOutlet.trim(),
      secondaryOutlets: newJournalist.secondaryOutlet.trim() ? [newJournalist.secondaryOutlet.trim()] : undefined,
      type: newJournalist.type as 'TV' | 'Print/Online' | 'Radio' | 'Trade' | 'College',
      beatSpecialty: newJournalist.beatSpecialty.trim() || 'General',
      accreditationLevel: newJournalist.accreditationLevel as 'P' | 'G' | 'Unaccredited',
      email: newJournalist.email.trim(),
      phone: newJournalist.phone.trim() || undefined,
      primaryOutletUrl: newJournalist.primaryOutletUrl.trim() || undefined,
      secondaryOutletUrls: newJournalist.secondaryOutletUrl.trim() ? [newJournalist.secondaryOutletUrl.trim()] : undefined,
      socialMedia: {
        twitter: newJournalist.twitter.trim() || undefined,
        instagram: newJournalist.instagram.trim() || undefined,
        linkedin: newJournalist.linkedin.trim() || undefined
      },
      credentialsPickedUp: false,
      specialNotes: newJournalist.specialNotes.trim() || undefined,
      interviewActivity: {
        currentPitches: 0,
        scheduledInterviews: 0,
        completedInterviews: 0
      },
      pressScreenings: {
        rsvpCount: 0
      }
    };

    // Add to journalists list
    setJournalists(prev => [...prev, journalistToAdd]);
    
    // Reset form and close modal
    setNewJournalist({
      name: '',
      email: '',
      primaryOutlet: '',
      secondaryOutlet: '',
      primaryOutletUrl: '',
      secondaryOutletUrl: '',
      phone: '',
      type: '',
      accreditationLevel: '',
      beatSpecialty: '',
      geography: '',
      specialNotes: '',
      twitter: '',
      instagram: '',
      linkedin: ''
    });
    setShowAddModal(false);
  };

  const handleEditJournalist = (journalist: Journalist) => {
    setEditJournalist({
      id: journalist.id,
      name: journalist.name,
      email: journalist.email,
      primaryOutlet: journalist.primaryOutlet,
      secondaryOutlet: journalist.secondaryOutlets?.[0] || '',
      primaryOutletUrl: journalist.primaryOutletUrl || '',
      secondaryOutletUrl: journalist.secondaryOutletUrls?.[0] || '',
      phone: journalist.phone || '',
      type: journalist.type,
      accreditationLevel: journalist.accreditationLevel,
      beatSpecialty: journalist.beatSpecialty,
      geography: '', // This field wasn't in original data
      specialNotes: journalist.specialNotes || '',
      twitter: journalist.socialMedia?.twitter || '',
      instagram: journalist.socialMedia?.instagram || '',
      linkedin: journalist.socialMedia?.linkedin || ''
    });
    setShowJournalistModal(false);
    setShowEditModal(true);
  };

  const handleUpdateJournalist = () => {
    // Validate required fields
    if (!editJournalist.name || !editJournalist.email || !editJournalist.primaryOutlet) {
      alert('Please fill in all required fields (Name, Email, Primary Outlet)');
      return;
    }

    // Update journalist in the list
    setJournalists(prev => prev.map(j => 
      j.id === editJournalist.id ? {
        ...j,
        name: editJournalist.name.trim(),
        email: editJournalist.email.trim(),
        primaryOutlet: editJournalist.primaryOutlet.trim(),
        secondaryOutlets: editJournalist.secondaryOutlet.trim() ? [editJournalist.secondaryOutlet.trim()] : undefined,
        primaryOutletUrl: editJournalist.primaryOutletUrl.trim() || undefined,
        secondaryOutletUrls: editJournalist.secondaryOutletUrl.trim() ? [editJournalist.secondaryOutletUrl.trim()] : undefined,
        phone: editJournalist.phone.trim() || undefined,
        type: editJournalist.type as 'TV' | 'Print/Online' | 'Radio' | 'Trade' | 'College',
        accreditationLevel: editJournalist.accreditationLevel as 'P' | 'G' | 'Unaccredited',
        beatSpecialty: editJournalist.beatSpecialty.trim() || j.beatSpecialty,
        specialNotes: editJournalist.specialNotes.trim() || undefined,
        socialMedia: {
          twitter: editJournalist.twitter.trim() || undefined,
          instagram: editJournalist.instagram.trim() || undefined,
          linkedin: editJournalist.linkedin.trim() || undefined
        }
      } : j
    ));

    // Reset form and close modal
    setEditJournalist({
      id: 0,
      name: '',
      email: '',
      primaryOutlet: '',
      secondaryOutlet: '',
      primaryOutletUrl: '',
      secondaryOutletUrl: '',
      phone: '',
      type: '',
      accreditationLevel: '',
      beatSpecialty: '',
      geography: '',
      specialNotes: '',
      twitter: '',
      instagram: '',
      linkedin: ''
    });
    setShowEditModal(false);
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
            type="button"
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
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-2">
                  <button
                    className="flex items-center justify-center p-1 rounded hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedJournalist(journalist);
                      setActivityType('pitches');
                      setShowActivityModal(true);
                    }}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {journalist.interviewActivity.currentPitches} pitches
                  </button>
                  <button
                    className="flex items-center justify-center p-1 rounded hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedJournalist(journalist);
                      setActivityType('scheduled');
                      setShowActivityModal(true);
                    }}
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    {journalist.interviewActivity.scheduledInterviews} scheduled
                  </button>
                  <button
                    className="flex items-center justify-center p-1 rounded hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedJournalist(journalist);
                      setActivityType('screenings');
                      setShowActivityModal(true);
                    }}
                  >
                    <span className="w-3 h-3 mr-1">🎬</span>
                    {journalist.pressScreenings.rsvpCount} screenings
                  </button>
                  <label className="flex items-center justify-center cursor-pointer p-1 rounded hover:bg-gray-100" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={journalist.credentialsPickedUp}
                      onChange={(e) => {
                        if (user.permissions.pressManagement === 'full_edit') {
                          const updatedJournalists = journalists.map(j =>
                            j.id === journalist.id 
                              ? { ...j, credentialsPickedUp: e.target.checked }
                              : j
                          );
                          setJournalists(updatedJournalists);
                        }
                      }}
                      disabled={user.permissions.pressManagement !== 'full_edit'}
                      className="w-3 h-3 mr-1 text-green-600 rounded border-gray-300 focus:ring-green-500"
                    />
                    <span className={journalist.credentialsPickedUp ? 'text-green-600' : 'text-yellow-600'}>
                      Credentials
                    </span>
                  </label>
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
                  type="button"
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
                  <button 
                    onClick={() => handleEditJournalist(selectedJournalist)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Edit Journalist
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Journalist Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add Journalist</h2>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Required Fields */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input 
                      type="text" 
                      value={newJournalist.name}
                      onChange={(e) => setNewJournalist(prev => ({...prev, name: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input 
                      type="email" 
                      value={newJournalist.email}
                      onChange={(e) => setNewJournalist(prev => ({...prev, email: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Outlet *</label>
                    <input 
                      type="text" 
                      value={newJournalist.primaryOutlet}
                      onChange={(e) => setNewJournalist(prev => ({...prev, primaryOutlet: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    />
                  </div>
                </div>

                {/* Optional Outlet Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Outlet</label>
                    <input 
                      type="text" 
                      value={newJournalist.secondaryOutlet}
                      onChange={(e) => setNewJournalist(prev => ({...prev, secondaryOutlet: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input 
                      type="tel" 
                      value={newJournalist.phone}
                      onChange={(e) => setNewJournalist(prev => ({...prev, phone: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    />
                  </div>
                </div>

                {/* URL Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Outlet URL</label>
                    <input 
                      type="url" 
                      value={newJournalist.primaryOutletUrl}
                      onChange={(e) => setNewJournalist(prev => ({...prev, primaryOutletUrl: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      placeholder="https://"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Outlet URL</label>
                    <input 
                      type="url" 
                      value={newJournalist.secondaryOutletUrl}
                      onChange={(e) => setNewJournalist(prev => ({...prev, secondaryOutletUrl: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      placeholder="https://"
                    />
                  </div>
                </div>

                {/* Dropdowns */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select 
                      value={newJournalist.type}
                      onChange={(e) => setNewJournalist(prev => ({...prev, type: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select Type</option>
                      <option value="TV">TV</option>
                      <option value="Print/Online">Print/Online</option>
                      <option value="Radio">Radio</option>
                      <option value="Trade">Trade</option>
                      <option value="College">College</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Accreditation</label>
                    <select 
                      value={newJournalist.accreditationLevel}
                      onChange={(e) => setNewJournalist(prev => ({...prev, accreditationLevel: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select Level</option>
                      <option value="P">Premium Press</option>
                      <option value="G">General Press</option>
                      <option value="Unaccredited">Unaccredited</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Geography</label>
                    <select 
                      value={newJournalist.geography}
                      onChange={(e) => setNewJournalist(prev => ({...prev, geography: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select Geography</option>
                      <option value="Local">Local</option>
                      <option value="Regional">Regional</option>
                      <option value="National">National</option>
                      <option value="International">International</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beat/Specialty</label>
                    <input 
                      type="text" 
                      value={newJournalist.beatSpecialty}
                      onChange={(e) => setNewJournalist(prev => ({...prev, beatSpecialty: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    />
                  </div>
                </div>

                {/* Social Media */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                    <input 
                      type="text" 
                      value={newJournalist.twitter}
                      onChange={(e) => setNewJournalist(prev => ({...prev, twitter: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                    <input 
                      type="text" 
                      value={newJournalist.instagram}
                      onChange={(e) => setNewJournalist(prev => ({...prev, instagram: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                    <input 
                      type="text" 
                      value={newJournalist.linkedin}
                      onChange={(e) => setNewJournalist(prev => ({...prev, linkedin: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      placeholder="profile-name"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Notes</label>
                  <textarea 
                    value={newJournalist.specialNotes}
                    onChange={(e) => setNewJournalist(prev => ({...prev, specialNotes: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    rows={3}
                  ></textarea>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddJournalist}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Journalist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Journalist Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Edit Journalist</h2>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                {/* Required Fields */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input 
                      type="text" 
                      value={editJournalist.name}
                      onChange={(e) => setEditJournalist(prev => ({...prev, name: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input 
                      type="email" 
                      value={editJournalist.email}
                      onChange={(e) => setEditJournalist(prev => ({...prev, email: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Outlet *</label>
                    <input 
                      type="text" 
                      value={editJournalist.primaryOutlet}
                      onChange={(e) => setEditJournalist(prev => ({...prev, primaryOutlet: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    />
                  </div>
                </div>

                {/* Optional Outlet Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Outlet</label>
                    <input 
                      type="text" 
                      value={editJournalist.secondaryOutlet}
                      onChange={(e) => setEditJournalist(prev => ({...prev, secondaryOutlet: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input 
                      type="tel" 
                      value={editJournalist.phone}
                      onChange={(e) => setEditJournalist(prev => ({...prev, phone: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    />
                  </div>
                </div>

                {/* URL Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Outlet URL</label>
                    <input 
                      type="url" 
                      value={editJournalist.primaryOutletUrl}
                      onChange={(e) => setEditJournalist(prev => ({...prev, primaryOutletUrl: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      placeholder="https://"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Outlet URL</label>
                    <input 
                      type="url" 
                      value={editJournalist.secondaryOutletUrl}
                      onChange={(e) => setEditJournalist(prev => ({...prev, secondaryOutletUrl: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      placeholder="https://"
                    />
                  </div>
                </div>

                {/* Dropdowns */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select 
                      value={editJournalist.type}
                      onChange={(e) => setEditJournalist(prev => ({...prev, type: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select Type</option>
                      <option value="TV">TV</option>
                      <option value="Print/Online">Print/Online</option>
                      <option value="Radio">Radio</option>
                      <option value="Trade">Trade</option>
                      <option value="College">College</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Accreditation</label>
                    <select 
                      value={editJournalist.accreditationLevel}
                      onChange={(e) => setEditJournalist(prev => ({...prev, accreditationLevel: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select Level</option>
                      <option value="P">Premium Press</option>
                      <option value="G">General Press</option>
                      <option value="Unaccredited">Unaccredited</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Geography</label>
                    <select 
                      value={editJournalist.geography}
                      onChange={(e) => setEditJournalist(prev => ({...prev, geography: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select Geography</option>
                      <option value="Local">Local</option>
                      <option value="Regional">Regional</option>
                      <option value="National">National</option>
                      <option value="International">International</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beat/Specialty</label>
                    <input 
                      type="text" 
                      value={editJournalist.beatSpecialty}
                      onChange={(e) => setEditJournalist(prev => ({...prev, beatSpecialty: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    />
                  </div>
                </div>

                {/* Social Media */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                    <input 
                      type="text" 
                      value={editJournalist.twitter}
                      onChange={(e) => setEditJournalist(prev => ({...prev, twitter: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                    <input 
                      type="text" 
                      value={editJournalist.instagram}
                      onChange={(e) => setEditJournalist(prev => ({...prev, instagram: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                    <input 
                      type="text" 
                      value={editJournalist.linkedin}
                      onChange={(e) => setEditJournalist(prev => ({...prev, linkedin: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      placeholder="profile-name"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Notes</label>
                  <textarea 
                    value={editJournalist.specialNotes}
                    onChange={(e) => setEditJournalist(prev => ({...prev, specialNotes: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    rows={3}
                  ></textarea>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateJournalist}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Update Journalist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && selectedJournalist && activityType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {activityType === 'pitches' && 'Current Pitches'}
                    {activityType === 'scheduled' && 'Scheduled Interviews'}
                    {activityType === 'screenings' && 'Press Screenings RSVPs'}
                  </h2>
                  <p className="text-gray-600">{selectedJournalist.name} - {selectedJournalist.primaryOutlet}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {activityType === 'pitches' && (
                  <div className="text-gray-600">
                    <p>Mock pitch data would be displayed here</p>
                    <p>• Pitch for Director Interview - Film Title A</p>
                    <p>• Cast Interview Request - Film Title B</p>
                    <p>• Producer Q&A - Film Title C</p>
                  </div>
                )}
                {activityType === 'scheduled' && (
                  <div className="text-gray-600">
                    <p>Mock scheduled interview data would be displayed here</p>
                    <p>• Nov 15, 2:00 PM - Director Interview with John Smith</p>
                    <p>• Nov 16, 4:30 PM - Cast Roundtable</p>
                  </div>
                )}
                {activityType === 'screenings' && (
                  <div className="text-gray-600">
                    <p>Mock press screening RSVPs would be displayed here</p>
                    <p>• Film Title A - Nov 14, 7:00 PM - RSVP Confirmed</p>
                    <p>• Film Title B - Nov 15, 2:00 PM - RSVP Confirmed</p>
                    <p>• Film Title C - Nov 16, 9:00 AM - RSVP Pending</p>
                  </div>
                )}
              </div>
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