import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Edit3, Mail, Phone, Calendar, Clock,
  FileText, Link, Send, CheckCircle, AlertCircle, XCircle,
  Download, Upload, Eye, Globe, MessageSquare, Users
} from 'lucide-react';

interface DistributorContact {
  name: string;
  email: string;
  company: string;
}

interface ScreenerAccessFilm {
  id: number;
  filmTitle: string;
  distributor: DistributorContact;
  accessType: 'cinesend' | 'direct_link' | 'distributor_request' | 'screenings_only';
  
  // Distributor coordination
  requestSentDate?: string;
  distributorResponse?: 'awaiting' | 'cinesend_yes' | 'direct_link' | 'distributor_handles' | 'no_digital';
  
  // Cinesend workflow (if Option A)
  instructionsSent?: boolean;
  instructionsSentDate?: string;
  filmUploaded?: boolean;
  uploadedDate?: string;
  
  // Direct link workflow (if Option B)
  directLink?: string;
  directLinkPassword?: string;
  
  // Press requests
  pressRequests: Array<{
    id: number;
    journalistName: string;
    journalistOutlet: string;
    journalistEmail: string;
    requestDate: string;
    status: 'pending' | 'approved' | 'denied' | 'sent_to_distributor' | 'link_sent';
    approvedDate?: string;
    notes?: string;
  }>;
}

interface User {
  id: number;
  name: string;
  role: string;
  permissions: Record<string, string>;
}

interface ScreenerAccessProps {
  user: User;
}

const ScreenerAccess: React.FC<ScreenerAccessProps> = ({ user }) => {
  const [films, setFilms] = useState<ScreenerAccessFilm[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [accessTypeFilter, setAccessTypeFilter] = useState('all');
  const [selectedFilm, setSelectedFilm] = useState<ScreenerAccessFilm | null>(null);
  const [showFilmModal, setShowFilmModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'requests'>('setup');

  // Mock data
  useEffect(() => {
    const mockFilms: ScreenerAccessFilm[] = [
      {
        id: 1,
        filmTitle: "All We Imagine As Light",
        distributor: {
          name: "Sarah Wilson",
          email: "sarah@petitchaos.com",
          company: "Petit Chaos"
        },
        accessType: 'cinesend',
        requestSentDate: "2024-09-15",
        distributorResponse: 'cinesend_yes',
        instructionsSent: true,
        instructionsSentDate: "2024-09-20",
        filmUploaded: true,
        uploadedDate: "2024-09-25",
        pressRequests: [
          {
            id: 1,
            journalistName: "Sarah Johnson",
            journalistOutlet: "Entertainment Weekly", 
            journalistEmail: "sarah@ew.com",
            requestDate: "2024-10-01",
            status: "approved",
            approvedDate: "2024-10-01"
          },
          {
            id: 2,
            journalistName: "Mike Chen",
            journalistOutlet: "The Hollywood Reporter",
            journalistEmail: "mike@thr.com", 
            requestDate: "2024-10-03",
            status: "pending"
          }
        ]
      },
      {
        id: 2,
        filmTitle: "Blitz",
        distributor: {
          name: "John Davis",
          email: "john@newregency.com",
          company: "New Regency"
        },
        accessType: 'direct_link',
        requestSentDate: "2024-09-10",
        distributorResponse: 'direct_link',
        directLink: "https://secure.newregency.com/blitz-screener",
        directLinkPassword: "BlitzCIFF2024!",
        pressRequests: [
          {
            id: 3,
            journalistName: "Lisa Park",
            journalistOutlet: "WGN News",
            journalistEmail: "lisa@wgn.com",
            requestDate: "2024-09-28",
            status: "link_sent",
            approvedDate: "2024-09-28",
            notes: "Sent secure link and password"
          }
        ]
      },
      {
        id: 3,
        filmTitle: "Rita", 
        distributor: {
          name: "Carlos Martinez",
          email: "carlos@odafilms.com",
          company: "Oda Films"
        },
        accessType: 'distributor_request',
        requestSentDate: "2024-09-12",
        distributorResponse: 'distributor_handles',
        pressRequests: [
          {
            id: 4,
            journalistName: "David Rodriguez",
            journalistOutlet: "Columbia College Chicago",
            journalistEmail: "drodriguez@colum.edu",
            requestDate: "2024-10-02",
            status: "sent_to_distributor",
            approvedDate: "2024-10-02"
          },
          {
            id: 5,
            journalistName: "Jennifer Walsh", 
            journalistOutlet: "Film Independent Blog",
            journalistEmail: "jen@filmindependent.com",
            requestDate: "2024-10-05",
            status: "pending"
          }
        ]
      },
      {
        id: 4,
        filmTitle: "Color Book",
        distributor: {
          name: "Emma Thompson",
          email: "emma@distributor.com", 
          company: "Independent Films LLC"
        },
        accessType: 'screenings_only',
        requestSentDate: "2024-09-08",
        distributorResponse: 'no_digital',
        pressRequests: []
      },
      {
        id: 5,
        filmTitle: "Transplant",
        distributor: {
          name: "Alex Kim",
          email: "alex@filmstudio.com",
          company: "Studio Films"
        },
        accessType: 'cinesend',
        requestSentDate: "2024-09-20",
        distributorResponse: 'awaiting',
        pressRequests: []
      }
    ];
    setFilms(mockFilms);
  }, []);

  const getAccessTypeBadge = (type: string) => {
    const badges = {
      'cinesend': { color: 'bg-green-100 text-green-800', text: 'Cinesend' },
      'direct_link': { color: 'bg-blue-100 text-blue-800', text: 'Direct Link' },
      'distributor_request': { color: 'bg-purple-100 text-purple-800', text: 'Distributor Request' },
      'screenings_only': { color: 'bg-gray-100 text-gray-800', text: 'Screenings Only' }
    };
    
    const badge = badges[type as keyof typeof badges] || badges['screenings_only'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getDistributorResponseBadge = (response?: string) => {
    if (!response) return null;
    
    const badges = {
      'awaiting': { color: 'bg-yellow-100 text-yellow-800', text: 'Awaiting Response' },
      'cinesend_yes': { color: 'bg-green-100 text-green-800', text: 'Approved Cinesend' },
      'direct_link': { color: 'bg-blue-100 text-blue-800', text: 'Provided Link' },
      'distributor_handles': { color: 'bg-purple-100 text-purple-800', text: 'Distributor Handles' },
      'no_digital': { color: 'bg-gray-100 text-gray-800', text: 'No Digital Access' }
    };
    
    const badge = badges[response as keyof typeof badges] || badges['awaiting'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getCinesendStatus = (film: ScreenerAccessFilm) => {
    if (film.accessType !== 'cinesend' || film.distributorResponse !== 'cinesend_yes') {
      return null;
    }
    
    if (film.filmUploaded) {
      return { color: 'text-green-600', text: 'Uploaded & Available', icon: CheckCircle };
    } else if (film.instructionsSent) {
      return { color: 'text-yellow-600', text: 'Instructions Sent', icon: Clock };
    } else {
      return { color: 'text-red-600', text: 'Need to Send Instructions', icon: AlertCircle };
    }
  };

  const getRequestStatusBadge = (status: string) => {
    const badges = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      'approved': { color: 'bg-green-100 text-green-800', text: 'Approved' },
      'denied': { color: 'bg-red-100 text-red-800', text: 'Denied' },
      'sent_to_distributor': { color: 'bg-purple-100 text-purple-800', text: 'Sent to Distributor' },
      'link_sent': { color: 'bg-blue-100 text-blue-800', text: 'Link Sent' }
    };
    
    const badge = badges[status as keyof typeof badges] || badges['pending'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const filteredFilms = films.filter(film => {
    const matchesSearch = 
      film.filmTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      film.distributor.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      film.distributor.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAccessType = accessTypeFilter === 'all' || film.accessType === accessTypeFilter;
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'awaiting_response':
          matchesStatus = film.distributorResponse === 'awaiting';
          break;
        case 'ready':
          matchesStatus = film.distributorResponse === 'cinesend_yes' && film.filmUploaded ||
                         film.distributorResponse === 'direct_link' ||
                         film.distributorResponse === 'distributor_handles';
          break;
        case 'pending_upload':
          matchesStatus = film.distributorResponse === 'cinesend_yes' && !film.filmUploaded;
          break;
        case 'no_access':
          matchesStatus = film.distributorResponse === 'no_digital';
          break;
      }
    }
    
    return matchesSearch && matchesAccessType && matchesStatus;
  });

  const getStatusCounts = () => {
    return {
      total: films.length,
      awaiting_response: films.filter(f => f.distributorResponse === 'awaiting').length,
      ready: films.filter(f => 
        (f.distributorResponse === 'cinesend_yes' && f.filmUploaded) ||
        f.distributorResponse === 'direct_link' ||
        f.distributorResponse === 'distributor_handles'
      ).length,
      pending_upload: films.filter(f => f.distributorResponse === 'cinesend_yes' && !f.filmUploaded).length,
      no_access: films.filter(f => f.distributorResponse === 'no_digital').length
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Screener Access</h2>
          <p className="text-gray-600">Manage digital screener access and requests</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Tab Navigation */}
          <div className="flex rounded-lg border border-gray-300 p-1">
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === 'setup' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Distributor Setup
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === 'requests' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Press Requests
            </button>
          </div>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-500">
          <div className="text-2xl font-bold text-gray-900">{statusCounts.total}</div>
          <div className="text-sm text-gray-600">Total Films</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-400">
          <div className="text-2xl font-bold text-yellow-600">{statusCounts.awaiting_response}</div>
          <div className="text-sm text-gray-600">Awaiting Response</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-400">
          <div className="text-2xl font-bold text-green-600">{statusCounts.ready}</div>
          <div className="text-sm text-gray-600">Ready for Press</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400">
          <div className="text-2xl font-bold text-blue-600">{statusCounts.pending_upload}</div>
          <div className="text-sm text-gray-600">Pending Upload</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-400">
          <div className="text-2xl font-bold text-red-600">{statusCounts.no_access}</div>
          <div className="text-sm text-gray-600">No Digital Access</div>
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
                placeholder="Search films, distributors..."
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
              <option value="awaiting_response">Awaiting Response</option>
              <option value="ready">Ready for Press</option>
              <option value="pending_upload">Pending Upload</option>
              <option value="no_access">No Digital Access</option>
            </select>

            <select
              value={accessTypeFilter}
              onChange={(e) => setAccessTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Access Types</option>
              <option value="cinesend">Cinesend</option>
              <option value="direct_link">Direct Link</option>
              <option value="distributor_request">Distributor Request</option>
              <option value="screenings_only">Screenings Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Films Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Film
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distributor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Access Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Press Requests
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFilms.map((film) => {
                const cinesendStatus = getCinesendStatus(film);
                
                return (
                  <tr key={film.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <button 
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                        onClick={() => {
                          // This would navigate to film card - placeholder for now
                          console.log('Navigate to film card:', film.filmTitle);
                        }}
                      >
                        {film.filmTitle}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{film.distributor.name}</div>
                        <div className="text-sm text-gray-600">{film.distributor.company}</div>
                        <div className="text-xs text-gray-500">{film.distributor.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getAccessTypeBadge(film.accessType)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {getDistributorResponseBadge(film.distributorResponse)}
                        {cinesendStatus && (
                          <div className={`text-xs flex items-center ${cinesendStatus.color}`}>
                            <cinesendStatus.icon className="w-3 h-3 mr-1" />
                            {cinesendStatus.text}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <div className="font-medium">{film.pressRequests.length} requests</div>
                        {film.pressRequests.length > 0 && (
                          <div className="text-gray-600">
                            {film.pressRequests.slice(0, 2).map((request, index) => (
                              <div key={index} className="text-xs">
                                {request.journalistName} ({request.status})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => {
                          setSelectedFilm(film);
                          setShowFilmModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Film Details Modal */}
      {showFilmModal && selectedFilm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedFilm.filmTitle}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    {getAccessTypeBadge(selectedFilm.accessType)}
                    {getDistributorResponseBadge(selectedFilm.distributorResponse)}
                  </div>
                </div>
                <button
                  onClick={() => setShowFilmModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Distributor Information</h3>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                      <div className="font-medium">{selectedFilm.distributor.name}</div>
                      <div>{selectedFilm.distributor.company}</div>
                      <div className="flex items-center">
                        <Mail className="w-3 h-3 mr-1 text-gray-400" />
                        <a href={`mailto:${selectedFilm.distributor.email}`} className="text-blue-600 hover:underline">
                          {selectedFilm.distributor.email}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Coordination Timeline</h3>
                    <div className="space-y-2 text-sm">
                      {selectedFilm.requestSentDate && (
                        <div className="flex items-center">
                          <Send className="w-4 h-4 mr-2 text-gray-400" />
                          <span>Request sent: {new Date(selectedFilm.requestSentDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      {selectedFilm.instructionsSent && selectedFilm.instructionsSentDate && (
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-blue-500" />
                          <span>Instructions sent: {new Date(selectedFilm.instructionsSentDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      {selectedFilm.filmUploaded && selectedFilm.uploadedDate && (
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                          <span>Film uploaded: {new Date(selectedFilm.uploadedDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedFilm.accessType === 'direct_link' && selectedFilm.directLink && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Direct Link Access</h3>
                      <div className="bg-blue-50 p-3 rounded-lg space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Link:</span>
                          <div className="flex items-center mt-1">
                            <Link className="w-4 h-4 mr-2 text-blue-500" />
                            <a href={selectedFilm.directLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                              {selectedFilm.directLink}
                            </a>
                          </div>
                        </div>
                        {selectedFilm.directLinkPassword && (
                          <div>
                            <span className="font-medium">Password:</span>
                            <div className="font-mono bg-white p-2 rounded mt-1 border">
                              {selectedFilm.directLinkPassword}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Press Requests ({selectedFilm.pressRequests.length})</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedFilm.pressRequests.length > 0 ? (
                        selectedFilm.pressRequests.map((request) => (
                          <div key={request.id} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-start mb-1">
                              <div className="font-medium text-gray-900">{request.journalistName}</div>
                              {getRequestStatusBadge(request.status)}
                            </div>
                            <div className="text-sm text-gray-600">{request.journalistOutlet}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Requested: {new Date(request.requestDate).toLocaleDateString()}
                              {request.approvedDate && (
                                <span> • Processed: {new Date(request.approvedDate).toLocaleDateString()}</span>
                              )}
                            </div>
                            {request.notes && (
                              <div className="text-xs text-gray-600 mt-1 italic">{request.notes}</div>
                            )}
                            
                            {user.permissions.screenerAccess === 'full_edit' && request.status === 'pending' && (
                              <div className="flex gap-2 mt-2">
                                <button className="text-green-600 hover:text-green-800 text-xs">
                                  Approve
                                </button>
                                <button className="text-red-600 hover:text-red-800 text-xs">
                                  Deny
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          No press requests yet
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedFilm.distributorResponse === 'distributor_handles' && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <MessageSquare className="w-4 h-4 mr-2 text-purple-600" />
                        <span className="font-medium text-purple-800">Distributor Handles Requests</span>
                      </div>
                      <p className="text-sm text-purple-700">
                        This distributor manages press requests directly. Approved requests are forwarded 
                        to the distributor and marked as "Sent to Distributor".
                      </p>
                    </div>
                  )}

                  {selectedFilm.accessType === 'screenings_only' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Eye className="w-4 h-4 mr-2 text-gray-600" />
                        <span className="font-medium text-gray-800">Screenings Only</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        No digital screener access available. Press must attend scheduled screenings to view this film.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {user.permissions.screenerAccess === 'full_edit' && (
                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end space-x-2">
                  {selectedFilm.distributorResponse === 'cinesend_yes' && !selectedFilm.instructionsSent && (
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                      Send Upload Instructions
                    </button>
                  )}
                  {selectedFilm.distributorResponse === 'cinesend_yes' && selectedFilm.instructionsSent && !selectedFilm.filmUploaded && (
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                      Mark as Uploaded
                    </button>
                  )}
                  <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                    Edit Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600 text-center">
        Showing {filteredFilms.length} of {films.length} films
      </div>
    </div>
  );
};

export default ScreenerAccess;