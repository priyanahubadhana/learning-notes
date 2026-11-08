import { parseCsv } from '../../databases/csv'

/**
 * Reading what NotebookLM gives out (one-time import, no live link): file
 * kinds, flashcards (CSV or copied text), quiz text and tables. Pure text in,
 * plain data out; nothing here touches the database.
 */

/** What a file or a paste is. */
export type NlmKind =
  | 'audio'
  | 'video'
  | 'slides'
  | 'picture'
  | 'csv'
  | 'report'
  | 'cards'
  | 'quiz'
  | 'table'
  | 'mindmap'

/** The kind a chosen or dropped file is (by its name or type), or null. */
export function kindOfFile(name: string, mime: string): NlmKind | null {
  const n = name.toLowerCase()
  if (mime.startsWith('video/') || /\.(mp4|mov|m4v)$/.test(n)) return 'video'
  if (mime.startsWith('audio/') || /\.(m4a|mp3|wav|ogg|oga|aac|webm)$/.test(n))
    return 'audio'
  if (/\.(pdf|pptx)$/.test(n) || mime === 'application/pdf') return 'slides'
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp)$/.test(n))
    return 'picture'
  if (/\.(csv|tsv)$/.test(n) || mime === 'text/csv') return 'csv'
  if (/\.(txt|md|markdown)$/.test(n) || mime.startsWith('text/'))
    return 'report'
  return null
}

const BOM = new RegExp('^' + String.fromCharCode(0xfeff))

export interface QaCard {
  q: string
  a: string
}

const HEADER_WORDS = new Set([
  'front',
  'back',
  'question',
  'answer',
  'term',
  'definition',
  'q',
  'a',
])

/** Rows of two or more columns become cards (column 1 front, column 2 back). */
export function cardsFromRows(rows: readonly (readonly string[])[]): QaCard[] {
  const body = [...rows]
  if (
    body.length > 1 &&
    body[0].length >= 2 &&
    HEADER_WORDS.has(body[0][0].trim().toLowerCase()) &&
    HEADER_WORDS.has(body[0][1].trim().toLowerCase())
  )
    body.shift()
  return body
    .map((r) => ({ q: (r[0] ?? '').trim(), a: (r[1] ?? '').trim() }))
    .filter((c) => c.q !== '')
}

const Q_LINE = /^\s*(?:q(?:uestion)?|front)\s*\d*\s*[:.)-]\s*(.*)$/i
const A_LINE = /^\s*(?:a(?:nswer)?|back)\s*[:.)-]\s*(.*)$/i

/**
 * Flashcards as NotebookLM gives them: a CSV (front, back), or copied text
 * ("Question: ... / Answer: ...", or a front line then back lines, blank line
 * between cards).
 */
export function parseFlashcards(text: string): QaCard[] {
  const clean = text.replace(BOM, '').trim()
  if (!clean) return []
  const first = clean.split(/\r?\n/, 1)[0]
  if (/[\t;,]/.test(first) && !Q_LINE.test(first)) {
    const rows = parseCsv(clean).rows
    if (rows.length > 0 && rows.every((r) => r.length >= 2)) {
      return cardsFromRows(rows)
    }
  }
  const cards: QaCard[] = []
  for (const block of clean.split(/\r?\n\s*\r?\n/)) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) continue
    let q = ''
    const a: string[] = []
    let inAnswer = false
    for (const [i, line] of lines.entries()) {
      const ql = Q_LINE.exec(line)
      const al = A_LINE.exec(line)
      if (ql && !inAnswer) q = ql[1]
      else if (al) {
        inAnswer = true
        if (al[1]) a.push(al[1])
      } else if (inAnswer) a.push(line)
      else if (i === 0) q = line
      else a.push(line)
    }
    if (q) cards.push({ q, a: a.join('\n') })
  }
  return cards
}

const QUESTION_START = /^\s*(?:q(?:uestion)?\s*)?\d+\s*[.):]\s*(.+)$/i
const OPTION = /^\s*\(?([A-Fa-f])[.)]\s*(.+)$/
const ANSWER = /^\s*(?:correct\s+)?answer\s*(?:is)?\s*[:-]\s*(.+)$/i
const MARKED = /\s*(?:✓|✔|\(correct\))\s*$/i

/**
 * Quiz text copied from NotebookLM: "1. Question", options "A) ...", and an
 * answer line or a check mark when it shows one. Each question becomes a
 * card: front = question and options, back = the right answer (empty if
 * unknown).
 */
export function parseQuiz(text: string): QaCard[] {
  const out: QaCard[] = []
  let cur: { q: string; options: string[]; answer: string } | null = null
  const flush = () => {
    if (!cur) return
    const letter = /^[A-Fa-f]$/.test(cur.answer.trim())
      ? cur.answer.trim().toUpperCase()
      : ''
    const found = letter
      ? cur.options.find((o) => o.startsWith(`${letter}) `))
      : undefined
    out.push({
      q: [cur.q, ...cur.options].join('\n'),
      a: found ?? cur.answer,
    })
    cur = null
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const qs = QUESTION_START.exec(line)
    const op = OPTION.exec(line)
    const an = ANSWER.exec(line)
    if (qs && !(cur && op)) {
      flush()
      cur = { q: qs[1], options: [], answer: '' }
    } else if (!cur) continue
    else if (an) cur.answer = an[1].trim()
    else if (op) {
      const marked = MARKED.test(op[2])
      const label = `${op[1].toUpperCase()}) ${op[2].replace(MARKED, '')}`
      cur.options.push(label)
      if (marked) cur.answer = label
    } else if (cur.options.length === 0) cur.q += ` ${line}`
  }
  flush()
  return out.filter((c) => c.q.trim() !== '')
}

/** A table: tab/comma/semicolon text, or a Markdown (|) table. */
export function parseTable(text: string): {
  headers: string[]
  body: string[][]
} {
  const lines = text.replace(BOM, '').trim().split(/\r?\n/)
  let rows: string[][]
  if (lines.filter((l) => l.includes('|')).length >= 2) {
    rows = lines
      .filter((l) => l.includes('|') && !/^\s*\|?[\s:|-]+\|?\s*$/.test(l))
      .map((l) =>
        l
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim()),
      )
  } else rows = parseCsv(text).rows
  rows = rows.filter((r) => r.some((c) => c.trim() !== ''))
  if (rows.length === 0) return { headers: [], body: [] }
  return { headers: rows[0], body: rows.slice(1) }
}

/** Whether CSV rows look like flashcards (exactly two columns). */
export function looksLikeCards(rows: readonly (readonly string[])[]): boolean {
  return (
    rows.length > 0 && rows.every((r) => r.length === 2 && r[0].trim() !== '')
  )
}

/**
 * A pasted quiz: numbered questions with options and an answer line, or the
 * plain "Q: / A:" list our NotebookLM prompt asks for.
 */
export function parseQuizText(text: string): QaCard[] {
  const numbered = parseQuiz(text)
  return numbered.length > 0 ? numbered : parseFlashcards(text)
}
