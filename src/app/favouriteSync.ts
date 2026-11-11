import type { LearningNotesDB } from '../core/db'
import { onApplied } from '../sync/applied'
import {
  bindFavouriteWriter,
  favourites,
  reconcileFavourites,
} from './favourites'

/**
 * Keeps the favourites list of this device in step with the stars on the page
 * records (which sync). Runs at start (older local stars are written to their
 * pages) and whenever sync brings pages from another device.
 */
export function startFavouriteSync(db: LearningNotesDB): () => void {
  bindFavouriteWriter(db)
  const run = async (ids: readonly string[]) => {
    const pages = await db.pages.bulkGet([...ids])
    const { list, toWrite } = reconcileFavourites(
      pages,
      ids,
      favourites.get(),
      Date.now(),
    )
    for (const w of toWrite) {
      await db.pages.update(w.id, { favourite: { on: true, at: w.at } })
    }
    if (JSON.stringify(list) !== JSON.stringify(favourites.get()))
      favourites.set(list)
  }
  void run(favourites.get()).catch(() => undefined)
  const stop = onApplied((a) => {
    if (a.table === 'pages') void run(a.ids).catch(() => undefined)
  })
  return () => {
    stop()
    bindFavouriteWriter(null)
  }
}
