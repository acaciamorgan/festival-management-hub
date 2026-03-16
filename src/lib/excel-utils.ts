import * as XLSX from 'xlsx'

export interface ProcessedExcelRow {
  data: any[]
  isStrikethrough: boolean
  rowIndex: number
}

/**
 * Process Excel file and detect strikethrough rows
 * @param file - The Excel file to process
 * @returns Object with headers and processed rows with strikethrough detection
 */
export async function processExcelWithStrikethrough(file: File): Promise<{
  headers: string[]
  rows: ProcessedExcelRow[]
}> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellStyles: true })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]

  // Get the range of the worksheet
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

  const headers: string[] = []
  const rows: ProcessedExcelRow[] = []

  // Extract headers from first row
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
    const cell = worksheet[cellAddress]
    headers.push(cell ? String(cell.v || '').trim() : '')
  }

  // Process data rows (starting from row 1, skipping header row 0)
  for (let row = 1; row <= range.e.r; row++) {
    const rowData: any[] = []
    let isRowStrikethrough = false

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = worksheet[cellAddress]

      if (cell) {
        // Extract cell value
        rowData.push(cell.v || '')

        // Check for strikethrough formatting
        // In Excel, strikethrough is stored in the font formatting
        if (cell.s && cell.s.font && cell.s.font.strike) {
          isRowStrikethrough = true
        }
      } else {
        rowData.push('')
      }
    }

    // Only add non-empty rows
    if (rowData.some(cell => cell && String(cell).trim())) {
      rows.push({
        data: rowData,
        isStrikethrough: isRowStrikethrough,
        rowIndex: row
      })
    }
  }

  return { headers, rows }
}

/**
 * Filter out strikethrough rows from processed Excel data
 * @param rows - Processed rows with strikethrough detection
 * @returns Filtered rows without strikethrough
 */
export function filterStrikethroughRows(rows: ProcessedExcelRow[]): any[][] {
  const filtered = rows.filter(row => !row.isStrikethrough)
  return filtered.map(row => row.data)
}

/**
 * Detect if a text string contains strikethrough characters
 * (fallback for CSV files that might have Unicode strikethrough)
 * @param text - Text to check
 * @returns True if text appears to be struck through
 */
export function hasTextStrikethrough(text: string): boolean {
  if (!text) return false

  // Check for Unicode strikethrough characters
  // U+0336 is the combining long stroke overlay
  // U+0338 is the combining long solidus overlay
  return text.includes('\u0336') || text.includes('\u0338')
}

/**
 * Check if a CSV row appears to be struck through
 * @param rowData - Array of cell values
 * @returns True if any cell appears struck through
 */
export function isCSVRowStrikethrough(rowData: string[]): boolean {
  return rowData.some(cell => hasTextStrikethrough(cell))
}