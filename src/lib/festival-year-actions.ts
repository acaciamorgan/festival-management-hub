// Server actions and utilities for managing festival years
import { createClient } from '@/lib/supabase/client'

export interface FestivalYear {
  id: string
  year: number
  edition_number: number
  festival_name: string
  is_archived: boolean
  start_date: string | null
  end_date: string | null
  important_links: { title: string; url: string }[]
  created_at: string
  updated_at: string
}

/**
 * Get all available festival years
 */
export async function getAllFestivalYears(): Promise<FestivalYear[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('festival_settings')
    .select('*')
    .order('year', { ascending: false })

  if (error) {
    console.error('Error fetching festival years:', error)
    return []
  }

  return data || []
}

/**
 * Get a specific festival year
 */
export async function getFestivalYear(year: number): Promise<FestivalYear | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('festival_settings')
    .select('*')
    .eq('year', year)
    .maybeSingle()

  if (error) {
    console.error('Error fetching festival year:', error)
    return null
  }

  return data
}

/**
 * Get the current (non-archived) festival year
 */
export async function getCurrentFestivalYear(): Promise<FestivalYear | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('festival_settings')
    .select('*')
    .eq('is_archived', false)
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching current festival year:', error)
    return null
  }

  return data
}

/**
 * Create a new festival year
 * Optionally copies venues and template programs from the previous year
 */
export async function createNewFestivalYear(options: {
  year: number
  editionNumber: number
  festivalName: string
  startDate?: string
  endDate?: string
  copyVenues?: boolean
  copyTemplatePrograms?: boolean
  copyContacts?: boolean
  copyPress?: boolean
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    // Check if year already exists
    const existing = await getFestivalYear(options.year)
    if (existing) {
      return { success: false, error: 'Year already exists' }
    }

    // Create the new year
    const { error: insertError } = await supabase
      .from('festival_settings')
      .insert({
        year: options.year,
        edition_number: options.editionNumber,
        festival_name: options.festivalName,
        is_archived: false,
        start_date: options.startDate || null,
        end_date: options.endDate || null,
        important_links: [],
      })

    if (insertError) {
      console.error('Error creating festival year:', insertError)
      return { success: false, error: insertError.message }
    }

    // Copy venues if requested
    if (options.copyVenues) {
      const previousYear = options.year - 1
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('*')
        .eq('festival_year', previousYear)

      if (!venuesError && venues && venues.length > 0) {
        const newVenues = venues.map(v => ({
          name: v.name,
          address: v.address,
          notes: v.notes,
          festival_year: options.year,
        }))

        await supabase.from('venues').insert(newVenues)
      }
    }

    // Copy contacts if requested
    if (options.copyContacts) {
      const previousYear = options.year - 1
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('festival_year', previousYear)

      if (!contactsError && contacts && contacts.length > 0) {
        const newContacts = contacts.map(c => ({
          contact_name: c.contact_name,
          contact_company: c.contact_company,
          contact_email: c.contact_email,
          phone: c.phone,
          contact_type: c.contact_type,
          mailing_address: c.mailing_address,
          notes: c.notes,
          festival_year: options.year,
        }))

        await supabase.from('contacts').insert(newContacts)
      }
    }

    // Copy press if requested
    if (options.copyPress) {
      const previousYear = options.year - 1
      const { data: press, error: pressError } = await supabase
        .from('press')
        .select('*')
        .eq('festival_year', previousYear)

      if (!pressError && press && press.length > 0) {
        const newPress = press.map(p => ({
          name: p.name,
          email: p.email,
          phone: p.phone,
          media_outlet: p.media_outlet,
          secondary_outlets: p.secondary_outlets,
          outlet_type: p.outlet_type,
          website_url: p.website_url,
          secondary_outlet_urls: p.secondary_outlet_urls,
          social_media: p.social_media,
          rotten_tomatoes_accredited: p.rotten_tomatoes_accredited,
          critics_groups: p.critics_groups,
          accreditation_level: p.accreditation_level,
          picked_up_credentials: false,
          festival_year: options.year,
        }))

        await supabase.from('press').insert(newPress)
      }
    }

    // Copy template programs if requested
    if (options.copyTemplatePrograms) {
      const previousYear = options.year - 1
      const { data: programs, error: programsError } = await supabase
        .from('programs')
        .select('*')
        .eq('festival_year', previousYear)
        .eq('is_template', true)

      if (!programsError && programs && programs.length > 0) {
        const newPrograms = programs.map(p => ({
          title: p.title,
          description: p.description,
          program_type: p.program_type,
          is_template: true,
          festival_year: options.year,
        }))

        await supabase.from('programs').insert(newPrograms)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error creating new festival year:', error)
    return { success: false, error: 'Unknown error occurred' }
  }
}

/**
 * Archive a festival year
 */
export async function archiveFestivalYear(year: number): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('festival_settings')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('year', year)

    if (error) {
      console.error('Error archiving festival year:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error archiving festival year:', error)
    return { success: false, error: 'Unknown error occurred' }
  }
}

/**
 * Unarchive a festival year
 */
export async function unarchiveFestivalYear(year: number): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('festival_settings')
      .update({ is_archived: false, updated_at: new Date().toISOString() })
      .eq('year', year)

    if (error) {
      console.error('Error unarchiving festival year:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error unarchiving festival year:', error)
    return { success: false, error: 'Unknown error occurred' }
  }
}

/**
 * Update festival year dates
 */
export async function updateFestivalYearDates(
  year: number,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('festival_settings')
      .update({
        start_date: startDate,
        end_date: endDate,
        updated_at: new Date().toISOString(),
      })
      .eq('year', year)

    if (error) {
      console.error('Error updating festival year dates:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating festival year dates:', error)
    return { success: false, error: 'Unknown error occurred' }
  }
}
