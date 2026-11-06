/**
 * Acronym builder (E2): the first letters of a list, and small groups for
 * long lists. Letters of any script: the first character of each item.
 */

/** Items of a pasted list: one per line, bullets and numbers stripped. */
export function listItems(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 30)
}

const firstLetter = (item: string): string =>
  (Array.from(item.replace(/^[^\p{L}\p{N}]+/u, ''))[0] ?? '').toUpperCase()

/** The acronym of a list (first letters, in order). */
export function acronymOf(items: readonly string[]): string {
  return items.map(firstLetter).join('')
}

/**
 * Groups of 3 letters for long acronyms, so a long list is remembered as a
 * few small chunks. The last group is never a lone letter.
 */
export function chunkAcronym(acronym: string, size = 3): string[] {
  const letters = Array.from(acronym)
  if (letters.length <= size + 1) return [acronym]
  const parts: string[] = []
  for (let i = 0; i < letters.length; i += size) {
    parts.push(letters.slice(i, i + size).join(''))
  }
  if (parts.length > 1 && Array.from(parts.at(-1)!).length === 1) {
    const last = parts.pop()!
    parts[parts.length - 1] += last
  }
  return parts
}
