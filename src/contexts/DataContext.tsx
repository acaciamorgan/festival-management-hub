import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Film {
  id: number;
  title: string;
  originalLanguageTitle?: string;
  director: string;
  countries: string[];
  programs: string[];
  runtime: number;
  language: string;
  subtitles: boolean;
  originalReleaseYear: number;
  genres: string[];
  premiereStatus: string;
  cast: string[];
  crew: {
    screenwriter?: string;
    cinematographer?: string;
    editor?: string;
    producer?: string;
    executiveProducer?: string;
  };
  production: {
    companies?: string[];
    website?: string;
    trailer?: string;
  };
  contentWarnings?: string;
  screenerAccessType?: 'cinesend' | 'direct_link' | 'distributor_request' | 'screenings_only';
}

export interface Person {
  id: number;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  filmTitles?: string[];
  speciality?: string;
  accreditation?: string;
  outlet?: string;
}

export interface Venue {
  id: number;
  name: string;
  address: string;
  capacity: number;
  rooms?: string[];
}

export interface StaffMember {
  id: number;
  name: string;
  title: string;
  email: string;
  phone?: string;
  role: string;
  permissions: Record<string, string>;
}

interface DataContextType {
  films: Film[];
  people: Person[];
  venues: Venue[];
  staff: StaffMember[];
  updateFilm: (film: Film) => void;
  addFilm: (film: Film) => void;
  updatePerson: (person: Person) => void;
  addPerson: (person: Person) => void;
  getFilmById: (id: number) => Film | undefined;
  getPersonById: (id: number) => Person | undefined;
  getFilmByTitle: (title: string) => Film | undefined;
  getPersonByName: (name: string) => Person | undefined;
  getStaffByName: (name: string) => StaffMember | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [films, setFilms] = useState<Film[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  // Initialize with mock data
  useEffect(() => {
    const mockFilms: Film[] = [
      {
        id: 1,
        title: "After Life",
        originalLanguageTitle: "Wandâfuru raifu",
        director: "Kore-eda Hirokazu",
        countries: ["Japan"],
        programs: ["Retrospective"],
        runtime: 119,
        language: "Japanese",
        subtitles: true,
        originalReleaseYear: 1998,
        genres: ["Drama", "Fantasy"],
        premiereStatus: "",
        cast: ["Arata Iura", "Erika Oda", "Susumu Terajima", "Takashi Naito", "Kei Tani"],
        crew: {
          screenwriter: "Kore-eda Hirokazu",
          cinematographer: "Yutaka Yamasaki, Masayoshi Sukita",
          editor: "Kore-eda Hirokazu",
          producer: "Yutaka Shigenobu, Shiho Sato, Masayuki Akieda"
        },
        production: {},
        screenerAccessType: 'cinesend'
      },
      {
        id: 2,
        title: "All We Imagine As Light",
        director: "Payal Kapadia",
        countries: ["France", "India", "Netherlands", "Luxembourg"],
        programs: ["International Feature Competition"],
        runtime: 118,
        language: "Malayalam, Hindi",
        subtitles: true,
        originalReleaseYear: 2024,
        genres: ["Drama", "Romance", "Women Centered"],
        premiereStatus: "Chicago Premiere",
        cast: ["Kani Kusruti", "Divya Prabha", "Chhaya Kadam", "Hridhu Haroon", "Azees Nedumangad"],
        crew: {
          screenwriter: "Payal Kapadia",
          cinematographer: "Ranabir Das",
          editor: "Clément Pinteaux",
          producer: "Thomas Hakim, Julien Graff"
        },
        production: {
          companies: ["Petit Chaos", "Chalk and Cheese", "Arte France Cinéma", "Baldr Film"]
        },
        screenerAccessType: 'direct_link'
      },
      {
        id: 3,
        title: "Blitz",
        director: "Steve McQueen",
        countries: ["United Kingdom"],
        programs: ["Special Presentation", "Black Perspectives"],
        runtime: 120,
        language: "English",
        subtitles: false,
        originalReleaseYear: 2024,
        genres: ["Drama", "Family Affairs", "Historical"],
        premiereStatus: "Chicago Premiere",
        cast: ["Saoirse Ronan", "Elliott Heffernan", "Harris Dickinson", "Benjamin Clementine"],
        crew: {
          screenwriter: "Steve McQueen",
          cinematographer: "Yorick Le Saux",
          producer: "Steve McQueen, Tim Bevan, Eric Fellner, Arnon Milchan"
        },
        production: {
          companies: ["Lammas Park", "Working Title Films", "New Regency"]
        },
        screenerAccessType: 'distributor_request'
      },
      {
        id: 4,
        title: "Rita",
        director: "Paz Vega",
        countries: ["Spain"],
        programs: ["International Feature Competition"],
        runtime: 105,
        language: "Spanish",
        subtitles: true,
        originalReleaseYear: 2024,
        genres: ["Drama"],
        premiereStatus: "Chicago Premiere",
        cast: ["Paz Vega", "Joaquín Furriel"],
        crew: {
          screenwriter: "Paz Vega",
          cinematographer: "Ignacio Giménez Rico",
          producer: "Paz Vega, Fernando Bovaira"
        },
        production: {
          companies: ["Mod Producciones", "Telecinco Cinema"]
        },
        screenerAccessType: 'cinesend'
      }
    ];

    const mockPeople: Person[] = [
      {
        id: 1,
        name: "Payal Kapadia",
        role: "Director",
        filmTitles: ["All We Imagine As Light"],
        email: "payal@production.com"
      },
      {
        id: 2,
        name: "Kani Kusruti",
        role: "Actress",
        filmTitles: ["All We Imagine As Light"],
        email: "kani@talent.com"
      },
      {
        id: 3,
        name: "Paz Vega",
        role: "Director/Actress",
        filmTitles: ["Rita"],
        email: "paz@talent.com"
      },
      {
        id: 4,
        name: "Steve McQueen",
        role: "Director",
        filmTitles: ["Blitz"],
        email: "steve@production.com"
      },
      {
        id: 5,
        name: "Sarah Johnson",
        role: "Journalist",
        outlet: "Entertainment Weekly",
        email: "sarah@ew.com",
        accreditation: "P"
      },
      {
        id: 6,
        name: "Mike Chen",
        role: "Journalist",
        outlet: "The Hollywood Reporter",
        email: "mike@thr.com",
        accreditation: "P"
      },
      {
        id: 7,
        name: "Lisa Park",
        role: "Journalist",
        outlet: "WGN News",
        email: "lisa@wgn.com",
        accreditation: "G"
      }
    ];

    const mockVenues: Venue[] = [
      {
        id: 1,
        name: "AMC River East 21",
        address: "322 E Illinois St, Chicago, IL 60611",
        capacity: 250,
        rooms: ["Theater 1", "Theater 2", "Theater 3", "VIP Lounge"]
      },
      {
        id: 2,
        name: "Gene Siskel Film Center",
        address: "164 N State St, Chicago, IL 60601",
        capacity: 184,
        rooms: ["Main Theater", "Green Room", "Lobby"]
      },
      {
        id: 3,
        name: "Music Box Theatre",
        address: "3733 N Southport Ave, Chicago, IL 60613",
        capacity: 750,
        rooms: ["Main Auditorium", "Balcony", "Mezzanine"]
      }
    ];

    const mockStaff: StaffMember[] = [
      {
        id: 1,
        name: "Morgan Harris",
        title: "PR Director",
        email: "morgan@ciff.org",
        phone: "+1 312 555 0001",
        role: "pr_team",
        permissions: {
          titleManagement: "read",
          pressManagement: "full_edit",
          interviewManagement: "full_edit",
          pressScreeningManagement: "full_edit",
          screenerAccess: "full_edit",
          travelModule: "full_edit",
          redCarpetEvents: "full_edit",
          photoCoordination: "full_edit"
        }
      },
      {
        id: 2,
        name: "Sarah Chen",
        title: "Event Coordinator",
        email: "sarah@ciff.org",
        phone: "+1 312 555 0002",
        role: "festival_staff",
        permissions: {
          titleManagement: "read",
          pressManagement: "read",
          interviewManagement: "read",
          pressScreeningManagement: "full_edit",
          redCarpetEvents: "full_edit"
        }
      },
      {
        id: 3,
        name: "Mike Rodriguez",
        title: "Media Coordinator",
        email: "mike@ciff.org",
        phone: "+1 312 555 0003",
        role: "festival_staff",
        permissions: {
          titleManagement: "read",
          pressManagement: "full_edit",
          interviewManagement: "read",
          photoCoordination: "read",
          redCarpetEvents: "read"
        }
      }
    ];

    setFilms(mockFilms);
    setPeople(mockPeople);
    setVenues(mockVenues);
    setStaff(mockStaff);
  }, []);

  const updateFilm = (updatedFilm: Film) => {
    setFilms(prev => prev.map(film => film.id === updatedFilm.id ? updatedFilm : film));
  };

  const addFilm = (newFilm: Film) => {
    setFilms(prev => [...prev, newFilm]);
  };

  const updatePerson = (updatedPerson: Person) => {
    setPeople(prev => prev.map(person => person.id === updatedPerson.id ? updatedPerson : person));
  };

  const addPerson = (newPerson: Person) => {
    setPeople(prev => [...prev, newPerson]);
  };

  const getFilmById = (id: number) => {
    return films.find(film => film.id === id);
  };

  const getPersonById = (id: number) => {
    return people.find(person => person.id === id);
  };

  const getFilmByTitle = (title: string) => {
    return films.find(film => 
      film.title.toLowerCase() === title.toLowerCase() ||
      film.originalLanguageTitle?.toLowerCase() === title.toLowerCase()
    );
  };

  const getPersonByName = (name: string) => {
    return people.find(person => 
      person.name.toLowerCase() === name.toLowerCase()
    );
  };

  const getStaffByName = (name: string) => {
    return staff.find(member => 
      member.name.toLowerCase() === name.toLowerCase()
    );
  };

  const value = {
    films,
    people,
    venues,
    staff,
    updateFilm,
    addFilm,
    updatePerson,
    addPerson,
    getFilmById,
    getPersonById,
    getFilmByTitle,
    getPersonByName,
    getStaffByName
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};