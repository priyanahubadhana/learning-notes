import { fold, searchWords } from './searchText'

/**
 * Marking the searched words in result text, the same way the index
 * matches them: a word that starts with a search word (ignoring case and
 * accents) has that start marked. Pure functions, so any screen can use
 * them.
 */

export interface TextPart {
  text: string
  /** True for a part to show highlighted. */
  match: boolean
}

const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' })

/** Splits `text` into plain and highlighted parts for the search `query`. */
export function highlightParts(text: string, query: string): TextPart[] {
  const words = searchWords(query)
  const parts: TextPart[] = []
  const push = (part: string, match: boolean) => {
    if (!part) return
    const last = parts.at(-1)
    if (last && last.match === match) last.text += part
    else parts.push({ text: part, match })
  }
  for (const { segment, isWordLike } of segmenter.segment(text)) {
    const folded = isWordLike ? fold(segment) : ''
    const word = isWordLike && words.find((w) => folded.startsWith(w))
    if (!word) {
      push(segment, false)
      continue
    }
    const end = matchedLength(segment, word)
    push(segment.slice(0, end), true)
    push(segment.slice(end), false)
  }
  return parts
}

/** How many characters of `segment` fold to (at least) `word`. */
function matchedLength(segment: string, word: string): number {
  const chars = [...segment]
  let prefix = ''
  for (const char of chars) {
    prefix += char
    if (fold(prefix).length >= word.length) break
  }
  return prefix.length
}

/**
 * A short piece of `text` around the first searched word (whole text when
 * short), with "…" where it was cut.
 */
export function snippet(text: string, query: string, length = 140): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= length) return flat
  const parts = highlightParts(flat, query)
  const firstMatch = parts.findIndex((p) => p.match)
  let at = 0
  for (const part of parts.slice(0, Math.max(0, firstMatch))) {
    at += part.text.length
  }
  const start = Math.max(0, Math.min(at - 40, flat.length - length))
  // Start and end on a space, so no word is cut in half.
  const from = start === 0 ? 0 : flat.indexOf(' ', start) + 1 || start
  let to = Math.min(flat.length, from + length)
  const lastSpace = flat.lastIndexOf(' ', to)
  if (to < flat.length && lastSpace > from) to = lastSpace
  return (
    (from > 0 ? '…' : '') + flat.slice(from, to) + (to < flat.length ? '…' : '')
  )
}
