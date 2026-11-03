import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import { dayOf, isDayString } from './formula/formulaValue'

/**
 * Everything dated, for the Calendar screen: rows of every database on
 * their Date column, and journal days. Only the shown period is returned.
 *
 * Reads go through indexes: databases by workspace, columns by database,
 * rows by `databaseId` (only databases that have a Date column are read at
 * all) and journal pages by notebook. A row's date lives inside its cell
 * values, which no index can reach, so the period is cut in memory after
 * the index read. If that ever gets slow, the next step is a small helper
 * index of dated rows (a database upgrade, with a backup first).
 */

export interface CalendarEntry {
  pageId: string
  /** The page's own title (journal days: shown by date instead). */
  title: string
  /** "YYYY-MM-DD" in the device's time zone. */
  day: string
  source: 'row' | 'journal'
  databaseId?: string
  databaseName?: string
}

/** The day a stored Date cell falls on, or null if it is not a date. */
function cellDay(value: unknown): string | null {
  if (typeof value !== 'string' || value === '') return null
  if (isDayString(value)) return value
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : dayOf({ date: value })
}

export async function calendarEntries(
  db: LearningNotesDB,
  workspaceId: string,
  fromDay: string,
  toDay: string,
): Promise<CalendarEntry[]> {
  const entries: CalendarEntry[] = []

  const databases = (
    await db.databases.where('workspaceId').equals(workspaceId).toArray()
  ).filter((d) => isLive(d) && d.kind !== 'studyTracker')
  for (const database of databases) {
    const dateColumns = (
      await db.dbColumns.where('databaseId').equals(database.id).toArray()
    ).filter((c) => isLive(c) && c.type === 'date')
    if (dateColumns.length === 0) continue
    const rows = await db.pages
      .where('databaseId')
      .equals(database.id)
      .toArray()
    for (const row of rows) {
      if (!isLive(row) || !row.values) continue
      const days = new Set<string>()
      for (const column of dateColumns) {
        const day = cellDay(row.values[column.id])
        if (day && day >= fromDay && day <= toDay) days.add(day)
      }
      for (const day of days) {
        entries.push({
          pageId: row.id,
          title: row.title,
          day,
          source: 'row',
          databaseId: database.id,
          databaseName: database.title,
        })
      }
    }
  }

  const journals = (
    await db.notebooks.where('workspaceId').equals(workspaceId).toArray()
  ).filter((n) => isLive(n) && n.kind === 'journal')
  for (const journal of journals) {
    const pages = await db.pages
      .where('notebookId')
      .equals(journal.id)
      .toArray()
    for (const page of pages) {
      const day = page.journalDate
      if (!isLive(page) || !day || day < fromDay || day > toDay) continue
      entries.push({
        pageId: page.id,
        title: page.title,
        day,
        source: 'journal',
      })
    }
  }
  return entries
}

/** Groups entries by day; journal days first, then rows by title. */
export function entriesByDay(
  entries: readonly CalendarEntry[],
): Map<string, CalendarEntry[]> {
  const byDay = new Map<string, CalendarEntry[]>()
  for (const entry of entries) {
    const list = byDay.get(entry.day)
    if (list) list.push(entry)
    else byDay.set(entry.day, [entry])
  }
  for (const list of byDay.values()) {
    list.sort((a, b) =>
      a.source !== b.source
        ? a.source === 'journal'
          ? -1
          : 1
        : a.title.localeCompare(b.title),
    )
  }
  return byDay
}
