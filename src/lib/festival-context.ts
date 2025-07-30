// Festival context utilities for getting current festival settings
import { createClient } from '@/lib/supabase/client'

interface FestivalSettings {
  id: string
  edition_number: number
  festival_name: string
  start_date: string
  end_date: string
  important_links: { title: string; url: string }[]
}

let cachedFestivalSettings: FestivalSettings | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Get festival settings with caching
export async function getFestivalSettings(): Promise<FestivalSettings | null> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (cachedFestivalSettings && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedFestivalSettings
  }
  
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('festival_settings')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching festival settings:', error)
      return null
    }

    cachedFestivalSettings = data
    cacheTimestamp = now
    return data
  } catch (error) {
    console.error('Error fetching festival settings:', error)
    return null
  }
}

// Get the festival year using string parsing only
export async function getFestivalYear(): Promise<number> {
  const settings = await getFestivalSettings()
  if (!settings) {
    console.warn('No festival settings found, defaulting to 2024')
    return 2024
  }
  
  // Parse year from YYYY-MM-DD string without Date objects
  const startDateStr = settings.start_date
  if (startDateStr && startDateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    const year = parseInt(startDateStr.split('-')[0])
    return year
  }
  
  console.warn('Invalid start_date format, defaulting to 2024')
  return 2024
}

// Get festival date range for validation
export async function getFestivalDateRange(): Promise<{ start: string; end: string } | null> {
  const settings = await getFestivalSettings()
  if (!settings) return null
  
  return {
    start: settings.start_date,
    end: settings.end_date
  }
}

// Clear cache (useful for testing or when settings are updated)
export function clearFestivalCache(): void {
  cachedFestivalSettings = null
  cacheTimestamp = 0
}