import { createClient } from '@/lib/supabase/server'
import { RSVPForm, RSVPResponse, RSVPField, FormFieldValue } from '@/types'

// RSVP Form Management
export async function createRSVPForm(
  eventId: string,
  moduleType: string,
  fields: RSVPField[]
): Promise<RSVPForm | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rsvp_forms')
    .insert([{
      event_id: eventId,
      module_type: moduleType,
      fields: fields
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating RSVP form:', error)
    return null
  }

  return data
}

export async function getRSVPForm(eventId: string): Promise<RSVPForm | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rsvp_forms')
    .select('*')
    .eq('event_id', eventId)
    .single()

  if (error) {
    console.error('Error fetching RSVP form:', error)
    return null
  }

  return data
}

// RSVP Response Management
export async function submitRSVPResponse(
  eventId: string,
  responses: Record<string, FormFieldValue>
): Promise<RSVPResponse | null> {
  const supabase = await createClient()

  // Check if this email matches any existing Cards
  const email = responses.email
  let linkedCardId = null
  let linkedCardType = null

  if (email) {
    // Check Guests
    const { data: guest } = await supabase
      .from('guests')
      .select('id')
      .eq('email', email)
      .single()

    if (guest) {
      linkedCardId = guest.id
      linkedCardType = 'guests'
    } else {
      // Check Press
      const { data: press } = await supabase
        .from('press')
        .select('id')
        .eq('email', email)
        .single()

      if (press) {
        linkedCardId = press.id
        linkedCardType = 'press'
      }
    }
  }

  const { data, error } = await supabase
    .from('rsvp_responses')
    .insert([{
      event_id: eventId,
      responses: responses,
      linked_card_id: linkedCardId,
      linked_card_type: linkedCardType,
      submitted_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) {
    console.error('Error submitting RSVP response:', error)
    return null
  }

  return data
}

export async function getRSVPResponses(eventId: string): Promise<RSVPResponse[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rsvp_responses')
    .select('*')
    .eq('event_id', eventId)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error fetching RSVP responses:', error)
    return []
  }

  return data || []
}

// Token Management for secure RSVP links
export async function generateRSVPToken(eventId: string): Promise<string> {
  const token = crypto.randomUUID()
  const supabase = await createClient()

  await supabase
    .from('rsvp_tokens')
    .insert([{
      token,
      event_id: eventId,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      created_at: new Date().toISOString()
    }])

  return token
}

export async function validateRSVPToken(token: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rsvp_tokens')
    .select('event_id, expires_at')
    .eq('token', token)
    .single()

  if (error || !data) {
    return null
  }

  if (Date.now() > new Date(data.expires_at).getTime()) {
    return null // Token expired
  }

  return data.event_id
}

// Default RSVP field templates by module type
export const rsvpFieldTemplates = {
  pressScreenings: [
    { name: 'name', label: 'Full Name', type: 'text' as const, required: true },
    { name: 'email', label: 'Email Address', type: 'email' as const, required: true },
    { name: 'outlet', label: 'Media Outlet', type: 'text' as const, required: true },
    { name: 'role', label: 'Role/Position', type: 'text' as const, required: false },
    { name: 'attendees', label: 'Number of Attendees', type: 'select' as const, required: true, options: ['1', '2'] }
  ],
  redCarpets: [
    { name: 'name', label: 'Full Name', type: 'text' as const, required: true },
    { name: 'email', label: 'Email Address', type: 'email' as const, required: true },
    { name: 'phone', label: 'Phone Number', type: 'tel' as const, required: true },
    { name: 'outlet', label: 'Media Outlet', type: 'text' as const, required: false },
    { name: 'role', label: 'Role/Position', type: 'text' as const, required: false },
    { name: 'dietary', label: 'Dietary Restrictions', type: 'textarea' as const, required: false }
  ],
  specialEvents: [
    { name: 'name', label: 'Full Name', type: 'text' as const, required: true },
    { name: 'email', label: 'Email Address', type: 'email' as const, required: true },
    { name: 'phone', label: 'Phone Number', type: 'tel' as const, required: false },
    { name: 'organization', label: 'Organization/Company', type: 'text' as const, required: false },
    { name: 'dietary', label: 'Dietary Restrictions', type: 'textarea' as const, required: false },
    { name: 'accessibility', label: 'Accessibility Needs', type: 'textarea' as const, required: false }
  ],
  photoShoots: [
    { name: 'name', label: 'Full Name', type: 'text' as const, required: true },
    { name: 'email', label: 'Email Address', type: 'email' as const, required: true },
    { name: 'phone', label: 'Phone Number', type: 'tel' as const, required: true },
    { name: 'outlet', label: 'Media Outlet', type: 'text' as const, required: true },
    { name: 'equipment', label: 'Equipment Needs', type: 'textarea' as const, required: false }
  ]
}