import type { Database, DbView } from '../../core/types'

/**
 * The view a database opens on: the one picked with "Always open on …",
 * else the Dashboard once there are rows (Table while empty), else the
 * first view.
 */
export function openingView(
  views: readonly DbView[],
  database: Pick<Database, 'openViewId'>,
  hasRows: boolean,
): DbView | undefined {
  const picked = views.find((v) => v.id === database.openViewId)
  if (picked) return picked
  const wanted = hasRows ? 'dashboard' : 'table'
  return views.find((v) => v.type === wanted) ?? views[0]
}

/**
 * The view last shown per database while the app is open, so coming back
 * from a row page shows the same view. A fresh start uses `openingView`.
 */
export const lastViewShown = new Map<string, string>()
