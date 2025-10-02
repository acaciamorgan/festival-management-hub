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
    .select('id')
    .eq('id', filmId)
    .single()

  if (featureFilm) {
    // It's a feature film - query by film_id
    return getInterviewsForCard('feature_films', filmId)
  }

  // It's a short film - query by short_film_id
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('short_film_id', filmId)
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