import type { PlanBlock, TimeEntry } from '../core/homeTypes'
import { addDays, parseDayKey, weekStart } from '../core/homeDays'
import { focusMsWithin, fromCycleList } from './timer'

/**
 * Reports (F2): pure aggregation over time entries, so they are tested with
 * thousands of entries and need no database. Only time you tracked is
 * counted. A Focus run counts its focus stretches, not its breaks.
 */

/** The time an entry counts for, as of `now` (a running entry counts up to now). */
export function countedMs(entry: TimeEntry, now: number): number {
  const end = entry.endedAt ?? now
  const total = Math.max(0, end - entry.startedAt)
  return entry.mode === 'focus'
    ? focusMsWithin(total, fromCycleList(entry.cycle))
    : total
}

export interface ProjectTime {
  /** null = no project. */
  projectId: string | null
  ms: number
}

/** Hours per project for the days from `fromDay` to `toDay`, longest first. */
export function hoursPerProject(
  entries: readonly TimeEntry[],
  fromDay: string,
  toDay: string,
  now: number,
): ProjectTime[] {
  const totals = new Map<string | null, number>()
  for (const entry of entries) {
    if (entry.deletedAt !== null) continue
    if (entry.day < fromDay || entry.day > toDay) continue
    const key = entry.projectId ?? null
    totals.set(key, (totals.get(key) ?? 0) + countedMs(entry, now))
  }
  return [...totals.entries()]
    .map(([projectId, ms]) => ({ projectId, ms }))
    .filter((p) => p.ms > 0)
    .sort((a, b) => b.ms - a.ms)
}

/** The days of the report range: today, or the week so far (Monday to today). */
export function rangeDays(
  range: 'today' | 'week',
  today: string,
): { from: string; to: string } {
  return range === 'today'
    ? { from: today, to: today }
    : { from: weekStart(today), to: today }
}

export interface Span {
  startMin: number
  endMin: number
  label?: string
  projectId?: string | null
}

/** Minutes after local midnight for a UTC time. */
export function minutesOfDay(at: number): number {
  const d = new Date(at)
  return d.getHours() * 60 + d.getMinutes()
}

/**
 * The day's timeline: planned blocks and what was really tracked, side by
 * side. Entries that run past midnight stop at the end of their day.
 */
export function dayTimeline(
  plan: readonly PlanBlock[],
  entries: readonly TimeEntry[],
  day: string,
  now: number,
): { planned: Span[]; actual: Span[]; overlapMin: number } {
  const planned = plan.map((b): Span => ({
    startMin: b.startMin,
    endMin: b.startMin + b.durationMin,
    label: b.title,
    projectId: b.projectId ?? null,
  }))
  const dayStart = parseDayKey(day)?.getTime() ?? 0
  const dayEnd =
    parseDayKey(addDays(day, 1))?.getTime() ?? dayStart + 86_400_000
  const actual: Span[] = []
  for (const entry of entries) {
    if (entry.deletedAt !== null || entry.day !== day) continue
    const start = Math.max(entry.startedAt, dayStart)
    const end = Math.min(entry.endedAt ?? now, dayEnd)
    if (end <= start) continue
    actual.push({
      startMin: Math.round((start - dayStart) / 60_000),
      endMin: Math.round((end - dayStart) / 60_000),
      projectId: entry.projectId ?? null,
    })
  }
  return { planned, actual, overlapMin: overlapMinutes(planned, actual) }
}

/** Minutes where a planned block and tracked time overlap. */
export function overlapMinutes(a: readonly Span[], b: readonly Span[]): number {
  let total = 0
  for (const x of a) {
    for (const y of b) {
      total += Math.max(
        0,
        Math.min(x.endMin, y.endMin) - Math.max(x.startMin, y.startMin),
      )
    }
  }
  return total
}
