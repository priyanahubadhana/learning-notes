/**
 * The daily highlight review (CR3, Readwise-style): five highlights a day,
 * oldest-unseen first, and none comes back until all have been shown. Pure:
 * the state is a small object the screen keeps on this device.
 */

export interface DailyState {
  /** Local day the five were picked, "YYYY-MM-DD". */
  day: string
  /** Today's picks, in order. */
  ids: string[]
  /** Highlights shown in this round (cleared when all have been shown). */
  seen: string[]
  /** Picks the user dismissed today. */
  done: string[]
}

export const EMPTY_DAILY: DailyState = { day: '', ids: [], seen: [], done: [] }

export const DAILY_COUNT = 5

export const isDailyState = (v: unknown): v is DailyState =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as DailyState).day === 'string' &&
  [(v as DailyState).ids, (v as DailyState).seen, (v as DailyState).done].every(
    (l) =>
      Array.isArray(l) &&
      l.length <= 100_000 &&
      l.every((x) => typeof x === 'string'),
  )

export interface Candidate {
  id: string
  createdAt: number
}

/**
 * Today's picks. The same day returns the same picks (minus highlights that
 * no longer exist). A new day takes the oldest highlights not yet shown in
 * this round; when fewer than five are left, the round ends and starts again
 * with the oldest, never repeating one within the same day.
 */
export function pickDaily(
  all: readonly Candidate[],
  state: DailyState,
  today: string,
  count: number = DAILY_COUNT,
): DailyState {
  const exists = new Set(all.map((c) => c.id))
  if (state.day === today) {
    return { ...state, ids: state.ids.filter((id) => exists.has(id)) }
  }
  const oldest = [...all].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  )
  let seen = new Set(state.seen.filter((id) => exists.has(id)))
  let ids = oldest
    .filter((c) => !seen.has(c.id))
    .slice(0, count)
    .map((c) => c.id)
  if (ids.length < count && oldest.length > ids.length) {
    // The round is over: start a new one, keeping today's picks distinct.
    seen = new Set()
    const chosen = new Set(ids)
    for (const c of oldest) {
      if (ids.length >= count) break
      if (!chosen.has(c.id)) {
        ids = [...ids, c.id]
        chosen.add(c.id)
      }
    }
    return { day: today, ids, seen: ids, done: [] }
  }
  return { day: today, ids, seen: [...seen, ...ids], done: [] }
}
