import { listBlocks, saveBlockChanges } from '../../core/blockService'
import type { LearningNotesDB } from '../../core/db'
import { orderBetween } from '../../core/order'
import { isLive } from '../../core/records'
import type {
  Block,
  ClaudeInboxItem,
  InboxBlock,
  InboxOp,
  JsonObject,
  JsonValue,
} from '../../core/types'
import { recordVersion } from '../../history/versionService'
import { syncCardRecords } from '../../recall/cardService'

/**
 * The Inbox: changes Claude proposed to pages that already exist. The server
 * wrote them as ordinary synced records (claudeInbox); here the person reads a
 * diff and accepts or rejects. Accepting saves the page to its History first
 * (reason 'claude'), applies the operations in one step and makes the recall
 * cards for any card blocks. Rejecting only closes the item. Nothing is ever
 * deleted.
 */

/** Plain text of a block's content, for diffs. */
export function plainText(content: JsonObject | undefined): string {
  if (!content) return ''
  const out: string[] = []
  const runs = (v: JsonValue | undefined): string => {
    if (!Array.isArray(v)) return ''
    return v
      .map((r) => {
        if (!r || typeof r !== 'object' || Array.isArray(r)) return ''
        const o = r as JsonObject
        return (typeof o.text === 'string' ? o.text : '') + runs(o.content)
      })
      .join('')
  }
  const t = content.text
  if (Array.isArray(t)) out.push(runs(t))
  else if (t && typeof t === 'object' && !Array.isArray(t)) {
    const rows = (t as JsonObject).rows
    if (Array.isArray(rows))
      for (const row of rows) {
        const cells = (row as JsonObject | null)?.cells
        if (Array.isArray(cells))
          out.push(cells.map((c) => runs(c as JsonValue)).join(' | '))
      }
  }
  if (typeof content.latex === 'string') out.push(content.latex)
  if (typeof content.url === 'string') out.push(content.url)
  if (typeof content.data === 'string') {
    try {
      const map = JSON.parse(content.data) as {
        nodes?: { text?: string }[]
      }
      out.push((map.nodes ?? []).map((n) => n.text ?? '').join(', '))
    } catch {
      /* not a map */
    }
  }
  return out.join('\n').trim()
}

export interface DiffRow {
  op: InboxOp['op']
  /** The type of block now and the type Claude wants. */
  typeBefore?: string
  typeAfter: string
  before?: string
  after: string
  /** Children of a new block, as lines. */
  more: string[]
  /** add / insert: where it goes. */
  place?: { kind: 'start' | 'end' } | { kind: 'after'; text: string }
  /** The block to replace is not on the page any more. */
  gone?: boolean
}

/** What accepting would do, in words the screen can show. */
export async function previewOps(
  db: LearningNotesDB,
  item: ClaudeInboxItem,
): Promise<DiffRow[]> {
  const live = new Map(
    (await listBlocks(db, item.pageId)).map((b) => [b.id, b] as const),
  )
  return item.ops.map((op): DiffRow => {
    const [first, ...kids] = op.blocks
    const after = plainText(first.content)
    const more = kids.map((k) => plainText(k.content)).filter(Boolean)
    if (op.op === 'replace') {
      const cur = op.targetId ? live.get(op.targetId) : undefined
      return {
        op: 'replace',
        typeBefore: cur?.type,
        typeAfter: first.type,
        before: cur ? plainText(cur.content) : undefined,
        after,
        more,
        gone: !cur,
      }
    }
    let place: DiffRow['place']
    if (op.place === 'start') place = { kind: 'start' }
    else if (typeof op.place === 'object' && op.place) {
      const prev = live.get(op.place.after)
      place = { kind: 'after', text: prev ? plainText(prev.content) : '' }
    } else place = { kind: 'end' }
    return { op: op.op, typeAfter: first.type, after, more, place }
  })
}

export type Decision = 'ok' | 'gone' | 'pageGone' | 'done'

/** Applies an item. Idempotent: blocks already on the page are not added twice. */
export async function acceptItem(
  db: LearningNotesDB,
  id: string,
  now = Date.now(),
): Promise<Decision> {
  const item = await db.claudeInbox.get(id)
  if (!item || !isLive(item) || item.status !== 'pending') return 'done'
  const page = await db.pages.get(item.pageId)
  if (!page || !isLive(page)) return 'pageGone'
  const blocks = await listBlocks(db, item.pageId)
  const byId = new Map(blocks.map((b) => [b.id, b] as const))
  // Every block Claude wanted to replace must still be there.
  if (item.ops.some((o) => o.op === 'replace' && !byId.has(o.targetId ?? ''))) {
    await db.claudeInbox.update(id, { failed: 'gone', updatedAt: now })
    return 'gone'
  }
  // The page as it is now, saved first.
  await recordVersion(db, item.pageId, { force: true, reason: 'claude', now })

  const kids = new Map<string | null, { id: string; order: string }[]>()
  const add = (b: Pick<Block, 'id' | 'parentId' | 'order'>) => {
    const list = kids.get(b.parentId) ?? []
    list.push({ id: b.id, order: b.order })
    list.sort((a, c) => (a.order < c.order ? -1 : a.order > c.order ? 1 : 0))
    kids.set(b.parentId, list)
  }
  blocks.forEach(add)
  const upserts: {
    id: string
    parentId: string | null
    type: string
    content: JsonObject
    order: string
  }[] = []
  const touched: string[] = []
  for (const op of item.ops) {
    if (op.op === 'replace') {
      const cur = byId.get(op.targetId!)!
      const nb = op.blocks[0]
      upserts.push({
        id: cur.id,
        parentId: cur.parentId,
        type: nb.type,
        content: nb.content,
        order: cur.order,
      })
      continue // a block the person wrote is not marked as an AI result
    }
    const [first, ...rest] = op.blocks
    if (byId.has(first.id)) continue // applied before
    // The parent may be gone by now: then the block goes to the top level.
    const parentId = op.parentId && byId.has(op.parentId) ? op.parentId : null
    const list = kids.get(parentId) ?? []
    let index = list.length
    if (op.place === 'start') index = 0
    else if (typeof op.place === 'object' && op.place) {
      const at = list.findIndex(
        (k) => k.id === (op.place as { after: string }).after,
      )
      index = at < 0 ? list.length : at + 1
    }
    const order = orderBetween(
      list[index - 1]?.order ?? null,
      list[index]?.order ?? null,
    )
    const top: InboxBlock = { ...first, parentId, order }
    upserts.push(top, ...rest)
    add(top)
    touched.push(first.id, ...rest.map((r) => r.id))
  }
  await saveBlockChanges(db, item.pageId, { upserts, deletes: [] })
  // Marked as an AI result, so "Remove this AI result" can take it away.
  await db.blocks
    .where('id')
    .anyOf(touched)
    .modify({ source: 'ai', batchId: item.batchId })
  await syncCardRecords(db, item.pageId, now)
  await db.pages.update(item.pageId, { updatedAt: now })
  await db.claudeInbox.update(id, {
    status: 'accepted',
    decidedAt: now,
    updatedAt: now,
  })
  return 'ok'
}

/** Closes an item without changing the page. */
export async function rejectItem(
  db: LearningNotesDB,
  id: string,
  now = Date.now(),
): Promise<void> {
  const item = await db.claudeInbox.get(id)
  if (!item || !isLive(item) || item.status !== 'pending') return
  await db.claudeInbox.update(id, {
    status: 'rejected',
    decidedAt: now,
    updatedAt: now,
  })
}
