import { createClient } from '@/lib/supabase/client'
import { getStringDayOfWeek } from '@/lib/string-date-utils'

interface VenueCard {
  short_code: string
  capacity: number | null
}

export async function syncPressScreenings(currentYear: number, venueCards: VenueCard[]): Promise<{ success: boolean; created: number; updated: number }> {
  const supabase = createClient()

  const { data: pressScreenings, error: pressError } = await supabase
    .from('press_screenings')
    .select(`*, venues(name)`)
    .eq('canceled', false)
    .eq('festival_year', currentYear)

  if (pressError) throw pressError

  const { data: allFeatureFilms } = await supabase
    .from('feature_films')
    .select('id, run_time')
    .eq('festival_year', currentYear)

  const featureRuntimeMap = new Map<string, number | null>()
  for (const film of allFeatureFilms || []) {
    featureRuntimeMap.set(film.id, film.run_time)
  }

  const { data: allPiJuryScreenings } = await supabase
    .from('pi_jury_screenings')
    .select('id, film_id, screening_date, start_time, festival_year, press_screening_id')
    .eq('festival_year', currentYear)

  const piJuryByPressId = new Map<string, string>()
  for (const pij of allPiJuryScreenings || []) {
    if (pij.press_screening_id) {
      piJuryByPressId.set(pij.press_screening_id, pij.id)
    }
  }

  let successCount = 0
  let updatedCount = 0

  for (const screening of pressScreenings || []) {
    if (!screening.screening_date || !screening.screening_time) continue
    if (!screening.short_code) continue
    if (!screening.film_id) continue

    const shortCode = screening.short_code

    let runtime = null
    if (screening.film_type === 'feature') {
      const mappedRuntime = featureRuntimeMap.get(screening.film_id)
      if (mappedRuntime) runtime = mappedRuntime
    }

    let capacity = null
    const venueMatch = venueCards.find(venue => venue.short_code === shortCode)
    if (venueMatch) {
      capacity = venueMatch.capacity
    }

    const existingId = piJuryByPressId.get(screening.id)

    if (existingId) {
      const { error: updateError } = await supabase
        .from('pi_jury_screenings')
        .update({
          screening_date: screening.screening_date,
          start_time: screening.screening_time,
          venue_short_code: shortCode,
          capacity: capacity,
          notes: screening.notes,
          is_tentative: !(screening.film_approved && screening.locked),
          film_approved: screening.film_approved || false,
          locked: screening.locked || false,
          day_of_week: getStringDayOfWeek(screening.screening_date),
          film_id: screening.film_id,
          film_type: screening.film_type || null,
          festival_year: currentYear
        })
        .eq('id', existingId)

      if (!updateError) updatedCount++
    } else {
      const { error: insertError } = await supabase
        .from('pi_jury_screenings')
        .insert({
          press_screening_id: screening.id,
          film_id: screening.film_id,
          film_type: screening.film_type || null,
          festival_year: currentYear,
          screening_type: 'P&I',
          screening_date: screening.screening_date,
          day_of_week: getStringDayOfWeek(screening.screening_date),
          start_time: screening.screening_time,
          venue_short_code: shortCode,
          capacity: capacity,
          notes: screening.notes,
          is_cancelled: false,
          is_tentative: !(screening.film_approved && screening.locked),
          film_approved: screening.film_approved || false,
          locked: screening.locked || false
        })

      if (!insertError) successCount++
    }
  }

  const activePressIds = new Set((pressScreenings || []).map(s => s.id))
  const orphaned = (allPiJuryScreenings || []).filter(pij =>
    pij.press_screening_id && !activePressIds.has(pij.press_screening_id)
  )
  for (const orphan of orphaned) {
    await supabase
      .from('pi_jury_screenings')
      .delete()
      .eq('id', orphan.id)
  }

  return { success: true, created: successCount, updated: updatedCount }
}
