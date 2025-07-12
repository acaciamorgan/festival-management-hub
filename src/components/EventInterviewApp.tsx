import React, { useState, useEffect } from 'react';
import { Users, Calendar, MessageSquare, FileText, User, Settings, Send, Filter, Star, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, Bell, Search, X, Plus, UserPlus, Mail, ExternalLink } from 'lucide-react';

const EventInterviewApp: React.FC = () => {
  const [currentUser, setCurrentUser] = useState({ 
    role: 'programming', 
    team: 'Programming Team',
    name: 'Sarah Johnson', 
    title: 'Programming Director',
    id: 1,
    email: 'sarah.johnson@festival.com',
    lastActive: Date.now()
  });
  
  const [activeModule, setActiveModule] = useState('programming');
  const [activeTab, setActiveTab] = useState('films');
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCelebrities, setSelectedCelebrities] = useState([]);
  const [expandedCelebrity, setExpandedCelebrity] = useState(null);
  const [expandedJournalist, setExpandedJournalist] = useState(null);
  const [sortBy, setSortBy] = useState('priority');
  const [chatView, setChatView] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const [targetedMessage, setTargetedMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [selectedCelebrity, setSelectedCelebrity] = useState(null);
  const [selectedJournalists, setSelectedJournalists] = useState([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [creditFilter, setCreditFilter] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntryForm, setManualEntryForm] = useState({
    name: '',
    outlet: '',
    email: '',
    phone: '',
    selectedCelebrities: [],
    notes: ''
  });
  const [isExistingJournalist, setIsExistingJournalist] = useState(false);
  const [journalistSearch, setJournalistSearch] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [previewEmailData, setPreviewEmailData] = useState(null);
  const [journalistSortBy, setJournalistSortBy] = useState('name');
  const [journalistSortDirection, setJournalistSortDirection] = useState('asc');
  const [celebrityStoryDetails, setCelebrityStoryDetails] = useState({});
  const [requestSortBy, setRequestSortBy] = useState('status');
  const [requestSortDirection, setRequestSortDirection] = useState('asc');
  const [guestSortBy, setGuestSortBy] = useState('name');
  const [guestSortDirection, setGuestSortDirection] = useState('asc');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessageRecipient, setNewMessageRecipient] = useState('');
  const [conversationSearch, setConversationSearch] = useState('');
  const [recipientSuggestions, setRecipientSuggestions] = useState([]);
  const [showRecipientSuggestions, setShowRecipientSuggestions] = useState(false);
  const [chatHeight, setChatHeight] = useState(384); // Default height (h-96 = 384px)
  const [isResizing, setIsResizing] = useState(false);
  const [selectedModalCelebrity, setSelectedModalCelebrity] = useState(null);
  const [selectedModalJournalist, setSelectedModalJournalist] = useState(null);
  
  // Film state management
  const [films, setFilms] = useState([]);
  const [filmSearchQuery, setFilmSearchQuery] = useState('');
  const [filmStatusFilter, setFilmStatusFilter] = useState('all');
  const [filmCategoryFilter, setFilmCategoryFilter] = useState('all');
  const [selectedFilm, setSelectedFilm] = useState(null);
  const [showFilmModal, setShowFilmModal] = useState(false);
  
  // Mock PR Team Members
  const [prTeamMembers] = useState([
    { id: 1, name: 'Jessica Martinez', email: 'jessica.martinez@example.com', role: 'PR Director', active: true },
    { id: 2, name: 'David Kim', email: 'david.kim@example.com', role: 'Media Relations Manager', active: true },
    { id: 3, name: 'Sarah Chen', email: 'sarah.chen@example.com', role: 'Communications Coordinator', active: true },
    { id: 4, name: 'Mike Johnson', email: 'mike.johnson@example.com', role: 'Press Relations Specialist', active: true }
  ]);
  
  const [allJournalists, setAllJournalists] = useState([
    { id: 1, name: 'Sarah Johnson', outlet: 'Entertainment Weekly', email: 'sarah@ew.com', phone: '(555) 123-4567', specialty: 'Celebrity Interviews', bio: 'Senior Entertainment Correspondent with 10+ years covering Hollywood', twitter: '@sarahjohnsonEW', credentialsPickedUp: false, notes: '' },
    { id: 2, name: 'Mike Chen', outlet: 'The Hollywood Reporter', email: 'mike@thr.com', phone: '(555) 234-5678', specialty: 'Film & TV', bio: 'Award-winning journalist specializing in blockbuster entertainment', twitter: '@mikechenthr', credentialsPickedUp: true, notes: 'VIP access requested' },
    { id: 3, name: 'Lisa Park', outlet: 'Variety', email: 'lisa@variety.com', phone: '(555) 345-6789', specialty: 'Industry News', bio: 'Covers entertainment business and industry trends', twitter: '@lisaparktv', credentialsPickedUp: false, notes: '' },
    { id: 4, name: 'Alex Rivera', outlet: 'Local News 5', email: 'alex@news5.com', phone: '(555) 456-7890', specialty: 'Local Entertainment', bio: 'Local entertainment reporter and anchor', credentialsPickedUp: true, notes: 'Needs photo approval' },
    { id: 5, name: 'Jordan Kim', outlet: 'Rolling Stone', email: 'jordan@rs.com', phone: '(555) 567-8901', specialty: 'Music & Pop Culture', bio: 'Music journalist with focus on pop culture intersections', twitter: '@jordankimrs', credentialsPickedUp: false, notes: '' },
    { id: 6, name: 'Taylor Swift', outlet: 'Comic Weekly', email: 'taylor@cw.com', phone: '(555) 678-9012', specialty: 'Comics & Animation', bio: 'Covers comic book industry and animated entertainment', credentialsPickedUp: false, notes: '' },
    { id: 7, name: 'Morgan Freeman', outlet: 'Voice Artists Daily', email: 'morgan@vad.com', phone: '(555) 789-0123', specialty: 'Voice Acting', bio: 'Veteran voice acting industry journalist', credentialsPickedUp: true, notes: 'Audio recording equipment approved' },
    { id: 8, name: 'Emma Stone', outlet: 'Animation Weekly', email: 'emma@aw.com', phone: '(555) 890-1234', specialty: 'Animation Industry', bio: 'Animation industry insider and journalist', credentialsPickedUp: false, notes: '' },
    { id: 9, name: 'Robert Downey', outlet: 'Marvel Insider', email: 'robert@marvel.com', phone: '(555) 901-2345', specialty: 'Superhero Films', bio: 'Marvel entertainment specialist', credentialsPickedUp: true, notes: 'First time attendee' },
    { id: 10, name: 'Natalie Portman', outlet: 'Indie Film Quarterly', email: 'natalie@ifq.com', phone: '(555) 012-3456', specialty: 'Independent Films', bio: 'Independent film critic and journalist', credentialsPickedUp: false, notes: '' },
    { id: 11, name: 'Chris Evans', outlet: 'Action Cinema Review', email: 'chris@acr.com', phone: '(555) 123-4567', specialty: 'Action Films', bio: 'Action movie specialist and stunt coordinator turned journalist', credentialsPickedUp: false, notes: '' },
    { id: 12, name: 'Scarlett Johansson', outlet: 'Female Filmmakers Forum', email: 'scarlett@fff.com', phone: '(555) 234-5678', specialty: 'Women in Film', bio: 'Advocates for women in entertainment industry', credentialsPickedUp: true, notes: 'Special dietary requirements' },
    { id: 13, name: 'Mark Ruffalo', outlet: 'Environmental Entertainment', email: 'mark@ee.com', phone: '(555) 345-6789', specialty: 'Eco-Friendly Productions', bio: 'Environmental journalist covering green entertainment', credentialsPickedUp: false, notes: '' },
    { id: 14, name: 'Jeremy Renner', outlet: 'Stunt News Daily', email: 'jeremy@snd.com', phone: '(555) 456-7890', specialty: 'Stunts & Action', bio: 'Former stuntman covering action entertainment', credentialsPickedUp: true, notes: 'Mobility assistance needed' },
    { id: 15, name: 'Paul Rudd', outlet: 'Comedy Central Times', email: 'paul@cct.com', phone: '(555) 567-8901', specialty: 'Comedy Entertainment', bio: 'Comedy entertainment journalist and critic', credentialsPickedUp: false, notes: '' },
    { id: 16, name: 'Brie Larson', outlet: 'Superhero Studies', email: 'brie@ss.com', phone: '(555) 678-9012', specialty: 'Superhero Culture', bio: 'Academic approach to superhero entertainment', credentialsPickedUp: false, notes: '' },
    { id: 17, name: 'Anthony Mackie', outlet: 'Urban Entertainment', email: 'anthony@ue.com', phone: '(555) 789-0123', specialty: 'Urban Culture', bio: 'Urban entertainment and culture specialist', credentialsPickedUp: true, notes: 'Late arrival - arriving Saturday' },
    { id: 18, name: 'Tom Holland', outlet: 'Young Hollywood', email: 'tom@yh.com', phone: '(555) 890-1234', specialty: 'Young Talent', bio: 'Covers emerging young talent in entertainment', credentialsPickedUp: false, notes: '' },
    { id: 19, name: 'Zendaya Coleman', outlet: 'Fashion & Film', email: 'zendaya@ff.com', phone: '(555) 901-2345', specialty: 'Fashion in Entertainment', bio: 'Fashion journalist covering entertainment industry style', credentialsPickedUp: false, notes: '' },
    { id: 20, name: 'Jake Gyllenhaal', outlet: 'Method Magazine', email: 'jake@mm.com', phone: '(555) 012-3456', specialty: 'Acting Techniques', bio: 'Deep dive into acting methods and techniques', credentialsPickedUp: true, notes: 'Press conference only - no individual interviews' }
  ]);
  
  const [requests, setRequests] = useState([
    {
      id: 1,
      journalistId: 1,
      journalistName: 'Sarah Johnson',
      outlet: 'Entertainment Weekly',
      celebrities: ['Chris Evans', 'Scarlett Johansson'],
      status: 'approved',
      priority: { 'Chris Evans': 'A', 'Scarlett Johansson': 'B' },
      completed: { 'Chris Evans': false, 'Scarlett Johansson': true },
      timestamp: '2025-07-05 10:30',
      isNew: false
    },
    {
      id: 2,
      journalistId: 2,
      journalistName: 'Mike Chen',
      outlet: 'The Hollywood Reporter',
      celebrities: ['Chris Evans', 'Robert Downey Jr.'],
      status: 'approved',
      priority: { 'Chris Evans': 'A', 'Robert Downey Jr.': 'A' },
      completed: { 'Chris Evans': false, 'Robert Downey Jr.': false },
      timestamp: '2025-07-05 09:15',
      isNew: false
    },
    {
      id: 3,
      journalistId: 3,
      journalistName: 'Lisa Park',
      outlet: 'Variety',
      celebrities: ['Chris Evans', 'Tom Holland'],
      status: 'pending',
      priority: { 'Chris Evans': 'Unassigned', 'Tom Holland': 'B' },
      completed: { 'Chris Evans': false, 'Tom Holland': false },
      timestamp: '2025-07-06 14:20',
      isNew: true
    },
    {
      id: 4,
      journalistId: 4,
      journalistName: 'Alex Rivera',
      outlet: 'Local News 5',
      celebrities: ['Chris Evans'],
      status: 'pending',
      priority: { 'Chris Evans': 'Unassigned' },
      completed: { 'Chris Evans': false },
      timestamp: '2025-07-06 16:45',
      isNew: true
    },
    {
      id: 5,
      journalistId: 5,
      journalistName: 'Jordan Kim',
      outlet: 'Rolling Stone',
      celebrities: ['Tara Strong', 'John DiMaggio'],
      status: 'approved',
      priority: { 'Tara Strong': 'A', 'John DiMaggio': 'B' },
      completed: { 'Tara Strong': true, 'John DiMaggio': false },
      timestamp: '2025-07-06 11:30',
      isNew: false
    }
  ]);

  // Mock film data for Programming module
  const [mockFilms] = useState([
    {
      id: 1,
      title: "Midnight in Monterey",
      director: "Sofia Rodriguez",
      country: "USA",
      year: 2024,
      runtime: 95,
      genre: ["Drama", "Romance"],
      category: "Feature Narrative",
      status: "confirmed",
      premiereType: "World Premiere",
      synopsis: "A young musician discovers love and loss in the vibrant music scene of Monterey Bay.",
      submissionDate: "2024-02-15",
      selectionDate: "2024-04-20",
      screeningTimes: ["Friday 7:00 PM", "Sunday 3:00 PM"],
      venue: "Main Theater",
      language: "English",
      subtitles: ["Spanish", "French"],
      rating: "PG-13",
      productionCompany: "Sunset Films",
      contact: {
        name: "Maria Garcia",
        email: "maria@sunsetfilms.com",
        phone: "(555) 123-4567"
      },
      technicalSpecs: {
        format: "DCP",
        aspectRatio: "2.39:1",
        soundFormat: "5.1 Surround"
      },
      cast: ["Emma Chen", "David Martinez", "Sarah Kim"],
      awards: ["Best Cinematography - Sundance 2024"],
      notes: "Director attending both screenings"
    },
    {
      id: 2,
      title: "Digital Ghosts",
      director: "Alex Thompson",
      country: "Canada",
      year: 2024,
      runtime: 78,
      genre: ["Sci-Fi", "Thriller"],
      category: "Feature Narrative",
      status: "confirmed",
      premiereType: "US Premiere",
      synopsis: "In a near-future world, a programmer uncovers a conspiracy hidden in AI code.",
      submissionDate: "2024-01-22",
      selectionDate: "2024-03-15",
      screeningTimes: ["Saturday 9:00 PM"],
      venue: "Digital Theater",
      language: "English",
      subtitles: ["Spanish"],
      rating: "R",
      productionCompany: "Northern Lights Productions",
      contact: {
        name: "James Wilson",
        email: "james@nlprod.ca",
        phone: "(555) 234-5678"
      },
      technicalSpecs: {
        format: "DCP",
        aspectRatio: "1.85:1",
        soundFormat: "7.1 Surround"
      },
      cast: ["Michael Roberts", "Lisa Zhang", "Tom Anderson"],
      awards: [],
      notes: "Special VFX presentation after screening"
    },
    {
      id: 3,
      title: "The Last Garden",
      director: "Yuki Tanaka",
      country: "Japan",
      year: 2024,
      runtime: 52,
      genre: ["Documentary"],
      category: "Documentary Short",
      status: "confirmed",
      premiereType: "International Premiere",
      synopsis: "Following an elderly gardener's fight to preserve traditional farming in modern Tokyo.",
      submissionDate: "2024-03-01",
      selectionDate: "2024-05-10",
      screeningTimes: ["Saturday 2:00 PM"],
      venue: "Documentary Hall",
      language: "Japanese",
      subtitles: ["English", "Spanish"],
      rating: "NR",
      productionCompany: "Tokyo Documentary Collective",
      contact: {
        name: "Hiroshi Sato",
        email: "hiroshi@tdcollective.jp",
        phone: "+81-3-1234-5678"
      },
      technicalSpecs: {
        format: "DCP",
        aspectRatio: "16:9",
        soundFormat: "Stereo"
      },
      cast: ["Kenji Yamamoto"],
      awards: ["Audience Choice - Tokyo Film Festival 2024"],
      notes: "Interpreter needed for Q&A"
    },
    {
      id: 4,
      title: "Broken Strings",
      director: "Carlos Mendez",
      country: "Mexico",
      year: 2024,
      runtime: 18,
      genre: ["Drama"],
      category: "Narrative Short",
      status: "waitlist",
      premiereType: "North American Premiere",
      synopsis: "A street musician's guitar breaks on the day of his biggest audition.",
      submissionDate: "2024-04-05",
      selectionDate: null,
      screeningTimes: [],
      venue: "TBD",
      language: "Spanish",
      subtitles: ["English"],
      rating: "PG",
      productionCompany: "Indie Mexico Films",
      contact: {
        name: "Ana Rodriguez",
        email: "ana@indiemx.com",
        phone: "+52-55-1234-5678"
      },
      technicalSpecs: {
        format: "DCP",
        aspectRatio: "1.85:1",
        soundFormat: "Stereo"
      },
      cast: ["Roberto Silva", "Carmen Lopez"],
      awards: [],
      notes: "Backup selection for shorts program"
    },
    {
      id: 5,
      title: "Ocean's Memory",
      director: "Isabella Romano",
      country: "Italy",
      year: 2024,
      runtime: 110,
      genre: ["Drama", "Family"],
      category: "Feature Narrative",
      status: "under_review",
      premiereType: "World Premiere",
      synopsis: "Three generations of women reunite at their family's seaside home to scatter their matriarch's ashes.",
      submissionDate: "2024-05-01",
      selectionDate: null,
      screeningTimes: [],
      venue: "TBD",
      language: "Italian",
      subtitles: ["English"],
      rating: "PG-13",
      productionCompany: "Mediterranean Films",
      contact: {
        name: "Giuseppe Bianchi",
        email: "giuseppe@medfilms.it",
        phone: "+39-06-1234-5678"
      },
      technicalSpecs: {
        format: "DCP",
        aspectRatio: "2.35:1",
        soundFormat: "5.1 Surround"
      },
      cast: ["Monica Bellucci", "Claudia Romano", "Sophia Bianchi"],
      awards: [],
      notes: "Programming committee reviewing"
    }
  ]);
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'general',
      from: 'Sarah Johnson',
      fromRole: 'journalist',
      message: 'What time does the press room open today?',
      timestamp: '2025-07-07 14:25',
      urgent: false
    },
    {
      id: 2,
      type: 'general',
      from: 'Jessica Martinez',
      fromRole: 'pr',
      message: 'Press room opens at 9 AM. Coffee and pastries will be available.',
      timestamp: '2025-07-07 14:27',
      urgent: false
    },
    {
      id: 3,
      type: 'targeted',
      from: 'David Kim',
      fromRole: 'pr',
      to: 'Chris Evans requesters',
      recipients: ['Sarah Johnson', 'Mike Chen'],
      message: 'Chris Evans available in 15 minutes at booth #12',
      timestamp: '2025-07-07 14:30',
      urgent: true
    },
    {
      id: 4,
      type: 'direct',
      from: 'Sarah Johnson',
      fromRole: 'journalist',
      to: 'Jessica Martinez',
      message: 'Hi Jessica, can you confirm my 3 PM slot with Scarlett?',
      timestamp: '2025-07-07 14:35',
      urgent: false
    }
  ]);

  const [prTeamMessages, setPrTeamMessages] = useState([
    {
      id: 1,
      from: 'Jessica Martinez',
      fromRole: 'pr',
      message: 'Team - heads up that Chris Evans interview moved to 2:30 PM',
      timestamp: '2025-07-07 13:15',
      urgent: false
    },
    {
      id: 2,
      from: 'David Kim',
      fromRole: 'pr',
      message: 'Got it! Should we notify the affected journalists?',
      timestamp: '2025-07-07 13:16',
      urgent: false
    }
  ]);

  // Additional direct messages for demo
  const [directMessages, setDirectMessages] = useState([
    {
      id: 1,
      type: 'direct',
      from: 'Jessica Martinez',
      fromRole: 'pr',
      to: 'Sarah Johnson',
      message: 'Hi Sarah, could you please confirm your interview time with Chris Evans?',
      timestamp: '2025-07-07 10:00',
      urgent: false,
      conversationId: 'jessica-sarah'
    },
    {
      id: 2,
      type: 'direct',
      from: 'Sarah Johnson',
      fromRole: 'journalist',
      to: 'Jessica Martinez',
      message: 'Yes, I can do 2:30 PM. Thank you for confirming!',
      timestamp: '2025-07-07 10:15',
      urgent: false,
      conversationId: 'jessica-sarah'
    },
    {
      id: 3,
      type: 'direct',
      from: 'David Kim',
      fromRole: 'pr',
      to: 'Mike Chen',
      message: 'Mike, we have a last-minute photo opportunity available with Scarlett Johansson. Interested?',
      timestamp: '2025-07-07 11:45',
      urgent: false,
      conversationId: 'david-mike'
    },
    {
      id: 4,
      type: 'direct',
      from: 'Mike Chen',
      fromRole: 'journalist',
      to: 'David Kim',
      message: 'Absolutely! What time works best?',
      timestamp: '2025-07-07 12:00',
      urgent: false,
      conversationId: 'david-mike'
    }
  ]);

  const [celebrities, setCelebrities] = useState([
    {
      id: 1,
      name: 'Chris Evans',
      category: 'Celebrity',
      days: ['Friday', 'Saturday'],
      knownFor: 'Captain America, Knives Out',
      agent: 'CAA - John Smith',
      agentContact: 'john.smith@caa.com, (555) 123-4567',
      prAvailable: 'Available for Interviews'
    },
    {
      id: 2,
      name: 'Scarlett Johansson',
      category: 'Celebrity',
      days: ['Saturday', 'Sunday'],
      knownFor: 'Black Widow, Marriage Story',
      agent: 'WME - Lisa Davis',
      agentContact: 'lisa.davis@wme.com, (555) 234-5678',
      prAvailable: 'Available for Interviews'
    },
    {
      id: 3,
      name: 'Robert Downey Jr.',
      category: 'Celebrity',
      days: ['Friday', 'Saturday', 'Sunday'],
      knownFor: 'Iron Man, Sherlock Holmes',
      agent: 'UTA - Mark Johnson',
      agentContact: 'mark.johnson@uta.com, (555) 345-6789',
      prAvailable: 'Not Available'
    },
    {
      id: 4,
      name: 'Tom Holland',
      category: 'Celebrity',
      days: ['Sunday'],
      knownFor: 'Spider-Man, The Impossible',
      agent: 'CAA - Sarah Wilson',
      agentContact: 'sarah.wilson@caa.com, (555) 456-7890',
      prAvailable: 'Available for Interviews'
    },
    {
      id: 5,
      name: 'Tara Strong',
      category: 'Voice',
      days: ['Friday', 'Saturday'],
      knownFor: 'Twilight Sparkle, Raven, Bubbles',
      agent: 'Voice Talent Agency - Mike Ross',
      agentContact: 'mike.ross@vta.com, (555) 111-2222',
      prAvailable: 'Available for Interviews'
    },
    {
      id: 6,
      name: 'John DiMaggio',
      category: 'Voice',
      days: ['Saturday', 'Sunday'],
      knownFor: 'Bender, Jake the Dog, Marcus Fenix',
      agent: 'Voice Talent Agency - Sarah Lee',
      agentContact: 'sarah.lee@vta.com, (555) 333-4444',
      prAvailable: 'Available for Interviews'
    },
    {
      id: 7,
      name: 'Jim Lee',
      category: 'Artist',
      days: ['Friday', 'Sunday'],
      knownFor: 'X-Men, Batman, DC Chief Creative Officer',
      agent: 'DC Comics Representative',
      agentContact: 'rep@dccomics.com, (555) 555-6666',
      prAvailable: 'Available for Interviews'
    },
    {
      id: 8,
      name: 'Kevin Feige',
      category: 'Exec',
      days: ['Saturday'],
      knownFor: 'Marvel Studios President',
      agent: 'Marvel Studios - PR Team',
      agentContact: 'pr@marvel.com, (555) 777-8888',
      prAvailable: 'Limited Availability'
    }
  ]);

  const categoryColors = {
    'Celebrity': 'bg-pink-100 text-pink-800',
    'Voice': 'bg-purple-100 text-purple-800',
    'Artist': 'bg-green-100 text-green-800',
    'Exec': 'bg-orange-100 text-orange-800'
  };

  const categoryIcons = {
    'Celebrity': '🎬',
    'Voice': '🎤',
    'Artist': '🎨',
    'Exec': '💼'
  };


  const pressItems = [
    { name: 'Event Press Kit', type: 'PDF', size: '2.3 MB' },
    { name: 'High-res Photos', type: 'Folder', size: '45 MB' },
    { name: 'Press Release - Day 1', type: 'PDF', size: '1.1 MB' },
    { name: 'Celebrity Headshots', type: 'Folder', size: '78 MB' }
  ];

  // Update last active time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentUser(prev => ({ ...prev, lastActive: Date.now() }));
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Initialize films with mock data
  useEffect(() => {
    setFilms(mockFilms);
  }, [mockFilms]);

  const getFilteredCelebrities = () => {
    let filtered = celebrities;
    
    // Filter by day
    if (selectedDay !== 'all') {
      filtered = filtered.filter(celeb => celeb.days.includes(selectedDay));
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(celeb => celeb.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(celeb => 
        celeb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        celeb.knownFor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        celeb.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by credit
    if (creditFilter) {
      filtered = filtered.filter(celeb => 
        celeb.knownFor.toLowerCase().includes(creditFilter.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getFilteredJournalists = () => {
    let filtered = allJournalists;
    
    if (searchQuery) {
      filtered = filtered.filter(journalist =>
        journalist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        journalist.outlet.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getRequestableCelebrities = () => {
    return getFilteredCelebrities().filter(celeb => celeb.prAvailable === 'Available for Interviews');
  };

  const getCelebrityRequests = (celebrityName) => {
    return requests.filter(req => req.celebrities.includes(celebrityName))
      .flatMap(req => req.celebrities
        .filter(celeb => celeb === celebrityName)
        .map(celeb => ({
          ...req,
          celebrity: celeb,
          priority: req.priority[celeb],
          completed: req.completed[celeb],
          status: req.priority[celeb] !== 'Unassigned' ? 'approved' : req.status
        }))
      );
  };

  const getJournalistRequests = (journalistId) => {
    const journalistRequests = requests.filter(req => req.journalistId === journalistId);
    return journalistRequests.flatMap(req => 
      req.celebrities.map(celeb => ({
        ...req,
        celebrity: celeb,
        priority: req.priority[celeb],
        completed: req.completed[celeb],
        status: req.priority[celeb] !== 'Unassigned' ? 'approved' : req.status
      }))
    );
  };

  const sortCelebrityRequests = (requests) => {
    const sorted = [...requests];
    switch (sortBy) {
      case 'priority':
        return sorted.sort((a, b) => {
          const priorityOrder = { 'A': 0, 'B': 1, 'C': 2, 'Unassigned': 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
      case 'outlet':
        return sorted.sort((a, b) => a.outlet.localeCompare(b.outlet));
      case 'completion':
        return sorted.sort((a, b) => a.completed - b.completed);
      case 'status':
        const statusOrder = { 'pending': 0, 'approved': 1, 'completed': 2 };
        return sorted.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      case 'timestamp':
        return sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      default:
        return sorted;
    }
  };

  const toggleCelebritySelection = (celebName) => {
    setSelectedCelebrities(prev => {
      const isSelected = prev.includes(celebName);
      if (isSelected) {
        // Remove story details when deselecting
        removeStoryDetails(celebName);
        return prev.filter(name => name !== celebName);
      } else {
        return [...prev, celebName];
      }
    });
  };

  const submitRequest = () => {
    if (selectedCelebrities.length === 0) return;
    
    const newRequest = {
      id: requests.length + 1,
      journalistId: currentUser.id,
      journalistName: currentUser.name,
      outlet: currentUser.outlet,
      celebrities: [...selectedCelebrities],
      status: 'pending',
      priority: Object.fromEntries(selectedCelebrities.map(name => [name, 'Unassigned'])),
      completed: Object.fromEntries(selectedCelebrities.map(name => [name, false])),
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      storyDetails: { ...celebrityStoryDetails },
      isNew: true
    };
    
    setRequests(prev => [...prev, newRequest]);
    setSelectedCelebrities([]);
    setCelebrityStoryDetails({});
    setActiveTab('requests');
  };
  
  const updateStoryDetails = (celebrityName, details) => {
    setCelebrityStoryDetails(prev => ({
      ...prev,
      [celebrityName]: details
    }));
  };
  
  const removeStoryDetails = (celebrityName) => {
    setCelebrityStoryDetails(prev => {
      const newDetails = { ...prev };
      delete newDetails[celebrityName];
      return newDetails;
    });
  };
  
  // Generate random temporary password
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };
  
  // Preview invitation email for manual journalist
  const previewInvitationEmail = (journalist) => {
    const tempPassword = generateTempPassword();
    
    const emailData = {
      type: 'invitation',
      journalist: journalist,
      from: currentUser.email,
      to: journalist.email,
      subject: 'Invitation to Festival Management Hub',
      body: `Dear ${journalist.name},

You have been invited to access the Festival Management Hub application.

Your login credentials:
Username: ${journalist.email}
Temporary Password: ${tempPassword}

Please log in and reset your password on first access.

Best regards,
${currentUser.name}
FAN EXPO Chicago PR Team`,
      tempPassword: tempPassword,
      timestamp: new Date().toISOString()
    };
    
    setPreviewEmailData(emailData);
    setShowEmailPreview(true);
  };
  
  // Preview password reset email
  const previewPasswordResetEmail = (journalist) => {
    const resetLink = `https://fanexpo-chicago-press.com/reset-password?token=${btoa(journalist.email + Date.now())}`;
    
    const emailData = {
      type: 'reset',
      journalist: journalist,
      from: currentUser.email,
      to: journalist.email,
      subject: 'Password Reset - Festival Management Hub',
      body: `Dear ${journalist.name},

You have requested a password reset for your Festival Management Hub account.

Click the link below to reset your password:
${resetLink}

If you did not request this reset, please ignore this email.

Best regards,
${currentUser.name}
FAN EXPO Chicago PR Team`,
      resetLink: resetLink,
      timestamp: new Date().toISOString()
    };
    
    setPreviewEmailData(emailData);
    setShowEmailPreview(true);
  };
  
  const getManualJournalists = () => {
    return allJournalists.filter(j => j.source === 'manual_entry');
  };
  
  // Send email after preview confirmation
  const sendEmailAfterPreview = async (emailData) => {
    // In production, this would integrate with Google API
    console.log('Sending email:', emailData);
    alert(`${emailData.type === 'invitation' ? 'Invitation' : 'Password reset'} sent to ${emailData.journalist.name}`);
    setShowEmailPreview(false);
    setPreviewEmailData(null);
  };
  
  // Sort journalists
  const getSortedJournalists = (journalistList) => {
    const sorted = [...journalistList].sort((a, b) => {
      let aValue, bValue;
      
      if (journalistSortBy === 'name') {
        aValue = getLastName(a.name);
        bValue = getLastName(b.name);
      } else if (journalistSortBy === 'outlet') {
        aValue = a.outlet;
        bValue = b.outlet;
      } else if (journalistSortBy === 'credentials') {
        // Sort by credentials pickup status (picked up first)
        aValue = a.credentialsPickedUp ? '1' : '0';
        bValue = b.credentialsPickedUp ? '1' : '0';
      }
      
      if (journalistSortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
    return sorted;
  };
  
  // Toggle sort direction
  const toggleSort = (sortType) => {
    if (journalistSortBy === sortType) {
      setJournalistSortDirection(journalistSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setJournalistSortBy(sortType);
      setJournalistSortDirection('asc');
    }
  };

  // Mark request as not new when PR team interacts
  const markRequestAsInteracted = (requestId) => {
    setRequests(prev => prev.map(request => 
      request.id === requestId ? { ...request, isNew: false } : request
    ));
  };

  // Toggle request sort direction
  const toggleRequestSort = (sortType) => {
    if (requestSortBy === sortType) {
      setRequestSortDirection(requestSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setRequestSortBy(sortType);
      setRequestSortDirection('asc');
    }
  };

  // Sort requests with new requests priority
  const getSortedRequests = (requestList) => {
    const sorted = [...requestList].sort((a, b) => {
      // Always prioritize new requests if sorting by status
      if (requestSortBy === 'status') {
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
      }
      
      let aValue, bValue;
      
      switch (requestSortBy) {
        case 'journalist':
          aValue = a.journalistName;
          bValue = b.journalistName;
          break;
        case 'outlet':
          aValue = a.outlet;
          bValue = b.outlet;
          break;
        case 'subject':
          aValue = a.celebrities.join(', ');
          bValue = b.celebrities.join(', ');
          break;
        case 'timestamp':
          aValue = a.timestamp;
          bValue = b.timestamp;
          break;
        case 'priority':
          const getPriorityOrder = (req) => {
            const priorities = Object.values(req.priority);
            if (priorities.includes('A')) return 1;
            if (priorities.includes('B')) return 2;
            if (priorities.includes('C')) return 3;
            if (priorities.includes('Declined')) return 5; // Sort to bottom
            return 4; // Unassigned
          };
          aValue = getPriorityOrder(a);
          bValue = getPriorityOrder(b);
          break;
        case 'status':
        default:
          const statusOrder = { 'pending': 0, 'approved': 1, 'rejected': 2 };
          aValue = statusOrder[a.status];
          bValue = statusOrder[b.status];
          break;
      }
      
      if (requestSortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return sorted;
  };
  
  const getCurrentPRMember = () => {
    return prTeamMembers.find(member => member.name === currentUser.name) || prTeamMembers[0];
  };

  // Get new requests count
  const getNewRequestsCount = () => {
    return requests.filter(req => req.isNew).length;
  };

  const updatePriority = (requestId, celebrity, newPriority) => {
    setRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { 
            ...req, 
            priority: { ...req.priority, [celebrity]: newPriority },
            status: newPriority !== 'Unassigned' ? 'approved' : req.status,
            isNew: false
          }
        : req
    ));
  };

  const toggleCompletion = (requestId, celebrity) => {
    setRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, completed: { ...req.completed, [celebrity]: !req.completed[celebrity] }, isNew: false }
        : req
    ));
  };

  const toggleRequestSelection = (requestKey) => {
    setSelectedRequests(prev => 
      prev.includes(requestKey)
        ? prev.filter(key => key !== requestKey)
        : [...prev, requestKey]
    );
  };

  const selectAllVisibleRequests = (allRequests) => {
    const allKeys = allRequests.map(req => `${req.id}-${req.celebrity}`);
    setSelectedRequests(allKeys);
  };

  const clearSelectedRequests = () => {
    setSelectedRequests([]);
  };

  const applyBulkAction = () => {
    if (!bulkAction || selectedRequests.length === 0) return;

    selectedRequests.forEach(requestKey => {
      const [requestId, celebrity] = requestKey.split('-');
      const numRequestId = parseInt(requestId);

      switch (bulkAction) {
        case 'approve-a':
          updatePriority(numRequestId, celebrity, 'A');
          break;
        case 'approve-b':
          updatePriority(numRequestId, celebrity, 'B');
          break;
        case 'approve-c':
          updatePriority(numRequestId, celebrity, 'C');
          break;
        case 'approve-declined':
          updatePriority(numRequestId, celebrity, 'Declined');
          break;
        case 'complete':
          setRequests(prev => prev.map(req => 
            req.id === numRequestId 
              ? { ...req, completed: { ...req.completed, [celebrity]: true } }
              : req
          ));
          break;
        case 'reject':
          setRequests(prev => prev.map(req => 
            req.id === numRequestId 
              ? { 
                  ...req, 
                  priority: { ...req.priority, [celebrity]: 'Unassigned' },
                  status: 'pending'
                }
              : req
          ));
          break;
      }
    });

    setSelectedRequests([]);
    setBulkAction('');
  };

  const updateCelebrityAvailability = (celebrityId, newAvailability) => {
    setCelebrities(prev => prev.map(celeb => 
      celeb.id === celebrityId 
        ? { ...celeb, prAvailable: newAvailability }
        : celeb
    ));
  };

  const handleManualEntrySubmit = () => {
    const { name, outlet, email, phone, selectedCelebrities, notes } = manualEntryForm;
    
    if (!name || !outlet || !email || selectedCelebrities.length === 0) {
      alert('Please fill in required fields (Name, Outlet, Email) and select at least one guest.');
      return;
    }

    // Check if journalist already exists
    const existingJournalist = allJournalists.find(j => 
      j.name.toLowerCase() === name.toLowerCase() && j.outlet.toLowerCase() === outlet.toLowerCase()
    );

    let journalistId;
    if (existingJournalist) {
      journalistId = existingJournalist.id;
    } else {
      // Create new journalist
      journalistId = Math.max(...allJournalists.map(j => j.id)) + 1;
      const newJournalist = {
        id: journalistId,
        name,
        outlet,
        email,
        phone,
        source: 'manual_entry'
      };
      setAllJournalists(prev => [...prev, newJournalist]);
    }

    // Create new request
    const newRequest = {
      id: Math.max(...requests.map(r => r.id)) + 1,
      journalistId,
      journalistName: name,
      outlet,
      celebrities: [...selectedCelebrities],
      status: 'pending',
      priority: Object.fromEntries(selectedCelebrities.map(name => [name, 'Unassigned'])),
      completed: Object.fromEntries(selectedCelebrities.map(name => [name, false])),
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      notes
    };

    setRequests(prev => [...prev, newRequest]);
    setManualEntryForm({
      name: '',
      outlet: '',
      email: '',
      phone: '',
      specialty: '',
      bio: '',
      selectedCelebrities: [],
      notes: ''
    });
    setShowManualEntry(false);
    setJournalistSearch('');
  };

  const toggleManualCelebritySelection = (celebrityName) => {
    setManualEntryForm(prev => ({
      ...prev,
      selectedCelebrities: prev.selectedCelebrities.includes(celebrityName)
        ? prev.selectedCelebrities.filter(name => name !== celebrityName)
        : [...prev.selectedCelebrities, celebrityName]
    }));
  };

  const getFilteredJournalistsForSearch = () => {
    if (!journalistSearch) return [];
    return allJournalists.filter(j => 
      j.name.toLowerCase().includes(journalistSearch.toLowerCase()) ||
      j.outlet.toLowerCase().includes(journalistSearch.toLowerCase())
    ).slice(0, 5);
  };

  const selectExistingJournalist = (journalist) => {
    setManualEntryForm(prev => ({
      ...prev,
      name: journalist.name,
      outlet: journalist.outlet,
      email: journalist.email,
      phone: journalist.phone || ''
    }));
    setJournalistSearch('');
    setIsExistingJournalist(true);
  };
  
  const handleNameChange = (value) => {
    setManualEntryForm(prev => ({ ...prev, name: value }));
    setJournalistSearch(value);
    
    // Check if this matches an existing journalist exactly
    const exactMatch = allJournalists.find(j => 
      j.name.toLowerCase() === value.toLowerCase()
    );
    
    if (exactMatch) {
      setManualEntryForm(prev => ({
        ...prev,
        outlet: exactMatch.outlet,
        email: exactMatch.email,
        phone: exactMatch.phone || ''
      }));
      setIsExistingJournalist(true);
    } else {
      setIsExistingJournalist(false);
    }
  };
  
  const clearManualForm = () => {
    setManualEntryForm({
      name: '',
      outlet: '',
      email: '',
      phone: '',
      selectedCelebrities: [],
      notes: ''
    });
    setIsExistingJournalist(false);
    setJournalistSearch('');
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    if (chatView === 'prteam') {
      // PR Team message
      const prMessage = {
        id: prTeamMessages.length + 1,
        from: currentUser.name,
        fromRole: currentUser.role,
        message: newMessage,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        urgent: isUrgent
      };
      
      setPrTeamMessages(prev => [...prev, prMessage]);
    } else if (chatView === 'direct' && selectedConversation) {
      // Direct message with selected conversation
      sendDirectMessage();
      return;
    } else {
      // General message
      const message = {
        id: messages.length + 1,
        type: chatView === 'general' ? 'general' : 'direct',
        from: currentUser.name,
        fromRole: currentUser.role,
        message: newMessage,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        urgent: isUrgent
      };
      
      setMessages(prev => [...prev, message]);
    }
    setNewMessage('');
    setIsUrgent(false);
    
    // Auto-scroll to bottom after sending message
    setTimeout(() => {
      const chatContainer = document.getElementById('chat-messages-container');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
    
    if (isUrgent && currentUser.role === 'pr') {
      console.log('🔔 PUSH NOTIFICATION sent to inactive users:', newMessage);
    }
  };

  const sendTargetedMessage = () => {
    if (!targetedMessage.trim() || selectedRecipients.length === 0) return;
    
    const message = {
      id: messages.length + 1,
      type: 'targeted',
      from: currentUser.name,
      fromRole: currentUser.role,
      to: `${selectedCelebrity} requesters`,
      recipients: selectedRecipients,
      message: targetedMessage,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      urgent: isUrgent
    };
    
    setMessages(prev => [...prev, message]);
    setTargetedMessage('');
    setSelectedRecipients([]);
    setSelectedCelebrity(null);
    setIsUrgent(false);
    
    if (isUrgent) {
      console.log('🔔 PUSH NOTIFICATION sent to:', selectedRecipients.join(', '));
    }
  };

  const sendJournalistMessage = () => {
    if (!targetedMessage.trim() || selectedJournalists.length === 0) return;
    
    const message = {
      id: messages.length + 1,
      type: 'broadcast',
      from: currentUser.name,
      fromRole: currentUser.role,
      to: 'Selected journalists',
      recipients: selectedJournalists,
      message: targetedMessage,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      urgent: isUrgent
    };
    
    setMessages(prev => [...prev, message]);
    setTargetedMessage('');
    setSelectedJournalists([]);
    setIsUrgent(false);
    
    if (isUrgent) {
      console.log('🔔 PUSH NOTIFICATION sent to:', selectedJournalists.join(', '));
    }
  };

  const toggleRecipient = (journalistName) => {
    setSelectedRecipients(prev => 
      prev.includes(journalistName)
        ? prev.filter(name => name !== journalistName)
        : [...prev, journalistName]
    );
  };

  const toggleJournalistSelection = (journalistName) => {
    setSelectedJournalists(prev => 
      prev.includes(journalistName)
        ? prev.filter(name => name !== journalistName)
        : [...prev, journalistName]
    );
  };

  const getFilteredMessages = () => {
    if (!messageSearch) return messages;
    
    return messages.filter(msg =>
      msg.message.toLowerCase().includes(messageSearch.toLowerCase()) ||
      msg.from.toLowerCase().includes(messageSearch.toLowerCase()) ||
      (msg.to && msg.to.toLowerCase().includes(messageSearch.toLowerCase()))
    );
  };

  const getFilteredRecipients = (recipientList) => {
    if (!recipientSearch) return recipientList;
    
    return recipientList.filter(recipient =>
      recipient.journalistName.toLowerCase().includes(recipientSearch.toLowerCase()) ||
      recipient.outlet.toLowerCase().includes(recipientSearch.toLowerCase())
    );
  };

  const getFilteredJournalistList = (journalistList) => {
    if (!recipientSearch) return journalistList;
    
    return journalistList.filter(journalist =>
      journalist.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
      journalist.outlet.toLowerCase().includes(recipientSearch.toLowerCase())
    );
  };

  const getFilteredRequestsByTime = (requestList) => {
    if (timeFilter === 'all') return requestList;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() + 7);
    
    return requestList.filter(req => {
      const requestDate = new Date(req.timestamp);
      
      switch (timeFilter) {
        case 'today':
          return requestDate >= today && requestDate < tomorrow;
        case 'tomorrow':
          return requestDate >= tomorrow && requestDate < new Date(tomorrow.getTime() + 24*60*60*1000);
        case 'thisWeek':
          return requestDate >= today && requestDate < thisWeek;
        default:
          return true;
      }
    });
  };

  // Filter requests by search query
  const getFilteredRequestsBySearch = (requestList) => {
    if (!searchQuery) return requestList;
    
    return requestList.filter(req => 
      req.journalistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.outlet.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.celebrities.some(celeb => celeb.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  // Toggle guest sort direction
  const toggleGuestSort = () => {
    setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
  };

  // Helper function to extract last name for sorting
  const getLastName = (fullName) => {
    const nameParts = fullName.trim().split(' ');
    return nameParts[nameParts.length - 1];
  };

  // Get sorted guests
  const getSortedGuests = (guestList) => {
    return [...guestList].sort((a, b) => {
      if (guestSortDirection === 'asc') {
        return getLastName(a.name).localeCompare(getLastName(b.name));
      } else {
        return getLastName(b.name).localeCompare(getLastName(a.name));
      }
    });
  };

  // Toggle credentials pickup status
  const toggleCredentials = (journalistId) => {
    setAllJournalists(prev => prev.map(journalist => 
      journalist.id === journalistId 
        ? { ...journalist, credentialsPickedUp: !journalist.credentialsPickedUp }
        : journalist
    ));
  };

  // Update journalist notes
  const updateJournalistNotes = (journalistId, notes) => {
    setAllJournalists(prev => prev.map(journalist => 
      journalist.id === journalistId 
        ? { ...journalist, notes }
        : journalist
    ));
  };

  // Get credentials pickup stats
  const getCredentialsStats = () => {
    const total = allJournalists.length;
    const pickedUp = allJournalists.filter(j => j.credentialsPickedUp).length;
    return { pickedUp, total, percentage: Math.round((pickedUp / total) * 100) };
  };

  // Navigate to journalist card
  const navigateToJournalist = (journalistId) => {
    setActiveTab('journalists');
    // Scroll to journalist after tab switch
    setTimeout(() => {
      const element = document.getElementById(`journalist-${journalistId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight effect
        element.style.backgroundColor = '#fef3cd';
        setTimeout(() => {
          element.style.backgroundColor = '';
        }, 2000);
      }
    }, 100);
  };

  // Navigate to guest card
  const navigateToGuest = (guestName) => {
    setActiveTab('celebrities');
    // Expand the celebrity card after tab switch
    setTimeout(() => {
      setExpandedCelebrity(guestName);
      // Scroll to the expanded card
      setTimeout(() => {
        const element = document.querySelector(`[data-guest-name="${guestName}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight effect
          element.style.backgroundColor = '#fef3cd';
          setTimeout(() => {
            element.style.backgroundColor = '';
          }, 2000);
        }
      }, 100);
    }, 100);
  };

  // Film utility functions
  const getFilteredFilms = () => {
    let filtered = films;
    
    // Filter by search query
    if (filmSearchQuery) {
      filtered = filtered.filter(film => 
        film.title.toLowerCase().includes(filmSearchQuery.toLowerCase()) ||
        film.director.toLowerCase().includes(filmSearchQuery.toLowerCase()) ||
        film.country.toLowerCase().includes(filmSearchQuery.toLowerCase()) ||
        film.genre.some(g => g.toLowerCase().includes(filmSearchQuery.toLowerCase()))
      );
    }
    
    // Filter by status
    if (filmStatusFilter !== 'all') {
      filtered = filtered.filter(film => film.status === filmStatusFilter);
    }
    
    // Filter by category
    if (filmCategoryFilter !== 'all') {
      filtered = filtered.filter(film => film.category === filmCategoryFilter);
    }
    
    return filtered;
  };

  const getFilmStats = () => {
    const confirmed = films.filter(f => f.status === 'confirmed').length;
    const underReview = films.filter(f => f.status === 'under_review').length;
    const waitlist = films.filter(f => f.status === 'waitlist').length;
    const total = films.length;
    
    return { confirmed, underReview, waitlist, total };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'waitlist': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return '✓';
      case 'under_review': return '⏳';
      case 'waitlist': return '⏸';
      default: return '?';
    }
  };

  // Get unread message counts
  const getUnreadMessageCounts = () => {
    // For demo purposes, using some logic to simulate unread messages
    const generalCount = messages.filter(msg => 
      msg.type === 'general' && 
      new Date(msg.timestamp) > new Date(Date.now() - 30 * 60 * 1000) // Messages in last 30 minutes
    ).length;
    
    const prTeamCount = prTeamMessages.filter(msg => 
      new Date(msg.timestamp) > new Date(Date.now() - 30 * 60 * 1000)
    ).length;
    
    // Count direct messages sent TO the current user (unread)
    const allDMs = [...messages.filter(m => m.type === 'direct'), ...directMessages];
    const directCount = allDMs.filter(msg => 
      msg.to === currentUser.name && // Messages sent TO current user
      msg.from !== currentUser.name && // Not sent BY current user
      new Date(msg.timestamp) > new Date(Date.now() - 30 * 60 * 1000) // Recent messages
    ).length;
    
    return { general: generalCount, prteam: prTeamCount, direct: directCount };
  };

  // Handle recipient input changes for autocomplete
  const handleRecipientInputChange = (value) => {
    setNewMessageRecipient(value);
    
    if (value.trim()) {
      const filtered = getAllUsers().filter(user => 
        user.name.toLowerCase().includes(value.toLowerCase()) ||
        user.displayName.toLowerCase().includes(value.toLowerCase())
      );
      setRecipientSuggestions(filtered);
      setShowRecipientSuggestions(true);
    } else {
      setRecipientSuggestions([]);
      setShowRecipientSuggestions(false);
    }
  };

  // Select recipient from suggestions
  const selectRecipient = (user) => {
    setNewMessageRecipient(user.name);
    setShowRecipientSuggestions(false);
  };

  // Agent management functions
  const getAllAgents = () => {
    const agentMap = new Map();
    
    celebrities.forEach(celebrity => {
      const agentName = celebrity.agent.split(' - ')[1] || celebrity.agent;
      const agentCompany = celebrity.agent.split(' - ')[0] || 'Unknown';
      const agentKey = celebrity.agent;
      
      if (!agentMap.has(agentKey)) {
        agentMap.set(agentKey, {
          id: agentKey,
          name: agentName,
          company: agentCompany,
          contact: celebrity.agentContact,
          guests: [],
          totalRequests: 0,
          availableGuests: 0
        });
      }
      
      const agent = agentMap.get(agentKey);
      agent.guests.push(celebrity);
      
      // Count requests for this celebrity
      const requestCount = requests.filter(r => r.celebrities.includes(celebrity.name)).length;
      agent.totalRequests += requestCount;
      
      // Count available guests
      if (celebrity.prAvailable === 'Available for Interviews') {
        agent.availableGuests++;
      }
    });
    
    return Array.from(agentMap.values()).sort((a, b) => getLastName(a.name).localeCompare(getLastName(b.name)));
  };

  const updateAgentGuestAvailability = (agentId, availability) => {
    setCelebrities(prev => prev.map(celebrity => 
      celebrity.agent === agentId 
        ? { ...celebrity, prAvailable: availability }
        : celebrity
    ));
  };

  // Separate available and unavailable guests for journalist view
  const separateGuestsByAvailability = (guestList) => {
    const available = guestList.filter(guest => guest.prAvailable === 'Available for Interviews');
    const unavailable = guestList.filter(guest => guest.prAvailable === 'Not Available');
    const limited = guestList.filter(guest => guest.prAvailable === 'Limited Availability');
    
    return {
      available: [...available, ...limited], // Include limited availability with available
      unavailable
    };
  };

  // Direct message helper functions
  const getAllUsers = () => {
    const prUsers = prTeamMembers.map(member => ({
      ...member,
      role: 'pr',
      displayName: `${member.name} (PR Team)`
    }));
    const journalistUsers = allJournalists.map(journalist => ({
      ...journalist,
      role: 'journalist',
      displayName: `${journalist.name} (${journalist.outlet})`
    }));
    
    // Filter users based on current user's role
    let availableUsers = [];
    if (currentUser.role === 'pr') {
      // PR team can message everyone
      availableUsers = [...prUsers, ...journalistUsers];
    } else if (currentUser.role === 'journalist') {
      // Journalists can only message PR team members
      availableUsers = prUsers;
    }
    
    return availableUsers.filter(user => user.name !== currentUser.name);
  };

  const getConversationId = (user1, user2) => {
    const users = [user1, user2].sort();
    return `${users[0].toLowerCase().replace(/\s+/g, '-')}-${users[1].toLowerCase().replace(/\s+/g, '-')}`;
  };

  const getAllConversations = () => {
    const allDMs = [...messages.filter(m => m.type === 'direct'), ...directMessages];
    const conversationMap = new Map();
    const allowedUsers = getAllUsers().map(user => user.name);
    
    allDMs.forEach(message => {
      const otherUser = message.from === currentUser.name ? message.to : message.from;
      const convId = message.conversationId || getConversationId(message.from, message.to);
      
      // Only include conversations with users the current user is allowed to message
      if (!allowedUsers.includes(otherUser)) {
        return;
      }
      
      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, {
          id: convId,
          otherUser,
          messages: [],
          lastMessage: null,
          lastTimestamp: '',
          unreadCount: 0
        });
      }
      
      const conversation = conversationMap.get(convId);
      conversation.messages.push(message);
      conversation.lastMessage = message.message;
      conversation.lastTimestamp = message.timestamp;
    });
    
    return Array.from(conversationMap.values()).sort((a, b) => 
      new Date(b.lastTimestamp) - new Date(a.lastTimestamp)
    );
  };

  const getFilteredConversations = () => {
    const conversations = getAllConversations();
    if (!conversationSearch) return conversations;
    
    return conversations.filter(conv => 
      conv.otherUser.toLowerCase().includes(conversationSearch.toLowerCase())
    );
  };

  const startDirectMessage = (recipient) => {
    const conversationId = getConversationId(currentUser.name, recipient);
    setSelectedConversation(conversationId);
    setChatView('direct');
    setShowNewMessageModal(false);
    setNewMessageRecipient('');
  };

  const sendDirectMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    const conversations = getAllConversations();
    const conversation = conversations.find(c => c.id === selectedConversation);
    
    if (conversation) {
      const directMessage = {
        id: Math.max(...directMessages.map(m => m.id), 0) + 1,
        type: 'direct',
        from: currentUser.name,
        fromRole: currentUser.role,
        to: conversation.otherUser,
        message: newMessage,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        urgent: isUrgent,
        conversationId: selectedConversation
      };
      
      setDirectMessages(prev => [...prev, directMessage]);
      setNewMessage('');
      setIsUrgent(false);
      
      // Auto-scroll to bottom after sending message
      setTimeout(() => {
        const chatContainer = document.getElementById('chat-messages-container');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    }
  };

  // Auto-scroll function for new messages
  const scrollToBottom = () => {
    setTimeout(() => {
      const chatContainer = document.getElementById('chat-messages-container');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  };

  // Handle mouse events for resizing
  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    const chatElement = document.getElementById('chat-container');
    if (chatElement) {
      const rect = chatElement.getBoundingClientRect();
      const newHeight = Math.max(200, Math.min(800, e.clientY - rect.top));
      setChatHeight(newHeight);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Add global mouse event listeners for resizing
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  // Auto-scroll when messages change
  React.useEffect(() => {
    scrollToBottom();
  }, [directMessages, prTeamMessages, messages, selectedConversation]);

  const CelebrityCard = ({ celebrity, selectable = false, selected = false }) => {
    const isExpanded = expandedCelebrity === celebrity.name;
    const requests = getCelebrityRequests(celebrity.name);
    const completedCount = requests.filter(r => r.completed).length;
    
    // Get background color based on category (only for PR team view)
    const getCategoryBackground = () => {
      if (selectable || selected) return selected ? 'bg-pink-50 border-pink-300' : 'bg-white';
      if (currentUser.role !== 'pr') return 'bg-white';
      
      switch (celebrity.category) {
        case 'Celebrity': return 'bg-green-50';
        case 'Voice': return 'bg-blue-50';
        case 'Artist': return 'bg-yellow-50';
        case 'Exec': return 'bg-white';
        default: return 'bg-white';
      }
    };
    
    return (
      <div 
        data-guest-name={celebrity.name}
        className={`border rounded-lg p-4 ${selectable ? 'cursor-pointer hover:bg-gray-50' : ''} ${getCategoryBackground()}`}
        onClick={selectable ? () => {
          console.log('Celebrity card clicked (selectable):', celebrity.name);
          toggleCelebritySelection(celebrity.name);
        } : (e) => {
          console.log('Celebrity card clicked (non-selectable):', celebrity.name);
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-lg">{celebrity.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded text-xs ${categoryColors[celebrity.category]}`}>
                    {categoryIcons[celebrity.category]} {celebrity.category}
                  </span>
                </div>
              </div>
              {!selectable && (
                <button
                  type="button"
                  onClick={(e) => {
                    console.log('View details button clicked:', celebrity.name);
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedModalCelebrity(celebrity);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  View Details
                </button>
              )}
            </div>
            
            <div className="text-gray-600 text-sm mb-2">
              {celebrity.knownFor.split(', ').map((credit, index) => (
                <span key={credit}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCreditFilter(creditFilter === credit.trim() ? '' : credit.trim());
                    }}
                    className={`hover:text-pink-600 hover:underline ${
                      creditFilter === credit.trim() ? 'text-pink-600 font-medium' : ''
                    }`}
                  >
                    {credit.trim()}
                  </button>
                  {index < celebrity.knownFor.split(', ').length - 1 && ', '}
                </span>
              ))}
            </div>
            <div className="flex gap-1 mb-2">
              {celebrity.days.map(day => (
                <span key={day} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  {day}
                </span>
              ))}
            </div>
            
            {currentUser.role === 'pr' && requests.length > 0 && (
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">{requests.length} requests</span>
                <span className="text-green-600 ml-2">({completedCount} completed)</span>
              </div>
            )}
          </div>
          
          {selectable && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Request Interview</span>
              <div className={`w-4 h-4 rounded border-2 ${selected ? 'bg-pink-500 border-pink-500' : 'border-gray-300'}`}>
                {selected && <div className="w-full h-full flex items-center justify-center text-white text-xs">✓</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const JournalistCard = ({ journalist }) => {
    const isExpanded = expandedJournalist === journalist.id;
    const journalistRequests = getJournalistRequests(journalist.id);
    const completedCount = journalistRequests.filter(r => r.completed).length;
    const hasRequests = journalistRequests.length > 0;
    
    return (
      <div id={`journalist-${journalist.id}`} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{journalist.name}</h3>
                  {journalist.source === 'manual_entry' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                      <Mail size={10} className="mr-1" />
                      Manual Entry
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm font-medium">{journalist.outlet}</p>
                {journalist.specialty && (
                  <p className="text-gray-500 text-xs">{journalist.specialty}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedModalJournalist(journalist)}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                View Details
              </button>
            </div>
            
            {/* Contact Preview */}
            <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
              <span>📧 {journalist.email}</span>
              {journalist.phone && <span>📞 {journalist.phone}</span>}
            </div>
            
            {hasRequests ? (
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">{journalistRequests.length} requests</span>
                <span className="text-green-600 ml-2">({completedCount} completed)</span>
              </div>
            ) : (
              <div className="text-sm text-orange-600 mb-2">No requests submitted</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const RequestRow = ({ request, showSelection = false }) => {
    const isJournalistView = currentUser.role === 'journalist';
    const requestKey = `${request.id}-${request.celebrity}`;
    const isSelected = selectedRequests.includes(requestKey);
    
    return (
      <div className={`border rounded-lg p-4 ${
        request.isNew ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
      } ${isSelected ? 'ring-2 ring-pink-200 bg-pink-50' : ''}`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-start gap-3">
            {showSelection && currentUser.role === 'pr' && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleRequestSelection(requestKey)}
                className="mt-1"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                {currentUser.role === 'pr' ? (
                  <button
                    onClick={() => navigateToJournalist(request.journalistId)}
                    className="font-semibold text-left hover:text-pink-600 hover:underline"
                  >
                    {request.journalistName}
                  </button>
                ) : (
                  <h3 className="font-semibold">{request.journalistName}</h3>
                )}
                {request.isNew && currentUser.role === 'pr' && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    NEW
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm">{request.outlet}</p>
              <p className="text-gray-500 text-xs">{request.timestamp}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs ${
              request.priority === 'Declined' ? 'bg-red-100 text-red-800' :
              request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
              request.status === 'approved' ? 'bg-green-100 text-green-800' : 
              'bg-red-100 text-red-800'
            }`}>
              {request.priority === 'Declined' ? 'Declined' : request.status}
            </span>
            {request.completed && (
              <CheckCircle size={16} className="text-green-600" />
            )}
          </div>
        </div>
        
        <div className="p-2 bg-gray-50 rounded">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{request.celebrity}</span>
              {!isJournalistView && (
                <span className={`px-2 py-1 rounded text-xs ${
                  request.priority === 'A' ? 'bg-red-100 text-red-800' :
                  request.priority === 'B' ? 'bg-yellow-100 text-yellow-800' :
                  request.priority === 'C' ? 'bg-pink-100 text-pink-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  Priority {request.priority}
                </span>
              )}
              {request.completed && (
                <span className="text-green-600 text-sm font-medium">Completed</span>
              )}
            </div>
            
            {currentUser.role === 'pr' && (
              <div className="flex items-center gap-2">
                <select 
                  value={request.priority}
                  onChange={(e) => updatePriority(request.id, request.celebrity, e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="Unassigned">Unassigned</option>
                  <option value="A">Priority A</option>
                  <option value="B">Priority B</option>
                  <option value="C">Priority C</option>
                  <option value="Declined">Declined</option>
                </select>
                
                <button
                  onClick={() => toggleCompletion(request.id, request.celebrity)}
                  className={`px-3 py-1 text-xs rounded ${
                    request.completed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {request.completed ? 'Completed' : 'Mark Complete'}
                </button>
              </div>
            )}
          </div>
          
          {/* Journalist's Request Notes */}
          {request.storyDetails && request.storyDetails[request.celebrity] && (
            <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
              <div className="text-xs font-medium text-blue-700 mb-1">📝 Journalist's Request Notes:</div>
              <div className="text-sm text-gray-800">{request.storyDetails[request.celebrity]}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ChatMessage = ({ message }) => (
    <div className={`mb-4 ${message.fromRole === currentUser.role && message.from === currentUser.name ? 'text-right' : ''}`}>
      <div className={`inline-block max-w-xs p-3 rounded-lg ${
        message.fromRole === currentUser.role && message.from === currentUser.name
          ? 'bg-pink-500 text-white'
          : 'bg-gray-200 text-gray-800'
      }`}>
        <div className="text-xs opacity-75 mb-1 flex items-center gap-1">
          {message.urgent && <Bell size={12} className="text-orange-500" />}
          {message.from} {message.fromRole === 'pr' ? '(PR Team)' : ''}
          {(message.type === 'targeted' || message.type === 'broadcast') && ` → ${message.to}`}
        </div>
        <div>{message.message}</div>
        <div className="text-xs opacity-75 mt-1">{message.timestamp}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 relative">
      {/* FAN EXPO Watermark */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "url('/fanexpo-logo.svg')",
          backgroundRepeat: 'repeat',
          backgroundPosition: '0 0, 300px 150px',
          backgroundSize: '300px 90px',
          opacity: 0.06,
          transform: 'rotate(-10deg)'
        }}
      />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b relative z-10">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* App Title */}
            <h1 className="text-2xl font-bold text-gray-900">Festival Management Hub</h1>
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="relative">
                <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder={currentUser.role === 'pr' ? "Search guests, journalists, or outlets..." : "Search guests..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
              </div>
            </form>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{currentUser.name}</span>
              {currentUser.outlet && <span> • {currentUser.outlet}</span>}
              {currentUser.role === 'pr' && <span> • PR Team</span>}
            </div>
            {/* Role switcher - only show for development/demo */}
            {process.env.NODE_ENV === 'development' && (
              <select 
                value={currentUser.role}
                onChange={(e) => setCurrentUser(prev => ({
                  ...prev, 
                  role: e.target.value,
                  name: e.target.value === 'pr' ? 'Jessica Martinez' : 'Sarah Johnson',
                  outlet: e.target.value === 'pr' ? null : 'Entertainment Weekly',
                  email: e.target.value === 'pr' ? 'jessica.martinez@example.com' : 'sarah.johnson@ew.com'
                }))}
                className="px-3 py-1 border rounded text-sm bg-yellow-50 border-yellow-300"
                title="Development only - role switcher"
              >
                <option value="journalist">Journalist View</option>
                <option value="pr">PR Team View</option>
              </select>
            )}
            {/* Acacia Logo */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Powered by</span>
              <img 
                src="/acacia-logo.svg" 
                alt="Acacia Consulting Group" 
                className="h-10 w-auto"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative z-10">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm h-screen relative z-10">
          <div className="p-4">
            {/* Module Selection */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Modules</h3>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveModule('programming');
                    setActiveTab('films');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                    activeModule === 'programming' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Star size={20} />
                  <span>Programming</span>
                </button>
                
                <button
                  onClick={() => {
                    setActiveModule('scheduling');
                    setActiveTab('schedule');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                    activeModule === 'scheduling' ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Calendar size={20} />
                  <span>Scheduling & Venues</span>
                </button>
                
                <button
                  onClick={() => {
                    setActiveModule('press');
                    setActiveTab('journalists');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                    activeModule === 'press' ? 'bg-pink-100 text-pink-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FileText size={20} />
                  <span>Press & Media</span>
                </button>
                
                <button
                  onClick={() => {
                    setActiveModule('operations');
                    setActiveTab('guests');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                    activeModule === 'operations' ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Settings size={20} />
                  <span>Operations</span>
                </button>
              </div>
            </div>
            
            {/* Module-Specific Navigation */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {activeModule === 'programming' && 'Programming Tools'}
                {activeModule === 'scheduling' && 'Scheduling Tools'}
                {activeModule === 'press' && 'Press Tools'}
                {activeModule === 'operations' && 'Operations Tools'}
              </h3>
              
              <div className="space-y-1">
                {/* Programming Module Navigation */}
                {activeModule === 'programming' && (
                  <>
                    <button
                      onClick={() => setActiveTab('films')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                        activeTab === 'films' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <FileText size={18} />
                      <span>Films</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('submissions')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                        activeTab === 'submissions' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Plus size={18} />
                      <span>Submissions</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('categories')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                        activeTab === 'categories' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Filter size={18} />
                      <span>Categories</span>
                    </button>
                  </>
                )}
                
                {/* Scheduling Module Navigation */}
                {activeModule === 'scheduling' && (
                  <>
                    <button
                      onClick={() => setActiveTab('schedule')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                        activeTab === 'schedule' ? 'bg-green-50 text-green-700 border border-green-200' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Calendar size={18} />
                      <span>Schedule</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('venues')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                        activeTab === 'venues' ? 'bg-green-50 text-green-700 border border-green-200' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Users size={18} />
                      <span>Venues</span>
                    </button>
                  </>
                )}
                
                {/* Press Module Navigation */}
                {activeModule === 'press' && (
                  <>
                    <button
                      onClick={() => setActiveTab('journalists')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                        activeTab === 'journalists' ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <User size={18} />
                      <span>Journalists</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('press-requests')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                        activeTab === 'press-requests' ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <MessageSquare size={18} />
                      <span>Press Requests</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('messages')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                        activeTab === 'messages' ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Mail size={18} />
                      <span>Messages</span>
                    </button>
                  </>
                )}
                
                {/* Operations Module Navigation */}
                {activeModule === 'operations' && (
                  <>
                    <button
                      onClick={() => setActiveTab('guests')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                        activeTab === 'guests' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Users size={18} />
                      <span>Festival Guests</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                        activeTab === 'dashboard' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Settings size={18} />
                      <span>Dashboard</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gray-100 relative z-10">
          {/* Programming Module - Films Tab */}
          {activeModule === 'programming' && activeTab === 'films' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Film Management</h2>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowFilmModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Film
                  </button>
                  <div className="text-sm text-gray-600">
                    {getFilmStats().total} films total
                  </div>
                </div>
              </div>
              
              {/* Film Statistics */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Confirmed</p>
                      <p className="text-2xl font-bold text-green-600">{getFilmStats().confirmed}</p>
                    </div>
                    <CheckCircle className="text-green-500" size={24} />
                  </div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Under Review</p>
                      <p className="text-2xl font-bold text-yellow-600">{getFilmStats().underReview}</p>
                    </div>
                    <Clock className="text-yellow-500" size={24} />
                  </div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Waitlist</p>
                      <p className="text-2xl font-bold text-gray-600">{getFilmStats().waitlist}</p>
                    </div>
                    <AlertCircle className="text-gray-500" size={24} />
                  </div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Films</p>
                      <p className="text-2xl font-bold text-blue-600">{getFilmStats().total}</p>
                    </div>
                    <Star className="text-blue-500" size={24} />
                  </div>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="bg-white rounded-lg border p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Search size={18} />
                    <input
                      type="text"
                      placeholder="Search films, directors, countries..."
                      value={filmSearchQuery}
                      onChange={(e) => setFilmSearchQuery(e.target.value)}
                      className="px-3 py-2 border rounded-lg w-64"
                    />
                  </div>
                  <select
                    value={filmStatusFilter}
                    onChange={(e) => setFilmStatusFilter(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="all">All Status</option>
                    <option value="confirmed">✓ Confirmed</option>
                    <option value="under_review">⏳ Under Review</option>
                    <option value="waitlist">⏸ Waitlist</option>
                  </select>
                  <select
                    value={filmCategoryFilter}
                    onChange={(e) => setFilmCategoryFilter(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="all">All Categories</option>
                    <option value="Feature Narrative">Feature Narrative</option>
                    <option value="Documentary Short">Documentary Short</option>
                    <option value="Narrative Short">Narrative Short</option>
                  </select>
                  {(filmSearchQuery || filmStatusFilter !== 'all' || filmCategoryFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setFilmSearchQuery('');
                        setFilmStatusFilter('all');
                        setFilmCategoryFilter('all');
                      }}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {/* Films List */}
              <div className="space-y-4">
                {getFilteredFilms().map(film => (
                  <div key={film.id} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{film.title}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(film.status)}`}>
                            {getStatusIcon(film.status)} {film.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {film.premiereType}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">
                          <strong>Director:</strong> {film.director} | <strong>Country:</strong> {film.country} | <strong>Year:</strong> {film.year}
                        </p>
                        <p className="text-gray-600 mb-2">
                          <strong>Runtime:</strong> {film.runtime} min | <strong>Category:</strong> {film.category} | <strong>Rating:</strong> {film.rating}
                        </p>
                        <p className="text-gray-700 mb-3">{film.synopsis}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {film.genre.map(g => (
                            <span key={g} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              {g}
                            </span>
                          ))}
                        </div>
                        {film.screeningTimes.length > 0 && (
                          <div className="text-sm text-gray-600">
                            <strong>Screenings:</strong> {film.screeningTimes.join(', ')} | <strong>Venue:</strong> {film.venue}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedFilm(film)}
                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
                      >
                        View Details
                      </button>
                    </div>
                    {film.notes && (
                      <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                        <p className="text-sm text-yellow-800">
                          <strong>Notes:</strong> {film.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                
                {getFilteredFilms().length === 0 && (
                  <div className="bg-white rounded-lg border p-8 text-center">
                    <Search size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No films found</h3>
                    <p className="text-gray-600">
                      Try adjusting your search criteria or filters.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Programming Module - Submissions Tab */}
          {activeModule === 'programming' && activeTab === 'submissions' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Film Submissions</h2>
                <div className="text-sm text-gray-600">
                  156 submissions under review
                </div>
              </div>
              
              <div className="bg-white rounded-lg border p-8 text-center">
                <div className="max-w-md mx-auto">
                  <Plus size={48} className="mx-auto text-blue-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Submission Management</h3>
                  <p className="text-gray-600 mb-4">
                    Track and review all film submissions for the festival.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700">
                      Module under development - Submission workflow, review process, 
                      and selection tools coming soon.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Programming Module - Categories Tab */}
          {activeModule === 'programming' && activeTab === 'categories' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Festival Categories</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Plus size={16} />
                  Add Category
                </button>
              </div>
              
              <div className="bg-white rounded-lg border p-8 text-center">
                <div className="max-w-md mx-auto">
                  <Filter size={48} className="mx-auto text-blue-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Category Management</h3>
                  <p className="text-gray-600 mb-4">
                    Organize films into festival categories and competition sections.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700">
                      Module under development - Category creation, film assignment, 
                      and competition management tools coming soon.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guests Tab (now under Operations) */}
          {activeModule === 'operations' && activeTab === 'guests' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Guests Attending</h2>
                  {creditFilter && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">Filtered by:</span>
                      <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded">
                        {creditFilter}
                      </span>
                      <button
                        onClick={() => setCreditFilter('')}
                        className="text-pink-600 hover:text-pink-800 text-xs"
                      >
                        Clear filter
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="all">All Categories</option>
                    <option value="Celebrity">🎬 Celebrity</option>
                    <option value="Voice">🎤 Voice</option>
                    <option value="Artist">🎨 Artist</option>
                    <option value="Exec">💼 Exec</option>
                  </select>
                  <select 
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="all">All Days</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
              </div>
              
              {/* Sort Controls */}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-gray-600">Sort by:</span>
                <button
                  onClick={toggleGuestSort}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                    'bg-pink-100 text-pink-700'
                  }`}
                >
                  Name
                  <span className="ml-1">
                    {guestSortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                </button>
              </div>

              {/* Category Overview */}
              <div className="grid grid-cols-5 gap-4 mb-6">
                {/* ALL Button */}
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setCreditFilter('');
                  }}
                  className={`p-3 rounded-lg border text-center transition-all hover:shadow-md ${
                    selectedCategory === 'all'
                      ? 'bg-pink-100 border-pink-300 ring-2 ring-pink-200'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="text-2xl mb-1">👥</div>
                  <div className="font-semibold">ALL</div>
                  <div className="text-sm text-gray-600">
                    {celebrities.length} total
                  </div>
                </button>

                {Object.keys(categoryColors).map(category => {
                  const count = celebrities.filter(c => c.category === category).length;
                  const filtered = getFilteredCelebrities().filter(c => c.category === category).length;
                  const isSelected = selectedCategory === category;
                  
                  // Get category background color for PR view
                  const getCategoryButtonBackground = () => {
                    if (isSelected) return 'bg-pink-100 border-pink-300 ring-2 ring-pink-200';
                    if (currentUser.role !== 'pr') return 'bg-white hover:bg-gray-50';
                    
                    switch (category) {
                      case 'Celebrity': return 'bg-green-50 hover:bg-green-100 border-green-200';
                      case 'Voice': return 'bg-blue-50 hover:bg-blue-100 border-blue-200';
                      case 'Artist': return 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200';
                      case 'Exec': return 'bg-white hover:bg-gray-50';
                      default: return 'bg-white hover:bg-gray-50';
                    }
                  };
                  
                  return (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCategory(isSelected ? 'all' : category);
                        setCreditFilter('');
                      }}
                      className={`p-3 rounded-lg border text-center transition-all hover:shadow-md ${getCategoryButtonBackground()}`}
                    >
                      <div className="text-2xl mb-1">{categoryIcons[category]}</div>
                      <div className="font-semibold">{category}</div>
                      <div className="text-sm text-gray-600">
                        {searchQuery || selectedDay !== 'all' ? `${filtered}/${count}` : count} total
                      </div>
                    </button>
                  );
                })}
              </div>

              {currentUser.role === 'journalist' && (
                <>
                  {/* Available Guests for Interview Requests */}
                  {(() => {
                    const { available, unavailable } = separateGuestsByAvailability(getSortedGuests(getFilteredCelebrities()));
                    return (
                      <>
                        <div className="mb-6 p-4 bg-pink-50 rounded-lg">
                          <h3 className="font-semibold mb-3">Request Interviews</h3>
                          <p className="text-sm text-gray-600 mb-3">Check the boxes to request interviews with guests:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {available.filter(celebrity => 
                              !requests.some(req => 
                                req.journalistId === currentUser.id && 
                                req.celebrities.includes(celebrity.name)
                              )
                            ).map(celebrity => (
                              <CelebrityCard 
                                key={celebrity.id}
                                celebrity={celebrity}
                                selectable={true}
                                selected={selectedCelebrities.includes(celebrity.name)}
                              />
                            ))}
                          </div>
                        </div>
                        
                        {/* Not Available Section */}
                        {unavailable.length > 0 && (
                          <div className="mb-6">
                            <h3 className="font-semibold mb-3 text-gray-700">Not Available for Interviews</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {unavailable.map(celebrity => (
                                <CelebrityCard 
                                  key={celebrity.id}
                                  celebrity={celebrity}
                                  selectable={false}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
              
              {currentUser.role === 'journalist' && selectedCelebrities.length > 0 && (
                <div className="mb-6 p-4 bg-pink-50 rounded-lg">
                  <h4 className="font-medium mb-4">Story Details</h4>
                  <div className="space-y-4 mb-6">
                    {selectedCelebrities.map(celebrityName => (
                      <div key={celebrityName} className="p-4 bg-gray-50 rounded-lg">
                        <h5 className="font-medium mb-2">{celebrityName}</h5>
                        <textarea
                          value={celebrityStoryDetails[celebrityName] || ''}
                          onChange={(e) => updateStoryDetails(celebrityName, e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                          rows="3"
                          placeholder={`Describe your story concept for ${celebrityName} and any special requirements...`}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {selectedCelebrities.length} guest(s) selected
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        submitRequest();
                      }}
                      className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                    >
                      Submit Request
                    </button>
                  </div>
                </div>
              )}

              {currentUser.role === 'pr' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getSortedGuests(getFilteredCelebrities()).map(celebrity => (
                    <CelebrityCard key={celebrity.id} celebrity={celebrity} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Journalists Tab */}
          {activeTab === 'journalists' && currentUser.role === 'pr' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Journalists</h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowManualEntry(true)}
                    className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2"
                  >
                    <UserPlus size={16} />
                    Add Manual Journalist
                  </button>
                  <div className="text-sm text-gray-600">
                    {getFilteredJournalists().length} of {allJournalists.length} journalists
                  </div>
                </div>
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-gray-600">Sort by:</span>
                <button
                  onClick={() => toggleSort('name')}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                    journalistSortBy === 'name' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Name
                  {journalistSortBy === 'name' && (
                    <span className="ml-1">
                      {journalistSortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => toggleSort('outlet')}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                    journalistSortBy === 'outlet' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Outlet
                  {journalistSortBy === 'outlet' && (
                    <span className="ml-1">
                      {journalistSortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => toggleSort('credentials')}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                    journalistSortBy === 'credentials' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Credentials
                  {journalistSortBy === 'credentials' && (
                    <span className="ml-1">
                      {journalistSortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getSortedJournalists(getFilteredJournalists()).map(journalist => (
                  <JournalistCard key={journalist.id} journalist={journalist} />
                ))}
              </div>
            </div>
          )}
          
          {/* Agents Tab */}
          {activeTab === 'agents' && currentUser.role === 'pr' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Agent Management</h2>
                <div className="text-sm text-gray-600">
                  {getAllAgents().length} agents representing {celebrities.length} guests
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getAllAgents().map(agent => (
                  <div key={agent.id} className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{agent.name}</h3>
                          <p className="text-sm text-gray-600">{agent.company}</p>
                          <p className="text-xs text-gray-500 mt-1">{agent.contact}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-blue-600">
                            {agent.guests.length} guest{agent.guests.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-gray-500">
                            {agent.availableGuests} available
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">Request Volume:</span>
                          <span className="font-medium">{agent.totalRequests} total</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-pink-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, (agent.totalRequests / Math.max(1, Math.max(...getAllAgents().map(a => a.totalRequests)))) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-gray-700">Represented Guests:</h4>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {agent.guests.map(guest => (
                            <div key={guest.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs ${categoryColors[guest.category]}`}>
                                  {categoryIcons[guest.category]}
                                </span>
                                <button
                                  onClick={() => navigateToGuest(guest.name)}
                                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {guest.name}
                                </button>
                              </div>
                              <div className="flex items-center gap-1">
                                <select
                                  value={guest.prAvailable}
                                  onChange={(e) => updateCelebrityAvailability(guest.id, e.target.value)}
                                  className={`text-xs px-2 py-1 rounded border ${
                                    guest.prAvailable === 'Available for Interviews' ? 'bg-green-100 text-green-800 border-green-300' :
                                    guest.prAvailable === 'Limited Availability' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                    'bg-red-100 text-red-800 border-red-300'
                                  }`}
                                >
                                  <option value="Available for Interviews">Available</option>
                                  <option value="Limited Availability">Limited</option>
                                  <option value="Not Available">Not Available</option>
                                </select>
                                <button
                                  onClick={() => setSelectedModalCelebrity(guest)}
                                  className="text-blue-600 hover:text-blue-800 text-xs underline"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-3 border-t flex gap-2">
                        <button
                          onClick={() => updateAgentGuestAvailability(agent.id, 'Available for Interviews')}
                          className="flex-1 px-3 py-2 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                        >
                          Set All Available
                        </button>
                        <button
                          onClick={() => updateAgentGuestAvailability(agent.id, 'Not Available')}
                          className="flex-1 px-3 py-2 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                        >
                          Set All Unavailable
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {getAllAgents().length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-2">No agents found</div>
                  <div className="text-sm text-gray-400">Agent information will appear here as guest data is loaded</div>
                </div>
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Interview Requests</h2>
                  {currentUser.role === 'pr' && (
                    <div className="text-sm text-gray-600 mt-1">
                      {getNewRequestsCount() > 0 && (
                        <span className="text-red-600 font-medium">{getNewRequestsCount()} new</span>
                      )}
                      {getNewRequestsCount() > 0 && <span className="mx-2">•</span>}
                      <span>{requests.length} total</span>
                    </div>
                  )}
                </div>
                
                {currentUser.role === 'pr' && (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowManualEntry(true)}
                      className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add Manual Request
                    </button>
                    <select 
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value)}
                      className="px-3 py-2 border rounded-lg"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="tomorrow">Tomorrow</option>
                      <option value="thisWeek">This Week</option>
                    </select>
                  </div>
                )}
              </div>
              
              {/* Sort Controls */}
              {currentUser.role === 'pr' && (
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <button
                    onClick={() => toggleRequestSort('status')}
                    className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                      requestSortBy === 'status' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Status
                    {requestSortBy === 'status' && (
                      <span className="ml-1">
                        {requestSortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => toggleRequestSort('journalist')}
                    className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                      requestSortBy === 'journalist' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Journalist
                    {requestSortBy === 'journalist' && (
                      <span className="ml-1">
                        {requestSortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => toggleRequestSort('subject')}
                    className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                      requestSortBy === 'subject' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Subject
                    {requestSortBy === 'subject' && (
                      <span className="ml-1">
                        {requestSortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => toggleRequestSort('outlet')}
                    className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                      requestSortBy === 'outlet' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Outlet
                    {requestSortBy === 'outlet' && (
                      <span className="ml-1">
                        {requestSortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => toggleRequestSort('priority')}
                    className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                      requestSortBy === 'priority' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Priority
                    {requestSortBy === 'priority' && (
                      <span className="ml-1">
                        {requestSortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => toggleRequestSort('timestamp')}
                    className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                      requestSortBy === 'timestamp' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Received
                    {requestSortBy === 'timestamp' && (
                      <span className="ml-1">
                        {requestSortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                </div>
              )}
              
              {/* Bulk Actions */}
              {currentUser.role === 'pr' && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Bulk Actions</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {selectedRequests.length > 0 && (
                        <span>{selectedRequests.length} selected</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        const visibleRequests = getFilteredRequestsByTime(
                          requests.filter(req => currentUser.role === 'pr' || req.journalistId === currentUser.id)
                        ).flatMap(req => req.celebrities.map(celeb => ({
                          ...req,
                          celebrity: celeb,
                          priority: req.priority[celeb],
                          completed: req.completed[celeb],
                          status: req.priority[celeb] !== 'Unassigned' ? 'approved' : req.status
                        })));
                        selectAllVisibleRequests(visibleRequests);
                      }}
                      className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Select All
                    </button>
                    
                    <button
                      onClick={clearSelectedRequests}
                      className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Clear Selection
                    </button>
                    
                    {selectedRequests.length > 0 && (
                      <>
                        <select 
                          value={bulkAction}
                          onChange={(e) => setBulkAction(e.target.value)}
                          className="px-3 py-1 border rounded text-sm"
                        >
                          <option value="">Choose Action...</option>
                          <option value="approve-a">Approve as Priority A</option>
                          <option value="approve-b">Approve as Priority B</option>
                          <option value="approve-c">Approve as Priority C</option>
                          <option value="approve-declined">Decline Request</option>
                          <option value="complete">Mark Complete</option>
                          <option value="reject">Reject/Reset</option>
                        </select>
                        
                        <button
                          onClick={applyBulkAction}
                          disabled={!bulkAction}
                          className="px-4 py-1 text-sm bg-pink-600 text-white rounded hover:bg-pink-700 disabled:bg-gray-400"
                        >
                          Apply to {selectedRequests.length} request{selectedRequests.length !== 1 ? 's' : ''}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {getSortedRequests(
                  getFilteredRequestsBySearch(
                    getFilteredRequestsByTime(
                      requests.filter(req => currentUser.role === 'pr' || req.journalistId === currentUser.id)
                    )
                  )
                )
                  .flatMap(req => req.celebrities.map(celeb => ({
                    ...req,
                    celebrity: celeb,
                    priority: req.priority[celeb],
                    completed: req.completed[celeb],
                    status: req.priority[celeb] !== 'Unassigned' ? 'approved' : req.status
                  })))
                  .map(request => (
                    <RequestRow 
                      key={`${request.id}-${request.celebrity}`} 
                      request={request} 
                      showSelection={currentUser.role === 'pr'}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Messages</h2>
                <div className="flex gap-2">
                  {(() => {
                    const messageCounts = getUnreadMessageCounts();
                    return (
                      <>
                        <button
                          onClick={() => setChatView('general')}
                          className={`px-3 py-1 rounded text-sm relative ${
                            chatView === 'general' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          General Chat
                          {messageCounts.general > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                              {messageCounts.general}
                            </span>
                          )}
                        </button>
                        {currentUser.role === 'pr' && (
                          <button
                            onClick={() => setChatView('prteam')}
                            className={`px-3 py-1 rounded text-sm relative ${
                              chatView === 'prteam' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            PR Team Chat
                            {messageCounts.prteam > 0 && (
                              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                {messageCounts.prteam}
                              </span>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => setChatView('direct')}
                          className={`px-3 py-1 rounded text-sm relative ${
                            chatView === 'direct' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          Direct Messages
                          {messageCounts.direct > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                              {messageCounts.direct}
                            </span>
                          )}
                        </button>
                      </>
                    );
                  })()}
                  
                  {currentUser.role === 'pr' && (
                    <>
                      <button
                        onClick={() => setChatView('targeted')}
                        className={`px-3 py-1 rounded text-sm ${
                          chatView === 'targeted' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Celebrity Requesters
                      </button>
                      <button
                        onClick={() => setChatView('broadcast')}
                        className={`px-3 py-1 rounded text-sm ${
                          chatView === 'broadcast' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        All Press
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Message Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border rounded-lg"
                  />
                  {messageSearch && (
                    <button
                      onClick={() => setMessageSearch('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Targeted Messaging to Celebrity Requesters */}
              {chatView === 'targeted' && currentUser.role === 'pr' && (
                <div className="mb-6 p-4 bg-orange-50 rounded-lg">
                  <h3 className="font-semibold mb-3">Message Celebrity Requesters</h3>
                  
                  <select 
                    value={selectedCelebrity || ''}
                    onChange={(e) => {
                      setSelectedCelebrity(e.target.value);
                      setSelectedRecipients([]);
                    }}
                    className="w-full p-2 border rounded mb-3"
                  >
                    <option value="">Select celebrity to message their requesters</option>
                    {celebrities.filter(c => getCelebrityRequests(c.name).length > 0).map(celeb => (
                      <option key={celeb.id} value={celeb.name}>
                        {celeb.name} ({getCelebrityRequests(celeb.name).length} requesters)
                      </option>
                    ))}
                  </select>

                  {selectedCelebrity && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">Select Recipients:</h4>
                        <div className="relative">
                          <Search size={14} className="absolute left-2 top-1.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search recipients..."
                            value={recipientSearch}
                            onChange={(e) => setRecipientSearch(e.target.value)}
                            className="pl-6 pr-2 py-1 border rounded text-sm w-48"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {getFilteredRecipients(getCelebrityRequests(selectedCelebrity)).map(request => (
                          <label key={`${request.id}-${request.celebrity}`} className="flex items-center gap-2 p-2 bg-white rounded border">
                            <input
                              type="checkbox"
                              checked={selectedRecipients.includes(request.journalistName)}
                              onChange={() => toggleRecipient(request.journalistName)}
                            />
                            <span className="flex-1">
                              <strong>{request.journalistName}</strong> ({request.outlet}) - Priority {request.priority}
                              <span className={`ml-2 px-2 py-1 text-xs rounded ${
                                request.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {request.status}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                      
                      {getCelebrityRequests(selectedCelebrity).length > 0 && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => setSelectedRecipients(getCelebrityRequests(selectedCelebrity).filter(r => r.priority === 'A').map(r => r.journalistName))}
                            className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                          >
                            Select All A-Priority
                          </button>
                          <button
                            onClick={() => setSelectedRecipients(getCelebrityRequests(selectedCelebrity).filter(r => r.status === 'approved').map(r => r.journalistName))}
                            className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                          >
                            Select All Approved
                          </button>
                          <button
                            onClick={() => setSelectedRecipients([])}
                            className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                          >
                            Clear All
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <textarea 
                    value={targetedMessage}
                    onChange={(e) => setTargetedMessage(e.target.value)}
                    className="w-full p-2 border rounded mb-3" 
                    placeholder="Message to send to selected recipients..."
                    rows="3"
                  />
                  
                  <div className="flex items-center gap-4 mb-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isUrgent}
                        onChange={(e) => setIsUrgent(e.target.checked)}
                      />
                      <Bell size={16} className="text-orange-500" />
                      <span className="text-sm">Urgent - Push Notification</span>
                    </label>
                  </div>
                  
                  {selectedRecipients.length > 0 && (
                    <p className="text-sm text-gray-600 mb-2">
                      This message will be sent to {selectedRecipients.length} journalist(s): {selectedRecipients.join(', ')}
                    </p>
                  )}
                  
                  <button 
                    onClick={sendTargetedMessage}
                    disabled={!selectedCelebrity || selectedRecipients.length === 0 || !targetedMessage.trim()}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Send to Selected Recipients
                  </button>
                </div>
              )}

              {/* Broadcast to All Press */}
              {chatView === 'broadcast' && currentUser.role === 'pr' && (
                <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-semibold mb-3">Message All Press</h3>
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Select Journalists:</h4>
                      <div className="relative">
                        <Search size={14} className="absolute left-2 top-1.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search journalists..."
                          value={recipientSearch}
                          onChange={(e) => setRecipientSearch(e.target.value)}
                          className="pl-6 pr-2 py-1 border rounded text-sm w-48"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {getFilteredJournalistList(allJournalists).map(journalist => {
                        const hasRequests = requests.some(req => req.journalistId === journalist.id);
                        return (
                          <label key={journalist.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                            <input
                              type="checkbox"
                              checked={selectedJournalists.includes(journalist.name)}
                              onChange={() => toggleJournalistSelection(journalist.name)}
                            />
                            <span className="flex-1">
                              <strong>{journalist.name}</strong>
                              <br />
                              <span className="text-sm text-gray-600">{journalist.outlet}</span>
                              {!hasRequests && <span className="text-xs text-orange-500 ml-1">(No requests)</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setSelectedJournalists(getFilteredJournalistList(allJournalists).map(j => j.name))}
                        className="px-3 py-1 text-xs bg-pink-100 text-pink-800 rounded hover:bg-pink-200"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedJournalists(getFilteredJournalistList(allJournalists).filter(j => 
                          requests.some(req => req.journalistId === j.id)
                        ).map(j => j.name))}
                        className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                      >
                        Select Active Press
                      </button>
                      <button
                        onClick={() => setSelectedJournalists(getFilteredJournalistList(allJournalists).filter(j => 
                          !requests.some(req => req.journalistId === j.id)
                        ).map(j => j.name))}
                        className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                      >
                        Select Inactive Press
                      </button>
                      <button
                        onClick={() => setSelectedJournalists([])}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <textarea 
                    value={targetedMessage}
                    onChange={(e) => setTargetedMessage(e.target.value)}
                    className="w-full p-2 border rounded mb-3" 
                    placeholder="Message to send to selected journalists..."
                    rows="3"
                  />
                  
                  <div className="flex items-center gap-4 mb-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isUrgent}
                        onChange={(e) => setIsUrgent(e.target.checked)}
                      />
                      <Bell size={16} className="text-orange-500" />
                      <span className="text-sm">Urgent - Push Notification</span>
                    </label>
                  </div>
                  
                  {selectedJournalists.length > 0 && (
                    <p className="text-sm text-gray-600 mb-2">
                      This message will be sent to {selectedJournalists.length} journalist(s): {selectedJournalists.join(', ')}
                    </p>
                  )}
                  
                  <button 
                    onClick={sendJournalistMessage}
                    disabled={selectedJournalists.length === 0 || !targetedMessage.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Send to Selected Journalists
                  </button>
                </div>
              )}


              {/* Chat Messages */}
              {chatView === 'direct' ? (
                // Split view for Direct Messages
                <div id="chat-container" className="bg-white rounded-lg border flex relative" style={{ height: `${chatHeight}px` }}>
                  {/* Left Panel - Conversations List */}
                  <div className="w-1/3 border-r flex flex-col">
                    <div className="p-4 border-b">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold">Conversations</h3>
                        <button
                          onClick={() => setShowNewMessageModal(true)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          New
                        </button>
                      </div>
                      <div className="relative">
                        <Search size={14} className="absolute left-2 top-2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search conversations..."
                          value={conversationSearch}
                          onChange={(e) => setConversationSearch(e.target.value)}
                          className="w-full pl-7 pr-2 py-1 border rounded text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                      {getFilteredConversations().map(conversation => (
                        <div
                          key={conversation.id}
                          onClick={() => setSelectedConversation(conversation.id)}
                          className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                            selectedConversation === conversation.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="font-medium text-sm">{conversation.otherUser}</div>
                          <div className="text-xs text-gray-600 truncate mt-1">
                            {conversation.lastMessage}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {conversation.lastTimestamp}
                          </div>
                        </div>
                      ))}
                      
                      {getFilteredConversations().length === 0 && (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No conversations yet. Start a new message!
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Right Panel - Active Conversation */}
                  <div className="flex-1 flex flex-col">
                    {selectedConversation ? (
                      <>
                        {/* Conversation Header */}
                        <div className="p-4 border-b bg-gray-50">
                          <div className="font-semibold">
                            {getAllConversations().find(c => c.id === selectedConversation)?.otherUser}
                          </div>
                        </div>
                        
                        {/* Messages */}
                        <div id="chat-messages-container" className="flex-1 p-4 overflow-y-auto">
                          {getAllConversations()
                            .find(c => c.id === selectedConversation)
                            ?.messages.map(message => (
                              <ChatMessage key={message.id} message={message} />
                            ))}
                        </div>
                        
                        {/* Message Input */}
                        <div className="border-t p-4">
                          <div className="flex gap-2 mb-2">
                            <input 
                              type="text" 
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                              placeholder="Type a direct message..."
                              className="flex-1 p-2 border rounded"
                            />
                            <button 
                              onClick={sendMessage}
                              disabled={!newMessage.trim()}
                              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                            >
                              <Send size={16} />
                            </button>
                          </div>
                          
                          {currentUser.role === 'pr' && (
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={isUrgent}
                                  onChange={(e) => setIsUrgent(e.target.checked)}
                                />
                                <Bell size={14} className="text-orange-500" />
                                <span>Urgent - Push Notification</span>
                              </label>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-gray-500">
                        Select a conversation to start messaging
                      </div>
                    )}
                  </div>
                  
                  {/* Resize Handle */}
                  <div 
                    className={`absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-gray-200 hover:bg-gray-300 transition-colors ${isResizing ? 'bg-blue-300' : ''}`}
                    onMouseDown={handleMouseDown}
                    title="Drag to resize chat window"
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-8 h-1 bg-gray-400 rounded"></div>
                    </div>
                  </div>
                </div>
              ) : (
                // Regular chat view for other message types
                <div id="chat-container" className="bg-white rounded-lg border flex flex-col relative" style={{ height: `${chatHeight}px` }}>
                  <div id="chat-messages-container" className="flex-1 p-4 overflow-y-auto">
                    {chatView === 'prteam' ? (
                      // Display PR Team messages
                      prTeamMessages
                        .filter(msg => {
                          if (!messageSearch) return true;
                          return msg.message.toLowerCase().includes(messageSearch.toLowerCase()) ||
                                 msg.from.toLowerCase().includes(messageSearch.toLowerCase());
                        })
                        .map(message => (
                          <ChatMessage key={message.id} message={message} />
                        ))
                    ) : (
                      // Display regular messages
                      getFilteredMessages()
                        .filter(msg => {
                          if (chatView === 'general') return msg.type === 'general';
                          if (chatView === 'targeted') return msg.type === 'targeted';
                          if (chatView === 'broadcast') return msg.type === 'broadcast';
                          return false;
                        })
                        .map(message => (
                          <ChatMessage key={message.id} message={message} />
                        ))
                    )}
                  </div>
                  
                  {/* Message Input */}
                  {(chatView === 'general' || chatView === 'prteam') && (
                    <div className="border-t p-4">
                      <div className="flex gap-2 mb-2">
                        <input 
                          type="text" 
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder={
                            chatView === 'general' ? "Type a message to general chat..." : 
                            "Type a message to PR team..."
                          }
                          className="flex-1 p-2 border rounded"
                        />
                        <button 
                          onClick={sendMessage}
                          disabled={!newMessage.trim()}
                          className={`px-4 py-2 text-white rounded hover:opacity-90 disabled:bg-gray-400 ${
                            chatView === 'prteam' ? 'bg-green-600 hover:bg-green-700' : 'bg-pink-600 hover:bg-pink-700'
                          }`}
                        >
                          <Send size={16} />
                        </button>
                      </div>
                      
                      {currentUser.role === 'pr' && (
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={isUrgent}
                              onChange={(e) => setIsUrgent(e.target.checked)}
                            />
                            <Bell size={14} className="text-orange-500" />
                            <span>Urgent - Push Notification</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Resize Handle */}
                  <div 
                    className={`absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-gray-200 hover:bg-gray-300 transition-colors ${isResizing ? 'bg-blue-300' : ''}`}
                    onMouseDown={handleMouseDown}
                    title="Drag to resize chat window"
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-8 h-1 bg-gray-400 rounded"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && currentUser.role === 'pr' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Dashboard & Analytics</h2>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock size={20} className="text-orange-500" />
                    <span className="font-medium">Pending Requests</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {requests.filter(r => r.status === 'pending').length}
                  </div>
                </div>
                
                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle size={20} className="text-green-500" />
                    <span className="font-medium">Approved Today</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {requests.filter(r => r.status === 'approved').length}
                  </div>
                </div>
                
                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center gap-3 mb-2">
                    <Star size={20} className="text-pink-500" />
                    <span className="font-medium">Completed Today</span>
                  </div>
                  <div className="text-2xl font-bold text-pink-600">
                    {requests.flatMap(r => r.celebrities).filter((_, index, arr) => 
                      requests.flatMap(req => req.celebrities.map(celeb => req.completed[celeb]))[index]
                    ).length}
                  </div>
                </div>
                
                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center gap-3 mb-2">
                    <User size={20} className="text-blue-500" />
                    <span className="font-medium">Credentials Picked Up</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {(() => {
                      const stats = getCredentialsStats();
                      return `${stats.pickedUp}/${stats.total}`;
                    })()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {getCredentialsStats().percentage}% completion
                  </div>
                </div>
              </div>

              {/* Workload View */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Guest Request Counts */}
                <div className="p-4 bg-white rounded-lg border">
                  <h3 className="font-semibold mb-4">Guest Request Volume</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {celebrities.map(celebrity => {
                      const requestCount = requests.filter(r => r.celebrities.includes(celebrity.name)).length;
                      const completedCount = requests.filter(r => r.celebrities.includes(celebrity.name) && r.completed[celebrity.name]).length;
                      if (requestCount === 0) return null;
                      
                      return (
                        <div key={celebrity.id} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors"
                             onClick={() => navigateToGuest(celebrity.name)}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{categoryIcons[celebrity.category]}</span>
                            <span className="font-medium text-blue-600 hover:text-blue-800">{celebrity.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600">{requestCount} requests</span>
                            <span className="text-green-600">({completedCount} done)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Priority Distribution */}
                <div className="p-4 bg-white rounded-lg border">
                  <h3 className="font-semibold mb-4">Priority Distribution</h3>
                  <div className="space-y-3">
                    {['A', 'B', 'C', 'Unassigned'].map(priority => {
                      const count = requests.flatMap(r => 
                        r.celebrities.filter(celeb => r.priority[celeb] === priority)
                      ).length;
                      const percentage = requests.length > 0 ? Math.round((count / requests.flatMap(r => r.celebrities).length) * 100) : 0;
                      
                      return (
                        <div key={priority} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              priority === 'A' ? 'bg-red-100 text-red-800' :
                              priority === 'B' ? 'bg-yellow-100 text-yellow-800' :
                              priority === 'C' ? 'bg-pink-100 text-pink-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              Priority {priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600">{count} requests</span>
                            <span className="text-pink-600">({percentage}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="p-4 bg-white rounded-lg border">
                <h3 className="font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {requests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10).map(request => (
                    <div key={request.id} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors"
                         onClick={() => navigateToJournalist(request.journalistId)}>
                      <div>
                        <span className="font-medium text-blue-600 hover:text-blue-800">{request.journalistName}</span>
                        <span className="text-gray-600 text-sm"> requested </span>
                        {request.celebrities.map((celebrity, index) => (
                          <span key={celebrity}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToGuest(celebrity);
                              }}
                              className="font-medium text-green-600 hover:text-green-800 hover:underline"
                            >
                              {celebrity}
                            </button>
                            {index < request.celebrities.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        {request.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Press Materials Tab */}
          {activeTab === 'press' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Press Materials</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pressItems.map((item, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText size={20} className="text-pink-600" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <span>{item.type}</span> • <span>{item.size}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* Manual Entry Form - Global Modal */}
      {showManualEntry && currentUser.role === 'pr' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Add Manual Interview Request</h3>
              <button
                onClick={() => {
                  setShowManualEntry(false);
                  clearManualForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Journalist Information */}
              <div>
                <h4 className="font-medium mb-4">Journalist Information</h4>
                
                {isExistingJournalist && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle size={16} />
                      <span className="font-medium">Existing journalist selected</span>
                    </div>
                    <div className="text-sm text-green-600 mt-1">
                      Contact info auto-filled from existing record
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={manualEntryForm.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Start typing journalist name..."
                      />
                      {journalistSearch && getFilteredJournalistsForSearch().length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {getFilteredJournalistsForSearch().map(journalist => (
                            <button
                              key={journalist.id}
                              onClick={() => selectExistingJournalist(journalist)}
                              className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
                            >
                              <div className="font-medium">{journalist.name}</div>
                              <div className="text-sm text-gray-600">{journalist.outlet}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Outlet *</label>
                    <input
                      type="text"
                      value={manualEntryForm.outlet}
                      onChange={(e) => setManualEntryForm(prev => ({ ...prev, outlet: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg ${isExistingJournalist ? 'bg-gray-50' : ''}`}
                      placeholder="Publication/Network"
                      readOnly={isExistingJournalist}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      value={manualEntryForm.email}
                      onChange={(e) => setManualEntryForm(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg ${isExistingJournalist ? 'bg-gray-50' : ''}`}
                      placeholder="Email address"
                      readOnly={isExistingJournalist}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <input
                      type="tel"
                      value={manualEntryForm.phone}
                      onChange={(e) => setManualEntryForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Phone number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <textarea
                      value={manualEntryForm.notes}
                      onChange={(e) => setManualEntryForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows="3"
                      placeholder="Additional notes about this request"
                    />
                  </div>
                </div>
              </div>
              
              {/* Celebrity Selection */}
              <div>
                <h4 className="font-medium mb-4">Select Guests *</h4>
                <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto border rounded-lg p-3">
                  {celebrities.filter(c => c.prAvailable === 'Available for Interviews').map(celebrity => (
                    <label key={celebrity.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={manualEntryForm.selectedCelebrities.includes(celebrity.name)}
                        onChange={() => toggleManualCelebritySelection(celebrity.name)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{celebrity.name}</div>
                        <div className="text-sm text-gray-600">{celebrity.knownFor}</div>
                        <div className="text-xs text-gray-500">
                          <span className={`px-2 py-1 rounded ${categoryColors[celebrity.category]}`}>
                            {categoryIcons[celebrity.category]} {celebrity.category}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                
                {manualEntryForm.selectedCelebrities.length > 0 && (
                  <div className="mt-3 p-3 bg-pink-50 rounded-lg">
                    <div className="text-sm font-medium mb-2">Selected Guests:</div>
                    <div className="flex flex-wrap gap-1">
                      {manualEntryForm.selectedCelebrities.map(name => (
                        <span key={name} className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowManualEntry(false);
                  clearManualForm();
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleManualEntrySubmit}
                className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
              >
                Create Request
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Email Preview Modal */}
      {showEmailPreview && previewEmailData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {previewEmailData.type === 'invitation' ? 'Preview Invitation Email' : 'Preview Password Reset Email'}
              </h3>
              <button
                onClick={() => {
                  setShowEmailPreview(false);
                  setPreviewEmailData(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">Email Details</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>From:</strong> {previewEmailData.from}</div>
                  <div><strong>To:</strong> {previewEmailData.to}</div>
                  <div><strong>Subject:</strong> {previewEmailData.subject}</div>
                  {previewEmailData.type === 'invitation' && (
                    <div><strong>Temporary Password:</strong> <code className="bg-yellow-100 px-2 py-1 rounded">{previewEmailData.tempPassword}</code></div>
                  )}
                  {previewEmailData.type === 'reset' && (
                    <div><strong>Reset Link:</strong> <code className="bg-blue-100 px-2 py-1 rounded text-xs break-all">{previewEmailData.resetLink}</code></div>
                  )}
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">Email Content</h4>
                <div className="bg-white p-4 rounded border">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{previewEmailData.body}</pre>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowEmailPreview(false);
                  setPreviewEmailData(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => sendEmailAfterPreview(previewEmailData)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">New Message</h3>
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium mb-2">Send to:</label>
                {currentUser.role === 'journalist' && (
                  <p className="text-xs text-gray-600 mb-2 p-2 bg-blue-50 rounded border border-blue-200">
                    📢 You can send messages to PR Team members only
                  </p>
                )}
                <input
                  type="text"
                  value={newMessageRecipient}
                  onChange={(e) => handleRecipientInputChange(e.target.value)}
                  onFocus={() => setShowRecipientSuggestions(true)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Type name or select from dropdown..."
                />
                
                {/* Suggestions Dropdown */}
                {showRecipientSuggestions && recipientSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {recipientSuggestions.map(user => (
                      <div
                        key={user.id}
                        onClick={() => selectRecipient(user)}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      >
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-600">{user.displayName}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Traditional Dropdown */}
                <select
                  value={newMessageRecipient}
                  onChange={(e) => {
                    setNewMessageRecipient(e.target.value);
                    setShowRecipientSuggestions(false);
                  }}
                  className="w-full px-3 py-2 border rounded-lg mt-2"
                >
                  <option value="">Or select from full list...</option>
                  {getAllUsers().map(user => (
                    <option key={user.id} value={user.name}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Message:</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="4"
                  placeholder="Type your message..."
                />
              </div>
              
              {currentUser.role === 'pr' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    id="urgentNewMessage"
                  />
                  <label htmlFor="urgentNewMessage" className="text-sm flex items-center gap-1">
                    <Bell size={14} className="text-orange-500" />
                    Urgent - Push Notification
                  </label>
                </div>
              )}
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowNewMessageModal(false)}
                  className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newMessageRecipient && newMessage.trim()) {
                      startDirectMessage(newMessageRecipient);
                    }
                  }}
                  disabled={!newMessageRecipient || !newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Celebrity Modal */}
      {selectedModalCelebrity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">{selectedModalCelebrity.name}</h3>
              <button
                onClick={() => setSelectedModalCelebrity(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded text-sm ${categoryColors[selectedModalCelebrity.category]}`}>
                    {categoryIcons[selectedModalCelebrity.category]} {selectedModalCelebrity.category}
                  </span>
                </div>
                <p className="text-gray-600 mb-3">{selectedModalCelebrity.knownFor}</p>
                <div className="flex gap-1 mb-3">
                  {selectedModalCelebrity.days.map(day => (
                    <span key={day} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      {day}
                    </span>
                  ))}
                </div>
              </div>

              {/* Agent & Contact Info (PR Only) */}
              {currentUser.role === 'pr' && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3">Agent & Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Agent:</strong> {selectedModalCelebrity.agent}</p>
                    <p><strong>Contact:</strong> {selectedModalCelebrity.agentContact}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <strong>PR Status:</strong> 
                      <select
                        value={selectedModalCelebrity.prAvailable}
                        onChange={(e) => {
                          updateCelebrityAvailability(selectedModalCelebrity.id, e.target.value);
                          setSelectedModalCelebrity({...selectedModalCelebrity, prAvailable: e.target.value});
                        }}
                        className={`px-2 py-1 rounded text-xs border ${
                          selectedModalCelebrity.prAvailable === 'Available for Interviews' ? 'bg-green-100 text-green-800 border-green-300' : 
                          selectedModalCelebrity.prAvailable === 'Limited Availability' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                          'bg-red-100 text-red-800 border-red-300'
                        }`}
                      >
                        <option value="Available for Interviews">Available for Interviews</option>
                        <option value="Limited Availability">Limited Availability</option>
                        <option value="Not Available">Not Available</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Interview Requests (PR Only) */}
              {currentUser.role === 'pr' && (() => {
                const requests = getCelebrityRequests(selectedModalCelebrity.name);
                return requests.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">Interview Requests ({requests.length})</h4>
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-2 py-1 border rounded text-xs"
                      >
                        <option value="priority">Priority</option>
                        <option value="outlet">Outlet</option>
                        <option value="completion">Completion</option>
                        <option value="timestamp">Time</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {sortCelebrityRequests(requests).map(request => (
                        <div key={`${request.id}-${request.celebrity}`} className="p-3 bg-gray-50 rounded">
                          <div className="flex justify-between items-center">
                            <div>
                              <button
                                onClick={() => {
                                  setSelectedModalCelebrity(null);
                                  navigateToJournalist(request.journalistId);
                                }}
                                className="font-medium text-blue-600 hover:text-blue-800 underline"
                              >
                                {request.journalistName}
                              </button>
                              <span className="text-gray-500 ml-1">({request.outlet})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <select 
                                value={request.priority}
                                onChange={(e) => updatePriority(request.id, request.celebrity, e.target.value)}
                                className="px-1 py-1 border rounded text-xs"
                              >
                                <option value="Unassigned">Unassigned</option>
                                <option value="A">Priority A</option>
                                <option value="B">Priority B</option>
                                <option value="C">Priority C</option>
                                <option value="Declined">Declined</option>
                              </select>
                              
                              <button
                                onClick={() => toggleCompletion(request.id, request.celebrity)}
                                className={`px-2 py-1 text-xs rounded ${
                                  request.completed 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {request.completed ? '✓' : '○'}
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Requested: {request.timestamp}
                          </div>
                          {request.storyDetails && request.storyDetails[request.celebrity] && (
                            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                              <div className="text-xs font-medium text-blue-700 mb-1">📝 Journalist's Notes:</div>
                              <div className="text-xs text-gray-800">{request.storyDetails[request.celebrity]}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Journalist Modal */}
      {selectedModalJournalist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-semibold">{selectedModalJournalist.name}</h3>
                  {selectedModalJournalist.source === 'manual_entry' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                      <Mail size={10} className="mr-1" />
                      Manual Entry
                    </span>
                  )}
                </div>
                <p className="text-gray-600 font-medium">{selectedModalJournalist.outlet}</p>
                {selectedModalJournalist.specialty && (
                  <p className="text-gray-500 text-sm">{selectedModalJournalist.specialty}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedModalJournalist(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h4 className="font-medium mb-3">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">📧</span>
                    <a href={`mailto:${selectedModalJournalist.email}`} className="text-pink-600 hover:underline">
                      {selectedModalJournalist.email}
                    </a>
                  </div>
                  {selectedModalJournalist.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">📞</span>
                      <a href={`tel:${selectedModalJournalist.phone}`} className="text-pink-600 hover:underline">
                        {selectedModalJournalist.phone}
                      </a>
                    </div>
                  )}
                  {selectedModalJournalist.twitter && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">🐦</span>
                      <a href={`https://twitter.com/${selectedModalJournalist.twitter.replace('@', '')}`} 
                         className="text-pink-600 hover:underline" 
                         target="_blank" 
                         rel="noopener noreferrer">
                        {selectedModalJournalist.twitter}
                      </a>
                    </div>
                  )}
                  {selectedModalJournalist.website && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">🌐</span>
                      <a href={selectedModalJournalist.website} className="text-pink-600 hover:underline" target="_blank" rel="noopener noreferrer">
                        Website
                      </a>
                    </div>
                  )}
                </div>
                
                {selectedModalJournalist.bio && (
                  <div className="mt-4">
                    <h5 className="font-medium mb-2">Bio</h5>
                    <p className="text-sm text-gray-600">{selectedModalJournalist.bio}</p>
                  </div>
                )}
              </div>

              {/* PR Team Controls */}
              {currentUser.role === 'pr' && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <h4 className="font-medium">PR Team Controls</h4>
                  
                  {/* Credentials Pickup */}
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedModalJournalist.credentialsPickedUp || false}
                        onChange={() => {
                          toggleCredentials(selectedModalJournalist.id);
                          setSelectedModalJournalist({...selectedModalJournalist, credentialsPickedUp: !selectedModalJournalist.credentialsPickedUp});
                        }}
                        className="rounded"
                      />
                      <span className="font-medium">Picked Up Credentials</span>
                    </label>
                  </div>
                  
                  {/* Notes */}
                  <div>
                    <label className="block font-medium mb-2">Notes (PR Team Only)</label>
                    <textarea
                      value={selectedModalJournalist.notes || ''}
                      onChange={(e) => {
                        updateJournalistNotes(selectedModalJournalist.id, e.target.value);
                        setSelectedModalJournalist({...selectedModalJournalist, notes: e.target.value});
                      }}
                      className="w-full px-3 py-2 border rounded"
                      rows="3"
                      placeholder="Internal notes about this journalist..."
                    />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-3 border-t">
                    <button
                      onClick={() => startDirectMessage(selectedModalJournalist.name)}
                      className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={16} />
                      Send Message
                    </button>
                    
                    {selectedModalJournalist.source === 'manual_entry' ? (
                      <button
                        onClick={() => previewInvitationEmail(selectedModalJournalist)}
                        className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
                      >
                        Send Invitation
                      </button>
                    ) : (
                      <button
                        onClick={() => previewPasswordResetEmail(selectedModalJournalist)}
                        className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
                      >
                        Reset Password
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Interview Requests */}
              {(() => {
                const journalistRequests = getJournalistRequests(selectedModalJournalist.id);
                const hasRequests = journalistRequests.length > 0;
                
                return hasRequests ? (
                  <div>
                    <h4 className="font-medium mb-3">Guests Requested ({journalistRequests.length})</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {journalistRequests.map(request => (
                        <div key={`${request.id}-${request.celebrity}`} className="p-3 bg-gray-50 rounded">
                          <div className="flex justify-between items-center">
                            <div>
                              <button
                                onClick={() => {
                                  setSelectedModalJournalist(null);
                                  navigateToGuest(request.celebrity);
                                }}
                                className="font-medium text-blue-600 hover:text-blue-800 underline"
                              >
                                {request.celebrity}
                              </button>
                              {currentUser.role === 'pr' && (
                                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                  request.priority === 'A' ? 'bg-red-100 text-red-800' :
                                  request.priority === 'B' ? 'bg-yellow-100 text-yellow-800' :
                                  request.priority === 'C' ? 'bg-pink-100 text-pink-800' :
                                  request.priority === 'Declined' ? 'bg-gray-100 text-gray-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {request.priority === 'Declined' ? 'Declined' : `Priority ${request.priority}`}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {request.completed && (
                                <span className="text-green-600 text-xs font-medium">✓ Completed</span>
                              )}
                              
                              {currentUser.role === 'pr' && (
                                <div className="flex items-center gap-1">
                                  <select 
                                    value={request.priority}
                                    onChange={(e) => updatePriority(request.id, request.celebrity, e.target.value)}
                                    className="px-1 py-1 border rounded text-xs"
                                  >
                                    <option value="Unassigned">Unassigned</option>
                                    <option value="A">Priority A</option>
                                    <option value="B">Priority B</option>
                                    <option value="C">Priority C</option>
                                    <option value="Declined">Declined</option>
                                  </select>
                                  
                                  <button
                                    onClick={() => toggleCompletion(request.id, request.celebrity)}
                                    className={`px-2 py-1 text-xs rounded ${
                                      request.completed 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    {request.completed ? '✓' : '○'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Requested: {request.timestamp}
                          </div>
                          {request.storyDetails && request.storyDetails[request.celebrity] && (
                            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                              <div className="text-xs font-medium text-blue-700 mb-1">📝 Original Request Notes:</div>
                              <div className="text-xs text-gray-800">{request.storyDetails[request.celebrity]}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <p>No interview requests submitted yet.</p>
                    {currentUser.role === 'pr' && (
                      <button 
                        onClick={() => {
                          setSelectedModalJournalist(null);
                          setActiveTab('messages');
                          setChatView('broadcast');
                          setSelectedJournalists([selectedModalJournalist.name]);
                        }}
                        className="mt-3 px-4 py-2 bg-pink-100 text-pink-700 rounded hover:bg-pink-200"
                      >
                        Send Message
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Film Detail Modal */}
      {selectedFilm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">{selectedFilm.title}</h2>
                <button
                  onClick={() => setSelectedFilm(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Film Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Director:</strong> {selectedFilm.director}</div>
                    <div><strong>Country:</strong> {selectedFilm.country}</div>
                    <div><strong>Year:</strong> {selectedFilm.year}</div>
                    <div><strong>Runtime:</strong> {selectedFilm.runtime} minutes</div>
                    <div><strong>Category:</strong> {selectedFilm.category}</div>
                    <div><strong>Rating:</strong> {selectedFilm.rating}</div>
                    <div><strong>Language:</strong> {selectedFilm.language}</div>
                    <div><strong>Subtitles:</strong> {selectedFilm.subtitles.join(', ')}</div>
                    <div className="flex items-center gap-2">
                      <strong>Status:</strong> 
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedFilm.status)}`}>
                        {getStatusIcon(selectedFilm.status)} {selectedFilm.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div><strong>Premiere Type:</strong> {selectedFilm.premiereType}</div>
                  </div>
                  
                  <h4 className="text-md font-semibold mt-4 mb-2">Genres</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedFilm.genre.map(g => (
                      <span key={g} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {g}
                      </span>
                    ))}
                  </div>

                  {selectedFilm.cast.length > 0 && (
                    <>
                      <h4 className="text-md font-semibold mt-4 mb-2">Cast</h4>
                      <div className="text-sm">
                        {selectedFilm.cast.join(', ')}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Production & Technical */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Production Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Production Company:</strong> {selectedFilm.productionCompany}</div>
                    <div><strong>Submission Date:</strong> {selectedFilm.submissionDate}</div>
                    {selectedFilm.selectionDate && (
                      <div><strong>Selection Date:</strong> {selectedFilm.selectionDate}</div>
                    )}
                  </div>
                  
                  <h4 className="text-md font-semibold mt-4 mb-2">Contact Information</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Name:</strong> {selectedFilm.contact.name}</div>
                    <div><strong>Email:</strong> {selectedFilm.contact.email}</div>
                    <div><strong>Phone:</strong> {selectedFilm.contact.phone}</div>
                  </div>
                  
                  <h4 className="text-md font-semibold mt-4 mb-2">Technical Specifications</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Format:</strong> {selectedFilm.technicalSpecs.format}</div>
                    <div><strong>Aspect Ratio:</strong> {selectedFilm.technicalSpecs.aspectRatio}</div>
                    <div><strong>Sound:</strong> {selectedFilm.technicalSpecs.soundFormat}</div>
                  </div>

                  {selectedFilm.awards.length > 0 && (
                    <>
                      <h4 className="text-md font-semibold mt-4 mb-2">Awards & Recognition</h4>
                      <div className="space-y-1 text-sm">
                        {selectedFilm.awards.map((award, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Star size={16} className="text-yellow-500" />
                            {award}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Synopsis */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Synopsis</h3>
                <p className="text-gray-700 leading-relaxed">{selectedFilm.synopsis}</p>
              </div>
              
              {/* Screening Information */}
              {selectedFilm.screeningTimes.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Screening Schedule</h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm">
                      <div><strong>Venue:</strong> {selectedFilm.venue}</div>
                      <div><strong>Screenings:</strong></div>
                      <ul className="list-disc list-inside ml-4 mt-1">
                        {selectedFilm.screeningTimes.map((time, index) => (
                          <li key={index}>{time}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Notes */}
              {selectedFilm.notes && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Notes</h3>
                  <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                    <p className="text-yellow-800">{selectedFilm.notes}</p>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="mt-6 flex gap-3 pt-4 border-t">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Edit Film
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Update Status
                </button>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  Schedule Screening
                </button>
                <button 
                  onClick={() => setSelectedFilm(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventInterviewApp;