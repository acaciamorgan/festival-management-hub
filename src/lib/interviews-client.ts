import { createClient } from '@/lib/supabase/client'
import { InterviewCard } from '@/types'

// Client-side interview functions for use in client components

export async function getInterviewsForCard(
  cardType: 'feature_films' | 'shorts_programs' | 'programs' | 'press' | 'guests',
  cardId: string,
  festivalYear?: number
): Promise<InterviewCard[]> {
  const supabase = createClient()

  let query = supabase.from('interviews_with_films').select('*')

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

  if (festivalYear) {
    query = query.eq('festival_year', festivalYear)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error(`Error fetching interviews for ${cardType} ${cardId}:`, error)
    return []
  }

  return data || []
}

export async function getInterviewsForFilmCard(filmId: string, festivalYear?: number): Promise<InterviewCard[]> {
  const supabase = createClient()

  // Query by film_id FK directly — no text fallback needed
  let query = supabase
    .from('interviews_with_films')
    .select('*')
    .eq('film_id', filmId)

  if (festivalYear) {
    query = query.eq('festival_year', festivalYear)
  }

  const { data: featureData } = await query.order('created_at', { ascending: false })

  if (featureData && featureData.length > 0) {
    return featureData
  }

  // Try as a short film
  let shortQuery = supabase
    .from('interviews_with_films')
    .select('*')
    .eq('short_film_id', filmId)

  if (festivalYear) {
    shortQuery = shortQuery.eq('festival_year', festivalYear)
  }

  const { data: shortData } = await shortQuery.order('created_at', { ascending: false })

  return shortData || []
}

export async function getInterviewsForShortsProgram(programId: string, festivalYear?: number): Promise<InterviewCard[]> {
  return getInterviewsForCard('shorts_programs', programId, festivalYear)
}

export async function getInterviewsForProgram(programId: string, festivalYear?: number): Promise<InterviewCard[]> {
  return getInterviewsForCard('programs', programId, festivalYear)
}

export async function getInterviewsForPressCard(pressId: string, festivalYear?: number): Promise<InterviewCard[]> {
  return getInterviewsForCard('press', pressId, festivalYear)
}

export async function getInterviewsForGuestCard(guestId: string, festivalYear?: number): Promise<InterviewCard[]> {
  return getInterviewsForCard('guests', guestId, festivalYear)
}
