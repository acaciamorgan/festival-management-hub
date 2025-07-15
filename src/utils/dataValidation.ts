import { useData } from '../contexts/DataContext';

/**
 * Data validation utilities to enforce data integrity rules
 * These functions help prevent violations of the cardinal rule:
 * NEVER invent names, venues, films, or people - only reference existing ones
 */

export const validatePersonName = (name: string, people: any[]): boolean => {
  return people.some(person => person.name === name);
};

export const validateFilmTitle = (title: string, films: any[]): boolean => {
  return films.some(film => film.title === title);
};

export const validateVenueName = (name: string, venues: any[]): boolean => {
  return venues.some(venue => venue.name === name);
};

export const validateStaffName = (name: string, staff: any[]): boolean => {
  return staff.some(member => member.name === name);
};

/**
 * Validates a comma-separated list of people names
 * Returns array of validation results
 */
export const validatePeopleList = (peopleString: string, people: any[]): {
  isValid: boolean;
  invalidNames: string[];
  validNames: string[];
} => {
  const names = peopleString.split(',').map(name => name.trim());
  const invalidNames: string[] = [];
  const validNames: string[] = [];
  
  names.forEach(name => {
    if (validatePersonName(name, people)) {
      validNames.push(name);
    } else {
      invalidNames.push(name);
    }
  });
  
  return {
    isValid: invalidNames.length === 0,
    invalidNames,
    validNames
  };
};

/**
 * Development-only function to check mock data integrity
 * Throws errors if data integrity is violated
 */
export const validateMockData = (mockData: any[], dataContext: any) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const errors: string[] = [];
  
  mockData.forEach((item, index) => {
    // Check people references
    if (item.subjects) {
      const validation = validatePeopleList(item.subjects, dataContext.people);
      if (!validation.isValid) {
        errors.push(`Mock data item ${index}: Invalid people names: ${validation.invalidNames.join(', ')}`);
      }
    }
    
    // Check film references
    if (item.filmTitle && !validateFilmTitle(item.filmTitle, dataContext.films)) {
      errors.push(`Mock data item ${index}: Invalid film title: ${item.filmTitle}`);
    }
    
    // Check venue references
    if (item.venue && !validateVenueName(item.venue, dataContext.venues)) {
      errors.push(`Mock data item ${index}: Invalid venue name: ${item.venue}`);
    }
  });
  
  if (errors.length > 0) {
    console.error('DATA INTEGRITY VIOLATIONS DETECTED:');
    errors.forEach(error => console.error('❌', error));
    throw new Error(`Data integrity violations found: ${errors.length} errors`);
  } else {
    console.log('✅ Mock data integrity validated successfully');
  }
};

/**
 * Helper to get all valid person names for reference
 */
export const getValidPersonNames = (people: any[]): string[] => {
  return people.map(person => person.name).sort();
};

/**
 * Helper to get all valid film titles for reference
 */
export const getValidFilmTitles = (films: any[]): string[] => {
  return films.map(film => film.title).sort();
};

/**
 * Helper to get all valid venue names for reference
 */
export const getValidVenueNames = (venues: any[]): string[] => {
  return venues.filter(venue => !venue.isTBD).map(venue => venue.name).sort();
};