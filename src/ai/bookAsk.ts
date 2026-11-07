import { estimateTokens } from './provider'

/**
 * Ask this book and Story so far (Phase P). Only the chosen part of a book
 * is sent: one chapter, some pages, or (Story so far) what has been read up
 * to the reading position, so nothing after it can spoil the story. Each
 * part carries a mark such as [p. 12] or [ch. 3] that the answer cites back.
 */

export interface BookPart {
  /** The mark the model cites, e.g. "p. 12" or "ch. 3". */
  cite: string
  /** Where the reader jumps for that mark (`pdf:12:0` or `href:...`). */
  at: string
  text: string
}

/** Most characters of a book sent in one call (about 15,000 tokens). */
export const MAX_BOOK_CHARS = 60_000
export const ASK_MAX_TOKENS = 1200
export const STORY_MAX_TOKENS = 1200

export interface Gathered {
  text: string
  parts: BookPart[]
  /** Some of the chosen text did not fit and was left out. */
  cut: boolean
  words: number
}

/**
 * Joins the parts under their marks, up to the limit. `keepEnd`: when too
 * long, the latest parts are kept (Story so far: the most recent reading).
 */
export function gatherParts(
  all: readonly BookPart[],
  keepEnd = false,
  limit = MAX_BOOK_CHARS,
): Gathered {
  const list = all.filter((p) => p.text.trim())
  const order = keepEnd ? [...list].reverse() : list
  const kept: BookPart[] = []
  let size = 0
  let cut = false
  for (const p of order) {
    const piece = `[${p.cite}]\n${p.text.trim()}\n\n`
    if (size + piece.length > limit) {
      const room = limit - size
      if (room > 200) {
        const text = keepEnd ? p.text.slice(-room) : p.text.slice(0, room)
        kept.push({ ...p, text })
      }
      cut = true
      break
    }
    kept.push(p)
    size += piece.length
  }
  if (keepEnd) kept.reverse()
  const text = kept.map((p) => `[${p.cite}]\n${p.text.trim()}`).join('\n\n')
  return {
    text,
    parts: kept,
    cut,
    words: text ? text.split(/\s+/).length : 0,
  }
}

const RULES =
  'Answer with Markdown only, no introduction. After each statement, cite where it comes from with the mark in square brackets exactly as it appears in the text, for example [p. 12] or [ch. 3]. Use only the text below.'

export function askPrompt(question: string, text: string): string {
  return `Answer the question about the book text below, in the language of the question. If the text does not hold the answer, say so in one line. ${RULES}\n\nQuestion: ${question.trim().slice(0, 2000)}\n\nBook text:\n${text}`
}

export function storyPrompt(text: string): string {
  return `The text below is everything the reader has read so far in a book. Summarise the story (or the ideas) so far in 6 to 12 short sentences, in the language of the text. Do not guess or mention anything that comes later. ${RULES}\n\nBook text:\n${text}`
}

/** Estimated tokens a prompt sends. */
export const promptTokens = (prompt: string) => estimateTokens(prompt)

/** A piece of an answer: plain text, or a citation to jump to. */
export type AnswerPiece =
  { kind: 'text'; text: string } | { kind: 'cite'; cite: string; at?: string }

const CITE = /\[((?:p|ch)\.\s*\d+)\]/g

/** Splits an answer into text and citations (known marks get a link). */
export function splitCitations(
  answer: string,
  parts: readonly BookPart[],
): AnswerPiece[] {
  const where = new Map(parts.map((p) => [p.cite, p.at]))
  const out: AnswerPiece[] = []
  let last = 0
  for (const m of answer.matchAll(CITE)) {
    const i = m.index ?? 0
    if (i > last) out.push({ kind: 'text', text: answer.slice(last, i) })
    const cite = m[1].replace(/\s+/g, ' ')
    out.push({ kind: 'cite', cite, at: where.get(cite) })
    last = i + m[0].length
  }
  if (last < answer.length) out.push({ kind: 'text', text: answer.slice(last) })
  return out
}

// ---- Where the reader is ----

/** The spine index an EPUB position is in (`epub:epubcfi(/6/N!...)`). */
export function sectionOfCfi(locator: string): number | null {
  const m = /epubcfi\(\/6\/(\d+)/.exec(locator)
  if (!m) return null
  const n = Number(m[1])
  return n >= 2 ? n / 2 - 1 : null
}

/** PDF chapters from the outline: each runs to the page before the next. */
export function pdfChapters(
  outline: readonly { title: string; page: number; depth: number }[],
  pageCount: number,
): { title: string; from: number; to: number }[] {
  const top = outline.filter((o) => o.depth === 0 && o.page > 0)
  return top.map((o, i) => ({
    title: o.title,
    from: o.page,
    to: Math.max(o.page, (top[i + 1]?.page ?? pageCount + 1) - 1),
  }))
}

/**
 * The read part of the current EPUB section: its start, up to what is left
 * (`charsLeft`, from the reader). Unknown: none of it (no spoilers).
 */
export function readPartOf(text: string, charsLeft: number | undefined) {
  if (charsLeft === undefined) return ''
  return text.slice(0, Math.max(0, text.length - charsLeft))
}
