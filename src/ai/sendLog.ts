import { readPref, writePref } from '../app/uiPrefs'
import { monthKey } from './usage'

/**
 * "Everything AI sent this month" (Settings › Permissions): one line per
 * call with the date, notebook, feature, host and estimated cost. It holds no
 * content and no key. Kept on this device (localStorage), this month only.
 */

export interface SendEntry {
  /** UTC milliseconds. */
  at: number
  notebookId?: string
  /** e.g. 'summary', 'askBook', 'storySoFar'. */
  feature: string
  host: string
  costUsd: number
}

const PREF = 'ai.sendLog'
/** Most lines kept (the oldest drop off). */
export const MAX_LOG = 500

const isEntry = (v: unknown): v is SendEntry => {
  const e = v as SendEntry
  return (
    !!e &&
    typeof e === 'object' &&
    typeof e.at === 'number' &&
    typeof e.feature === 'string' &&
    typeof e.host === 'string' &&
    typeof e.costUsd === 'number' &&
    (e.notebookId === undefined || typeof e.notebookId === 'string')
  )
}
const isLog = (v: unknown): v is SendEntry[] =>
  Array.isArray(v) && v.every(isEntry)

/** This month's lines, newest first. */
export function readSendLog(now: Date = new Date()): SendEntry[] {
  const month = monthKey(now)
  return readPref(PREF, isLog, [])
    .filter((e) => monthKey(new Date(e.at)) === month)
    .sort((a, b) => b.at - a.at)
}

export function logSend(entry: SendEntry, now: Date = new Date()): void {
  // Only the listed fields are kept, whatever the caller passed.
  const clean: SendEntry = {
    at: entry.at,
    feature: entry.feature.slice(0, 40),
    host: entry.host.slice(0, 80),
    costUsd: entry.costUsd,
    ...(entry.notebookId && { notebookId: entry.notebookId }),
  }
  writePref(PREF, [clean, ...readSendLog(now)].slice(0, MAX_LOG))
}
