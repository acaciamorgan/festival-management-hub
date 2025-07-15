import React, { useState } from 'react';
import { X, Mail, Phone, Calendar, MapPin, Plane, ChevronDown, ChevronUp, User, Camera, Mic } from 'lucide-react';

interface Guest {
  id: number;
  name: string;
  role: string;
  filmTitles?: string[];
  email?: string;
  phone?: string;
  arrivalDate?: string;
  departureDate?: string;
  flightDetails?: {
    arrival?: string;
    departure?: string;
  };
  accommodation?: {
    hotel?: string;
    checkIn?: string;
    checkOut?: string;
  };
  specialRequests?: string;
  dietaryRestrictions?: string;
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  // Additional data for expandable sections
  interviews?: Array<{
    id: number;
    journalistName: string;
    journalistOutlet: string;
    date: string;
    time: string;
    status: string;
  }>;
  photoShoots?: Array<{
    id: number;
    type: string;
    date: string;
    time: string;
    venue: string;
    photographer: string;
  }>;
}

interface GuestDetailModalProps {
  guest: Guest | null;
  isOpen: boolean;
  onClose: () => void;
}

const GuestDetailModal: React.FC<GuestDetailModalProps> = ({ guest, isOpen, onClose }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  if (!isOpen || !guest) return null;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{guest.name}</h2>
              <p className="text-gray-600">{guest.role}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  {guest.email && (
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <a href={`mailto:${guest.email}`} className="text-blue-600 hover:underline">
                        {guest.email}
                      </a>
                    </div>
                  )}
                  {guest.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <a href={`tel:${guest.phone}`} className="text-blue-600 hover:underline">
                        {guest.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {guest.filmTitles && guest.filmTitles.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Associated Films</h3>
                  <div className="flex flex-wrap gap-1">
                    {guest.filmTitles.map((title, index) => (
                      <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                        {title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {guest.specialRequests && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Special Requests</h3>
                  <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                    {guest.specialRequests}
                  </p>
                </div>
              )}

              {guest.dietaryRestrictions && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Dietary Restrictions</h3>
                  <p className="text-sm text-gray-600 bg-orange-50 p-3 rounded-lg">
                    {guest.dietaryRestrictions}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Travel Details</h3>
                <div className="space-y-2 text-sm">
                  {guest.arrivalDate && (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span>Arrives: {new Date(guest.arrivalDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {guest.departureDate && (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span>Departs: {new Date(guest.departureDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {guest.flightDetails?.arrival && (
                    <div className="flex items-center">
                      <Plane className="w-4 h-4 mr-2 text-gray-400" />
                      <span>Arrival Flight: {guest.flightDetails.arrival}</span>
                    </div>
                  )}
                  {guest.flightDetails?.departure && (
                    <div className="flex items-center">
                      <Plane className="w-4 h-4 mr-2 text-gray-400" />
                      <span>Departure Flight: {guest.flightDetails.departure}</span>
                    </div>
                  )}
                </div>
              </div>

              {guest.accommodation && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Accommodation</h3>
                  <div className="space-y-2 text-sm">
                    {guest.accommodation.hotel && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{guest.accommodation.hotel}</span>
                      </div>
                    )}
                    {guest.accommodation.checkIn && (
                      <p>Check-in: {new Date(guest.accommodation.checkIn).toLocaleDateString()}</p>
                    )}
                    {guest.accommodation.checkOut && (
                      <p>Check-out: {new Date(guest.accommodation.checkOut).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              )}

              {guest.emergencyContact && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Emergency Contact</h3>
                  <div className="text-sm bg-red-50 p-3 rounded-lg">
                    {guest.emergencyContact.name && (
                      <p><span className="font-medium">Name:</span> {guest.emergencyContact.name}</p>
                    )}
                    {guest.emergencyContact.relationship && (
                      <p><span className="font-medium">Relationship:</span> {guest.emergencyContact.relationship}</p>
                    )}
                    {guest.emergencyContact.phone && (
                      <p><span className="font-medium">Phone:</span> {guest.emergencyContact.phone}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Expandable Sections */}
          <div className="mt-6 border-t border-gray-200 pt-6 space-y-4">
            {/* Travel Details Expandable */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection('travel')}
                className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <Plane className="w-5 h-5 mr-2 text-gray-600" />
                  <span className="font-medium text-gray-900">Travel Information</span>
                </div>
                {expandedSection === 'travel' ? 
                  <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                }
              </button>
              {expandedSection === 'travel' && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Dates in Town</h4>
                      <div className="space-y-1 text-sm">
                        {guest.arrivalDate && (
                          <div>Arrives: {new Date(guest.arrivalDate).toLocaleDateString()}</div>
                        )}
                        {guest.departureDate && (
                          <div>Departs: {new Date(guest.departureDate).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Flight Details</h4>
                      <div className="space-y-1 text-sm">
                        {guest.flightDetails?.arrival && (
                          <div>Arrival: {guest.flightDetails.arrival}</div>
                        )}
                        {guest.flightDetails?.departure && (
                          <div>Departure: {guest.flightDetails.departure}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  {guest.accommodation && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-700 mb-2">Accommodation</h4>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        {guest.accommodation.hotel && <div>{guest.accommodation.hotel}</div>}
                        {guest.accommodation.checkIn && guest.accommodation.checkOut && (
                          <div>
                            {new Date(guest.accommodation.checkIn).toLocaleDateString()} - {new Date(guest.accommodation.checkOut).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Interviews Expandable */}
            {guest.interviews && guest.interviews.length > 0 && (
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('interviews')}
                  className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <Mic className="w-5 h-5 mr-2 text-gray-600" />
                    <span className="font-medium text-gray-900">Interviews ({guest.interviews.length})</span>
                  </div>
                  {expandedSection === 'interviews' ? 
                    <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  }
                </button>
                {expandedSection === 'interviews' && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="space-y-3 mt-3">
                      {guest.interviews.map((interview) => (
                        <div key={interview.id} className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-900">{interview.journalistName}</div>
                              <div className="text-sm text-gray-600">{interview.journalistOutlet}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(interview.date).toLocaleDateString()} at {formatTime(interview.time)}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              interview.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                              interview.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                              interview.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {interview.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Photo Shoots Expandable */}
            {guest.photoShoots && guest.photoShoots.length > 0 && (
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('photos')}
                  className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <Camera className="w-5 h-5 mr-2 text-gray-600" />
                    <span className="font-medium text-gray-900">Photo Shoots ({guest.photoShoots.length})</span>
                  </div>
                  {expandedSection === 'photos' ? 
                    <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  }
                </button>
                {expandedSection === 'photos' && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="space-y-3 mt-3">
                      {guest.photoShoots.map((shoot) => (
                        <div key={shoot.id} className="bg-pink-50 p-3 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-900">{shoot.type}</div>
                              <div className="text-sm text-gray-600">{shoot.venue}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(shoot.date).toLocaleDateString()} at {formatTime(shoot.time)}
                              </div>
                              <div className="text-xs text-gray-500">Photographer: {shoot.photographer}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestDetailModal;