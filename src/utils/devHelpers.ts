/**
 * Development helpers for data integrity
 * These functions help developers see what data is available
 */

import { useData } from '../contexts/DataContext';

/**
 * Console helper to display all available entities
 * Use this before creating any mock data
 */
export const showAvailableData = () => {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group('🔍 AVAILABLE DATA FOR MOCK CREATION');
  
  // This would need to be called from within a component that has access to useData
  console.log('Call this from within a component:');
  console.log(`
    const { people, films, venues, staff } = useData();
    
    console.log('📋 Available People:', people.map(p => p.name));
    console.log('🎬 Available Films:', films.map(f => f.title));
    console.log('🏢 Available Venues:', venues.filter(v => !v.isTBD).map(v => v.name));
    console.log('👥 Available Staff:', staff.map(s => s.name));
  `);
  
  console.groupEnd();
};

/**
 * Add this to any component during development to see available data
 */
export const useDevDataLogger = () => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const { people, films, venues, staff } = useData();
  
  console.group('🔍 AVAILABLE DATA FOR MOCK CREATION');
  console.log('📋 Available People:', people.map(p => p.name));
  console.log('🎬 Available Films:', films.map(f => f.title));
  console.log('🏢 Available Venues:', venues.filter(v => !v.isTBD).map(v => v.name));
  console.log('👥 Available Staff:', staff.map(s => s.name));
  console.groupEnd();
};