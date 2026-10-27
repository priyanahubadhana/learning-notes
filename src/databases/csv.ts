/**
 * CSV: reading and writing comma-separated text (RFC 4180: quotes, doubled
 * quotes, line breaks inside quotes; the separator may also be ";" or a
 * tab, as spreadsheets in some regions write). Pure text in, text out.
 */

/** Longest file read (characters) and most rows kept. */
export const MAX_CSV_CHARS = 30_000_000
export const MAX_CSV_ROWS = 100_000
export const MAX_CSV_COLUMNS = 200

const SEPARATORS = [',', ';', '\t'] as const

/** The separator the first line uses most (outside quotes). */
function detectSeparator(text: string): string {
  const counts = new Map<string, number>(SEPARATORS.map((s) => [s, 0]))
  let quoted = false
  for (const ch of text.slice(0, 5000)) {
    if (ch === '"') quoted = !quoted
    else if (!quoted && (ch === '\n' || ch === '\r')) break
    else if (!quoted && counts.has(ch)) counts.set(ch, counts.get(ch)! + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][1] > 0
    ? [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : ','
}

export interface ParsedCsv {
  /** Every row, the first (header) row included. */
  rows: string[][]
  /** True if rows or columns were dropped to stay within the limits. */
  truncated: boolean
}

/** Reads CSV text. A leading BOM is ignored; blank lines are skipped. */
export function parseCsv(input: string): ParsedCsv {
  const text = input
    .replace(new RegExp('^' + String.fromCharCode(0xfeff)), '')
    .slice(0, MAX_CSV_CHARS)
  const separator = detectSeparator(text)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let truncated = input.length > MAX_CSV_CHARS
  const endField = () => {
    row.push(field)
    field = ''
  }
  const endRow = () => {
    endField()
    if (row.length > 1 || row[0] !== '') {
      if (rows.length < MAX_CSV_ROWS + 1)
        rows.push(row.slice(0, MAX_CSV_COLUMNS))
      else truncated = true
      if (row.length > MAX_CSV_COLUMNS) truncated = true
    }
    row = []
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
    } else if (ch === '"' && field === '') quoted = true
    else if (ch === separator) endField()
    else if (ch === '\n') endRow()
    else if (ch === '\r') {
      if (text[i + 1] === '\n') i++
      endRow()
    } else field += ch
  }
  if (field !== '' || row.length > 0) endRow()
  return { rows, truncated }
}

/**
 * A cell as safe text for a spreadsheet: one that starts with = + - @ (or a
 * tab/return) would be run as a formula by Excel, so it gets a leading
 * apostrophe, which `unprotectCell` removes again on import.
 */
export function protectCell(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
}

/** Reverses `protectCell`. */
export function unprotectCell(text: string): string {
  return /^'[=+\-@\t\r]/.test(text) ? text.slice(1) : text
}

/** Writes rows as CSV text (comma separated, CRLF lines, quotes where needed). */
export function writeCsv(rows: readonly (readonly string[])[]): string {
  const cell = (text: string) =>
    /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}
