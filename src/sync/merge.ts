import { excerptOf, independentEdit } from './clash'
import { parseHlc } from './hlc'
import type { MergeMode } from './tables'

/**
 * Merge rules (L7), as pure functions so they are easy to test. A pulled
 * record is compared with this device's copy:
 *
 * 1. Nothing here yet → take it.
 * 2. "Delete forever" always wins (a purged copy beats an unpurged one).
 * 3. `append` rows never change: keep what is here.
 * 4. This device has no unsent change → take it (it is newer than our base).
 * 5. Both changed (a true conflict) → the newer clock wins (or the side the
 *    person chose after signing back in, `prefer`); equal clocks
 *    cannot happen (the device id is part of the clock). For `blocks`, the
 *    loser is kept in History when its content differs.
 * 6. Pages only: two small things that change all the time are kept from
 *    both sides instead of one side winning the whole page (see
 *    `mergePageReading`): where a book was last read (and the furthest
 *    place), and the favourite star.
 */

export interface LocalCopy {
  value: Record<string, unknown>
  /** Clock of the last change on this device. */
  hlc: string
  /** Changed here and not yet accepted by the server. */
  dirty: boolean
}

export interface RemoteCopy {
  value: Record<string, unknown>
  hlc: string
}

export type MergeResult = (
  | { action: 'take' }
  | { action: 'keep' }
  | { action: 'take'; loser: Record<string, unknown> }
  | { action: 'keep'; loser: Record<string, unknown> }
) & {
  /**
   * Pages: the winner with the reading place and the star of both sides put
   * together. It differs from the winner, so it is saved here and sent again.
   */
  merged?: Record<string, unknown>
}

const purged = (v: Record<string, unknown>) => typeof v.purgedAt === 'number'

/** Fields that do not count as a content difference. */
const IGNORE = new Set(['updatedAt', 'order', 'parentId'])

function sameContent(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    if (IGNORE.has(k)) continue
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false
  }
  return true
}

/**
 * A clash is about words. The losing side counts only if it has text the
 * winner lacks: pictures, videos and other blocks without text, and changes
 * of position or props alone, merge silently (newest wins).
 */
export function differentText(
  winner: Record<string, unknown>,
  loser: Record<string, unknown>,
): boolean {
  // No base is stored here, so the check is: the loser is not the winner's
  // text, nor an earlier or shorter state of it (item 1).
  return independentEdit(
    null,
    excerptOf(winner.content, 100000),
    excerptOf(loser.content, 100000),
  )
}

type Source = Record<string, unknown> & {
  progress?: number
  at?: string
  openedAt?: number
  furthest?: number
  furthestAt?: string
  pageCount?: number
}
type Star = { on: boolean; at: number }

const isStar = (v: unknown): v is Star =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as Star).on === 'boolean' &&
  typeof (v as Star).at === 'number'

/**
 * A page changed on two devices. The newer clock wins the page, but a book's
 * reading place and a page's star are small things both devices keep
 * changing, so they are put together instead:
 * - the place last read (progress, spot, page count) comes from the side the
 *   book was opened on most recently;
 * - the furthest place ever read is the larger of the two;
 * - the star is the one set most recently (ties: the winner's).
 * Returns the winner changed that way, or null when nothing differs.
 */
export function mergePageReading(
  winner: Record<string, unknown>,
  loser: Record<string, unknown>,
): Record<string, unknown> | null {
  const out: Record<string, unknown> = { ...winner }
  const ws = winner.source as Source | undefined
  const ls = loser.source as Source | undefined
  if (ws && ls && typeof ws === 'object' && typeof ls === 'object') {
    const lastRead = (ls.openedAt ?? 0) > (ws.openedAt ?? 0) ? ls : ws
    const source: Source = { ...ws }
    for (const k of ['progress', 'at', 'openedAt', 'pageCount'] as const) {
      if (lastRead[k] !== undefined) source[k] = lastRead[k] as never
    }
    const farthest = (ls.furthest ?? -1) > (ws.furthest ?? -1) ? ls : ws
    if (farthest.furthest !== undefined) {
      source.furthest = farthest.furthest
      source.furthestAt = farthest.furthestAt
    }
    out.source = source
  }
  const wf = winner.favourite
  const lf = loser.favourite
  if (isStar(lf) && (!isStar(wf) || lf.at > wf.at)) out.favourite = lf
  return JSON.stringify(out) === JSON.stringify(winner) ? null : out
}

export function mergeRecord(
  mode: MergeMode,
  local: LocalCopy | undefined,
  remote: RemoteCopy,
  prefer?: 'here' | 'there',
  table?: string,
): MergeResult {
  if (!local) return { action: 'take' }
  if (purged(remote.value) && !purged(local.value)) return { action: 'take' }
  if (purged(local.value) && !purged(remote.value)) return { action: 'keep' }
  if (mode === 'append') return { action: 'keep' }
  if (!local.dirty) return { action: 'take' }
  const remoteWins = prefer ? prefer === 'there' : remote.hlc > local.hlc
  const loser = remoteWins ? local.value : remote.value
  const winner = remoteWins ? remote.value : local.value
  // Our own change coming back is never a clash (item 1).
  const echo =
    parseHlc(remote.hlc)?.deviceId !== undefined &&
    parseHlc(remote.hlc)?.deviceId === parseHlc(local.hlc)?.deviceId
  const keepLoser =
    mode === 'blocks' &&
    !echo &&
    winner.deletedAt === null &&
    loser.deletedAt === null &&
    !sameContent(winner, loser) &&
    differentText(winner, loser)
  const merged =
    table === 'pages' && !prefer ? mergePageReading(winner, loser) : null
  const extra = merged ? { merged } : {}
  if (remoteWins)
    return keepLoser
      ? { action: 'take', loser, ...extra }
      : { action: 'take', ...extra }
  return keepLoser
    ? { action: 'keep', loser, ...extra }
    : { action: 'keep', ...extra }
}
