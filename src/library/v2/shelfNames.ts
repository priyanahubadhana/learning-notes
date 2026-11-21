import { t } from '../../i18n/t'
import type { LibraryPrefs, ShelfId } from './libraryPrefs'

export const SHELF_IDS = ['all', 'reading', 'want', 'finished'] as const

/** The name of the open shelf (for the title and the shelf button). */
export function shelfName(prefs: LibraryPrefs, shelf: ShelfId = prefs.shelf) {
  if (shelf.startsWith('c:'))
    return (
      prefs.collections.find((c) => c.id === shelf.slice(2))?.name ??
      t('lib2.shelf.all')
    )
  return t(`lib2.shelf.${shelf as (typeof SHELF_IDS)[number]}`)
}
