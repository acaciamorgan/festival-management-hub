'use client'

import { createClient } from '@/lib/supabase/client'
import { StickyNote } from '@/types'

const supabase = createClient()

export async function getStickyNotesForModule(moduleId: string): Promise<StickyNote[]> {
  const { data, error } = await supabase
    .from('sticky_notes')
    .select('*')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching sticky notes:', error)
    throw error
  }

  return data || []
}

export async function createStickyNote(note: Omit<StickyNote, 'id' | 'created_at' | 'updated_at'>): Promise<StickyNote> {
  const { data, error } = await supabase
    .from('sticky_notes')
    .insert([note])
    .select()
    .single()

  if (error) {
    console.error('Error creating sticky note:', error)
    throw error
  }

  return data
}

export async function updateStickyNote(noteId: string, updates: Partial<StickyNote>): Promise<StickyNote> {
  const { data, error } = await supabase
    .from('sticky_notes')
    .update(updates)
    .eq('id', noteId)
    .select()
    .single()

  if (error) {
    console.error('Error updating sticky note:', error)
    throw error
  }

  return data
}

export async function deleteStickyNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('sticky_notes')
    .delete()
    .eq('id', noteId)

  if (error) {
    console.error('Error deleting sticky note:', error)
    throw error
  }
}