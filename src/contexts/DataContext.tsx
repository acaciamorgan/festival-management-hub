import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 🚨 CLAUDE IS ABSOLUTELY FORBIDDEN FROM CREATING MOCK DATA 🚨
// CLAUDE MUST NEVER CREATE, MODIFY, OR ADD ANY MOCK DATA
// CLAUDE MUST NEVER TOUCH MOCK DATA ARRAYS
// CLAUDE MUST NEVER ADD NEW PEOPLE, FILMS, VENUES, OR IDs
// ONLY THE HUMAN USER CAN CREATE MOCK DATA

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
  contactInfo?: {
    personal?: {
      email?: string;
      phone?: string;
    };
    publicist?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    studioRep?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  };
  notes?: string;
  travelInfo?: {
    arrivalDate?: string;
    departureDate?: string;
    isLocal?: boolean;
  };
}

interface House {
  id: number;
  name: string;
  capacity?: number;
}

export interface Venue {
  id: number;
  name: string;
  address: string;
  color: string;
  houses: House[];
  isTBD?: boolean;
}

export interface Journalist {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone?: string;
  officePhone?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  twitterHandle?: string;
  isFilmCriticsMember: boolean;
  filmCriticsOrganizations?: string;
  primaryOutlet: string;
  additionalOutlets?: string;
  primaryOutletType?: string;
  primaryOutletCountry?: string;
  primaryOutletMarket?: string;
  primaryOutletCirculation?: string;
  editorFirstName?: string;
  editorLastName?: string;
  editorEmail?: string;
  status: 'Accredited - G' | 'Accredited - P' | 'Pending' | 'Denied';
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
  journalists: Journalist[];
  staff: StaffMember[];
  updateFilm: (film: Film) => void;
  addFilm: (film: Film) => void;
  updatePerson: (person: Person) => void;
  addPerson: (person: Person) => void;
  addTravelerToPeople: (traveler: any) => void;
  getPersonSchedule: (personId: number) => any[];
  getPersonPhotosAndCarpets: (personId: number) => any[];
  getTravelInfoForPerson: (personId: number) => any;
  getFilmById: (id: number) => Film | undefined;
  getPersonById: (id: number) => Person | undefined;
  getFilmByTitle: (title: string) => Film | undefined;
  getPersonByName: (name: string) => Person | undefined;
  getStaffByName: (name: string) => StaffMember | undefined;
  getVenueById: (id: number) => Venue | undefined;
  getVenueByName: (name: string) => Venue | undefined;
  getJournalistById: (id: number) => Journalist | undefined;
  getJournalistByEmail: (email: string) => Journalist | undefined;
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
  const [journalists, setJournalists] = useState<Journalist[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  // APPROVED MOCK DATA PROVIDED BY HUMAN - FILM CARDS ONLY
  // SINGLE SOURCE OF TRUTH FOR ALL FILMS
  useEffect(() => {
    const approvedFilms: Film[] = [
      {
        id: 1,
        title: "The Art of Joy",
        originalLanguageTitle: "L'arte della gioia",
        director: "Valeria Golino",
        countries: ["Italy", "United Kingdom"],
        programs: ["Spotlight"],
        runtime: 155,
        language: "Italian",
        subtitles: true,
        originalReleaseYear: 2024,
        genres: ["Historical", "Literary Adaptation", "Women Centered"],
        premiereStatus: "North American Premiere",
        cast: ["Tecla Insolia", "Jasmine Trinca", "Valeria Bruni Tedeschi", "Guido Caprino", "Alma Noce", "Giovanni Bagnasco", "Giuseppe Spata"],
        crew: {
          screenwriter: "Valeria Golino, Valia Santella, Francesca Marciano, Luca Infascelli, Stefano Sardo",
          cinematographer: "Fabio Cianchetti",
          editor: "Giogiò Franchini",
          producer: "Viola Prestieri",
          executiveProducer: "Viola Prestieri, Valeria Golino, Gennaro Formisano, Nils Hartmann, Sonia Rovai, Erica Negri"
        },
        production: {
          companies: [],
          website: "",
          trailer: ""
        },
        contentWarnings: ""
      },
      {
        id: 2,
        title: "Blitz",
        originalLanguageTitle: "",
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
          editor: "",
          producer: "Steve McQueen, Tim Bevan, Eric Fellner, Arnon Milchan, Yariv Milchan, Michael Schaefer, Anita Overland, Adam Somner",
          executiveProducer: ""
        },
        production: {
          companies: ["Lammas Park", "Working Title Films", "New Regency"],
          website: "",
          trailer: ""
        },
        contentWarnings: ""
      },
      {
        id: 3,
        title: "Here",
        originalLanguageTitle: "",
        director: "Robert Zemeckis",
        countries: ["United Kingdom", "United States"],
        programs: ["Closing Night"],
        runtime: 104,
        language: "English",
        subtitles: false,
        originalReleaseYear: 2024,
        genres: ["Drama", "Family Affairs"],
        premiereStatus: "Chicago Premiere",
        cast: ["Tom Hanks", "Robin Wright", "Paul Bettany", "Kelly Reilly", "Michelle Dockery"],
        crew: {
          screenwriter: "Eric Roth, Robert Zemeckis",
          cinematographer: "",
          editor: "",
          producer: "Robert Zemeckis, Jack Rapke, Derek Hogue, Bill Block",
          executiveProducer: "Jeremy Johns, Andrew Golov, Thom Zadra"
        },
        production: {
          companies: [],
          website: "",
          trailer: ""
        },
        contentWarnings: ""
      },
      {
        id: 4,
        title: "Like Father, Like Son",
        originalLanguageTitle: "Soshite chichi ni naru",
        director: "Kore-eda Hirokazu",
        countries: ["Japan"],
        programs: ["Retrospective"],
        runtime: 121,
        language: "Japanese",
        subtitles: true,
        originalReleaseYear: 2013,
        genres: ["Drama", "Family Affairs"],
        premiereStatus: "",
        cast: ["Masaharu Fukuyama", "Machiko Ono", "Yoko Maki"],
        crew: {
          screenwriter: "Kore-eda Hirokazu",
          cinematographer: "Mikiya Takimoto",
          editor: "Kore-eda Hirokazu",
          producer: "Hijiri Taguchi, Kaoru Matsuzaki",
          executiveProducer: ""
        },
        production: {
          companies: [],
          website: "",
          trailer: ""
        },
        contentWarnings: ""
      },
      {
        id: 5,
        title: "A Photographic Memory",
        originalLanguageTitle: "",
        director: "Rachel Elizabeth Seed",
        countries: ["United States"],
        programs: ["Documentary", "City & State"],
        runtime: 87,
        language: "English",
        subtitles: false,
        originalReleaseYear: 2024,
        genres: ["Art", "Family Affairs", "Women Centered"],
        premiereStatus: "Chicago Premiere",
        cast: [],
        crew: {
          screenwriter: "Rachel Elizabeth Seed",
          cinematographer: "Joseph Michael Lopez, Rachel Elizabeth Seed",
          editor: "Christopher Stoudt, Eileen Meyer, Tyler Hubby, Will Garafolo",
          producer: "Rachel Elizabeth Seed, Sigrid Dyekjær, Beth Levison, Matt Perniciaro, Michael Sherman, Danielle Varga",
          executiveProducer: "Kirsten Johnson, Maida Lynn, Hinda Gilbert, Robina Riccitiello"
        },
        production: {
          companies: [],
          website: "rachelseed.com/#/apm/",
          trailer: "https://vimeo.com/929172660"
        },
        contentWarnings: ""
      },
      {
        id: 6,
        title: "The Piano Lesson",
        originalLanguageTitle: "",
        director: "Malcolm Washington",
        countries: ["United States"],
        programs: ["Opening Night", "Black Perspectives"],
        runtime: 125,
        language: "English",
        subtitles: false,
        originalReleaseYear: 2024,
        genres: ["Drama", "Family Affairs", "Literary Adaptation", "Social Commentary"],
        premiereStatus: "Chicago Premiere",
        cast: ["Samuel L. Jackson", "John David Washington", "Danielle Deadwyler", "Michael Potts", "Ray Fisher", "Corey Hawkins", "Erykah Badu", "Stephan James"],
        crew: {
          screenwriter: "Virgil Williams, Malcolm Washington",
          cinematographer: "Michael Gioulakis",
          editor: "Leslie Jones",
          producer: "Denzel Washington, Todd Black",
          executiveProducer: "Jennifer Roth, Constanza Romero, Katia Washington"
        },
        production: {
          companies: ["Netflix", "Mundy Lane Entertainment", "Escape Artists"],
          website: "",
          trailer: ""
        },
        contentWarnings: ""
      },
      {
        id: 7,
        title: "The Quiet Son",
        originalLanguageTitle: "Jouer avec le feu",
        director: "Delphine Coulin, Muriel Coulin",
        countries: ["France"],
        programs: ["International Feature Competition"],
        runtime: 118,
        language: "French",
        subtitles: true,
        originalReleaseYear: 2024,
        genres: ["Drama", "Family Affairs", "Social Commentary"],
        premiereStatus: "North American Premiere",
        cast: ["Vincent Lindon", "Benjamin Voisin", "Stefan Crepon"],
        crew: {
          screenwriter: "Delphine Coulin, Muriel Coulin",
          cinematographer: "Frédéric Noirhomme",
          editor: "Béatrice Herminie, Pierre Deschamps",
          producer: "Olivier Delbosc, Marie Guillaumond",
          executiveProducer: ""
        },
        production: {
          companies: ["Felicita Films", "Curiosa Films"],
          website: "",
          trailer: ""
        },
        contentWarnings: ""
      },
      {
        id: 8,
        title: "A Real Pain",
        originalLanguageTitle: "",
        director: "Jesse Eisenberg",
        countries: ["United States", "Poland"],
        programs: ["Special Presentation", "Comedy"],
        runtime: 89,
        language: "English",
        subtitles: false,
        originalReleaseYear: 2024,
        genres: ["Comedy", "Family Affairs", "Religion"],
        premiereStatus: "Chicago Premiere",
        cast: ["Jesse Eisenberg", "Kieran Culkin", "Will Sharpe", "Jennifer Grey", "Kurt Egyiawan", "Liza Sadovy", "Daniel Oreskes"],
        crew: {
          screenwriter: "Jesse Eisenberg",
          cinematographer: "Michał Dymek",
          editor: "Robert Nassau",
          producer: "Dave McCary, Ali Herting, Emma Stone, Jesse Eisenberg, Jennifer Semler, Ewa Puszczyńska",
          executiveProducer: "Ryan Heller, Jennifer Westin, Michael Bloom, Kevin Kelly"
        },
        production: {
          companies: ["Topic Studios"],
          website: "http://www.topicstudios.com",
          trailer: ""
        },
        contentWarnings: ""
      },
      {
        id: 9,
        title: "Universal Language",
        originalLanguageTitle: "Une Langue Universelle",
        director: "Matthew Rankin",
        countries: ["Canada"],
        programs: ["Comedy"],
        runtime: 89,
        language: "Farsi, French",
        subtitles: true,
        originalReleaseYear: 2024,
        genres: ["Comedy", "Drama"],
        premiereStatus: "Chicago Premiere",
        cast: ["Rojina Esmaeili", "Saba Vahedyousefi", "Sobhan Javadi", "Pirouz Nemati", "Matthew Rankin", "Mani Soleymanlou", "Danielle Fichaud", "Bahram Nabatian", "Ila Firouzabadi", "Hemela Pourafzal", "Dara Najmabadi"],
        crew: {
          screenwriter: "Matthew Rankin, Pirouz Nemati, Ila Firouzabadi",
          cinematographer: "Isabelle Stachtchenko",
          editor: "Xi Feng",
          producer: "Sylvain Corbeil",
          executiveProducer: "Pirouz Nemati, Ila Firouzabadi, Daniel Berger, Aaron Katz, Matthew Rankin"
        },
        production: {
          companies: ["Metafilms"],
          website: "https://universallanguage.oscilloscope.net/",
          trailer: ""
        },
        contentWarnings: ""
      }
    ];

    setFilms(approvedFilms);
    
    // APPROVED VENUE DATA PROVIDED BY HUMAN - VENUE CARDS ONLY
    // SINGLE SOURCE OF TRUTH FOR ALL VENUES
    const approvedVenues: Venue[] = [
      {
        id: 1,
        name: "AMC NEWCITY 14",
        address: "1500 N. Clybourn Ave., Chicago, IL 60614",
        color: "#3B82F6",
        houses: [
          { id: 1, name: "Theater 1", capacity: 289 },
          { id: 2, name: "Theater 2", capacity: 100 },
          { id: 3, name: "Theater 3", capacity: 256 },
          { id: 4, name: "Theater 4", capacity: 199 },
          { id: 5, name: "Theater 5", capacity: 158 }
        ]
      },
      {
        id: 2,
        name: "Music Box Theatre",
        address: "3733 N. Southport Ave., Chicago, IL 60110",
        color: "#F59E0B",
        houses: [
          { id: 1, name: "Main House", capacity: 750 }
        ]
      },
      {
        id: 3,
        name: "Gene Siskel Film Center",
        address: "64 N. State St., Chicago, IL 60606",
        color: "#10B981",
        houses: [
          { id: 1, name: "Theater 1", capacity: 200 },
          { id: 2, name: "Theater 2", capacity: 300 }
        ]
      },
      {
        id: 4,
        name: "Filmmaker's Lounge",
        address: "1500 N. Clybourn Ave., Chicago, IL 60614",
        color: "#8B5CF6",
        houses: [
          { id: 1, name: "Main Room", capacity: undefined }
        ]
      }
    ];

    setVenues(approvedVenues);
    
    // APPROVED JOURNALIST DATA PROVIDED BY HUMAN - JOURNALIST CARDS ONLY
    // SINGLE SOURCE OF TRUTH FOR ALL JOURNALISTS/PRESS
    const approvedJournalists: Journalist[] = [
      {
        id: 1,
        firstName: "Varun",
        lastName: "Khushalani",
        email: "vktest@gmail.com",
        cellPhone: "4432753356",
        officePhone: "4432753356",
        city: "Morristown",
        state: "NJ",
        country: "United States",
        zipCode: "07960",
        twitterHandle: "",
        isFilmCriticsMember: false,
        filmCriticsOrganizations: "",
        primaryOutlet: "14 East Magazine",
        additionalOutlets: "",
        primaryOutletType: "Magazine, Online, College",
        primaryOutletCountry: "United States",
        primaryOutletMarket: "Chicago",
        primaryOutletCirculation: "1000, approx",
        editorFirstName: "Hailey",
        editorLastName: "Bosek",
        editorEmail: "haileybosek15@gmail.com",
        status: "Accredited - G"
      },
      {
        id: 2,
        firstName: "Victor",
        lastName: "Aragon",
        email: "testfandads@gmail.com",
        cellPhone: "773-620-3143",
        officePhone: "773-620-3143",
        city: "Chicago",
        state: "IL",
        country: "USA",
        zipCode: "60618",
        twitterHandle: "@Fandads",
        isFilmCriticsMember: true,
        filmCriticsOrganizations: "Chicago Indie Critics",
        primaryOutlet: "Fandads.com",
        additionalOutlets: "",
        primaryOutletType: "Online",
        primaryOutletCountry: "USA",
        primaryOutletMarket: "Chicago",
        primaryOutletCirculation: "1900",
        editorFirstName: "Victor",
        editorLastName: "Aragon",
        editorEmail: "fandads@gmail.com",
        status: "Accredited - G"
      },
      {
        id: 3,
        firstName: "Won",
        lastName: "Park",
        email: "neomusicatest@hotmail.com",
        cellPhone: "773-769-3581",
        officePhone: "773-769-3581",
        city: "Chicago",
        state: "IL",
        country: "USA",
        zipCode: "60659",
        twitterHandle: "",
        isFilmCriticsMember: false,
        filmCriticsOrganizations: "",
        primaryOutlet: "News Magazine Chicago",
        additionalOutlets: "Kyocharo",
        primaryOutletType: "Weekly newspaper, Television",
        primaryOutletCountry: "USA",
        primaryOutletMarket: "Chicago",
        primaryOutletCirculation: "24,000",
        editorFirstName: "Won",
        editorLastName: "Park",
        editorEmail: "neomusica@hotmail.com",
        status: "Accredited - G"
      },
      {
        id: 4,
        firstName: "Zachary",
        lastName: "Lee",
        email: "zacharylee7test29@gmail.com",
        cellPhone: "7739549593",
        officePhone: "",
        city: "Chicago",
        state: "Illinois",
        country: "United States",
        zipCode: "60625",
        twitterHandle: "@zacharoni22",
        isFilmCriticsMember: true,
        filmCriticsOrganizations: "Chicago Film Critics Association",
        primaryOutlet: "The Chicago Reader",
        additionalOutlets: "RogerEbert.com, Third Coast Review",
        primaryOutletType: "Weekly newspaper, Online",
        primaryOutletCountry: "United States",
        primaryOutletMarket: "Chicago",
        primaryOutletCirculation: "Total Monthly Reach: Weekly Print: Digital + Social: M people copies M monthly users Email uniques: 42,000 Website monthly users: 690,000 Twitter: 283,000 Facebook: 95,000 Instagram: 61,000+",
        editorFirstName: "Taryn",
        editorLastName: "Allen",
        editorEmail: "tallen@chicagoreader.com",
        status: "Accredited - G"
      },
      {
        id: 5,
        firstName: "Zachary",
        lastName: "Zweifler",
        email: "zacharyzweiflertest@gmail.com",
        cellPhone: "5179174174",
        officePhone: "5179174174",
        city: "Hamtramck",
        state: "MI",
        country: "United States",
        zipCode: "48215",
        twitterHandle: "@filmwithfamily",
        isFilmCriticsMember: false,
        filmCriticsOrganizations: "",
        primaryOutlet: "Film with Family",
        additionalOutlets: "",
        primaryOutletType: "Podcast",
        primaryOutletCountry: "USA",
        primaryOutletMarket: "National",
        primaryOutletCirculation: "",
        editorFirstName: "Zach",
        editorLastName: "Zweifler",
        editorEmail: "filmwithfamilypodcast@gmail.com",
        status: "Accredited - G"
      },
      {
        id: 6,
        firstName: "Zbigniew",
        lastName: "Banas",
        email: "zbanas@yahootest.com",
        cellPhone: "312-304-2217",
        officePhone: "312-304-2217",
        city: "Chicago",
        state: "IL",
        country: "USA",
        zipCode: "60654",
        twitterHandle: "",
        isFilmCriticsMember: true,
        filmCriticsOrganizations: "Chicago Film Critics Association",
        primaryOutlet: "WPNA-FM Radio",
        additionalOutlets: "WEUR-AM Radio, Polish Daily News",
        primaryOutletType: "Radio",
        primaryOutletCountry: "USA",
        primaryOutletMarket: "Greater Chicagoland",
        primaryOutletCirculation: "50,000",
        editorFirstName: "Jacek",
        editorLastName: "Niemczyk",
        editorEmail: "niemczyk@wpna.fm",
        status: "Accredited - G"
      },
      {
        id: 7,
        firstName: "Andi",
        lastName: "Ortiz",
        email: "andi.ortiz@thetest.com",
        cellPhone: "8473467361",
        officePhone: "",
        city: "Schaumburg",
        state: "IL",
        country: "United States",
        zipCode: "60194",
        twitterHandle: "",
        isFilmCriticsMember: false,
        filmCriticsOrganizations: "",
        primaryOutlet: "TheWrap.com",
        additionalOutlets: "",
        primaryOutletType: "Online",
        primaryOutletCountry: "United States",
        primaryOutletMarket: "Los Angeles/Hollywood",
        primaryOutletCirculation: "8.5 million/month",
        editorFirstName: "Adam",
        editorLastName: "Chitwood",
        editorEmail: "adam.chitwood@thewrap.com",
        status: "Accredited - P"
      },
      {
        id: 8,
        firstName: "Bill",
        lastName: "Stamets",
        email: "bstamets@itestc.org",
        cellPhone: "7734498410",
        officePhone: "312 4219060",
        city: "Chicago",
        state: "IL",
        country: "United States",
        zipCode: "60637",
        twitterHandle: "",
        isFilmCriticsMember: false,
        filmCriticsOrganizations: "",
        primaryOutlet: "Chicago Sun-Times",
        additionalOutlets: "",
        primaryOutletType: "Daily newspaper",
        primaryOutletCountry: "United States",
        primaryOutletMarket: "Chicago",
        primaryOutletCirculation: "N/A",
        editorFirstName: "Darel",
        editorLastName: "Jevens",
        editorEmail: "djevens@suntimes.com",
        status: "Accredited - P"
      },
      {
        id: 9,
        firstName: "Brian",
        lastName: "Hieggelke",
        email: "brian@newcityfakecom",
        cellPhone: "",
        officePhone: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
        twitterHandle: "",
        isFilmCriticsMember: false,
        filmCriticsOrganizations: "",
        primaryOutlet: "Newcity",
        additionalOutlets: "",
        primaryOutletType: "",
        primaryOutletCountry: "",
        primaryOutletMarket: "",
        primaryOutletCirculation: "",
        editorFirstName: "",
        editorLastName: "",
        editorEmail: "",
        status: "Accredited - P"
      },
      {
        id: 10,
        firstName: "Brian",
        lastName: "Tallerico",
        email: "brian@eberttestdigital.biz",
        cellPhone: "",
        officePhone: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
        twitterHandle: "",
        isFilmCriticsMember: false,
        filmCriticsOrganizations: "",
        primaryOutlet: "RogerEbert.com",
        additionalOutlets: "",
        primaryOutletType: "",
        primaryOutletCountry: "",
        primaryOutletMarket: "",
        primaryOutletCirculation: "",
        editorFirstName: "",
        editorLastName: "",
        editorEmail: "",
        status: "Accredited - P"
      }
    ];

    setJournalists(approvedJournalists);
    
    // Keep other arrays empty until human provides approved data
    setPeople([]);
    setStaff([]);
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

  const addTravelerToPeople = (traveler: any) => {
    console.log('addTravelerToPeople called with:', traveler);
    console.log('Current people array length:', people.length);
    
    // Check if person already exists to avoid duplicates
    const existingPerson = people.find(p => p.name.toLowerCase() === traveler.name.toLowerCase());
    console.log('Existing person found:', existingPerson);
    
    if (!existingPerson) {
      const newPerson: Person = {
        id: people.length + 1000, // Use high ID to avoid conflicts
        name: traveler.name,
        role: traveler.role,
        email: traveler.contactInfo?.primary?.email,
        phone: traveler.contactInfo?.primary?.phone,
        filmTitles: traveler.filmTitle ? [traveler.filmTitle] : []
      };
      
      console.log('Creating new person:', newPerson);
      setPeople(prev => {
        const updated = [...prev, newPerson];
        console.log('Updated people array length:', updated.length);
        return updated;
      });
      console.log('Added traveler to central people database:', newPerson);
    } else {
      console.log('Person already exists, checking film titles...');
      // Update existing person's film titles if needed
      if (traveler.filmTitle && !existingPerson.filmTitles?.includes(traveler.filmTitle)) {
        const updatedPerson = {
          ...existingPerson,
          filmTitles: [...(existingPerson.filmTitles || []), traveler.filmTitle]
        };
        updatePerson(updatedPerson);
        console.log('Updated existing person with new film:', updatedPerson);
      } else {
        console.log('No update needed for existing person');
      }
    }
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

  const getVenueById = (id: number) => {
    return venues.find(venue => venue.id === id);
  };

  const getVenueByName = (name: string) => {
    return venues.find(venue => 
      venue.name.toLowerCase() === name.toLowerCase()
    );
  };

  const getJournalistById = (id: number) => {
    return journalists.find(journalist => journalist.id === id);
  };

  const getJournalistByEmail = (email: string) => {
    return journalists.find(journalist => 
      journalist.email.toLowerCase() === email.toLowerCase()
    );
  };

  const getPersonSchedule = (personId: number) => {
    const person = people.find(p => p.id === personId);
    if (!person) return [];
    
    // WAITING FOR HUMAN TO PROVIDE APPROVED MOCK DATA
    // CLAUDE IS FORBIDDEN FROM CREATING MOCK DATA
    
    return [];
  };

  const getPersonPhotosAndCarpets = (personId: number) => {
    const person = people.find(p => p.id === personId);
    if (!person) return [];
    
    // WAITING FOR HUMAN TO PROVIDE APPROVED MOCK DATA
    // CLAUDE IS FORBIDDEN FROM CREATING MOCK DATA
    
    return [];
  };
  
  const getTravelInfoForPerson = (personId: number) => {
    const person = people.find(p => p.id === personId);
    if (!person) return null;
    
    // This will need to be implemented to pull from Travel module
    // For now, returning basic structure
    return person.travelInfo || null;
  };

  const value = {
    films,
    people,
    venues,
    journalists,
    staff,
    updateFilm,
    addFilm,
    updatePerson,
    addPerson,
    addTravelerToPeople,
    getFilmById,
    getPersonById,
    getFilmByTitle,
    getPersonByName,
    getStaffByName,
    getVenueById,
    getVenueByName,
    getJournalistById,
    getJournalistByEmail,
    getPersonSchedule,
    getPersonPhotosAndCarpets,
    getTravelInfoForPerson
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataProvider;