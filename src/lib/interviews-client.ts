import { createClient } from '@/lib/supabase/client'
import { InterviewCard } from '@/types'

// Client-side interview functions for use in client components
export async function getInterviewsForCard(
  cardType: 'feature_films' | 'shorts_programs' | 'programs' | 'press' | 'guests',
  cardId: string
): Promise<InterviewCard[]> {
  const supabase = createClient()
  
  let query = supabase.from('interviews').select('*')
  
  // Filter based on card type
  switch (cardType) {
    case 'feature_films':
      query = query.eq('film_id', cardId)
      break
    case 'shorts_programs':
      query = query.eq('shorts_program_id', cardId)
      break
    case 'programs':
      query = query.eq('program_id', cardId)
      break
    case 'press':
      query = query.eq('press_id', cardId)
      break
    case 'guests':
      query = query.contains('subject_guest_ids', [cardId])
      break
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error(`Error fetching interviews for ${cardType} ${cardId}:`, error)
    return []
  }

  return data || []
}

export async function getInterviewsForFilmCard(filmId: string): Promise<InterviewCard[]> {
  const supabase = createClient()

  // First, determine if this is a feature film or short film
  const { data: featureFilm } = await supabase
    .from('feature_films')
    .select('id, title')
    .eq('id', filmId)
    .single()

  if (featureFilm) {
    // It's a feature film - query by film_id OR film_title contains this film's title
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .or(`film_id.eq.${filmId},film_title.ilike.%${featureFilm.title}%`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(`Error fetching interviews for feature film ${filmId}:`, error)
      return []
    }

    return data || []
  }

  // It's a short film - get the title and query by short_film_id OR film_title
  const { data: shortFilm } = await supabase
    .from('short_films')
    .select('id, title')
    .eq('id', filmId)
    .single()

  if (!shortFilm) {
    return []
  }

  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .or(`short_film_id.eq.${filmId},film_title.ilike.%${shortFilm.title}%`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(`Error fetching interviews for short film ${filmId}:`, error)
    return []
  }

  return data || []
}

export async function getInterviewsForShortsProgram(programId: string): Promise<InterviewCard[]> {
  return getInterviewsForCard('shorts_programs', programId)
}

export async function getInterviewsForProgram(programId: string): Promise<InterviewCard[]> {
  return getInterviewsForCard('programs', programId)
}

export async function getInterviewsForPressCard(pressId: string): Promise<InterviewCard[]> {
  return getInterviewsForCard('press', pressId)
}

export async function getInterviewsForGuestCard(guestId: string): Promise<InterviewCard[]> {
  return getInterviewsForCard('guests', guestId)
}