import { createClient } from '@/lib/supabase/server'
import { CardType } from '@/types'

// Generic Card interface - specific Card types will extend this
export interface BaseCard {
  id: string
  created_at: string
  updated_at: string
  created_by: string
}

// Generic CRUD operations for Cards
export async function getCards<T extends BaseCard>(
  cardType: CardType,
  userId?: string
): Promise<T[]> {
  const supabase = await createClient()
  
  let query = supabase.from(cardType).select('*')
  
  if (userId) {
    query = query.eq('created_by', userId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error(`Error fetching ${cardType}:`, error)
    return []
  }

  return data || []
}

export async function getCard<T extends BaseCard>(
  cardType: CardType,
  id: string
): Promise<T | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(cardType)
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error(`Error fetching ${cardType} with id ${id}:`, error)
    return null
  }

  return data
}

export async function createCard<T extends Omit<BaseCard, 'id' | 'created_at' | 'updated_at'>>(
  cardType: CardType,
  cardData: T
): Promise<BaseCard | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(cardType)
    .insert([cardData])
    .select()
    .single()

  if (error) {
    console.error(`Error creating ${cardType}:`, error)
    return null
  }

  return data
}

export async function updateCard<T extends Partial<BaseCard>>(
  cardType: CardType,
  id: string,
  updates: T
): Promise<BaseCard | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(cardType)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error(`Error updating ${cardType} with id ${id}:`, error)
    return null
  }

  return data
}

export async function deleteCard(
  cardType: CardType,
  id: string
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from(cardType)
    .delete()
    .eq('id', id)

  if (error) {
    console.error(`Error deleting ${cardType} with id ${id}:`, error)
    return false
  }

  return true
}

