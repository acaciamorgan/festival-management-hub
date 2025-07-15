import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import GuestDetailModal from './GuestDetailModal';

interface Film {
  id: number;
  title: string;
  originalLanguageTitle?: string;
  director: string;
  countries: string[];
  runtime: number;
  language: string;
  originalReleaseYear: number;
  premiereStatus?: string;
  programs: string[];
  genres: string[];
  crew: {
    screenwriter?: string;
    cinematographer?: string;
    producer?: string;
  };
  cast: string[];
}

interface FilmDetailModalProps {
  film: Film | null;
  isOpen: boolean;
  onClose: () => void;
}

const FilmDetailModal: React.FC<FilmDetailModalProps> = ({ film, isOpen, onClose }) => {
  const { getPersonByName } = useData();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);

  if (!isOpen || !film) return null;

  const handlePersonClick = (personName: string) => {
    const person = getPersonByName(personName);
    if (person) {
      // Convert person data to guest format for modal
      const guestData = {
        id: person.id,
        name: person.name,
        role: person.role,
        filmTitles: person.filmTitles || [],
        email: person.email,
        phone: person.phone,
        // Note: In real implementation, we would fetch full guest data from Travel module
        // For now, basic person info will be shown
      };
      
      setSelectedGuest(guestData);
      setShowGuestModal(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{film.title}</h2>
              {film.originalLanguageTitle && (
                <p className="text-gray-600 italic">{film.originalLanguageTitle}</p>
              )}
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
                <h3 className="font-semibold text-gray-900 mb-2">Basic Information</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Director:</span> {
                    (() => {
                      const person = getPersonByName(film.director);
                      console.log(`🎬 DIRECTOR CHECK: "${film.director}":`, person);
                      return person ? (
                        <button 
                          className="text-blue-600 hover:text-blue-800 hover:underline ml-1"
                          onClick={() => handlePersonClick(film.director)}
                        >
                          {film.director}
                        </button>
                      ) : (
                        <span className="ml-1">{film.director}</span>
                      );
                    })()
                  }</p>
                  <p><span className="font-medium">Countries:</span> {film.countries.join(', ')}</p>
                  <p><span className="font-medium">Runtime:</span> {film.runtime} minutes</p>
                  <p><span className="font-medium">Language:</span> {film.language}</p>
                  <p><span className="font-medium">Year:</span> {film.originalReleaseYear}</p>
                  {film.premiereStatus && (
                    <p><span className="font-medium">Premiere:</span> {film.premiereStatus}</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Programs & Genres</h3>
                <div className="flex flex-wrap gap-1 mb-2">
                  {film.programs.map((program: string, index: number) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {program}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {film.genres.map((genre: string, index: number) => (
                    <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Cast & Crew</h3>
                <div className="space-y-1 text-sm">
                  {film.crew.screenwriter && (
                    <p><span className="font-medium">Screenwriter:</span> {
                      getPersonByName(film.crew.screenwriter) ? (
                        <button 
                          className="text-blue-600 hover:text-blue-800 hover:underline ml-1"
                          onClick={() => handlePersonClick(film.crew.screenwriter!)}
                        >
                          {film.crew.screenwriter}
                        </button>
                      ) : (
                        <span className="ml-1">{film.crew.screenwriter}</span>
                      )
                    }</p>
                  )}
                  {film.crew.cinematographer && (
                    <p><span className="font-medium">Cinematographer:</span> {
                      getPersonByName(film.crew.cinematographer) ? (
                        <button 
                          className="text-blue-600 hover:text-blue-800 hover:underline ml-1"
                          onClick={() => handlePersonClick(film.crew.cinematographer!)}
                        >
                          {film.crew.cinematographer}
                        </button>
                      ) : (
                        <span className="ml-1">{film.crew.cinematographer}</span>
                      )
                    }</p>
                  )}
                  {film.crew.producer && (
                    <p><span className="font-medium">Producer:</span> {
                      getPersonByName(film.crew.producer) ? (
                        <button 
                          className="text-blue-600 hover:text-blue-800 hover:underline ml-1"
                          onClick={() => handlePersonClick(film.crew.producer!)}
                        >
                          {film.crew.producer}
                        </button>
                      ) : (
                        <span className="ml-1">{film.crew.producer}</span>
                      )
                    }</p>
                  )}
                </div>
                
                {film.cast.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-sm">Principal Cast:</p>
                    <p className="text-sm text-gray-600">
                      {film.cast.map((castMember, index) => (
                        <span key={index}>
                          {getPersonByName(castMember.trim()) ? (
                            <button 
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                              onClick={() => handlePersonClick(castMember.trim())}
                            >
                              {castMember}
                            </button>
                          ) : (
                            <span>{castMember}</span>
                          )}
                          {index < film.cast.length - 1 && ', '}
                        </span>
                      ))}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Detail Modal */}
      <GuestDetailModal 
        guest={selectedGuest}
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
      />
    </div>
  );
};

export default FilmDetailModal;