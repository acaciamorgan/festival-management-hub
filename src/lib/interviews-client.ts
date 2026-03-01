import { createClient } from '@/lib/supabase/client'
import { InterviewCard } from '@/types'

// Client-side interview functions for use in client components

export async function getInterviewsForCard(
  cardType: 'feature_films' | 'shorts_programs' | 'programs' | 'press' | 'guests',
  cardId: string
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

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error(`Error fetching interviews for ${cardType} ${cardId}:`, error)
    return []
  }

  return data || []
}

export async function getInterviewsForFilmCard(filmId: string): Promise<InterviewCard[]> {
  const supabase = createClient()

  // Query by film_id FK directly — no text fallback needed
  const { data: featureData } = await supabase
    .from('interviews_with_films')
    .select('*')
    .eq('film_id', filmId)
    .order('created_at', { ascending: false })

  if (featureData && featureData.length > 0) {
    return featureData
  }

  // Try as a short film
  const { data: shortData } = await supabase
    .from('interviews_with_films')
    .select('*')
    .eq('short_film_id', filmId)
    .order('created_at', { ascending: false })

  return shortData || []
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
