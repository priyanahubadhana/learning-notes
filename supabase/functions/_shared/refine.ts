/**
 * `refine_page`: the changes Claude may propose to a page that already exists
 * (plan B, slice 7). Pure planning, no network: the Node tests check every
 * decision.
 *
 * One block per operation:
 *   - `add`     a new block at the end of the page (or of a block's children);
 *   - `insert`  a new block after a given block (or at the start);
 *   - `replace` the type and text of one existing block (its place, children
 *               and id stay).
 * There is no delete operation. A change is applied at once only when it is
 * small and does not touch recall cards, and the page is still as Claude read
 * it. Otherwise it is stored as an Inbox item (an end-to-end encrypted record
 * the app shows in Settings > Claude > Inbox) and the person accepts or
 * rejects it. Either way the page's earlier state is kept in its History.
 */
import { ToolFail } from './escrow.ts'
import { orderBetween } from './fracindex.ts'
import { byOrder } from './markdown.ts'
import type { Block } from './notesModel.ts'
import {
  blockTree,
  edited,
  type Counts,
  type MadeRecord,
  type MakeOptions,
} from './notesWrite.ts'
import {
  describeErrors,
  SPEC_VERSION,
  validateSpec,
  type SpecBlock,
} from './spec.ts'

export const MAX_OPS = 50
/** A change over this share of the page goes to the Inbox. */
export const BIG_CHANGE = 0.3

export type OpKind = 'add' | 'insert' | 'replace'
export interface RefineOp {
  op: OpKind
  block: SpecBlock
  /** replace: the block to replace. */
  blockId?: string
  /** insert: the block to insert after; null = at the start. */
  afterBlockId?: string | null
  /** add / insert at the start: nest under this block (null or unset = top level). */
  parentId?: string | null
}

const ID = /^[A-Za-z0-9_-]{1,64}$/
const isPlain = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  Object.getPrototypeOf(v) === Object.prototype

/** Block types refine_page cannot make (they need ids it does not have). */
const NOT_HERE = new Set(['database', 'pageLink'])

function hasType(b: SpecBlock, types: Set<string>): boolean {
  return types.has(b.type) || (b.children ?? []).some((c) => hasType(c, types))
}

/** Checks the operations (shape, limits, every block against the spec rules). Never partial. */
export function parseOps(input: unknown): RefineOp[] {
  if (!Array.isArray(input) || input.length === 0)
    throw new ToolFail('Give "ops": a list of 1 to 50 operations.')
  if (input.length > MAX_OPS)
    throw new ToolFail(`At most ${MAX_OPS} operations in one call.`)
  const out: RefineOp[] = []
  const problems: string[] = []
  const replaced = new Set<string>()
  input.forEach((raw, i) => {
    const at = `/ops/${i}`
    if (!isPlain(raw)) return void problems.push(`${at}: Must be an object.`)
    const kind = raw.op
    if (kind !== 'add' && kind !== 'insert' && kind !== 'replace')
      return void problems.push(`${at}/op: Must be add, insert or replace.`)
    const allowed = ['op', 'block']
    if (kind === 'replace') allowed.push('blockId')
    if (kind === 'insert') allowed.push('afterBlockId', 'parentId')
    if (kind === 'add') allowed.push('parentId')
    for (const k of Object.keys(raw))
      if (!allowed.includes(k))
        problems.push(`${at}/${k}: Unknown field for "${kind}".`)
    const idOk = (v: unknown) => typeof v === 'string' && ID.test(v)
    if (kind === 'replace') {
      if (!idOk(raw.blockId))
        problems.push(`${at}/blockId: Give the id of the block to replace.`)
      else if (replaced.has(raw.blockId as string))
        problems.push(
          `${at}/blockId: Each block can be replaced once per call.`,
        )
      else replaced.add(raw.blockId as string)
    }
    if (kind === 'insert') {
      if (raw.afterBlockId !== null && !idOk(raw.afterBlockId))
        problems.push(
          `${at}/afterBlockId: Give a block id, or null to insert at the start.`,
        )
      if (raw.afterBlockId !== null && raw.parentId !== undefined)
        problems.push(
          `${at}/parentId: Only with "afterBlockId": null (the new block goes next to that block).`,
        )
    }
    if (
      (kind === 'add' || kind === 'insert') &&
      raw.parentId !== undefined &&
      raw.parentId !== null &&
      !idOk(raw.parentId)
    )
      problems.push(`${at}/parentId: Give a block id or null.`)
    // The block is checked by the same rules as a block in a notebook spec.
    const r = validateSpec({
      version: SPEC_VERSION,
      title: 'Block',
      pages: [{ title: 'Block', blocks: [raw.block] }],
    })
    if (!r.ok) {
      for (const e of r.errors)
        problems.push(
          `${e.path.replace('/pages/0/blocks/0', `${at}/block`)}: ${e.message}`,
        )
      return
    }
    const block = r.spec.pages[0].blocks[0]
    if (hasType(block, NOT_HERE))
      return void problems.push(
        `${at}/block: Database and page-link blocks cannot be made here (use create_database / add_page).`,
      )
    if (kind === 'replace' && block.children?.length)
      return void problems.push(
        `${at}/block/children: A replacement has no children (the old ones stay). Use "add" with a parentId to add some.`,
      )
    out.push({
      op: kind,
      block,
      ...(kind === 'replace' ? { blockId: raw.blockId as string } : {}),
      ...(kind === 'insert'
        ? { afterBlockId: raw.afterBlockId as string | null }
        : {}),
      ...(raw.parentId !== undefined
        ? { parentId: raw.parentId as string | null }
        : {}),
    })
  })
  if (problems.length)
    throw new ToolFail(
      `The changes are not valid. Nothing was changed.\n${problems.slice(0, 20).join('\n')}`,
    )
  return out
}

/** Where a new block goes, as stored in an Inbox item. */
export type Place = 'start' | 'end' | { after: string }

export interface PlannedBlock {
  id: string
  parentId: string | null
  type: string
  content: Record<string, unknown>
  order: string
}
export interface PlannedOp {
  op: OpKind
  /** replace: the block replaced. */
  targetId?: string
  /** add / insert: the parent and the place among its children. */
  parentId?: string | null
  place?: Place
  /** The new block (first) and its children; for replace, only the new type and content. */
  blocks: PlannedBlock[]
}
export interface Plan {
  ops: PlannedOp[]
  /** New block records, then edited blocks: ready to save as they are. */
  records: MadeRecord[]
  replaced: number
  added: number
  existing: number
  /** Share of the page this changes (0 to 1). */
  fraction: number
  touchesCards: boolean
}

interface Kid {
  id: string
  order: string
}

/** Works out the new blocks, their places and what they touch. Throws ToolFail for a block that is not on the page. */
export function planRefine(args: {
  ops: readonly RefineOp[]
  blocks: readonly { b: Block; rev: number }[]
  /** Ids of blocks that have recall card records. */
  cardBlocks: ReadonlySet<string>
  notebookId: string
  pageId: string
  pageTitle: string
  opts: MakeOptions
}): Plan {
  const byId = new Map(args.blocks.map((x) => [x.b.id, x]))
  const kids = new Map<string | null, Kid[]>()
  for (const { b } of args.blocks) {
    const list = kids.get(b.parentId) ?? []
    list.push({ id: b.id, order: b.order })
    kids.set(b.parentId, list)
  }
  for (const list of kids.values())
    list.sort((a, c) => byOrder({ ...a }, { ...c }))
  const inCard = (id: string | null): boolean => {
    for (let n = 0; id && n < 50; n++) {
      const x = byId.get(id)?.b
      if (!x) return false
      if (x.type === 'card' || args.cardBlocks.has(x.id)) return true
      id = x.parentId
    }
    return false
  }
  const live = (id: string, what: string) => {
    const x = byId.get(id)
    if (!x) throw new ToolFail(`${what}: no such block on this page.`)
    return x
  }

  const plan: Plan = {
    ops: [],
    records: [],
    replaced: 0,
    added: 0,
    existing: args.blocks.length,
    fraction: 0,
    touchesCards: false,
  }
  const newEdits: MadeRecord[] = []

  args.ops.forEach((o, i) => {
    const at = `/ops/${i}`
    if (o.op === 'replace') {
      const target = live(o.blockId!, `${at}/blockId`)
      const made = blockTree(o.block, {
        ...args.opts,
        notebookId: args.notebookId,
        pageId: args.pageId,
        pageTitle: args.pageTitle,
        parentId: target.b.parentId,
        order: target.b.order,
      })
      const top = made.records.find((r) => r.id === made.blockId)!
      const value = top.value as {
        type: string
        content: Record<string, unknown>
      }
      if (
        target.b.type === 'card' ||
        args.cardBlocks.has(target.b.id) ||
        inCard(target.b.parentId) ||
        value.type === 'card'
      )
        plan.touchesCards = true
      plan.replaced++
      plan.ops.push({
        op: 'replace',
        targetId: target.b.id,
        blocks: [
          {
            id: target.b.id,
            parentId: target.b.parentId,
            type: value.type,
            content: value.content,
            order: target.b.order,
          },
        ],
      })
      newEdits.push(
        edited(
          'blocks',
          target.b as unknown as Record<string, unknown>,
          target.rev,
          {
            type: value.type,
            content: value.content,
            // Not marked as an AI result: "Remove this AI result" must never
            // take away a block the person wrote (the old text is in History).
            clash: undefined,
          },
          args.opts.now,
        ),
      )
      return
    }
    // add / insert
    let parentId: string | null = null
    let place: Place = 'end'
    if (o.op === 'insert') {
      if (o.afterBlockId === null || o.afterBlockId === undefined) {
        parentId = o.parentId ?? null
        if (parentId !== null) live(parentId, `${at}/parentId`)
        place = 'start'
      } else {
        const after = live(o.afterBlockId, `${at}/afterBlockId`)
        parentId = after.b.parentId
        place = { after: after.b.id }
      }
    } else if (o.parentId) {
      live(o.parentId, `${at}/parentId`)
      parentId = o.parentId
    }
    const list = kids.get(parentId) ?? []
    let index = list.length
    if (place === 'start') index = 0
    else if (place !== 'end')
      index = list.findIndex((k) => k.id === place.after) + 1
    const order = orderBetween(
      list[index - 1]?.order ?? null,
      list[index]?.order ?? null,
    )
    const made = blockTree(o.block, {
      ...args.opts,
      notebookId: args.notebookId,
      pageId: args.pageId,
      pageTitle: args.pageTitle,
      parentId,
      order,
    })
    list.splice(index, 0, { id: made.blockId, order })
    kids.set(parentId, list)
    if (
      made.records.some((r) => r.table === 'cards') ||
      made.records.some(
        (r) =>
          r.table === 'blocks' && (r.value as { type: string }).type === 'card',
      ) ||
      inCard(parentId)
    )
      plan.touchesCards = true
    plan.added++
    plan.ops.push({
      op: o.op,
      parentId,
      place,
      blocks: made.records
        .filter((r) => r.table === 'blocks')
        .map((r) => {
          const v = r.value as {
            parentId: string | null
            type: string
            content: Record<string, unknown>
            order: string
          }
          return {
            id: r.id,
            parentId: v.parentId,
            type: v.type,
            content: v.content,
            order: v.order,
          }
        }),
    })
    plan.records.push(...made.records)
  })
  plan.records.push(...newEdits)
  plan.fraction =
    plan.existing === 0
      ? 0
      : (plan.replaced + plan.added) / (plan.existing + plan.added)
  return plan
}

export type InboxReason = 'big' | 'cards' | 'conflict'

/** Why a plan cannot be applied at once ([] = it can). */
export function inboxReasons(plan: Plan, conflict: boolean): InboxReason[] {
  const out: InboxReason[] = []
  if (plan.fraction > BIG_CHANGE) out.push('big')
  if (plan.touchesCards) out.push('cards')
  if (conflict) out.push('conflict')
  return out
}

/** The Inbox item: an app record (src/core/types.ts ClaudeInboxItem), sealed like any other. */
export function inboxRecord(args: {
  id: string
  now: number
  pageId: string
  notebookId: string
  pageTitle: string
  baseRevision: string
  reasons: InboxReason[]
  plan: Plan
  batchId: string
}): MadeRecord {
  return {
    table: 'claudeInbox',
    id: args.id,
    value: {
      id: args.id,
      createdAt: args.now,
      updatedAt: args.now,
      deletedAt: null,
      pageId: args.pageId,
      notebookId: args.notebookId,
      pageTitle: args.pageTitle,
      baseRevision: args.baseRevision,
      reasons: args.reasons,
      status: 'pending',
      batchId: args.batchId,
      ops: args.plan.ops,
      stats: {
        replaced: args.plan.replaced,
        added: args.plan.added,
        existing: args.plan.existing,
      },
    },
  }
}

/** The page as it was, kept in its History before Claude changes it (a `pageVersions` record). */
export function versionRecord(args: {
  id: string
  now: number
  page: Record<string, unknown>
  blocks: readonly Block[]
}): MadeRecord {
  const blocks = args.blocks.map((b) => ({
    id: b.id,
    parentId: b.parentId,
    type: b.type,
    content: b.content,
    order: b.order,
    ...(b.boxId ? { boxId: b.boxId } : {}),
  }))
  const layout: Record<string, unknown> = {}
  if (Array.isArray(args.page.boxes) && args.page.boxes.length)
    layout.boxes = args.page.boxes
  if (args.page.inkBg) layout.inkBg = args.page.inkBg
  if (args.page.sheet) layout.sheet = args.page.sheet
  const state = {
    title: String(args.page.title ?? ''),
    blocks,
    ...(Object.keys(layout).length ? { layout } : {}),
  }
  return {
    table: 'pageVersions',
    id: args.id,
    value: {
      id: args.id,
      createdAt: args.now,
      updatedAt: args.now,
      deletedAt: null,
      pageId: String(args.page.id),
      ...state,
      reason: 'claude',
      // The server cannot copy the page's ink; restoring this copy leaves the ink as it is.
      inkKept: true,
      bytes: JSON.stringify(state).length,
    },
  }
}

export function countsOf(plan: Plan): Counts & Record<string, number> {
  return {
    pages: 0,
    blocks: plan.added,
    cards: 0,
    replaced: plan.replaced,
    added: plan.added,
  }
}

export { describeErrors }
