import Dexie from 'dexie'
import type { LearningNotesDB } from '../core/db'
import type { Block, SyncState } from '../core/types'
import { keepTheirsInHistory } from '../history/loserVersion'
import { recordVersion } from '../history/versionService'
import { announceApplied } from './applied'
import { NeedsTapError, type Connectors, type RemoteRecord } from './connectors'
import {
  openFile,
  openRecord,
  remoteId,
  sealFile,
  sealRecord,
  type MasterKey,
} from './crypto'
import { getDeviceId, nextHlc, seenHlc } from './device'
import { isSuspect } from './hlc'
import { mergeRecord, type MergeResult } from './merge'
import { markRemote, syncStateId } from './outbox'
import { SYNC_FORMAT_VERSION, SYNC_TABLES, isSynced } from './tables'
import { fromWire, toWire } from './wire'

/**
 * The sync engine (L7, L8): pull, merge, push, then move file bytes.
 *
 * - Pull: changes after our cursor, oldest first; each is opened (a record
 *   that cannot be opened is skipped and counted, never applied) and merged
 *   by its table's rule; pulled writes are not tracked as local changes.
 * - Push: records changed here, locked, saved with compare-and-swap. A
 *   refused save means another device saved first: its copy is fetched and
 *   merged, and ours is sent again next round. One bad record never stops
 *   the rest.
 * - Files (pictures, books, audio, fonts): bytes are locked and uploaded to
 *   Drive before their record is sent; pulled ones download in the
 *   background. A Drive pass that needs a tap stops only the files.
 */

const CURSOR = 'sync.cursor'
const MERGED = 'sync.merged'
const PAGE = 200

/** What travels inside the encryption for one record. */
interface Envelope {
  f: number
  h: string
  d: string
  r: Record<string, unknown>
  /** File tables: Drive id of the locked bytes. */
  file?: string
}

export interface SyncReport {
  pulled: number
  pushed: number
  conflicts: number
  /** Records that could not be opened (wrong key or damaged). */
  unreadable: number
  /** Pages whose blocks were merged with a copy kept in History. */
  mergedPages: string[]
  filesUp: number
  filesDown: number
  /** Drive needs a tap to renew its pass. */
  needsDriveTap: boolean
  /** A pulled clock was far in the future (clock problem on a device). */
  clockWarning: boolean
  /** The newest server order seen (pulled or accepted): a ping at or below it is old news. */
  seq: number
}

const emptyReport = (): SyncReport => ({
  pulled: 0,
  pushed: 0,
  conflicts: 0,
  unreadable: 0,
  mergedPages: [],
  filesUp: 0,
  filesDown: 0,
  needsDriveTap: false,
  clockWarning: false,
  seq: 0,
})

/**
 * Marks every synced record that changed since it was last synced (or was
 * never synced) as "changed here". Run when sync is turned on and at each
 * start, so edits made while signed out or tracking was off are not lost.
 */
export async function enqueueChanged(db: LearningNotesDB): Promise<number> {
  let marked = 0
  for (const table of db.tables) {
    if (!isSynced(table.name)) continue
    const states = new Map(
      (
        await db.syncState.where('id').startsWith(`${table.name}/`).toArray()
      ).map((s) => [s.recordId, s]),
    )
    const add: SyncState[] = []
    await table.each((row: { id: string; updatedAt?: number }) => {
      const s = states.get(row.id)
      const since = s ? Number(s.hlc.slice(0, 15)) : -1
      if (s?.dirty === 1) return
      if (s && (row.updatedAt ?? 0) <= since) return
      add.push({
        ...(s ?? { rev: 0 }),
        id: syncStateId(table.name, row.id),
        table: table.name,
        recordId: row.id,
        hlc: nextHlc(Math.max(Date.now(), row.updatedAt ?? 0)),
        dirty: 1,
        ...(SYNC_TABLES[table.name] === 'file' ? { fileState: 'up' } : {}),
      })
    })
    if (add.length > 0) await db.syncState.bulkPut(add)
    marked += add.length
  }
  return marked
}

export async function syncOnce(
  db: LearningNotesDB,
  conn: Connectors,
  master: MasterKey,
): Promise<SyncReport> {
  const report = emptyReport()
  await pull(db, conn, master, report)
  await uploadFiles(db, conn, master, report)
  await push(db, conn, master, report)
  await downloadFiles(db, conn, master, report)
  if (report.mergedPages.length > 0) {
    await db.meta.put({ id: MERGED, value: report.mergedPages.slice(0, 50) })
  }
  return report
}

async function pull(
  db: LearningNotesDB,
  conn: Connectors,
  master: MasterKey,
  report: SyncReport,
) {
  let cursor = Number((await db.meta.get(CURSOR))?.value ?? 0)
  report.seq = Math.max(report.seq, cursor)
  for (;;) {
    const batch = await conn.records.pull(cursor, PAGE)
    if (batch.length === 0) break
    await applyRemote(db, master, batch, report)
    cursor = batch[batch.length - 1].seq
    report.seq = Math.max(report.seq, cursor)
    await db.meta.put({ id: CURSOR, value: cursor })
    if (batch.length < PAGE) break
  }
}

async function openAll(
  master: MasterKey,
  rows: RemoteRecord[],
  report: SyncReport,
) {
  const out: { table: string; id: string; rev: number; env: Envelope }[] = []
  for (const row of rows) {
    try {
      const { table, id, value } = await openRecord(master, row.id, row.rev, {
        keyId: row.keyId,
        data: row.data,
      })
      const env = value as Envelope
      if (
        !isSynced(table) ||
        typeof env?.h !== 'string' ||
        !env.r ||
        (env.r as { id?: unknown }).id !== id ||
        env.f > SYNC_FORMAT_VERSION
      ) {
        report.unreadable++
        continue
      }
      out.push({ table, id, rev: row.rev, env })
    } catch {
      report.unreadable++
    }
  }
  return out
}

/** Merges pulled records into the database. */
async function applyRemote(
  db: LearningNotesDB,
  master: MasterKey,
  rows: RemoteRecord[],
  report: SyncReport,
) {
  const opened = await openAll(master, rows, report)
  const now = Date.now()
  const byTable = new Map<string, typeof opened>()
  for (const o of opened) {
    if (isSuspect(o.env.h, now)) report.clockWarning = true
    else seenHlc(o.env.h, now)
    byTable.set(o.table, [...(byTable.get(o.table) ?? []), o])
  }

  for (const [table, items] of byTable) {
    const mode = SYNC_TABLES[table]
    const tb = db.table(table)
    const decisions: { item: (typeof items)[0]; result: MergeResult }[] = []
    const keys = items.map((i) => syncStateId(table, i.id))
    const [states, locals] = await Promise.all([
      db.syncState.bulkGet(keys),
      tb.bulkGet(items.map((i) => i.id)),
    ])
    items.forEach((item, i) => {
      const local = locals[i] as Record<string, unknown> | undefined
      const st = states[i]
      decisions.push({
        item,
        result: mergeRecord(
          mode,
          local && st
            ? { value: local, hlc: st.hlc, dirty: st.dirty === 1 }
            : local
              ? { value: local, hlc: '', dirty: true }
              : undefined,
          {
            value: fromWire(item.env.r) as Record<string, unknown>,
            hlc: item.env.h,
          },
        ),
      })
    })

    // Blocks: keep the losing text in the page's History first.
    if (mode === 'blocks') await keepLosers(db, decisions, report)

    await db.transaction('rw', [tb, db.syncState], async () => {
      markRemote(Dexie.currentTransaction!.idbtrans)
      const puts: Record<string, unknown>[] = []
      const newStates: SyncState[] = []
      decisions.forEach(({ item, result }, i) => {
        const old = states[i]
        const take = result.action === 'take'
        if (take) {
          const value = fromWire(item.env.r) as Record<string, unknown>
          if (mode === 'file') {
            // Keep bytes we already have; otherwise wait for the download.
            const have = locals[i] as { data?: ArrayBuffer } | undefined
            value.data =
              have?.data && old?.fileRef === item.env.file
                ? have.data
                : new ArrayBuffer(0)
          }
          puts.push(value)
        }
        newStates.push({
          id: keys[i],
          table,
          recordId: item.id,
          rev: item.rev,
          hlc: take ? item.env.h : (old?.hlc ?? nextHlc()),
          dirty: take ? 0 : 1,
          ...(mode === 'file'
            ? take
              ? {
                  fileRef: item.env.file,
                  fileState:
                    old?.fileRef === item.env.file && old?.fileState === 'ok'
                      ? 'ok'
                      : item.env.file
                        ? 'down'
                        : 'ok',
                }
              : { fileRef: old?.fileRef, fileState: old?.fileState ?? 'up' }
            : {}),
        })
      })
      if (puts.length > 0) await tb.bulkPut(puts)
      await db.syncState.bulkPut(newStates)
    })
    report.pulled += items.length
    // The open screens put these into the page live (R6-13).
    const taken = decisions.filter((d) => d.result.action === 'take')
    if (taken.length > 0) {
      announceApplied({
        table,
        ids: taken.map((d) => d.item.id),
        ...(mode === 'blocks'
          ? {
              pageIds: [
                ...new Set(
                  taken.map((d) => String(d.item.env.r.pageId ?? '')),
                ),
              ],
            }
          : {}),
      })
    }
  }
}

/** Saves the losing side of a block conflict in the page's History. */
async function keepLosers(
  db: LearningNotesDB,
  decisions: {
    item: { id: string; env: Envelope }
    result: MergeResult
  }[],
  report: SyncReport,
) {
  const pages = new Map<string, Block[]>()
  for (const { result } of decisions) {
    if (!('loser' in result)) continue
    const loser = result.loser as unknown as Block
    if (result.action === 'take') {
      // Our text loses: a copy of the page as it is here.
      if (!pages.has(loser.pageId)) pages.set(loser.pageId, [])
    } else {
      pages.set(loser.pageId, [...(pages.get(loser.pageId) ?? []), loser])
    }
  }
  for (const [pageId, remoteLosers] of pages) {
    if (remoteLosers.length === 0) {
      await recordVersion(db, pageId, { force: true })
    } else if (!(await keepTheirsInHistory(db, pageId, remoteLosers))) {
      continue
    }
    report.mergedPages.push(pageId)
  }
}

async function push(
  db: LearningNotesDB,
  conn: Connectors,
  master: MasterKey,
  report: SyncReport,
) {
  for (let round = 0; round < 20; round++) {
    const dirty = (
      await db.syncState.where('dirty').equals(1).limit(PAGE).toArray()
    )
      // A file's record waits until its bytes are on Drive.
      .filter((s) => s.fileState !== 'up')
    if (dirty.length === 0) return
    const items = []
    const sent = new Map<string, SyncState>()
    for (const s of dirty) {
      const row = (await db.table(s.table).get(s.recordId)) as
        Record<string, unknown> | undefined
      if (!row) {
        // Hard-deleted here (not done by the app): nothing to send.
        await db.syncState.update(s.id, { dirty: 0 })
        continue
      }
      const value = { ...row }
      if (SYNC_TABLES[s.table] === 'file') delete value.data
      const env: Envelope = {
        f: SYNC_FORMAT_VERSION,
        h: s.hlc,
        d: getDeviceId(),
        r: toWire(value) as Record<string, unknown>,
        ...(s.fileRef ? { file: s.fileRef } : {}),
      }
      const sealed = await sealRecord(
        master,
        s.table,
        s.recordId,
        s.rev + 1,
        env,
      )
      const rid = remoteId(s.table, s.recordId)
      items.push({ id: rid, baseRev: s.rev, ...sealed })
      sent.set(rid, s)
    }
    if (items.length === 0) continue
    const res = await conn.records.push(items)
    await db.transaction('rw', db.syncState, async () => {
      for (const a of res.accepted) {
        const s = sent.get(a.id)!
        const now = await db.syncState.get(s.id)
        // Edited again while sending: stays "changed here" with the new rev.
        await db.syncState.update(s.id, {
          rev: a.rev,
          dirty: now && now.hlc !== s.hlc ? 1 : 0,
        })
      }
    })
    report.pushed += res.accepted.length
    for (const a of res.accepted) report.seq = Math.max(report.seq, a.seq)
    if (res.conflicts.length > 0) {
      report.conflicts += res.conflicts.length
      await applyRemote(
        db,
        master,
        await conn.records.get(res.conflicts),
        report,
      )
    }
    if (res.accepted.length === 0 && res.conflicts.length === 0) return
  }
}

async function uploadFiles(
  db: LearningNotesDB,
  conn: Connectors,
  master: MasterKey,
  report: SyncReport,
) {
  const waiting = await db.syncState.where('fileState').equals('up').toArray()
  for (const s of waiting) {
    const row = (await db.table(s.table).get(s.recordId)) as
      | { data?: ArrayBuffer; deletedAt?: number | null; purgedAt?: number }
      | undefined
    const bytes = row?.data ? new Uint8Array(row.data) : null
    if (row?.purgedAt && s.fileRef) {
      // Delete forever also clears the cloud copy (Drive may keep its own
      // revisions for a while: see docs/features/sync.md).
      await conn.files.remove(s.fileRef).catch(() => undefined)
      await db.syncState.update(s.id, { fileState: 'ok', fileRef: undefined })
      continue
    }
    if (!bytes || bytes.length === 0 || row?.purgedAt) {
      await db.syncState.update(s.id, { fileState: 'ok' })
      continue
    }
    const name = `ln-f-${crypto.randomUUID()}`
    try {
      const fileId = await conn.files.put(
        name,
        await sealFile(master, `${s.table}/${s.recordId}`, bytes),
      )
      await db.syncState.update(s.id, {
        fileRef: fileId,
        fileState: 'ok',
        dirty: 1,
      })
      report.filesUp++
    } catch (e) {
      if (e instanceof NeedsTapError) {
        report.needsDriveTap = true
        return
      }
      throw e
    }
  }
}

async function downloadFiles(
  db: LearningNotesDB,
  conn: Connectors,
  master: MasterKey,
  report: SyncReport,
) {
  const waiting = await db.syncState
    .where('fileState')
    .equals('down')
    .limit(20)
    .toArray()
  for (const s of waiting) {
    if (!s.fileRef) continue
    try {
      const sealed = await conn.files.get(s.fileRef)
      const bytes = await openFile(master, `${s.table}/${s.recordId}`, sealed)
      await db.transaction(
        'rw',
        [db.table(s.table), db.syncState],
        async () => {
          markRemote(Dexie.currentTransaction!.idbtrans)
          const buf = bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ) as ArrayBuffer
          await db.table(s.table).update(s.recordId, { data: buf })
          await db.syncState.update(s.id, { fileState: 'ok' })
        },
      )
      report.filesDown++
    } catch (e) {
      if (e instanceof NeedsTapError) {
        report.needsDriveTap = true
        return
      }
      // A missing or damaged file: try again next time, never stop sync.
    }
  }
}

/** Pages merged in the last sync (for the "see History" notice). */
export async function lastMergedPages(db: LearningNotesDB): Promise<string[]> {
  return ((await db.meta.get(MERGED))?.value as string[] | undefined) ?? []
}

/** Adds a page to the "changed on two devices" notice (live apply, R6-13). */
export async function noteMergedPage(
  db: LearningNotesDB,
  pageId: string,
): Promise<void> {
  const list = await lastMergedPages(db)
  if (!list.includes(pageId)) {
    await db.meta.put({ id: MERGED, value: [pageId, ...list].slice(0, 50) })
  }
}

export async function clearMergedNotice(db: LearningNotesDB): Promise<void> {
  await db.meta.delete(MERGED)
}
