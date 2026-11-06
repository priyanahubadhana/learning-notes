import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { isNumberList, readPref, writePref } from '../app/uiPrefs'
import type { LearningNotesDB } from '../core/db'
import type { TimeEntry } from '../core/homeTypes'
import { runningEntry } from './timerService'
import {
  clampCycle,
  DEFAULT_CYCLE,
  fromCycleList,
  toCycleList,
  type Cycle,
} from './timer'

/** The running entry (live), or undefined; null while loading. */
export function useRunning(db: LearningNotesDB): TimeEntry | undefined | null {
  const found = useLiveQuery(
    async () => ({ entry: await runningEntry(db) }),
    [db],
  )
  return found === undefined ? null : found.entry
}

/** The time now, refreshed every second while `active` (display only). */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    // The first look comes at once, then every second.
    const first = setTimeout(() => setNow(Date.now()), 0)
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [active])
  return now
}

const CYCLE_KEY = 'home.cycle'

/** The Pomodoro lengths on this device. */
export function readCycle(): Cycle {
  return fromCycleList(
    readPref(CYCLE_KEY, isNumberList, toCycleList(DEFAULT_CYCLE)),
  )
}

export function saveCycle(cycle: Cycle): Cycle {
  const clean = clampCycle(cycle)
  writePref(CYCLE_KEY, toCycleList(clean))
  return clean
}
