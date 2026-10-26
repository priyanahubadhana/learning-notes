import type { LearningNotesDB } from '../core/db'
import { findMatches } from './searchService'
import { searchWords } from './searchText'

/**
 * "Did you mean…?": for a search with no results, the closest words that
 * exist in the index (1 letter off for short words, 2 for longer ones;
 * a swap of two letters counts as 1). Only offered when the suggestion
 * itself finds something. Typo-tolerant matching can later replace this
 * as a pluggable matcher on the same index.
 */

/** Scripts written without letter-by-letter spelling: no suggestions. */
const NO_SPELLING =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u

/** Words longer than this aren't compared (very long tokens, hashes). */
const MAX_LENGTH = 30

export async function suggestSearch(
  db: LearningNotesDB,
  text: string,
): Promise<string | null> {
  const words = searchWords(text)
  if (words.length === 0 || NO_SPELLING.test(text)) return null

  let changed = false
  const fixed: string[] = []
  for (const word of words) {
    const known =
      (await db.searchEntries.where('words').startsWith(word).count()) > 0
    const better = known ? null : await closestWord(db, word)
    if (better) changed = true
    fixed.push(better ?? word)
  }
  if (!changed) return null
  const matches = await findMatches(db, fixed)
  return matches.some((m) => !m.entry.deleted) ? fixed.join(' ') : null
}

/**
 * The indexed word closest to `word`, or null if none is close enough.
 * Looks only at words with the same first letter (an index range), so it
 * stays fast with a large index.
 */
async function closestWord(
  db: LearningNotesDB,
  word: string,
): Promise<string | null> {
  if (word.length < 3 || word.length > MAX_LENGTH) return null
  const limit = word.length <= 4 ? 1 : 2
  const first = String.fromCodePoint(word.codePointAt(0)!)
  const candidates = (await db.searchEntries
    .where('words')
    .startsWith(first)
    .uniqueKeys()) as string[]

  let best: string | null = null
  let bestScore = Infinity
  for (const candidate of candidates) {
    // Longer words stay in: "mitocon" may be the start of "mitochondria".
    if (candidate.length < word.length - limit) continue
    const whole = editDistance(word, candidate, limit)
    const start = editDistance(word, candidate.slice(0, word.length), limit)
    // A whole-word match is preferred over a word that only starts alike.
    const score = Math.min(whole, start + 0.5)
    if (
      score <= limit &&
      (score < bestScore ||
        (score === bestScore &&
          best !== null &&
          candidate.length < best.length))
    ) {
      best = candidate
      bestScore = score
    }
  }
  return best
}

/**
 * Edits (insert, delete, change, swap of neighbours) to turn `a` into `b`;
 * returns `limit + 1` as soon as it is clearly more than `limit`.
 */
export function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1
  const rows: number[][] = [Array.from({ length: b.length + 1 }, (_, j) => j)]
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let smallest = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(
        rows[i - 1][j] + 1,
        row[j - 1] + 1,
        rows[i - 1][j - 1] + cost,
      )
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, rows[i - 2][j - 2] + 1)
      }
      row.push(value)
      smallest = Math.min(smallest, value)
    }
    if (smallest > limit) return limit + 1
    rows.push(row)
  }
  return Math.min(rows[a.length][b.length], limit + 1)
}
