import { createClient } from '@/lib/supabase/client'
import { HIGHLIGHT_THRESHOLD_DAYS } from '@/config/highlight-config'

function normalize(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'boolean') return value.toString()
  if (typeof value === 'number') return value.toString()
  return String(value).trim()
}

/**
 * Compare original and updated objects, return list of field names that changed.
 * Only checks fields in the fieldsToTrack array.
 */
export function detectChangedFields(
  original: Record<string, unknown>,
  updated: Record<string, unknown>,
  fieldsToTrack: string[]
): string[] {
  const changed: string[] = []
  for (const field of fieldsToTrack) {
    if (normalize(original[field]) !== normalize(updated[field])) {
      changed.push(field)
    }
  }
  return changed
}

/**
 * Batch insert changed field entries into field_changes table.
 */
export async function logFieldChanges(
  tableName: string,
  recordId: string,
  changedFields: string[],
  festivalYear: number
): Promise<void> {
  if (changedFields.length === 0) return

  const supabase = createClient()
  const rows = changedFields.map(field => ({
    table_name: tableName,
    record_id: recordId,
    field_name: field,
    festival_year: festivalYear,
  }))

  const { error } = await supabase.from('field_changes').insert(rows)
  if (error) {
    console.error('Error logging field changes:', error)
  }
}

/**
 * Fetch recent field changes for a set of record IDs.
 * Returns a Map where key = recordId, value = Set of changed field names.
 */
export async function fetchFieldChanges(
  tableName: string,
  recordIds: string[],
  festivalYear: number
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>()
  if (recordIds.length === 0) return result

  const supabase = createClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - HIGHLIGHT_THRESHOLD_DAYS)

  const { data, error } = await supabase
    .from('field_changes')
    .select('record_id, field_name')
    .eq('table_name', tableName)
    .eq('festival_year', festivalYear)
    .in('record_id', recordIds)
    .gte('changed_at', cutoff.toISOString())

  if (error) {
    console.error('Error fetching field changes:', error)
    return result
  }

  for (const row of data || []) {
    if (!result.has(row.record_id)) {
      result.set(row.record_id, new Set())
    }
    result.get(row.record_id)!.add(row.field_name)
  }

  return result
}

/**
 * Log all non-null fields of a newly inserted record as changed.
 * This gives brand-new records the same yellow highlight as edited cells.
 */
export async function logNewRecord(
  tableName: string,
  record: Record<string, unknown>,
  fieldsToTrack: string[],
  festivalYear: number
): Promise<void> {
  const recordId = String(record.id ?? '')
  if (!recordId) return

  const changedFields = fieldsToTrack.filter(field => {
    const val = record[field]
    return val !== null && val !== undefined && val !== ''
  })

  await logFieldChanges(tableName, recordId, changedFields, festivalYear)
}

/**
 * Returns 'bg-yellow-100' if the field was recently changed, '' otherwise.
 */
export function getCellHighlightClass(
  fieldChangesMap: Map<string, Set<string>>,
  recordId: string,
  fieldName: string
): string {
  return fieldChangesMap.get(recordId)?.has(fieldName) ? 'bg-yellow-100' : ''
}
