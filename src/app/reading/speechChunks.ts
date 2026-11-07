/**
 * Splitting a page's text into short pieces to speak. Short pieces are
 * needed because browsers cut a long utterance off (Chrome after about 15
 * seconds, Safari sooner on some voices), and because every piece is a
 * place to restart from after a pause or a locked screen.
 */

export interface Chunk {
  /** Offsets in the whole text. */
  start: number
  end: number
  text: string
}

const MAX_CHUNK = 180

const SENTENCE_END = /[.!?…。！？।]["'”’)\]]*(?=\s|$)/g

/**
 * Chunks of `text` from offset `from` on. A new line always ends a chunk;
 * so does a sentence end; a long sentence is cut at a comma or a space.
 */
export function makeChunks(
  text: string,
  from = 0,
  max: number = MAX_CHUNK,
): Chunk[] {
  const chunks: Chunk[] = []
  let at = Math.max(0, Math.min(from, text.length))
  // Start at the beginning of the sentence the offset is in? No: start
  // exactly at the offset (the word the user tapped), skipping blanks.
  while (at < text.length) {
    while (at < text.length && /\s/.test(text[at])) at++
    if (at >= text.length) break
    const lineEnd = text.indexOf('\n', at)
    const limit = lineEnd === -1 ? text.length : lineEnd
    // The first sentence end inside the line.
    SENTENCE_END.lastIndex = at
    const m = SENTENCE_END.exec(text)
    let end =
      m && m.index + m[0].length <= limit ? m.index + m[0].length : limit
    if (end - at > max) end = cut(text, at, max)
    const piece = text.slice(at, end)
    if (piece.trim() !== '') {
      const trimmed = piece.trimEnd()
      chunks.push({ start: at, end: at + trimmed.length, text: trimmed })
    }
    at = end
  }
  return chunks
}

/** Where to cut a too-long sentence: the last comma/space before `max`. */
function cut(text: string, at: number, max: number): number {
  const slice = text.slice(at, at + max)
  const comma = Math.max(
    slice.lastIndexOf(', '),
    slice.lastIndexOf('; '),
    slice.lastIndexOf(': '),
  )
  if (comma > max / 3) return at + comma + 1
  const space = slice.lastIndexOf(' ')
  return space > 0 ? at + space : at + max
}

/** The word that contains (or follows) an offset: [start, end). */
export function wordAt(text: string, index: number): [number, number] {
  let start = Math.max(0, Math.min(index, text.length))
  while (start > 0 && !/\s/.test(text[start - 1])) start--
  while (start < text.length && /\s/.test(text[start])) start++
  let end = start
  while (end < text.length && !/\s/.test(text[end])) end++
  return [start, end]
}

/** The chunk that holds an offset (or the first after it). */
export function chunkIndexAt(chunks: readonly Chunk[], offset: number): number {
  const i = chunks.findIndex((c) => c.end > offset)
  return i === -1 ? Math.max(0, chunks.length - 1) : i
}
