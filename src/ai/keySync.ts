import { liveQuery } from 'dexie'
import type { LearningNotesDB } from '../core/db'
import { stableId } from '../core/ids'
import { newRecordFields } from '../core/records'
import type { JsonObject, SecretRecord } from '../core/types'
import { readPref, writePref } from '../app/uiPrefs'
import {
  isAiKey,
  listKeys,
  onKeysSaved,
  replaceKeys,
  type AiKey,
} from './keyStore'

/**
 * AI keys on all devices (R6-2, opt-in). The keys live in this browser's
 * localStorage (keyStore.ts); with the switch on they are mirrored into one
 * `secrets` record with a fixed id, which sync locks with the master key
 * like any record (the server never sees it) and never writes to a backup.
 *
 * - A local change writes the record; a pulled record replaces the local list.
 * - The switch travels in the record (`on`): turning it off on one device
 *   empties the record and turns it off everywhere; every device keeps the
 *   keys it already has.
 * - Turning it on joins the record's keys with this device's (by id; this
 *   device's copy of a key wins), then sends the result.
 */

export const KEY_SYNC_PREF = 'ai.keysSync'
export const AI_KEYS_SECRET_ID = stableId('secret:aiKeys')

export const keySyncOn = (): boolean =>
  readPref(KEY_SYNC_PREF, (v): v is boolean => typeof v === 'boolean', false)

interface AiKeysValue {
  on: boolean
  keys: AiKey[]
}

const readValue = (rec: SecretRecord | undefined): AiKeysValue => {
  const v = rec?.value as Partial<AiKeysValue> | undefined
  return {
    on: v?.on === true,
    keys: Array.isArray(v?.keys) ? v.keys.filter(isAiKey) : [],
  }
}

async function writeValue(db: LearningNotesDB, value: AiKeysValue) {
  const now = Date.now()
  const old = await db.secrets.get(AI_KEYS_SECRET_ID)
  const rec: SecretRecord = {
    ...(old ?? { ...newRecordFields(), id: AI_KEYS_SECRET_ID }),
    kind: 'aiKeys',
    value: { on: value.on, keys: value.keys } as unknown as JsonObject,
    updatedAt: now,
    deletedAt: null,
  }
  await db.secrets.put(rec)
}

const changeListeners = new Set<() => void>()
/** Fires when another device's keys were put in place here (screens refresh). */
export function onKeysArrived(fn: () => void): () => void {
  changeListeners.add(fn)
  return () => changeListeners.delete(fn)
}

/** The running mirror of each open database (tests open two). */
const running = new Map<LearningNotesDB, () => void>()
let applying = false

export function stopKeySync(db: LearningNotesDB): void {
  running.get(db)?.()
  running.delete(db)
}

/** Turns the mirror on or off here (and, through the record, everywhere). */
export async function setKeySync(db: LearningNotesDB, on: boolean) {
  writePref(KEY_SYNC_PREF, on)
  if (on) {
    const theirs = readValue(await db.secrets.get(AI_KEYS_SECRET_ID)).keys
    const mine = listKeys()
    const ids = new Set(mine.map((k) => k.id))
    const joined = [...mine, ...theirs.filter((k) => !ids.has(k.id))]
    replaceKeys(joined)
    await writeValue(db, { on: true, keys: joined })
    for (const l of changeListeners) l()
    startKeySync(db)
  } else {
    stopKeySync(db)
    await writeValue(db, { on: false, keys: [] })
  }
}

/** Called once sync is running; does nothing while the switch is off. */
export function startKeySync(db: LearningNotesDB): void {
  if (running.has(db) || !keySyncOn()) return
  const offSave = onKeysSaved((list) => {
    if (applying || !keySyncOn()) return
    void writeValue(db, { on: true, keys: list })
  })
  let last: string | undefined
  const sub = liveQuery(() => db.secrets.get(AI_KEYS_SECRET_ID)).subscribe({
    next: (rec) => {
      const value = readValue(rec)
      const print = JSON.stringify(value)
      if (print === last) return
      last = print
      if (!rec) return
      if (!value.on) {
        // Turned off on another device: off here too, keys stay.
        writePref(KEY_SYNC_PREF, false)
        stopKeySync(db)
        for (const l of changeListeners) l()
        return
      }
      if (JSON.stringify(listKeys()) === JSON.stringify(value.keys)) return
      applying = true
      try {
        replaceKeys(value.keys)
      } finally {
        applying = false
      }
      for (const l of changeListeners) l()
    },
    error: () => {},
  })
  running.set(db, () => {
    offSave()
    sub.unsubscribe()
  })
}
