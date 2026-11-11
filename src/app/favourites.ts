import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { prefStore } from './tools/store'

/**
 * Favourite pages: starred from a page's ⋯ menu or from the sidebar. The list
 * of ids is kept on this device (instant, works offline, and a renamed page
 * stays a favourite). The star itself also lives on the page record
 * (`Page.favourite`, with the time it was set), so it syncs: the newest
 * star or un-star wins per page, and two devices starring different pages
 * both keep theirs. `favouriteSync.ts` keeps the two in step.
 */

export const MAX_FAVOURITES = 200

/** A plain list of page ids: unique, short, not too many. */
export const isIdList = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length <= MAX_FAVOURITES &&
  new Set(value).size === value.length &&
  value.every(
    (id) => typeof id === 'string' && id.length > 0 && id.length < 100,
  )

export const favourites = prefStore<string[]>('favourites', isIdList, [])

export const isFavourite = (pageId: string): boolean =>
  favourites.get().includes(pageId)

/** Where the star is written; set once the database is open. */
let writeStar: ((pageId: string, on: boolean, at: number) => void) | null = null
export function bindFavouriteWriter(db: LearningNotesDB | null): void {
  writeStar = db
    ? (pageId, on, at) => {
        void db.pages
          .update(pageId, { favourite: { on, at } })
          .catch(() => undefined)
      }
    : null
}

/** Stars a page, or takes the star off. Returns true if it is now a favourite. */
export function toggleFavourite(pageId: string): boolean {
  const list = favourites.get()
  const now = Date.now()
  if (list.includes(pageId)) {
    favourites.set(list.filter((id) => id !== pageId))
    writeStar?.(pageId, false, now)
    return false
  }
  favourites.set([pageId, ...list].slice(0, MAX_FAVOURITES))
  writeStar?.(pageId, true, now)
  return true
}

type StarPage = Pick<Page, 'id' | 'favourite' | 'deletedAt' | 'purgedAt'>

/**
 * Puts the stars on the page records and the list on this device in step.
 * `pages[i]` is the page with id `ids[i]` (undefined: not here).
 * - A page with a star record decides: on = in the list, off = out. This is
 *   how a star from another device arrives (new ones go to the front, newest
 *   first). The order of the rest is kept.
 * - An id in the list whose page has no star record yet is an older, local
 *   star (made before stars synced, or while sync was off): it is written to
 *   the page (`toWrite`) and stays where it is.
 * - A deleted page leaves the list. An id whose page is not here yet stays:
 *   it may arrive.
 * Pure: no database; `now` only dates the older stars.
 */
export function reconcileFavourites(
  pages: readonly (StarPage | undefined)[],
  ids: readonly string[],
  local: readonly string[],
  now: number,
): { list: string[]; toWrite: { id: string; at: number }[] } {
  const byId = new Map<string, StarPage>()
  ids.forEach((id, i) => {
    const p = pages[i]
    if (p) byId.set(id, p)
  })
  const gone = (p: StarPage) => !!p.deletedAt || !!p.purgedAt
  const toWrite: { id: string; at: number }[] = []
  const list: string[] = []
  const inList = new Set<string>()
  local.forEach((id, index) => {
    if (inList.has(id)) return
    inList.add(id)
    const p = byId.get(id)
    if (!p) return void list.push(id)
    if (gone(p)) return
    if (!p.favourite) {
      // Older local star: newest first, so earlier in the list = later time.
      toWrite.push({ id, at: now - index })
      return void list.push(id)
    }
    if (p.favourite.on) list.push(id)
  })
  const added = [...byId]
    .filter(([id, p]) => !inList.has(id) && !gone(p) && p.favourite?.on)
    .sort((a, b) => (b[1].favourite?.at ?? 0) - (a[1].favourite?.at ?? 0))
    .map(([id]) => id)
  return { list: [...added, ...list].slice(0, MAX_FAVOURITES), toWrite }
}
