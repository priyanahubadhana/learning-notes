/**
 * Small text helpers the tag picker needs. They mirror `search/searchText.ts`
 * (fold) and `tags/tagNames.ts` (cleanTagName) so the design parts do not
 * depend on those features; a test keeps them identical.
 */
const OPTIONAL_MARKS = /[̀-֑ͯ-ׇً-ٰٟ]/g

/** Lower case, optional marks removed (same as the search index). */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(OPTIONAL_MARKS, '')
    .normalize('NFC')
}

/** One level's name as stored: no "#" or "/", spaces → "-", 60 letters. */
export function cleanTagName(text: string): string {
  return text.replace(/[#/]/g, '').trim().replace(/\s+/g, '-').slice(0, 60)
}
