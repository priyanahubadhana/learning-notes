import { byOrder } from '../core/order'
import type { Block, JsonObject, JsonValue } from '../core/types'
import type { BlockDraft } from './diff'
import type { AppSchema } from './schema'

/**
 * Converts between BlockNote's block format and our records.
 *
 * This is the ONLY file that knows BlockNote's data format, so swapping
 * the editor means rewriting just this file (plus the editor component).
 *
 * Format rules:
 * - BlockNote `props` (heading level, checked, …) → keys of `content`.
 * - BlockNote inline `content` (rich text) → `content.text`.
 * - BlockNote nested `children` → separate records with `parentId`.
 */

/** A block as BlockNote returns it (editor.document). */
export type EditorBlock = AppSchema['Block']
/** A block as BlockNote accepts it (initialContent). */
export type EditorPartialBlock = AppSchema['PartialBlock']

/** Deep-copies plain data as JSON (detaches it from editor objects). */
function toJson<T extends JsonValue>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Flattens BlockNote's nested blocks into drafts, parents before children,
 * siblings in display order.
 */
export function editorToDrafts(
  blocks: readonly EditorBlock[],
  parentId: string | null = null,
): BlockDraft[] {
  const drafts: BlockDraft[] = []
  for (const block of blocks) {
    const content = toJson<JsonObject>(block.props)
    if (block.content !== undefined) content.text = toJson(block.content)
    drafts.push({ id: block.id, parentId, type: block.type, content })
    drafts.push(...editorToDrafts(block.children, block.id))
  }
  return drafts
}

/**
 * Rebuilds BlockNote's nested blocks from live records.
 * - Blocks whose parent is missing are shown at the top level (never lost).
 * - Blocks of types the editor cannot show are left out, together with
 *   anything nested inside them. They stay untouched in the database.
 */
export function recordsToEditor(
  records: readonly Block[],
  supportedTypes: ReadonlySet<string>,
): EditorPartialBlock[] {
  const ids = new Set(records.map((r) => r.id))
  const childrenOf = new Map<string | null, Block[]>()
  for (const record of records) {
    const parent =
      record.parentId !== null && ids.has(record.parentId)
        ? record.parentId
        : null
    const list = childrenOf.get(parent) ?? []
    list.push(record)
    childrenOf.set(parent, list)
  }

  const build = (parentId: string | null): EditorPartialBlock[] =>
    (childrenOf.get(parentId) ?? [])
      .filter((r) => supportedTypes.has(r.type))
      .sort(byOrder)
      .map((r) => toEditorBlock(r, build(r.id)))

  return build(null)
}

function toEditorBlock(
  record: Block,
  children: EditorPartialBlock[],
): EditorPartialBlock {
  const { text, ...props } = toJson<JsonObject>(record.content)
  const block = {
    id: record.id,
    type: record.type,
    props,
    ...(text !== undefined && { content: text }),
    children,
  }
  // Cast: BlockNote's types are per block type; the shape here is generic
  // and was produced by editorToDrafts, so it matches at runtime.
  return block as unknown as EditorPartialBlock
}
