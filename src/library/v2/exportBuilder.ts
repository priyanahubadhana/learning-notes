import type { HighlightColour } from '../../core/types'

/** One thing that can be exported: a highlight, a note or a bookmark. */
export interface ExportItem {
  bookId: string
  book: string
  kind: 'highlight' | 'note' | 'bookmark' | 'sticky'
  quote?: string
  note?: string
  /** What you wrote "in my words" (not stored yet: empty today). */
  inMyWords?: string
  colour?: HighlightColour
  chapter?: string
  place?: string
  key?: boolean
  tags?: string[]
  cards?: { q: string; a: string }[]
}

/** A book-level piece: its summary or a chapter recap. */
export interface ExportBookText {
  bookId: string
  book: string
  summary?: string
  recaps?: string[]
}

export interface ExportOptions {
  include: {
    highlights: boolean
    notes: boolean
    inMyWords: boolean
    bookmarks: boolean
    cards: boolean
    summaries: boolean
    recaps: boolean
    tags: boolean
  }
  keyOnly: boolean
  /** Empty = every colour. */
  colours: HighlightColour[]
  /** Empty = every book. */
  bookIds: string[]
  format: 'md' | 'csv'
}

export const DEFAULT_EXPORT: ExportOptions = {
  include: {
    highlights: true,
    notes: true,
    inMyWords: true,
    bookmarks: true,
    cards: true,
    summaries: true,
    recaps: true,
    tags: true,
  },
  keyOnly: false,
  colours: [],
  bookIds: [],
  format: 'md',
}

export const INCLUDE_KEYS = Object.keys(
  DEFAULT_EXPORT.include,
) as (keyof ExportOptions['include'])[]

export interface ExportPlan {
  items: ExportItem[]
  texts: ExportBookText[]
  /** Items plus book texts. */
  count: number
  books: number
}

/** What the current switches would export (also drives the live count line). */
export function planExport(
  items: readonly ExportItem[],
  texts: readonly ExportBookText[],
  o: ExportOptions,
): ExportPlan {
  const inBook = (id: string) =>
    o.bookIds.length === 0 || o.bookIds.includes(id)
  const keep = items.filter((i) => {
    if (!inBook(i.bookId)) return false
    if (o.keyOnly && !i.key) return false
    if (o.colours.length && !(i.colour && o.colours.includes(i.colour)))
      return false
    if (i.kind === 'highlight') return o.include.highlights
    if (i.kind === 'bookmark') return o.include.bookmarks
    return o.include.notes
  })
  const tx = texts
    .filter((x) => inBook(x.bookId))
    .map((x) => ({
      ...x,
      summary: o.include.summaries ? x.summary : undefined,
      recaps: o.include.recaps ? x.recaps : undefined,
    }))
    .filter((x) => x.summary || x.recaps?.length)
  const books = new Set([
    ...keep.map((i) => i.bookId),
    ...tx.map((x) => x.bookId),
  ])
  return {
    items: keep,
    texts: tx,
    count: keep.length + tx.length,
    books: books.size,
  }
}

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim()
/** Markdown: a leading marker or backtick must not turn text into markup. */
const mdEscape = (s: string) =>
  s.replace(/^(\s*)([#>*+-]|\d+\.)(\s)/gm, '$1\\$2$3')

/** CSV cell: quotes doubled; a leading = + - @ is made safe against formulas. */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function buildMarkdown(plan: ExportPlan, o: ExportOptions): string {
  const byBook = new Map<string, { title: string; items: ExportItem[] }>()
  const book = (id: string, title: string) => {
    let b = byBook.get(id)
    if (!b) byBook.set(id, (b = { title, items: [] }))
    return b
  }
  for (const i of plan.items) book(i.bookId, i.book).items.push(i)
  for (const x of plan.texts) book(x.bookId, x.book)
  const lines: string[] = []
  for (const [id, b] of byBook) {
    lines.push(`# ${oneLine(b.title)}`, '')
    const text = plan.texts.find((x) => x.bookId === id)
    if (text?.summary)
      lines.push('## Summary', '', mdEscape(text.summary.trim()), '')
    for (const i of b.items) {
      const quote = i.quote ? oneLine(i.quote) : ''
      if (quote) lines.push(`> ${quote}`)
      const nz = i.note?.trim()
      if (nz && o.include.notes) lines.push('', mdEscape(nz))
      if (i.inMyWords && o.include.inMyWords)
        lines.push('', `In my words: ${mdEscape(oneLine(i.inMyWords))}`)
      for (const c of i.cards ?? [])
        if (o.include.cards)
          lines.push('', `Q: ${oneLine(c.q)}`, `A: ${oneLine(c.a)}`)
      const tail = [
        i.place,
        i.colour,
        i.key ? '★' : '',
        o.include.tags && i.tags?.length
          ? i.tags.map((x) => `#${x}`).join(' ')
          : '',
      ].filter(Boolean)
      if (tail.length) lines.push('', tail.join(' · '))
      lines.push('')
    }
    if (text?.recaps?.length) {
      lines.push('## Chapter recaps', '')
      for (const r of text.recaps) lines.push(`- ${oneLine(r)}`)
      lines.push('')
    }
  }
  return lines.join('\n').trimEnd() + '\n'
}

export const CSV_HEADER = [
  'book',
  'type',
  'quote',
  'note',
  'in_my_words',
  'colour',
  'chapter',
  'place',
  'key',
  'tags',
  'cards',
] as const

/** CSV with a column per switch: switched-off columns are left out. */
export function buildCsv(plan: ExportPlan, o: ExportOptions): string {
  const skip = new Set<string>()
  if (!o.include.notes) skip.add('note')
  if (!o.include.inMyWords) skip.add('in_my_words')
  if (!o.include.tags) skip.add('tags')
  if (!o.include.cards) skip.add('cards')
  const cols = CSV_HEADER.filter((c) => !skip.has(c))
  const rows = plan.items.map((i) => {
    const all: Record<(typeof CSV_HEADER)[number], string> = {
      book: i.book,
      type: i.kind,
      quote: i.quote ? oneLine(i.quote) : '',
      note: i.note ?? '',
      in_my_words: i.inMyWords ?? '',
      colour: i.colour ?? '',
      chapter: i.chapter ?? '',
      place: i.place ?? '',
      key: i.key ? 'yes' : '',
      tags: (i.tags ?? []).join('; '),
      cards: (i.cards ?? []).map((c) => `${c.q} / ${c.a}`).join('; '),
    }
    return cols.map((c) => csvCell(all[c])).join(',')
  })
  for (const x of plan.texts) {
    if (x.summary)
      rows.push(
        cols
          .map((c) =>
            csvCell(
              c === 'book'
                ? x.book
                : c === 'type'
                  ? 'summary'
                  : c === 'quote'
                    ? x.summary!
                    : '',
            ),
          )
          .join(','),
      )
    for (const r of x.recaps ?? [])
      rows.push(
        cols
          .map((c) =>
            csvCell(
              c === 'book'
                ? x.book
                : c === 'type'
                  ? 'recap'
                  : c === 'quote'
                    ? r
                    : '',
            ),
          )
          .join(','),
      )
  }
  return [cols.join(','), ...rows].join('\n') + '\n'
}

export const buildExport = (plan: ExportPlan, o: ExportOptions): string =>
  o.format === 'csv' ? buildCsv(plan, o) : buildMarkdown(plan, o)
