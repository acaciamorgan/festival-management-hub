import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, MessageSquare, FileText, User, Settings, 
  Film, Briefcase, Building, Camera, Megaphone, Shield, Search, 
  Bell, Menu, LogOut, Home, Filter, BarChart3
} from 'lucide-react';

// Import context provider
import { DataProvider } from '../contexts/DataContext';

// Import module components
import TitleManagement from './modules/TitleManagement';
import PressManagement from './modules/PressManagement';
import InterviewManagement from './modules/InterviewManagement';
import PressScreeningManagement from './modules/PressScreeningManagement';
import ScreenerAccess from './modules/ScreenerAccess';
import TravelModule from './modules/TravelModule';
import VenueManagement from './modules/VenueManagement';
import RedCarpetEvents from './modules/RedCarpetEvents';
import PhotoCoordination from './modules/PhotoCoordination';
import AnalyticsReports from './modules/AnalyticsReports';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'pr_team' | 'festival_staff' | 'press';
  title: string;
  permissions: Record<string, string>;
}

const FestivalManagementApp: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User>({
    id: 1,
    name: 'Morgan Harris',
    email: 'morgan@acaciapr.com',
    role: 'pr_team',
    title: 'PR Director',
    permissions: {
      titleManagement: 'read',
      pressManagement: 'full_edit',
      interviewManagement: 'full_edit',
      pressScreeningManagement: 'full_edit',
      screenerAccess: 'full_edit',
      travelModule: 'full_edit',
      venueManagement: 'full_edit',
      redCarpetEvents: 'full_edit',
      photoCoordination: 'full_edit',
      analyticsReports: 'full_edit'
    }
  });

  const [activeModule, setActiveModule] = useState('titleManagement');
  // Force sidebar to always be expanded
  const sidebarCollapsed = false;
  
  console.log('Sidebar state - activeModule:', activeModule, 'sidebarCollapsed:', sidebarCollapsed);

  const modules = [
    {
      id: 'titleManagement',
      name: 'Title Management',
      icon: Film,
      description: 'Manage festival films and programs'
    },
    {
      id: 'pressManagement',
      name: 'Press Management',
      icon: Users,
      description: 'Manage journalists and media contacts'
    },
    {
      id: 'interviewManagement',
      name: 'Interview Management',
      icon: MessageSquare,
      description: 'Coordinate interview requests and scheduling'
    },
    {
      id: 'pressScreeningManagement',
      name: 'Press Screenings',
      icon: Calendar,
      description: 'Manage press screening events and RSVPs'
    },
    {
      id: 'screenerAccess',
      name: 'Screener Access',
      icon: FileText,
      description: 'Manage digital screener access and requests'
    },
    {
      id: 'travelModule',
      name: 'Travel',
      icon: Briefcase,
      description: 'Coordinate filmmaker and guest travel'
    },
    {
      id: 'venueManagement',
      name: 'Venue Management',
      icon: Building,
      description: 'Manage festival venues and spaces'
    },
    {
      id: 'redCarpetEvents',
      name: 'Red Carpet Events',
      icon: Camera,
      description: 'Manage red carpet events and logistics'
    },
    {
      id: 'photoCoordination',
      name: 'Photo Coordination',
      icon: Megaphone,
      description: 'Coordinate internal photography assignments'
    },
    {
      id: 'analyticsReports',
      name: 'Analytics & Reports',
      icon: BarChart3,
      description: 'Generate reports and analytics (PR Team & Staff only)',
      permissions: ['pr_team', 'festival_staff']
    }
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'titleManagement':
        return <TitleManagement user={currentUser} />;
      case 'pressManagement':
        return <PressManagement user={currentUser} />;
      case 'interviewManagement':
        return <InterviewManagement user={currentUser} />;
      case 'pressScreeningManagement':
        return <PressScreeningManagement user={currentUser} />;
      case 'screenerAccess':
        return <ScreenerAccess user={currentUser} />;
      case 'travelModule':
        return <TravelModule user={currentUser} />;
      case 'venueManagement':
        return <VenueManagement user={currentUser} />;
      case 'redCarpetEvents':
        return <RedCarpetEvents user={currentUser} />;
      case 'photoCoordination':
        return <PhotoCoordination user={currentUser} />;
      case 'analyticsReports':
        return <AnalyticsReports user={currentUser} />;
      default:
        return <TitleManagement user={currentUser} />;
    }
  };

  const currentModuleName = modules.find(m => m.id === activeModule)?.name || 'Dashboard';

  return (
    <DataProvider>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <div 
          className={`bg-white shadow-lg transition-all duration-300 flex flex-col h-screen ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
          style={{ width: '256px', minWidth: '256px', maxWidth: '256px' }}
        >
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className={`font-bold text-xl text-gray-800 ${sidebarCollapsed ? 'hidden' : ''}`}>
                CIFF Management
              </div>
              <button
                disabled
                className="p-1 rounded-lg opacity-50 cursor-not-allowed"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="p-4 flex-1 overflow-y-auto">
            {modules.map((module) => {
              const IconComponent = module.icon;
              const hasAccess = currentUser.permissions[module.id] !== undefined;
              
              // Check role-based permissions for Analytics
              if (module.permissions && !module.permissions.includes(currentUser.role)) {
                return null;
              }
              
              if (!hasAccess) return null;

              return (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={`w-full flex items-center p-3 rounded-lg mb-2 transition-colors ${
                    activeModule === module.id
                      ? 'bg-blue-100 text-blue-800'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <IconComponent className="w-5 h-5 mr-3" />
                  {!sidebarCollapsed && (
                    <div className="text-left">
                      <div className="font-medium">{module.name}</div>
                      <div className="text-xs text-gray-500">{module.description}</div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 p-4 flex-shrink-0">
            <div className={`${sidebarCollapsed ? 'hidden' : ''}`}>
              <div className="flex items-center mb-2">
                <User className="w-8 h-8 p-1 bg-gray-200 rounded-full mr-3" />
                <div>
                  <div className="font-medium text-sm">{currentUser.name}</div>
                  <div className="text-xs text-gray-500">{currentUser.title}</div>
                </div>
              </div>
              <button className="w-full flex items-center p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentModuleName}</h1>
              <p className="text-gray-600 text-sm">Chicago International Film Festival Management</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Module Content */}
        <main className="flex-1 p-6 overflow-auto">
          {renderModule()}
        </main>
      </div>
    </div>
    </DataProvider>
  );
};

export default FestivalManagementApp;