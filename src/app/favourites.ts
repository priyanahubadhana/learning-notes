import { prefStore } from './tools/store'

/**
 * Favourite pages: starred from a page's ⋯ menu or from the sidebar. Kept
 * on this device (page ids only, so a renamed page stays favourite). Sync
 * of favourites between devices comes with sync itself.
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

/** Stars a page, or takes the star off. Returns true if it is now a favourite. */
export function toggleFavourite(pageId: string): boolean {
  const list = favourites.get()
  if (list.includes(pageId)) {
    favourites.set(list.filter((id) => id !== pageId))
    return false
  }
  favourites.set([pageId, ...list].slice(0, MAX_FAVOURITES))
  return true
}
