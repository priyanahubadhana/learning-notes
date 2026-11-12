import type { IconName } from '../../app/tools/icons'

export interface Command {
  id: string
  label: string
  /** Other words that find this command ("color" for "Colour"). */
  aliases?: string[]
  icon?: IconName
  /** The key combination shown on the right, e.g. "Ctrl B". */
  shortcut?: string
  hint?: string
  danger?: boolean
}

export interface CommandGroup {
  id: string
  label: string
  items: Command[]
}

export const RECENT_MAX = 3
/** Items shown before "Show all" when nothing is typed. */
export const SHORT_LIMIT = 5

export const normalise = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** 0 = no match; higher = better. Every typed word must hit the name or an alias. */
export function scoreCommand(c: Command, query: string): number {
  const words = normalise(query).split(/\s+/).filter(Boolean)
  if (!words.length) return 1
  const name = normalise(c.label)
  const aliases = (c.aliases ?? []).map(normalise)
  let total = 0
  for (const w of words) {
    let best = 0
    if (name.startsWith(w)) best = 4
    else if (name.split(/[\s\-/]+/).some((p) => p.startsWith(w))) best = 3
    else if (name.includes(w)) best = 2
    else if (aliases.some((a) => a.startsWith(w))) best = 2
    else if (aliases.some((a) => a.includes(w))) best = 1
    if (!best) return 0
    total += best
  }
  return total
}

/** Groups with only the matching items, best match first inside a group. */
export function filterGroups(
  groups: readonly CommandGroup[],
  query: string,
): CommandGroup[] {
  if (!normalise(query)) return groups.map((g) => ({ ...g }))
  const out: CommandGroup[] = []
  for (const g of groups) {
    const items = g.items
      .map((c, i) => ({ c, i, s: scoreCommand(c, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .map((x) => x.c)
    if (items.length) out.push({ ...g, items })
  }
  return out
}

/** The last picked ids, newest first, no repeats, at most 3. */
export function pushRecent(
  recent: readonly string[],
  id: string,
  max = RECENT_MAX,
): string[] {
  return [id, ...recent.filter((r) => r !== id)].slice(0, max)
}

export type ListRow =
  | { kind: 'heading'; key: string; label: string }
  | { kind: 'item'; key: string; item: Command; recent: boolean }
  | { kind: 'showAll'; key: string }

export interface BuiltList {
  rows: ListRow[]
  /** Keys of the rows that can be highlighted, in order. */
  navKeys: string[]
  /** Items hidden behind "Show all". */
  hidden: number
  matches: number
}

/**
 * The rows to draw. Nothing typed: Recent (last 3) on top, then the groups,
 * cut to `limit` items with a "Show all" row until it is pressed. Typing
 * searches every group, no Recent, no limit.
 */
export function buildList(opts: {
  groups: readonly CommandGroup[]
  query: string
  recent: readonly string[]
  showAll: boolean
  limit?: number
}): BuiltList {
  const { groups, query, showAll, limit = SHORT_LIMIT } = opts
  const searching = normalise(query).length > 0
  const rows: ListRow[] = []
  let hidden = 0
  let matches = 0

  if (searching) {
    for (const g of filterGroups(groups, query)) {
      rows.push({ kind: 'heading', key: `h-${g.id}`, label: g.label })
      for (const item of g.items) {
        matches += 1
        rows.push({ kind: 'item', key: `i-${item.id}`, item, recent: false })
      }
    }
  } else {
    const all = new Map<string, Command>()
    for (const g of groups) for (const c of g.items) all.set(c.id, c)
    const recentItems = opts.recent
      .map((id) => all.get(id))
      .filter((c): c is Command => !!c)
      .slice(0, RECENT_MAX)
    const total = [...all.values()].length
    matches = total
    if (recentItems.length) {
      rows.push({ kind: 'heading', key: 'h-recent', label: '' })
      for (const item of recentItems)
        rows.push({ kind: 'item', key: `r-${item.id}`, item, recent: true })
    }
    let used = 0
    for (const g of groups) {
      const take = showAll
        ? g.items
        : g.items.slice(0, Math.max(0, limit - used))
      if (!take.length) {
        hidden += g.items.length
        continue
      }
      rows.push({ kind: 'heading', key: `h-${g.id}`, label: g.label })
      for (const item of take)
        rows.push({ kind: 'item', key: `i-${item.id}`, item, recent: false })
      used += take.length
      hidden += g.items.length - take.length
    }
    if (!showAll && hidden > 0) rows.push({ kind: 'showAll', key: 'show-all' })
  }
  const navKeys = rows.filter((r) => r.kind !== 'heading').map((r) => r.key)
  return { rows, navKeys, hidden, matches }
}

/** Moves the highlight by `delta`, wrapping; -1 (nothing) starts at the ends. */
export function moveIndex(
  current: number,
  delta: number,
  count: number,
): number {
  if (count <= 0) return -1
  if (current < 0) return delta >= 0 ? 0 : count - 1
  return (current + delta + count) % count
}
