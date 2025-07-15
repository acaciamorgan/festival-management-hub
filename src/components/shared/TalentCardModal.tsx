import React, { useState } from 'react';
import { 
  X, Mail, Phone, MapPin, Calendar, Clock, Plane, 
  Hotel, Film, User, Briefcase, Star, ChevronDown, ChevronUp,
  Edit3, Save, FileText, ExternalLink, Camera
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';

interface TalentCardModalProps {
  person: any;
  isOpen: boolean;
  onClose: () => void;
}

const TalentCardModal: React.FC<TalentCardModalProps> = ({ person, isOpen, onClose }) => {
  const { getFilmByTitle, getPersonSchedule, getPersonPhotosAndCarpets, getTravelInfoForPerson, updatePerson } = useData();
  const [contactExpanded, setContactExpanded] = useState(false);
  const [travelExpanded, setTravelExpanded] = useState(false);
  const [photosAndCarpetsExpanded, setPhotosAndCarpetsExpanded] = useState(false);
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(person?.notes || '');
  
  if (!isOpen || !person) return null;
  
  const associatedFilms = person.filmTitles?.map((title: string) => getFilmByTitle(title)).filter(Boolean) || [];
  const schedule = getPersonSchedule(person.id);
  const photosAndCarpets = getPersonPhotosAndCarpets(person.id);
  const travelInfo = getTravelInfoForPerson(person.id);
  
  
  const handleSaveNotes = () => {
    const updatedPerson = { ...person, notes };
    updatePerson(updatedPerson);
    setIsEditingNotes(false);
  };
  
  const formatTravelDates = () => {
    if (travelInfo?.isLocal) return 'Local';
    if (travelInfo?.arrivalDate && travelInfo?.departureDate) {
      const arrival = new Date(travelInfo.arrivalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const departure = new Date(travelInfo.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${arrival} - ${departure}`;
    }
    return 'TBD';
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <User className="w-6 h-6 mr-2 text-blue-600" />
                {person.name}
              </h2>
              <p className="text-lg text-gray-600">{person.role}</p>
              
              {/* Associated Films */}
              {associatedFilms.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center text-sm text-gray-700">
                    <Film className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{associatedFilms.map(f => f.title).join(', ')}</span>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Contact Information Section */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => setContactExpanded(!contactExpanded)}
              className="w-full flex justify-between items-center py-4 text-left hover:bg-gray-50"
            >
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Contact Information
              </h3>
              {contactExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {contactExpanded && (
              <div className="pb-4">
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Personal Contact */}
                <div className="space-y-3">
                  <h4 className="text-md font-medium text-gray-900 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-600" />
                    Personal Contact
                  </h4>
                  {person.contactInfo?.personal?.email && (
                    <div className="flex items-center text-gray-700">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <a href={`mailto:${person.contactInfo.personal.email}`} className="text-blue-600 hover:underline text-sm">
                        {person.contactInfo.personal.email}
                      </a>
                    </div>
                  )}
                  {person.contactInfo?.personal?.phone && (
                    <div className="flex items-center text-gray-700">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <a href={`tel:${person.contactInfo.personal.phone}`} className="text-blue-600 hover:underline text-sm">
                        {person.contactInfo.personal.phone}
                      </a>
                    </div>
                  )}
                  {!person.contactInfo?.personal?.email && !person.contactInfo?.personal?.phone && (
                    <p className="text-gray-500 text-sm">No personal contact</p>
                  )}
                </div>

                {/* Publicist Contact */}
                <div className="space-y-3">
                  <h4 className="text-md font-medium text-gray-900 flex items-center">
                    <Briefcase className="w-4 h-4 mr-2 text-blue-600" />
                    Publicist
                  </h4>
                  {person.contactInfo?.publicist?.name && (
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{person.contactInfo.publicist.name}</div>
                      {person.contactInfo.publicist.email && (
                        <div className="flex items-center text-gray-700 mt-1">
                          <Mail className="w-3 h-3 mr-1 text-gray-400" />
                          <a href={`mailto:${person.contactInfo.publicist.email}`} className="text-blue-600 hover:underline text-xs">
                            {person.contactInfo.publicist.email}
                          </a>
                        </div>
                      )}
                      {person.contactInfo.publicist.phone && (
                        <div className="flex items-center text-gray-700 mt-1">
                          <Phone className="w-3 h-3 mr-1 text-gray-400" />
                          <a href={`tel:${person.contactInfo.publicist.phone}`} className="text-blue-600 hover:underline text-xs">
                            {person.contactInfo.publicist.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  {!person.contactInfo?.publicist?.name && (
                    <p className="text-gray-500 text-sm">No publicist contact</p>
                  )}
                </div>

                {/* Studio Rep Contact */}
                <div className="space-y-3">
                  <h4 className="text-md font-medium text-gray-900 flex items-center">
                    <Star className="w-4 h-4 mr-2 text-blue-600" />
                    Studio Rep
                  </h4>
                  {person.contactInfo?.studioRep?.name && (
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{person.contactInfo.studioRep.name}</div>
                      {person.contactInfo.studioRep.email && (
                        <div className="flex items-center text-gray-700 mt-1">
                          <Mail className="w-3 h-3 mr-1 text-gray-400" />
                          <a href={`mailto:${person.contactInfo.studioRep.email}`} className="text-blue-600 hover:underline text-xs">
                            {person.contactInfo.studioRep.email}
                          </a>
                        </div>
                      )}
                      {person.contactInfo.studioRep.phone && (
                        <div className="flex items-center text-gray-700 mt-1">
                          <Phone className="w-3 h-3 mr-1 text-gray-400" />
                          <a href={`tel:${person.contactInfo.studioRep.phone}`} className="text-blue-600 hover:underline text-xs">
                            {person.contactInfo.studioRep.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  {!person.contactInfo?.studioRep?.name && (
                    <p className="text-gray-500 text-sm">No studio rep contact</p>
                  )}
                </div>
              </div>
              </div>
            )}
          </div>

          {/* Photos & Red Carpets Section */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => setPhotosAndCarpetsExpanded(!photosAndCarpetsExpanded)}
              className="w-full flex justify-between items-center py-4 text-left hover:bg-gray-50"
            >
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Camera className="w-5 h-5 mr-2 text-blue-600" />
                Photos & Red Carpets ({photosAndCarpets.length})
              </h3>
              {photosAndCarpetsExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {photosAndCarpetsExpanded && (
              <div className="pb-4">
                <div className="space-y-3">
                  {photosAndCarpets.length > 0 ? (
                    <div className="space-y-2">
                      {photosAndCarpets.map((item: any) => (
                        <div key={item.id} className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center mb-1">
                                <div className="font-medium text-gray-900">{item.title}</div>
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                  item.type === 'photo_shoot' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {item.type === 'photo_shoot' ? 'Photo Shoot' : 'Red Carpet'}
                                </span>
                                {item.status && (
                                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                    item.status === 'completed' 
                                      ? 'bg-green-100 text-green-800'
                                      : item.status === 'cancelled'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {item.status}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                {new Date(item.date).toLocaleDateString('en-US', { 
                                  weekday: 'long', 
                                  month: 'long', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })} at {new Date(`1970-01-01T${item.time}:00`).toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit', 
                                  hour12: true 
                                })}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 space-y-1">
                                <div>
                                  <MapPin className="w-3 h-3 inline mr-1" />
                                  {item.venue}
                                </div>
                                {item.photographer && (
                                  <div>
                                    <Camera className="w-3 h-3 inline mr-1" />
                                    Photographer: {item.photographer}
                                  </div>
                                )}
                                {item.shootType && (
                                  <div>
                                    <span className="font-medium">Type:</span> {item.shootType}
                                  </div>
                                )}
                                {item.pressCallTime && (
                                  <div>
                                    <span className="font-medium">Press Call:</span> {new Date(`1970-01-01T${item.pressCallTime}:00`).toLocaleTimeString('en-US', { 
                                      hour: 'numeric', 
                                      minute: '2-digit', 
                                      hour12: true 
                                    })}
                                  </div>
                                )}
                                {item.screeningTime && (
                                  <div>
                                    <span className="font-medium">Screening:</span> {new Date(`1970-01-01T${item.screeningTime}:00`).toLocaleTimeString('en-US', { 
                                      hour: 'numeric', 
                                      minute: '2-digit', 
                                      hour12: true 
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button className="text-blue-600 hover:text-blue-800">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No photos or red carpet events scheduled</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Travel Information Section */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => setTravelExpanded(!travelExpanded)}
              className="w-full flex justify-between items-center py-4 text-left hover:bg-gray-50"
            >
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Plane className="w-5 h-5 mr-2 text-blue-600" />
                Travel Information
              </h3>
              {travelExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {travelExpanded && (
              <div className="pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-md font-medium text-gray-900 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                      Travel Dates
                    </h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-700">
                        <strong>Status:</strong> {formatTravelDates()}
                      </div>
                      {travelInfo && !travelInfo.isLocal && (
                        <div className="space-y-1 mt-2">
                          {travelInfo.arrivalDate && (
                            <div className="text-sm text-gray-600">
                              <strong>Arrival:</strong> {new Date(travelInfo.arrivalDate).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'long', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </div>
                          )}
                          {travelInfo.departureDate && (
                            <div className="text-sm text-gray-600">
                              <strong>Departure:</strong> {new Date(travelInfo.departureDate).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'long', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-md font-medium text-gray-900 flex items-center">
                      <Hotel className="w-4 h-4 mr-2 text-blue-600" />
                      Special Requirements
                    </h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      {notes ? (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
                      ) : (
                        <p className="text-gray-500 text-sm italic">No special requirements noted</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Schedule Information Section */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => setScheduleExpanded(!scheduleExpanded)}
              className="w-full flex justify-between items-center py-4 text-left hover:bg-gray-50"
            >
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Schedule & Notes
              </h3>
              {scheduleExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {scheduleExpanded && (
              <div className="pb-4 space-y-4">
                {/* Schedule */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Festival Schedule</h4>
                  {schedule.length > 0 ? (
                    <div className="space-y-2">
                      {schedule.map((item: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{item.title}</div>
                              <div className="text-sm text-gray-600">
                                {new Date(item.date).toLocaleDateString()} at {item.time}
                              </div>
                              {item.location && (
                                <div className="text-xs text-gray-500 mt-1">
                                  <MapPin className="w-3 h-3 inline mr-1" />
                                  {item.location}
                                </div>
                              )}
                            </div>
                            <button className="text-blue-600 hover:text-blue-800">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No scheduled commitments</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-md font-medium text-gray-900 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-blue-600" />
                      Editable Notes
                    </h4>
                    <button
                      onClick={() => {
                        if (isEditingNotes) {
                          handleSaveNotes();
                        } else {
                          setIsEditingNotes(true);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      {isEditingNotes ? (
                        <><Save className="w-4 h-4 mr-1" />Save</>
                      ) : (
                        <><Edit3 className="w-4 h-4 mr-1" />Edit</>
                      )}
                    </button>
                  </div>
                  {isEditingNotes ? (
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm"
                      rows={4}
                      placeholder="Add notes about this person..."
                    />
                  ) : (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      {notes ? (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
                      ) : (
                        <p className="text-gray-500 text-sm italic">No notes added</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Associated Films - Always visible */}
          <div className="space-y-3 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Film className="w-5 h-5 mr-2 text-blue-600" />
              Associated Films
            </h3>
            {associatedFilms.length > 0 ? (
              <div className="space-y-2">
                {associatedFilms.map((film: any) => (
                  <div key={film.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="font-medium text-gray-900">{film.title}</div>
                    <div className="text-sm text-gray-600">
                      {film.director} • {film.originalReleaseYear}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {film.genres?.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No associated films</p>
            )}
          </div>

          {/* Additional Information */}
          {(person.accreditation || person.role === 'Journalist') && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Press Information</h3>
              {person.accreditation && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-700">Accreditation: </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    person.accreditation === 'P' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {person.accreditation === 'P' ? 'Press' : person.accreditation}
                  </span>
                </div>
              )}
              {person.outlet && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-700">Outlet: </span>
                  <span className="text-sm text-gray-600">{person.outlet}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Close Button */}
          <div className="flex justify-end mt-6 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalentCardModal;