import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Edit3, Mail, Phone, Calendar, Clock,
  User, Building, MessageSquare, CheckCircle, AlertCircle, 
  XCircle, PlayCircle, Users, ChevronDown, Star
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';

interface InterviewRequest {
  id: number;
  filmTitle: string;
  talentName: string;
  talentRole: string;
  journalistName: string;
  journalistOutlet: string;
  journalistEmail: string;
  status: 'pitched' | 'pending' | 'approved' | 'declined' | 'scheduled' | 'complete';
  priority: 'A' | 'B' | 'C';
  requestDate: string;
  interviewFormat: 'in-person' | 'zoom' | 'phone';
  scheduledDate?: string;
  scheduledTime?: string;
  duration?: number;
  location?: string;
  prStaffManaging: string;
  notes?: string;
  calendarInviteSent?: boolean;
}

interface User {
  id: number;
  name: string;
  role: string;
  permissions: Record<string, string>;
}

interface InterviewManagementProps {
  user: User;
}

const InterviewManagement: React.FC<InterviewManagementProps> = ({ user }) => {
  const [requests, setRequests] = useState<InterviewRequest[]>([]);
  
  // Helper function to convert 24-hour time to 12-hour AM/PM format
  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('requestDate');
  const [showBulkPitchModal, setShowBulkPitchModal] = useState(false);
  const [showAddInterviewModal, setShowAddInterviewModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [selectedRequestForScheduling, setSelectedRequestForScheduling] = useState<InterviewRequest | null>(null);

  // Mock data
  useEffect(() => {
    const mockRequests: InterviewRequest[] = [
      {
        id: 1,
        filmTitle: "Rita",
        talentName: "Paz Vega",
        talentRole: "Director/Star",
        journalistName: "Sarah Johnson",
        journalistOutlet: "Entertainment Weekly",
        journalistEmail: "sarah@ew.com",
        status: "scheduled",
        priority: "A",
        requestDate: "2024-10-08",
        interviewFormat: "in-person",
        scheduledDate: "2024-10-17",
        scheduledTime: "14:30",
        duration: 30,
        location: "Room 205",
        prStaffManaging: "Morgan Harris",
        calendarInviteSent: true
      },
      {
        id: 2,
        filmTitle: "Color Book",
        talentName: "David Fortune",
        talentRole: "Director",
        journalistName: "Mike Chen",
        journalistOutlet: "The Hollywood Reporter",
        journalistEmail: "mike@thr.com",
        status: "approved",
        priority: "A",
        requestDate: "2024-10-10",
        interviewFormat: "zoom",
        prStaffManaging: "Morgan Harris",
        notes: "Director's first feature film"
      },
      {
        id: 3,
        filmTitle: "Transplant",
        talentName: "Jason Park",
        talentRole: "Director",
        journalistName: "Lisa Park",
        journalistOutlet: "WGN News",
        journalistEmail: "lisa@wgn.com",
        status: "pending",
        priority: "B",
        requestDate: "2024-10-11",
        interviewFormat: "in-person",
        prStaffManaging: "Morgan Harris"
      },
      {
        id: 4,
        filmTitle: "Párvulos",
        talentName: "Isaac Ezban",
        talentRole: "Director",
        journalistName: "David Rodriguez",
        journalistOutlet: "Columbia College Chicago",
        journalistEmail: "drodriguez@colum.edu",
        status: "pitched",
        priority: "C",
        requestDate: "2024-10-12",
        interviewFormat: "zoom",
        prStaffManaging: "Morgan Harris"
      },
      {
        id: 5,
        filmTitle: "All We Imagine As Light",
        talentName: "Payal Kapadia",
        talentRole: "Director",
        journalistName: "Jennifer Walsh",
        journalistOutlet: "Film Independent Blog",
        journalistEmail: "jen@filmindependent.com",
        status: "declined",
        priority: "B",
        requestDate: "2024-10-09",
        interviewFormat: "phone",
        prStaffManaging: "Morgan Harris",
        notes: "Director not available during festival dates"
      }
    ];
    setRequests(mockRequests);
  }, []);

  const getStatusBadge = (status: string) => {
    const badges = {
      'pitched': { color: 'bg-blue-100 text-blue-800', icon: MessageSquare, text: 'Pitched' },
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
      'approved': { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Approved' },
      'declined': { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Declined' },
      'scheduled': { color: 'bg-purple-100 text-purple-800', icon: Calendar, text: 'Scheduled' },
      'complete': { color: 'bg-gray-100 text-gray-800', icon: CheckCircle, text: 'Complete' }
    };
    
    const badge = badges[status as keyof typeof badges] || badges['pitched'];
    const IconComponent = badge.icon;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${badge.color}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {badge.text}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const badges = {
      'A': { color: 'bg-red-100 text-red-800', text: 'Priority A' },
      'B': { color: 'bg-yellow-100 text-yellow-800', text: 'Priority B' },
      'C': { color: 'bg-green-100 text-green-800', text: 'Priority C' }
    };
    
    const badge = badges[priority as keyof typeof badges] || badges['C'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.filmTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.talentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.journalistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.journalistOutlet.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const sortedRequests = filteredRequests.sort((a, b) => {
    switch (sortBy) {
      case 'requestDate':
        return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
      case 'priority':
        const priorityOrder = { 'A': 3, 'B': 2, 'C': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'status':
        const statusOrder = { 'pitched': 1, 'pending': 2, 'approved': 3, 'scheduled': 4, 'complete': 5, 'declined': 6 };
        return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
      case 'film':
        return a.filmTitle.localeCompare(b.filmTitle);
      case 'journalist':
        return a.journalistName.localeCompare(b.journalistName);
      default:
        return 0;
    }
  });

  const updateRequestStatus = (requestId: number, newStatus: string, additionalData?: any) => {
    setRequests(prev => prev.map(request => 
      request.id === requestId 
        ? { ...request, status: newStatus as any, ...additionalData }
        : request
    ));
  };

  const getStatusCounts = () => {
    return {
      pitched: requests.filter(r => r.status === 'pitched').length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      scheduled: requests.filter(r => r.status === 'scheduled').length,
      complete: requests.filter(r => r.status === 'complete').length,
      declined: requests.filter(r => r.status === 'declined').length
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Interview Management</h2>
          <p className="text-gray-600">Coordinate interview requests and scheduling</p>
        </div>
        {user.permissions.interviewManagement === 'full_edit' && (
          <div className="flex space-x-3">
            <button 
              onClick={() => setShowAddInterviewModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Interview
            </button>
            <button 
              onClick={() => setShowBulkPitchModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Bulk Pitch
            </button>
          </div>
        )}
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { key: 'pitched', label: 'Pitched', color: 'bg-blue-50 border-blue-200 text-blue-800' },
          { key: 'pending', label: 'Pending', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
          { key: 'approved', label: 'Approved', color: 'bg-green-50 border-green-200 text-green-800' },
          { key: 'scheduled', label: 'Scheduled', color: 'bg-purple-50 border-purple-200 text-purple-800' },
          { key: 'complete', label: 'Complete', color: 'bg-gray-50 border-gray-200 text-gray-800' },
          { key: 'declined', label: 'Declined', color: 'bg-red-50 border-red-200 text-red-800' }
        ].map(({ key, label, color }) => (
          <div key={key} className={`p-4 rounded-lg border-2 ${color} cursor-pointer hover:opacity-80`} 
               onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}>
            <div className="text-2xl font-bold">{statusCounts[key as keyof typeof statusCounts]}</div>
            <div className="text-sm">{label}</div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search films, talent, journalists, outlets..."
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
              <option value="pitched">Pitched</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="scheduled">Scheduled</option>
              <option value="complete">Complete</option>
              <option value="declined">Declined</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="A">Priority A</option>
              <option value="B">Priority B</option>
              <option value="C">Priority C</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="requestDate">Sort by Date</option>
              <option value="priority">Sort by Priority</option>
              <option value="status">Sort by Status</option>
              <option value="film">Sort by Film</option>
              <option value="journalist">Sort by Journalist</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Film & Talent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Journalist
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{request.filmTitle}</div>
                      <div className="text-sm text-gray-600">{request.talentName} ({request.talentRole})</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{request.journalistName}</div>
                      <div className="text-sm text-gray-600">{request.journalistOutlet}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-4 py-4">
                    {getPriorityBadge(request.priority)}
                  </td>
                  <td className="px-4 py-4">
                    {request.scheduledDate && request.scheduledTime ? (
                      <div className="text-sm">
                        <div className="font-medium">{new Date(request.scheduledDate).toLocaleDateString()}</div>
                        <div className="text-gray-600">{formatTime(request.scheduledTime)} ({request.duration}min)</div>
                        {request.location && <div className="text-gray-600">{request.location}</div>}
                        {request.calendarInviteSent && (
                          <div className="text-green-600 text-xs flex items-center mt-1">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Calendar sent
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Not scheduled</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex space-x-2">
                      {user.permissions.interviewManagement === 'full_edit' && (
                        <>
                          {request.status === 'pitched' && (
                            <>
                              <button
                                onClick={() => updateRequestStatus(request.id, 'pending')}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Mark Interested
                              </button>
                              <button
                                onClick={() => updateRequestStatus(request.id, 'declined')}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Decline
                              </button>
                            </>
                          )}
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateRequestStatus(request.id, 'approved')}
                                className="text-green-600 hover:text-green-800 text-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => updateRequestStatus(request.id, 'declined')}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Decline
                              </button>
                            </>
                          )}
                          {request.status === 'approved' && (
                            <button
                              onClick={() => {
                                setSelectedRequestForScheduling(request);
                                setShowScheduleModal(true);
                              }}
                              className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                            >
                              Schedule
                            </button>
                          )}
                          {request.status === 'scheduled' && (
                            <button
                              onClick={() => updateRequestStatus(request.id, 'complete')}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              Mark Complete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Pitch Modal */}
      {showBulkPitchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Bulk Pitch Creation</h2>
                <button
                  onClick={() => setShowBulkPitchModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Step 1: Select Talent/Filmmaker</h3>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Paz Vega (Rita - Director/Star)</option>
                    <option>David Fortune (Color Book - Director)</option>
                    <option>Jason Park (Transplant - Director)</option>
                    <option>Payal Kapadia (All We Imagine As Light - Director)</option>
                  </select>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Step 2: Select Journalists</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {[
                      { name: 'Sarah Johnson', outlet: 'Entertainment Weekly', accreditation: 'P' },
                      { name: 'Mike Chen', outlet: 'The Hollywood Reporter', accreditation: 'P' },
                      { name: 'Lisa Park', outlet: 'WGN News', accreditation: 'G' },
                      { name: 'David Rodriguez', outlet: 'Columbia College Chicago', accreditation: 'G' },
                      { name: 'Jennifer Walsh', outlet: 'Film Independent Blog', accreditation: 'Unaccredited' }
                    ].map((journalist, index) => (
                      <label key={index} className="flex items-center p-2 hover:bg-gray-50 rounded">
                        <input type="checkbox" className="mr-3" />
                        <div className="flex-1">
                          <div className="font-medium">{journalist.name}</div>
                          <div className="text-sm text-gray-600">{journalist.outlet}</div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          journalist.accreditation === 'P' ? 'bg-purple-100 text-purple-800' :
                          journalist.accreditation === 'G' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {journalist.accreditation}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Step 3: Set Priority & Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Interview Format</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>In-Person</option>
                        <option>Zoom</option>
                        <option>Phone</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Managing PR Staff</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>Morgan Harris</option>
                        <option>Sarah Chen</option>
                        <option>Mike Johnson</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 flex justify-end space-x-4">
                  <button
                    onClick={() => setShowBulkPitchModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Here you would create the bulk pitch requests
                      setShowBulkPitchModal(false);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Create Pitches
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Interview Modal */}
      {showAddInterviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Add Interview</h2>
                <button
                  onClick={() => setShowAddInterviewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Film Title</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Talent Name</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Talent Role</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Director, Actor, etc." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="A">Priority A</option>
                      <option value="B">Priority B</option>
                      <option value="C">Priority C</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Journalist Name</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Outlet</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Journalist Email</label>
                    <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interview Format</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="in-person">In-Person</option>
                      <option value="zoom">Zoom</option>
                      <option value="phone">Phone</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="approved">Approved (Ready to Schedule)</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="complete">Complete</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Managing PR Staff</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option>Morgan Harris</option>
                      <option>Sarah Chen</option>
                      <option>Mike Johnson</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2" rows={3}></textarea>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowAddInterviewModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Here you would add the interview
                    setShowAddInterviewModal(false);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Add Interview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showScheduleModal && selectedRequestForScheduling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Schedule Interview</h2>
                <button
                  onClick={() => {
                    setShowScheduleModal(false);
                    setSelectedRequestForScheduling(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-medium text-gray-900">{selectedRequestForScheduling.filmTitle}</div>
                  <div className="text-sm text-gray-600">
                    {selectedRequestForScheduling.talentName} & {selectedRequestForScheduling.journalistName} ({selectedRequestForScheduling.journalistOutlet})
                  </div>
                </div>
              </div>

              <div className="space-y-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                    <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" defaultValue="30" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2" defaultValue={selectedRequestForScheduling.interviewFormat}>
                      <option value="in-person">In-Person</option>
                      <option value="zoom">Zoom</option>
                      <option value="phone">Phone</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Room number, Zoom link, or phone details" />
                </div>

                <div className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <label className="text-sm text-gray-700">Send calendar invites to participants</label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => {
                    setShowScheduleModal(false);
                    setSelectedRequestForScheduling(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Here you would save the schedule
                    setShowScheduleModal(false);
                    setSelectedRequestForScheduling(null);
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Schedule Interview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600 text-center">
        Showing {sortedRequests.length} of {requests.length} interview requests
      </div>
    </div>
  );
};

export default InterviewManagement;