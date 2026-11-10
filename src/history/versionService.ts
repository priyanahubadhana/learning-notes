import { listBlocks, saveBlockChanges } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { inkSnapshot, restoreInk } from '../core/inkService'
import type { InkSnapshot } from '../core/inkTypes'
import { newRecordFields } from '../core/records'
import type { PageVersion, VersionBlock } from '../core/types'
import { t } from '../i18n/t'
import { pushStep, quietAsync } from '../core/historySteps'
import { getPage, renamePage } from '../pages/pageService'
import { syncCardRecords } from '../recall/cardService'

/** Most copies kept per page (thinned over time, see `thinVersions`). */
export const KEEP_VERSIONS = 300
/** A page's copies may not use more than this much (rough bytes). */
export const VERSION_BYTES_MAX = 20 * 1024 * 1024
/** While editing, a new copy is taken at most this often. */
export const VERSION_GAP_MS = 2 * 60 * 1000
/** A big change (many blocks added or removed) may be kept this soon. */
export const BIG_GAP_MS = 20 * 1000
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

/** The page's live title and blocks as they are now. */
async function currentState(db: LearningNotesDB, pageId: string) {
  const page = await getPage(db, pageId)
  if (!page) return null
  const blocks: VersionBlock[] = (await listBlocks(db, pageId)).map((b) => ({
    id: b.id,
    parentId: b.parentId,
    type: b.type,
    content: b.content,
    order: b.order,
    ...(b.boxId ? { boxId: b.boxId } : {}),
  }))
  const ink = await inkSnapshot(db, pageId)
  const layout: NonNullable<PageVersion['layout']> = {}
  if (page.boxes?.length) layout.boxes = page.boxes
  if (page.inkBg) layout.inkBg = page.inkBg
  if (page.sheet) layout.sheet = page.sheet
  return {
    title: page.title,
    blocks,
    ...(ink ? { ink } : {}),
    ...(Object.keys(layout).length ? { layout } : {}),
  }
}

type State = {
  title: string
  blocks: VersionBlock[]
  ink?: InkSnapshot
  layout?: PageVersion['layout']
}
const same = (a: State, b: State) =>
  a.title === b.title &&
  JSON.stringify(a.layout ?? null) === JSON.stringify(b.layout ?? null) &&
  JSON.stringify(a.blocks) === JSON.stringify(b.blocks) &&
  JSON.stringify(a.ink?.chunks ?? null) ===
    JSON.stringify(b.ink?.chunks ?? null) &&
  JSON.stringify(a.ink?.layers ?? null) ===
    JSON.stringify(b.ink?.layers ?? null)

/** A page's copies, newest first. */
export async function listVersions(
  db: LearningNotesDB,
  pageId: string,
): Promise<PageVersion[]> {
  const all = await db.pageVersions.where('pageId').equals(pageId).toArray()
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Keeps a copy of the page as it is now. Skipped when nothing changed since
 * the newest copy; unless `force`, also skipped when that copy is younger
 * than `VERSION_GAP_MS`. Returns the new copy, if one was made.
 */
/** Many blocks added or removed since the last copy (or ink gone/new). */
export function isBigChange(prev: State, now: State): boolean {
  const a = prev.blocks.length
  const b = now.blocks.length
  if (Math.abs(a - b) >= Math.max(5, Math.round(a * 0.2))) return true
  if ((prev.layout?.boxes?.length ?? 0) !== (now.layout?.boxes?.length ?? 0))
    return true
  return (prev.ink?.chunks.length ?? 0) !== (now.ink?.chunks.length ?? 0)
    ? Math.abs(
        (prev.ink?.chunks.length ?? 0) - (now.ink?.chunks.length ?? 0),
      ) >= 5
    : false
}

/**
 * Which copies to keep: everything from the last 2 hours, one per hour for
 * 2 days, one per day for 90 days; copies taken before a restore or a big
 * change are favoured when two compete. Never more than KEEP_VERSIONS.
 * Newest first in, ids to delete out. (Pure.)
 */
export function thinVersions(
  versions: readonly PageVersion[],
  now: number,
  maxBytes = VERSION_BYTES_MAX,
): string[] {
  const drop: string[] = []
  const slots = new Map<string, PageVersion>()
  const kept: PageVersion[] = []
  for (const v of versions) {
    const age = now - v.createdAt
    if (age <= 2 * HOUR) {
      kept.push(v)
      continue
    }
    if (age > 90 * DAY) {
      drop.push(v.id)
      continue
    }
    const slot =
      age <= 2 * DAY
        ? `h${Math.floor(v.createdAt / HOUR)}`
        : `d${Math.floor(v.createdAt / DAY)}`
    const held = slots.get(slot)
    if (!held) {
      slots.set(slot, v)
      kept.push(v)
    } else if (
      v.reason === 'before-restore' &&
      held.reason !== 'before-restore'
    ) {
      drop.push(held.id)
      kept.splice(kept.indexOf(held), 1)
      slots.set(slot, v)
      kept.push(v)
    } else drop.push(v.id)
  }
  kept.sort((a, b) => b.createdAt - a.createdAt)
  let bytes = 0
  kept.forEach((v, i) => {
    bytes += v.bytes ?? 0
    if (i >= KEEP_VERSIONS || (i > 0 && bytes > maxBytes)) drop.push(v.id)
  })
  return drop
}

export async function recordVersion(
  db: LearningNotesDB,
  pageId: string,
  {
    force = false,
    now = Date.now(),
    reason,
  }: { force?: boolean; now?: number; reason?: PageVersion['reason'] } = {},
): Promise<PageVersion | null> {
  return db.transaction(
    'rw',
    db.pages,
    db.blocks,
    db.pageVersions,
    db.inkLayers,
    db.inkChunks,
    async () => {
      const state = await currentState(db, pageId)
      if (!state) return null
      const versions = await listVersions(db, pageId)
      const newest = versions[0]
      // A first copy of an empty page would hold nothing worth bringing back.
      if (!newest && state.blocks.length === 0 && !state.ink) return null
      if (newest) {
        if (same(newest, state)) return null
        const age = now - newest.createdAt
        const big = isBigChange(newest, state)
        if (!force && age < (big ? BIG_GAP_MS : VERSION_GAP_MS)) return null
        reason ??= big ? 'big' : 'timed'
      }
      const version: PageVersion = {
        ...newRecordFields(),
        createdAt: now,
        updatedAt: now,
        pageId,
        ...state,
        ...(reason ? { reason } : {}),
        bytes: JSON.stringify(state).length,
      }
      await db.pageVersions.add(version)
      const drop = thinVersions([version, ...versions], now)
      if (drop.length > 0) await db.pageVersions.bulkDelete(drop)
      return version
    },
  )
}

/**
 * Puts a copy back as the live page. What the page was just before is kept
 * as a copy first, so a restore can itself be undone.
 */
export async function restoreVersion(
  db: LearningNotesDB,
  versionId: string,
): Promise<void> {
  // The restore is one step of the page's Undo list, written below; the many
  // writes inside it are not steps of their own.
  let pageId = ''
  let before = ''
  await quietAsync(() =>
    doRestore(db, versionId, (p, b) => {
      pageId = p
      before = b
    }),
  )
  if (before)
    pushStep({
      kind: 'restore',
      label: t('history.restoreStep'),
      data: { pageId, to: versionId, from: before },
    })
}

async function doRestore(
  db: LearningNotesDB,
  versionId: string,
  made: (pageId: string, before: string) => void,
): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.pages,
      db.blocks,
      db.cards,
      db.pageVersions,
      db.inkLayers,
      db.inkChunks,
    ],
    async () => {
      const version = await db.pageVersions.get(versionId)
      if (!version) throw new Error('That copy no longer exists')
      const kept = await recordVersion(db, version.pageId, {
        force: true,
        reason: 'before-restore',
      })
      // Nothing new is kept when the page is the same as its newest copy.
      made(
        version.pageId,
        kept?.id ?? (await listVersions(db, version.pageId))[0]?.id ?? '',
      )
      // Copies made before 11 Nov 2026 hold no box layout: those leave the
      // live boxes alone (everything else is restored).
      const hasLayout = version.bytes !== undefined
      const live = await listBlocks(db, version.pageId)
      const keep = new Set(version.blocks.map((b) => b.id))
      const liveById = new Map(live.map((b) => [b.id, b]))
      // Only what differs is written (a big page stays quick).
      const upserts = version.blocks.filter((b) => {
        const now = liveById.get(b.id)
        return (
          !now ||
          now.parentId !== b.parentId ||
          now.type !== b.type ||
          now.order !== b.order ||
          (now.boxId ?? null) !== (b.boxId ?? null) ||
          JSON.stringify(now.content) !== JSON.stringify(b.content)
        )
      })
      await saveBlockChanges(db, version.pageId, {
        upserts: upserts.map((b) =>
          hasLayout ? { ...b, boxId: b.boxId ?? null } : b,
        ),
        deletes: live.filter((b) => !keep.has(b.id)).map((b) => b.id),
      })
      // Not a rename when the title is the same (a journal page keeps its
      // automatic date name).
      const current = await getPage(db, version.pageId)
      if (current?.title !== version.title) {
        await renamePage(db, version.pageId, version.title)
      }
      if (hasLayout) {
        // Boxes, positions, sizes, locks and the paper settings, as they were.
        await db.pages.update(version.pageId, {
          boxes: version.layout?.boxes,
          inkBg: version.layout?.inkBg,
          sheet: version.layout?.sheet,
          updatedAt: Date.now(),
        })
      }
      await restoreInk(db, version.pageId, version.ink)
      await syncCardRecords(db, version.pageId)
    },
  )
}
