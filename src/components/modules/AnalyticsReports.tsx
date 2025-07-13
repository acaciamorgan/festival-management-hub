import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, Film, Calendar, Download,
  Eye, Star, Clock, MapPin, Target, Activity, PieChart,
  FileText, Filter, ChevronDown
} from 'lucide-react';

interface AnalyticsData {
  totalScreenings: number;
  totalAttendees: number;
  averageCapacity: number;
  topPerformingFilms: Array<{
    title: string;
    attendance: number;
    capacity: number;
    utilization: number;
  }>;
  venueUtilization: Array<{
    venue: string;
    events: number;
    totalCapacity: number;
    totalAttendance: number;
    utilization: number;
  }>;
  attendeesByDay: Array<{
    date: string;
    attendees: number;
    events: number;
  }>;
  programStats: Array<{
    program: string;
    films: number;
    screenings: number;
    avgAttendance: number;
  }>;
  mediaStats: {
    pressScreenings: number;
    interviews: number;
    photoShoots: number;
    mediaAttendees: number;
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
  const [selectedDateRange, setSelectedDateRange] = useState('festival');
  const [selectedMetric, setSelectedMetric] = useState('attendance');
  const [showReportModal, setShowReportModal] = useState(false);

  // Mock data
  useEffect(() => {
    const mockData: AnalyticsData = {
      totalScreenings: 47,
      totalAttendees: 8920,
      averageCapacity: 78.5,
      topPerformingFilms: [
        { title: 'All We Imagine As Light', attendance: 245, capacity: 250, utilization: 98 },
        { title: 'Rita', attendance: 180, capacity: 184, utilization: 97.8 },
        { title: 'Blitz', attendance: 235, capacity: 250, utilization: 94 },
        { title: 'Opening Night Gala', attendance: 650, capacity: 750, utilization: 86.7 },
        { title: 'Color Book', attendance: 155, capacity: 184, utilization: 84.2 }
      ],
      venueUtilization: [
        { venue: 'AMC River East 21', events: 15, totalCapacity: 3750, totalAttendance: 3240, utilization: 86.4 },
        { venue: 'Gene Siskel Film Center', events: 12, totalCapacity: 2208, totalAttendance: 1950, utilization: 88.3 },
        { venue: 'Music Box Theatre', events: 8, totalCapacity: 6000, totalAttendance: 4800, utilization: 80 },
        { venue: 'Columbia College Chicago', events: 6, totalCapacity: 480, totalAttendance: 420, utilization: 87.5 }
      ],
      attendeesByDay: [
        { date: '2024-10-16', attendees: 1850, events: 5 },
        { date: '2024-10-17', attendees: 2100, events: 8 },
        { date: '2024-10-18', attendees: 1950, events: 9 },
        { date: '2024-10-19', attendees: 1820, events: 7 },
        { date: '2024-10-20', attendees: 1200, events: 4 }
      ],
      programStats: [
        { program: 'International Feature Competition', films: 12, screenings: 18, avgAttendance: 210 },
        { program: 'Special Presentation', films: 8, screenings: 10, avgAttendance: 195 },
        { program: 'Black Perspectives', films: 6, screenings: 8, avgAttendance: 175 },
        { program: 'Retrospective', films: 4, screenings: 6, avgAttendance: 160 },
        { program: 'Documentary Competition', films: 5, screenings: 5, avgAttendance: 140 }
      ],
      mediaStats: {
        pressScreenings: 15,
        interviews: 28,
        photoShoots: 12,
        mediaAttendees: 145
      }
    };
    setAnalyticsData(mockData);
  }, []);

  const generateReport = () => {
    // In a real app, this would generate and download a PDF report
    alert('Report generated! (This would download a PDF in a real application)');
  };

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
          <p className="text-gray-600">Festival performance metrics and insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="festival">Entire Festival</option>
            <option value="week1">Week 1</option>
            <option value="week2">Week 2</option>
            <option value="today">Today</option>
          </select>
          <button 
            onClick={() => setShowReportModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Film className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Screenings</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalScreenings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Attendees</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalAttendees.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Target className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Capacity</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.averageCapacity}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Media Events</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.mediaStats.pressScreenings + analyticsData.mediaStats.interviews + analyticsData.mediaStats.photoShoots}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Attendance Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Attendance</h3>
          <div className="space-y-3">
            {analyticsData.attendeesByDay.map((day, index) => (
              <div key={day.date} className="flex items-center">
                <div className="w-20 text-sm text-gray-600">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full" 
                      style={{ width: `${(day.attendees / Math.max(...analyticsData.attendeesByDay.map(d => d.attendees))) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900 w-16 text-right">
                  {day.attendees}
                </div>
                <div className="text-xs text-gray-500 w-16 text-right">
                  ({day.events} events)
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Films */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Films</h3>
          <div className="space-y-3">
            {analyticsData.topPerformingFilms.map((film, index) => (
              <div key={film.title} className="flex items-center">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs font-bold text-yellow-700">
                  {index + 1}
                </div>
                <div className="flex-1 ml-3">
                  <div className="text-sm font-medium text-gray-900 truncate">{film.title}</div>
                  <div className="text-xs text-gray-500">{film.attendance}/{film.capacity} seats</div>
                </div>
                <div className="text-sm font-bold text-green-600">
                  {film.utilization}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Venue and Program Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Venue Utilization */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Venue Utilization</h3>
          <div className="space-y-4">
            {analyticsData.venueUtilization.map((venue) => (
              <div key={venue.venue} className="border-b border-gray-200 pb-3 last:border-b-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{venue.venue}</div>
                    <div className="text-sm text-gray-600">{venue.events} events</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-gray-900">{venue.utilization}%</div>
                    <div className="text-xs text-gray-500">{venue.totalAttendance.toLocaleString()} attendees</div>
                  </div>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${venue.utilization}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Program Statistics */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Program Performance</h3>
          <div className="space-y-4">
            {analyticsData.programStats.map((program) => (
              <div key={program.program} className="border-b border-gray-200 pb-3 last:border-b-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{program.program}</div>
                    <div className="text-sm text-gray-600">{program.films} films, {program.screenings} screenings</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-gray-900">{program.avgAttendance}</div>
                    <div className="text-xs text-gray-500">avg attendance</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Media Activity Summary */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Media Activity Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{analyticsData.mediaStats.pressScreenings}</div>
            <div className="text-sm text-gray-600">Press Screenings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{analyticsData.mediaStats.interviews}</div>
            <div className="text-sm text-gray-600">Interviews</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{analyticsData.mediaStats.photoShoots}</div>
            <div className="text-sm text-gray-600">Photo Shoots</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{analyticsData.mediaStats.mediaAttendees}</div>
            <div className="text-sm text-gray-600">Media Attendees</div>
          </div>
        </div>
      </div>

      {/* Export Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Export Report</h2>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Complete Festival Report</option>
                    <option>Attendance Summary</option>
                    <option>Venue Utilization Report</option>
                    <option>Media Activity Report</option>
                    <option>Financial Summary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Entire Festival</option>
                    <option>Week 1 Only</option>
                    <option>Week 2 Only</option>
                    <option>Custom Range</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>PDF Report</option>
                    <option>Excel Spreadsheet</option>
                    <option>CSV Data</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <label className="text-sm text-gray-700">Include charts and graphs</label>
                </div>

                <div className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <label className="text-sm text-gray-700">Include raw data</label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    generateReport();
                    setShowReportModal(false);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Generate Report
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