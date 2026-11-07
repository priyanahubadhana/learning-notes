import { liveQuery } from 'dexie'
import type { LearningNotesDB } from '../../../core/db'
import { stableId } from '../../../core/ids'
import { newRecordFields } from '../../../core/records'
import type { JsonObject, SecretRecord } from '../../../core/types'
import { readPref, writePref } from '../../uiPrefs'
import {
  cleanExtras,
  cleanMainList,
  cleanPillMap,
  extraTools,
  mainList,
  pillLists,
} from './mainTools'

/**
 * The tool bar layout as a synced setting (R7-10): the main bar, each pill's
 * options and the pinned tools travel in one `secrets` record with a fixed
 * id (the table sync already locks and sends; it needs no new Dexie version).
 * The newer edit wins. A pulled layout is cleaned like a saved one, so a
 * device that knows fewer tools keeps the rest of the choices.
 */

export const LAYOUT_SECRET_ID = stableId('secret:toolbarLayout')
const AT_KEY = 'toolbar.layoutAt'

interface LayoutValue {
  main: unknown
  pills: unknown
  extras: unknown
}

const current = (): LayoutValue => ({
  main: mainList.get(),
  pills: pillLists.get(),
  extras: extraTools.get(),
})

const print = (v: LayoutValue) => JSON.stringify(v)

const isNumber = (v: unknown): v is number => typeof v === 'number'
const localAt = () => readPref(AT_KEY, isNumber, 0)

/** Puts a pulled layout in place (cleaned); true if anything changed. */
export function applyLayout(value: Partial<LayoutValue>): boolean {
  const before = print(current())
  const main = cleanMainList(value.main)
  const pills = cleanPillMap(value.pills)
  const extras = cleanExtras(value.extras)
  if (main) mainList.set(main)
  if (pills) pillLists.set(pills)
  if (extras) extraTools.set(extras)
  return print(current()) !== before
}

const running = new Map<LearningNotesDB, () => void>()
let applying = false

/** Called once sync is running. */
export function startLayoutSync(db: LearningNotesDB): void {
  if (running.has(db)) return
  let timer = 0
  const save = () => {
    if (applying) return
    const now = Date.now()
    writePref(AT_KEY, now)
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      void (async () => {
        const old = await db.secrets.get(LAYOUT_SECRET_ID)
        await db.secrets.put({
          ...(old ?? { ...newRecordFields(), id: LAYOUT_SECRET_ID }),
          kind: 'toolbarLayout',
          value: current() as unknown as JsonObject,
          updatedAt: now,
          deletedAt: null,
        } as SecretRecord)
      })()
    }, 600)
  }
  const offs = [mainList, pillLists, extraTools].map((s) => s.subscribe(save))
  let last: string | undefined
  const sub = liveQuery(() => db.secrets.get(LAYOUT_SECRET_ID)).subscribe({
    next: (rec) => {
      if (!rec) {
        // First device with a custom bar: send it.
        if (localAt() > 0) save()
        return
      }
      const seen = JSON.stringify(rec.value)
      if (seen === last) return
      last = seen
      if (rec.updatedAt <= localAt()) return // my edit is newer
      applying = true
      try {
        applyLayout(rec.value as unknown as Partial<LayoutValue>)
      } finally {
        applying = false
      }
    },
    error: () => {},
  })
  running.set(db, () => {
    window.clearTimeout(timer)
    offs.forEach((off) => off())
    sub.unsubscribe()
  })
}

export function stopLayoutSync(db: LearningNotesDB): void {
  running.get(db)?.()
  running.delete(db)
}
