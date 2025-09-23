import { createClient } from '@/lib/supabase/client'

export interface GuestMatch {
  name: string
  guestId: string
  confidence: 'exact' | 'contextual' | 'ambiguous'
  filmContext?: string
}

export interface GuestMatchResult {
  matches: GuestMatch[]
  unmatched: string[]
}

/**
 * Smart guest matching that uses film/program context to disambiguate duplicates
 */
export async function matchSubjectsToGuests(
  subjectNames: string[],
  filmTitle?: string
): Promise<GuestMatchResult> {
  const supabase = createClient()
  const matches: GuestMatch[] = []
  const unmatched: string[] = []

  try {
    // Get all guests with their film/program associations including short films
    const { data: guestsData, error: guestsError } = await supabase
      .from('guests')
      .select(`
        id,
        name,
        guest_films:guest_films(film_title),
        guest_programs:guest_programs(program_title),
        guest_short_films:guest_short_films(film_title)
      `)

    if (guestsError) throw guestsError

    for (const subjectName of subjectNames) {
      const trimmedName = subjectName.trim()
      if (!trimmedName || trimmedName === '—') continue

      // Find potential matches by name (case insensitive)
      const potentialMatches = (guestsData || []).filter(guest => 
        guest.name.toLowerCase() === trimmedName.toLowerCase()
      )

      if (potentialMatches.length === 0) {
        unmatched.push(trimmedName)
        continue
      }

      if (potentialMatches.length === 1) {
        // Single match - high confidence
        matches.push({
          name: trimmedName,
          guestId: potentialMatches[0].id,
          confidence: 'exact'
        })
        continue
      }

      // Multiple matches - use film context for disambiguation
      if (filmTitle && potentialMatches.length > 1) {
        const contextualMatch = potentialMatches.find(guest => {
          const guestFilms = [
            ...(guest.guest_films || []).map((f: any) => f.film_title),
            ...(guest.guest_programs || []).map((p: any) => p.program_title),
            ...(guest.guest_short_films || []).map((sf: any) => sf.film_title)
          ]
          return guestFilms.some(title =>
            title.toLowerCase() === filmTitle.toLowerCase()
          )
        })

        if (contextualMatch) {
          matches.push({
            name: trimmedName,
            guestId: contextualMatch.id,
            confidence: 'contextual',
            filmContext: filmTitle
          })
          continue
        }
      }

      // Multiple matches without context - mark as ambiguous
      // For now, we'll skip ambiguous matches rather than guess
      unmatched.push(trimmedName)
    }

    return { matches, unmatched }
  } catch (error) {
    console.error('Error matching subjects to guests:', error)
    return { matches: [], unmatched: subjectNames }
  }
}

/**
 * Get guest suggestions for autocomplete in forms
 */
export async function getGuestSuggestions(query: string): Promise<Array<{
  id: string
  name: string
  films_display: string
  label: string
}>> {
  if (!query || query.length < 2) return []

  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('guests')
      .select(`
        id,
        name,
        guest_films:guest_films(film_title),
        guest_programs:guest_programs(program_title),
        guest_short_films:guest_short_films(film_title)
      `)
      .ilike('name', `%${query}%`)
      .limit(10)

    if (error) throw error

    return (data || []).map(guest => {
      const films = [
        ...(guest.guest_films || []).map((f: any) => f.film_title),
        ...(guest.guest_programs || []).map((p: any) => p.program_title),
        ...(guest.guest_short_films || []).map((sf: any) => sf.film_title)
      ]
      const films_display = films.join(', ') || 'No films assigned'

      return {
        id: guest.id,
        name: guest.name,
        films_display,
        label: `${guest.name} ✓ Guest (${films_display})`
      }
    })
  } catch (error) {
    console.error('Error getting guest suggestions:', error)
    return []
  }
}