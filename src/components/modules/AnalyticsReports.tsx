import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, Film, Calendar, Download,
  Eye, Star, Clock, MapPin, Target, Activity, PieChart,
  FileText, Filter, ChevronDown, Plane, CreditCard
} from 'lucide-react';

interface AnalyticsData {
  pressScreeningAttendance: Array<{
    screening: string;
    date: string;
    totalRSVPs: number;
    actualAttendance: number;
    attendanceRate: number;
  }>;
  screenerRequests: Array<{
    film: string;
    totalRequests: number;
    approved: number;
    pending: number;
    declined: number;
  }>;
  credentialsPickup: Array<{
    journalist: string;
    outlet: string;
    pickupDate?: string;
    status: 'picked_up' | 'pending' | 'no_show';
  }>;
  guestTravelByDay: Array<{
    date: string;
    arrivingGuests: number;
    departingGuests: number;
    totalInTown: number;
  }>;
  summaryStats: {
    totalPressScreenings: number;
    totalScreenerRequests: number;
    credentialsIssued: number;
    guestsInTown: number;
  };
}

interface User {
  id: number;
  name: string;
  role: string;
  permissions: Record<string, string>;
}

interface AnalyticsReportsProps {
  user: User;
}

const AnalyticsReports: React.FC<AnalyticsReportsProps> = ({ user }) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState('week');
  const [reportType, setReportType] = useState('overview');
  const [showReportModal, setShowReportModal] = useState(false);

  // WAITING FOR HUMAN TO PROVIDE APPROVED MOCK DATA
  // CLAUDE IS FORBIDDEN FROM CREATING MOCK DATA
  useEffect(() => {
    const emptyData: AnalyticsData = {
      pressScreeningAttendance: [],
      screenerRequests: [],
      credentialsPickup: [],
      guestTravelByDay: [],
      summaryStats: {
        totalPressScreenings: 0,
        totalScreenerRequests: 0,
        credentialsIssued: 0,
        guestsInTown: 0
      }
    };
    setAnalyticsData(emptyData);
  }, []);

  if (!analyticsData) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
          <p className="text-gray-600">PR operations analytics and reporting</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="festival">Festival Period</option>
            <option value="custom">Custom Range</option>
          </select>
          <button 
            type="button"
            onClick={() => setShowReportModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Film className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Press Screenings</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.summaryStats.totalPressScreenings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Screener Requests</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.summaryStats.totalScreenerRequests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Credentials Issued</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.summaryStats.credentialsIssued}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <Plane className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Guests In Town</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.summaryStats.guestsInTown}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Press Screening Attendance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Press Screening Attendance</h3>
          <div className="space-y-3">
            {analyticsData.pressScreeningAttendance.map((screening, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{screening.screening}</div>
                  <div className="text-sm text-gray-600">{new Date(screening.date).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{screening.actualAttendance}/{screening.totalRSVPs}</div>
                  <div className="text-sm text-green-600">{screening.attendanceRate}% attended</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Screener Requests */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Screener Requests by Film</h3>
          <div className="space-y-3">
            {analyticsData.screenerRequests.map((film, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900 mb-2">{film.film}</div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Approved: {film.approved}</span>
                  <span className="text-yellow-600">Pending: {film.pending}</span>
                  <span className="text-red-600">Declined: {film.declined}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Total: {film.totalRequests} requests</div>
              </div>
            ))}
          </div>
        </div>

        {/* Credentials Pickup */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Credentials Pickup Status</h3>
          <div className="space-y-3">
            {analyticsData.credentialsPickup.map((credential, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{credential.journalist}</div>
                  <div className="text-sm text-gray-600">{credential.outlet}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    credential.status === 'picked_up' ? 'text-green-600' :
                    credential.status === 'pending' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {credential.status === 'picked_up' ? 'Picked Up' :
                     credential.status === 'pending' ? 'Pending' :
                     'No Show'}
                  </div>
                  {credential.pickupDate && (
                    <div className="text-xs text-gray-500">
                      {new Date(credential.pickupDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guest Travel by Day */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Guest Travel by Day</h3>
          <div className="space-y-3">
            {analyticsData.guestTravelByDay.map((day, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900">
                  {new Date(day.date).toLocaleDateString()}
                </div>
                <div className="flex space-x-4 text-sm">
                  <span className="text-green-600">↓ {day.arrivingGuests} arriving</span>
                  <span className="text-blue-600">↑ {day.departingGuests} departing</span>
                  <span className="text-purple-600">{day.totalInTown} in town</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Export Report</h2>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                  <select 
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="overview">Complete Overview</option>
                    <option value="press_screenings">Press Screening Attendance</option>
                    <option value="screener_requests">Screener Requests</option>
                    <option value="credentials">Credentials Pickup</option>
                    <option value="travel">Guest Travel Data</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="csv">CSV</option>
                    <option value="xlsx">Excel (XLSX)</option>
                    <option value="pdf">PDF Report</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="festival">Festival Period</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Here you would generate and download the report
                    setShowReportModal(false);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Download Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsReports;