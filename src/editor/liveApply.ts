import type { Node as PMNode } from 'prosemirror-model'
import { TextSelection } from 'prosemirror-state'
import { listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { byOrder } from '../core/order'
import type { Block, OrderKey } from '../core/types'
import { keepTheirsInHistory } from '../history/loserVersion'
import { noteMergedPage } from '../sync/engine'
import { getSyncStatus, setSyncStatus } from '../sync/syncStatus'
import type { BlockDraft, SavedBlock } from './diff'
import { editorToDrafts, recordToEditorBlock } from './mapping'
import type { PageSync } from './pageSync'
import { editorBlockTypes, type AppSchema } from './schema'

/**
 * Live apply (R6-13): blocks another device changed go into the open
 * editor one by one, with no reload, keeping the caret and selection.
 *
 * - A block the person is editing right now (its text in the editor
 *   differs from what was last saved) is never touched: their typing is
 *   the newer change and wins, like the sync merge rule; the other
 *   device's text is kept in the page's History and the "changed on two
 *   devices" notice shows.
 * - Everything else is updated, inserted or removed in place; the snapshot
 *   of the autosaver takes the new state as "saved", so nothing is written
 *   back. The changes are not Undo steps for the person here.
 * - A block moved on the other device is put at its new place unless the
 *   caret is in it (then it stays where it is until the page is reopened).
 */

export interface LiveApplyResult {
  applied: string[]
  /** Blocks left alone because they were being edited here. */
  kept: string[]
}

type Editor = AppSchema['BlockNoteEditor']
type Partial = AppSchema['PartialBlock']

const same = (
  d: BlockDraft,
  saved: { content: string; type: string; parentId: string | null },
) =>
  d.type === saved.type &&
  d.parentId === saved.parentId &&
  JSON.stringify(d.content) === saved.content

/** One end of the selection as a block id and a text offset inside it. */
interface Spot {
  id: string
  offset: number
}

/**
 * The selection as its two ends (anchor and head), each a block id and an
 * offset, so it can be put back after blocks moved. A collapsed selection
 * has both ends the same. R7-4: a word the person selected (a Pencil double
 * tap) must survive a synced change arriving a few seconds later; putting
 * back only a caret threw it away.
 */
function selectionOf(editor: Editor): { anchor: Spot; head: Spot } | null {
  try {
    const { doc, selection } = editor.prosemirrorState
    const spot = (pos: number): Spot | null => {
      const $pos = doc.resolve(pos)
      for (let d = $pos.depth; d > 0; d--) {
        const node = $pos.node(d)
        if (node.type.name === 'blockContainer') {
          const start = contentStart(doc, node.attrs.id as string)
          return start === null
            ? null
            : { id: node.attrs.id as string, offset: pos - start }
        }
      }
      return null
    }
    const anchor = spot(selection.anchor)
    const head = spot(selection.head)
    return anchor && head ? { anchor, head } : null
  } catch {
    return null
  }
}

const sameSpot = (a: Spot | undefined, b: Spot | undefined) =>
  !!a && !!b && a.id === b.id && a.offset === b.offset

/** Has the selection moved from where it was (by the block ids and offsets)? */
function selectionMoved(
  editor: Editor,
  was: { anchor: Spot; head: Spot },
): boolean {
  const now = selectionOf(editor)
  return (
    !now || !sameSpot(now.anchor, was.anchor) || !sameSpot(now.head, was.head)
  )
}

const caretOf = (editor: Editor) => selectionOf(editor)

/** Position just inside a block's content node, or null when not shown. */
function contentStart(doc: PMNode, id: string): number | null {
  let found: number | null = null
  doc.descendants((node, pos) => {
    if (found !== null) return false
    if (node.type.name === 'blockContainer' && node.attrs.id === id) {
      found = pos + 2 // inside the container, inside its content node
      return false
    }
    return true
  })
  return found
}

function restoreCaret(editor: Editor, sel: { anchor: Spot; head: Spot }) {
  try {
    editor.transact((tr) => {
      const at = (s: Spot): number | null => {
        const start = contentStart(tr.doc, s.id)
        if (start === null) return null
        const end = tr.doc.resolve(start).end()
        return Math.min(Math.max(start, start + s.offset), end)
      }
      const anchor = at(sel.anchor)
      const head = at(sel.head)
      if (anchor === null) return
      tr.setSelection(
        head === null
          ? TextSelection.create(tr.doc, anchor)
          : TextSelection.between(tr.doc.resolve(anchor), tr.doc.resolve(head)),
      )
      tr.setMeta('addToHistory', false)
    })
  } catch {
    // A block type without text (a picture): the editor keeps its own place.
  }
}

/** Depth-first order so parents go in before their children. */
function sortForInsert(records: Block[], all: Map<string, Block>): Block[] {
  const depth = (b: Block): number => {
    let d = 0
    let p = b.parentId
    while (p && all.has(p) && d < 50) {
      d++
      p = all.get(p)!.parentId
    }
    return d
  }
  return [...records].sort((a, b) => depth(a) - depth(b) || byOrder(a, b))
}

/** JSON with sorted keys, so two stores' orderings compare equal. */
function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canon(o[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(v)
}

/**
 * A record already shown and saved exactly like this: nothing to do. This
 * is the common case: this device's own saves come back from the server.
 */
function upToDate(r: Block, saved: SavedBlock): boolean {
  if (
    r.deletedAt !== null ||
    r.type !== saved.type ||
    r.parentId !== saved.parentId ||
    r.order !== saved.order
  )
    return false
  try {
    return canon(r.content) === canon(JSON.parse(saved.content))
  } catch {
    return false
  }
}

export async function applyRemoteBlocks(
  db: LearningNotesDB,
  editor: Editor,
  pageId: string,
  sync: Pick<PageSync, 'savedOf' | 'absorb'>,
  ids: readonly string[],
  /** Called with true just before the editor is changed and false after. */
  editing?: (on: boolean) => void,
): Promise<LiveApplyResult> {
  const result: LiveApplyResult = { applied: [], kept: [] }
  const changed = (await db.blocks.bulkGet([...ids])).filter(
    (b): b is Block => !!b && b.pageId === pageId,
  )
  if (changed.length === 0) return result
  const live = await listBlocks(db, pageId)
  const all = new Map(live.map((b) => [b.id, b]))
  for (const b of changed) all.set(b.id, b)

  const drafts = new Map(editorToDrafts(editor.document).map((d) => [d.id, d]))
  const inEditor = (id: string | null) => id !== null && drafts.has(id)
  const theirs: Block[] = []
  const orders = new Map<string, OrderKey | null>()
  const caret = caretOf(editor)

  editing?.(true)
  editor.transact((tr) => {
    tr.setMeta('addToHistory', false)
    for (const r of sortForInsert(changed, all)) {
      const draft = drafts.get(r.id)
      const saved = sync.savedOf(r.id)
      if (draft && saved && upToDate(r, saved)) continue
      const typing = !!draft && (!saved || !same(draft, saved))
      if (typing) {
        // Their change loses to the typing here: kept in History below.
        if (
          r.deletedAt === null &&
          saved &&
          JSON.stringify(r.content) !== saved.content
        ) {
          theirs.push(r)
        }
        result.kept.push(r.id)
        continue
      }
      if (r.deletedAt !== null) {
        if (draft) {
          editor.removeBlocks([r.id])
          drafts.delete(r.id)
          orders.set(r.id, null)
          result.applied.push(r.id)
        }
        continue
      }
      if (!editorBlockTypes.has(r.type)) continue
      const partial = recordToEditorBlock(r)
      const moved =
        !!draft &&
        !!saved &&
        (saved.parentId !== r.parentId || saved.order !== r.order)
      let kids: Partial['children'] = []
      const inSelection =
        !!caret && (caret.anchor.id === r.id || caret.head.id === r.id)
      if (draft && moved && !inSelection) {
        // Put it at its new place; its children travel with it.
        kids = (editor.getBlock(r.id)?.children ?? []) as Partial['children']
        editor.removeBlocks([r.id])
        drafts.delete(r.id)
      }
      if (drafts.has(r.id)) {
        editor.updateBlock(r.id, partial)
      } else {
        // Where among its siblings: before the next one the editor shows,
        // else after the previous one, else first inside its parent.
        const siblings = [...all.values()]
          .filter(
            (b) =>
              b.id !== r.id &&
              b.deletedAt === null &&
              b.parentId === r.parentId &&
              inEditor(b.id),
          )
          .sort(byOrder)
        const next = siblings.find((b) => byOrder(b, r) > 0)
        const prev = [...siblings].reverse().find((b) => byOrder(b, r) < 0)
        const withKids = { ...partial, children: kids } as Partial
        if (next) editor.insertBlocks([withKids], next.id, 'before')
        else if (prev) editor.insertBlocks([withKids], prev.id, 'after')
        else if (r.parentId && inEditor(r.parentId)) {
          editor.updateBlock(r.parentId, { children: [withKids] })
        } else {
          const top = editor.document
          editor.insertBlocks([withKids], top[top.length - 1].id, 'after')
        }
        drafts.set(r.id, {
          id: r.id,
          parentId: r.parentId,
          type: r.type,
          content: r.content,
        })
      }
      orders.set(r.id, r.order)
      result.applied.push(r.id)
    }
  })

  if (orders.size > 0) sync.absorb(orders)
  // Put the selection back only when the change moved it: a selection the
  // editor mapped through the change by itself is left alone.
  if (caret && result.applied.length > 0 && selectionMoved(editor, caret)) {
    restoreCaret(editor, caret)
  }
  editing?.(false)
  if (theirs.length > 0 && (await keepTheirsInHistory(db, pageId, theirs))) {
    await noteMergedPage(db, pageId)
    setSyncStatus({ mergedPages: (getSyncStatus().mergedPages ?? 0) + 1 })
  }
  return result
}
