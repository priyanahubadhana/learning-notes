import type { RowPlace } from '../databaseService'
import type { GroupedItem } from './rowGroups'

/**
 * Re-ordering rows of the Table and List by hand: the maths apart from the
 * screen. A row is always placed just before or after a neighbour (that is
 * what `placeRow` takes), and the opposite placement undoes the move.
 */

/** The ids of the rows of each group, in the order shown ('' = no grouping). */
export function idsByGroup(
  items: readonly GroupedItem[],
): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  let key = ''
  for (const item of items) {
    if (item.kind === 'group') {
      key = item.key
      groups.set(key, [])
    } else {
      const list = groups.get(key)
      if (list) list.push(item.row.page.id)
      else groups.set(key, [item.row.page.id])
    }
  }
  return groups
}

/**
 * Where a row goes when dropped at `index` among the other rows of its
 * list (0 = first). Null when it would stay where it is.
 */
export function placeAt(
  ids: readonly string[],
  movedId: string,
  index: number,
): RowPlace | null {
  const from = ids.indexOf(movedId)
  if (from < 0) return null
  const others = ids.filter((id) => id !== movedId)
  const at = Math.max(0, Math.min(index, others.length))
  if (others.length === 0 || at === from) return null
  return at < others.length ? { before: others[at] } : { after: others[at - 1] }
}

/** The placement that puts a row back where it was in `ids`. */
export function placeBack(
  ids: readonly string[],
  movedId: string,
): RowPlace | null {
  const from = ids.indexOf(movedId)
  if (from < 0 || ids.length < 2) return null
  return from > 0 ? { after: ids[from - 1] } : { before: ids[1] }
}

/** `ids` with a row moved to `index` among the others (a new list). */
export function moveId(
  ids: readonly string[],
  movedId: string,
  index: number,
): string[] {
  const others = ids.filter((id) => id !== movedId)
  const at = Math.max(0, Math.min(index, others.length))
  return [...others.slice(0, at), movedId, ...others.slice(at)]
}

/**
 * The index among the other rows where a row dropped on `overId` lands:
 * before it (upper half) or after it (lower half). Null when `overId` is
 * not in the list.
 */
export function indexOver(
  ids: readonly string[],
  movedId: string,
  overId: string,
  lowerHalf: boolean,
): number | null {
  const others = ids.filter((id) => id !== movedId)
  const over = others.indexOf(overId)
  if (over < 0) return null
  return lowerHalf ? over + 1 : over
}
