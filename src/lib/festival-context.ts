// Festival context utilities for getting current festival settings
import { createClient } from '@/lib/supabase/client'

interface FestivalSettings {
  id: string
  year: number
  edition_number: number
  festival_name: string
  start_date: string
  end_date: string
  important_links: { title: string; url: string }[]
  is_archived: boolean
}

let cachedFestivalSettings: Map<number, FestivalSettings> = new Map()
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Get festival settings for a specific year with caching
export async function getFestivalSettings(year: number): Promise<FestivalSettings | null> {
  const now = Date.now()

  // Return cached data if still valid
  if (cachedFestivalSettings.has(year) && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedFestivalSettings.get(year) || null
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('festival_settings')
      .select('*')
      .eq('year', year)
      .single()

    if (error) {
      console.error('Error fetching festival settings:', error)
      return null
    }

    cachedFestivalSettings.set(year, data)
    cacheTimestamp = now
    return data
  } catch (error) {
    console.error('Error fetching festival settings:', error)
    return null
  }
}

// Get current (non-archived) festival settings
export async function getCurrentFestivalSettings(): Promise<FestivalSettings | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('festival_settings')
      .select('*')
      .eq('is_archived', false)
      .order('year', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching current festival settings:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching current festival settings:', error)
    return null
  }
}

// Get festival date range for a specific year
export async function getFestivalDateRange(year: number): Promise<{ start: string; end: string } | null> {
  const settings = await getFestivalSettings(year)
  if (!settings) return null

  return {
    start: settings.start_date,
    end: settings.end_date
  }
}

// Clear cache (useful for testing or when settings are updated)
export function clearFestivalCache(): void {
  cachedFestivalSettings.clear()
  cacheTimestamp = 0
}