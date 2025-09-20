import { createClient } from '@/lib/supabase/client'

export interface CSVTitleMapping {
  id: number
  csv_title: string
  database_title: string
  created_at: string
}

export async function getTitleMappings(): Promise<CSVTitleMapping[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('csv_title_mappings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching title mappings:', error)
    return []
  }

  return data || []
}

export async function saveTitleMapping(csvTitle: string, databaseTitle: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from('csv_title_mappings')
    .upsert({
      csv_title: csvTitle,
      database_title: databaseTitle
    }, {
      onConflict: 'csv_title'
    })

  if (error) {
    console.error('Error saving title mapping:', error)
    return false
  }

  return true
}

export async function saveTitleMappings(mappings: Record<string, string>): Promise<boolean> {
  const supabase = createClient()

  const mappingRows = Object.entries(mappings).map(([csvTitle, databaseTitle]) => ({
    csv_title: csvTitle,
    database_title: databaseTitle
  }))

  const { error } = await supabase
    .from('csv_title_mappings')
    .upsert(mappingRows, {
      onConflict: 'csv_title'
    })

  if (error) {
    console.error('Error saving title mappings:', error)
    return false
  }

  return true
}

export function getMappedTitle(csvTitle: string, mappings: CSVTitleMapping[]): string | null {
  const mapping = mappings.find(m => m.csv_title === csvTitle)
  return mapping ? mapping.database_title : null
}