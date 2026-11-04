import { readPref, writePref } from '../uiPrefs'

/**
 * Where you stopped reading each page, bookmarks, and the daily reading
 * streak. All of it stays on this device (never with the notes).
 */

export interface ResumePoint {
  /** The block at the top of the screen (found again by id). */
  blockId: string
  /** 0 to 1 through the page (fallback when the block is gone). */
  progress: number
  at: number
}

export interface Bookmark {
  id: string
  blockId: string
  label: string
  progress: number
  at: number
}

const MAX_PAGES = 400
const MAX_BOOKMARKS = 50

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isResume = (v: unknown): v is ResumePoint =>
  isObject(v) &&
  typeof v.blockId === 'string' &&
  typeof v.progress === 'number' &&
  typeof v.at === 'number'

const isBookmark = (v: unknown): v is Bookmark =>
  isObject(v) &&
  typeof v.id === 'string' &&
  typeof v.blockId === 'string' &&
  typeof v.label === 'string' &&
  typeof v.progress === 'number' &&
  typeof v.at === 'number'

const isResumeMap = (v: unknown): v is Record<string, ResumePoint> =>
  isObject(v) && Object.values(v).every(isResume)
const isBookmarkMap = (v: unknown): v is Record<string, Bookmark[]> =>
  isObject(v) &&
  Object.values(v).every(
    (list) => Array.isArray(list) && list.every(isBookmark),
  )

const RESUME_KEY = 'reading.resume'
const BOOKMARK_KEY = 'reading.bookmarks'

export const getResume = (pageId: string): ResumePoint | undefined =>
  readPref(RESUME_KEY, isResumeMap, {})[pageId]

export function saveResume(pageId: string, point: ResumePoint): void {
  const all = { ...readPref(RESUME_KEY, isResumeMap, {}), [pageId]: point }
  const ids = Object.keys(all)
  if (ids.length > MAX_PAGES) {
    // Forget the pages read longest ago.
    ids
      .sort((a, b) => all[a].at - all[b].at)
      .slice(0, ids.length - MAX_PAGES)
      .forEach((id) => delete all[id])
  }
  writePref(RESUME_KEY, all)
}

export function clearResume(pageId: string): void {
  const all = { ...readPref(RESUME_KEY, isResumeMap, {}) }
  delete all[pageId]
  writePref(RESUME_KEY, all)
}

export const getBookmarks = (pageId: string): Bookmark[] =>
  readPref(BOOKMARK_KEY, isBookmarkMap, {})[pageId] ?? []

function saveBookmarks(pageId: string, list: Bookmark[]): void {
  const all = { ...readPref(BOOKMARK_KEY, isBookmarkMap, {}) }
  if (list.length === 0) delete all[pageId]
  else all[pageId] = list.slice(-MAX_BOOKMARKS)
  writePref(BOOKMARK_KEY, all)
}

/** Adds a bookmark (a second one on the same block is not added). */
export function addBookmark(
  pageId: string,
  mark: Omit<Bookmark, 'id' | 'at'>,
  now: number = Date.now(),
): Bookmark[] {
  const list = getBookmarks(pageId)
  if (list.some((b) => b.blockId === mark.blockId)) return list
  const next = [...list, { ...mark, id: `${now}-${list.length}`, at: now }]
  saveBookmarks(pageId, next)
  return getBookmarks(pageId)
}

export function removeBookmark(pageId: string, id: string): Bookmark[] {
  saveBookmarks(
    pageId,
    getBookmarks(pageId).filter((b) => b.id !== id),
  )
  return getBookmarks(pageId)
}

// ---- Reading streak (an extra): days with at least a minute of reading ----

export interface StreakData {
  /** Reading seconds per local day, "YYYY-MM-DD" (the last 60 days kept). */
  days: Record<string, number>
}

const isStreak = (v: unknown): v is StreakData =>
  isObject(v) &&
  isObject(v.days) &&
  Object.values(v.days).every((n) => typeof n === 'number')

const STREAK_KEY = 'reading.streak'
export const STREAK_MIN_SECONDS = 60

export function dayKey(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

export const readStreakData = (): StreakData =>
  readPref(STREAK_KEY, isStreak, { days: {} })

/** Adds reading seconds to today. */
export function addReadingSeconds(
  seconds: number,
  now: Date = new Date(),
): void {
  if (!(seconds > 0)) return
  const data = readStreakData()
  const key = dayKey(now)
  const days = { ...data.days, [key]: (data.days[key] ?? 0) + seconds }
  const keep = Object.keys(days).sort().slice(-60)
  writePref(STREAK_KEY, {
    days: Object.fromEntries(keep.map((k) => [k, days[k]])),
  })
}

/**
 * Days in a row with enough reading, counting back from today (or from
 * yesterday while today is not done yet, so the streak is not lost at dawn).
 */
export function streakDays(
  data: StreakData = readStreakData(),
  now: Date = new Date(),
): number {
  const done = (d: Date) => (data.days[dayKey(d)] ?? 0) >= STREAK_MIN_SECONDS
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!done(cursor)) cursor.setDate(cursor.getDate() - 1)
  let count = 0
  while (done(cursor)) {
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}
