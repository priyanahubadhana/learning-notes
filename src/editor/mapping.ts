import { byOrder } from '../core/order'
import { t } from '../i18n/t'
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

/** Rich text for `content.text` from a plain string (e.g. starter templates). */
export function plainText(text: string): JsonValue {
  return text ? [{ type: 'text', text, styles: {} }] : []
}

/** Inline type of a link to a page, or a heading/card on it ("[["). */
export const NOTE_LINK = 'noteLink'

/** Where a link points; `blockId` '' = the page itself. */
export interface NoteLinkTarget {
  pageId: string
  blockId: string
}

/** Props of a note link: its target, and its text when it was made. */
export interface NoteLinkProps extends NoteLinkTarget {
  /**
   * The title (› heading) when the link was made. The editor and "Linked
   * from" always show the current title; plain-text views (search, card
   * lists) use this copy, so it can be out of date after a rename.
   */
  label: string
}

const isObject = (v: JsonValue | undefined): v is JsonObject =>
  !!v && typeof v === 'object' && !Array.isArray(v)

/** The props of a note link run, or null for any other run. */
export function noteLinkProps(
  run: JsonValue | undefined,
): NoteLinkProps | null {
  if (!isObject(run) || run.type !== NOTE_LINK || !isObject(run.props)) {
    return null
  }
  const { pageId, blockId, label } = run.props
  if (typeof pageId !== 'string' || !pageId) return null
  return {
    pageId,
    blockId: typeof blockId === 'string' ? blockId : '',
    label: typeof label === 'string' ? label : '',
  }
}

/**
 * A run's plain text: its text, or a note link's label. Tags are not part
 * of the sentence, so they have none.
 */
export function runText(run: JsonValue | undefined): string {
  if (!isObject(run)) return ''
  if (typeof run.text === 'string') return run.text
  return noteLinkProps(run)?.label ?? ''
}

/** Inline type of a tag written in text ("#"). */
export const TAG = 'tag'

/** Props of an inline tag: the tag, and its path ("a/b") when it was added. */
export interface TagRefProps {
  tagId: string
  /** For plain-text views only; chips always show the current name. */
  label: string
}

/** The props of an inline tag run, or null for any other run. */
export function tagRefProps(run: JsonValue | undefined): TagRefProps | null {
  if (!isObject(run) || run.type !== TAG || !isObject(run.props)) return null
  const { tagId, label } = run.props
  if (typeof tagId !== 'string' || !tagId) return null
  return { tagId, label: typeof label === 'string' ? label : '' }
}

/** Ids of the tags written in a block's rich text (any depth), each once. */
export function inlineTagIds(block: Pick<Block, 'content'>): string[] {
  const ids = new Set<string>()
  const visit = (value: JsonValue | undefined) => {
    if (Array.isArray(value)) value.forEach(visit)
    else if (isObject(value)) {
      const tag = tagRefProps(value)
      if (tag) ids.add(tag.tagId)
      else Object.values(value).forEach(visit)
    }
  }
  visit(block.content.text)
  return [...ids]
}

/**
 * A copy of rich text with each inline tag changed by `map`: new props, or
 * null to remove the tag (e.g. merging or deleting a tag).
 */
export function mapInlineTags(
  value: JsonValue | undefined,
  map: (tag: TagRefProps) => TagRefProps | null,
): JsonValue | undefined {
  if (Array.isArray(value)) {
    return value.flatMap((v) => {
      const tag = tagRefProps(v)
      if (!tag) return [mapInlineTags(v, map)!]
      const next = map(tag)
      return next ? [{ ...(v as JsonObject), props: { ...next } }] : []
    })
  }
  if (!isObject(value)) return value
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, mapInlineTags(v, map)!]),
  )
}

/** The plain text of a block's `content.text` (e.g. for previews). */
export function toPlainText(content: JsonObject): string {
  const runs = content.text
  if (!Array.isArray(runs)) return ''
  return runs.map(runText).join('')
}

/**
 * Every link written in a block, in order: note links in its rich text (at
 * any depth, e.g. inside table cells) and a page link block's page.
 */
export function linkTargets(
  block: Pick<Block, 'type' | 'content'>,
): NoteLinkTarget[] {
  const out: NoteLinkTarget[] = []
  if (block.type === 'pageLink' && typeof block.content.pageId === 'string') {
    if (block.content.pageId) {
      out.push({ pageId: block.content.pageId, blockId: '' })
    }
  }
  const visit = (value: JsonValue | undefined) => {
    if (Array.isArray(value)) value.forEach(visit)
    else if (isObject(value)) {
      const link = noteLinkProps(value)
      if (link) out.push({ pageId: link.pageId, blockId: link.blockId })
      else Object.values(value).forEach(visit)
    }
  }
  visit(block.content.text)
  return out
}

/**
 * A copy of rich text with each note link's props changed by `map`
 * (return them unchanged to keep them): new targets when pages are copied,
 * current titles for read-only views.
 */
export function mapNoteLinks(
  value: JsonValue | undefined,
  map: (link: NoteLinkProps) => NoteLinkProps,
): JsonValue | undefined {
  if (Array.isArray(value)) return value.map((v) => mapNoteLinks(v, map)!)
  if (!isObject(value)) return value
  const link = noteLinkProps(value)
  if (link) {
    return { ...value, props: { ...map(link) } }
  }
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, mapNoteLinks(v, map)!]),
  )
}

/**
 * Ids of the fill-in-the-blanks in a block's `content.text` (runs styled
 * `blank`, including inside links), in order, without repeats.
 */
export function blankIds(content: JsonObject): string[] {
  const ids: string[] = []
  const visit = (runs: JsonValue | undefined) => {
    if (!Array.isArray(runs)) return
    for (const run of runs) {
      if (!run || typeof run !== 'object' || Array.isArray(run)) continue
      const styles = run.styles
      if (styles && typeof styles === 'object' && !Array.isArray(styles)) {
        const id = styles.blank
        if (typeof id === 'string' && !ids.includes(id)) ids.push(id)
      }
      visit(run.content) // links hold their own runs
    }
  }
  visit(content.text)
  return ids
}

/**
 * Removes ids from editor blocks (and their children), so BlockNote gives
 * them new ones, e.g. when inserting a template into a page.
 */
export function withoutIds(blocks: EditorPartialBlock[]): EditorPartialBlock[] {
  return blocks.map((block) => {
    const {
      id: _id,
      children,
      ...rest
    } = block as EditorPartialBlock & {
      id?: string
      children?: EditorPartialBlock[]
    }
    void _id
    return {
      ...rest,
      children: withoutIds(children ?? []),
    } as EditorPartialBlock
  })
}

/** One run of rich text the editor can show. */
function isShowableRun(run: JsonValue): boolean {
  if (!isObject(run)) return false
  if (run.type === 'text') {
    return (
      typeof run.text === 'string' &&
      (run.styles === undefined || isObject(run.styles))
    )
  }
  if (run.type === 'link') {
    return (
      typeof run.href === 'string' &&
      Array.isArray(run.content) &&
      run.content.every(isShowableRun)
    )
  }
  return (run.type === NOTE_LINK || run.type === TAG) && isObject(run.props)
}

/** A table's rows of cells; a cell is a list of runs or a cell object. */
function isShowableTable(value: JsonObject): boolean {
  if (value.type !== 'tableContent' || !Array.isArray(value.rows)) return false
  return value.rows.every(
    (row) =>
      isObject(row) &&
      Array.isArray(row.cells) &&
      row.cells.every((cell) => {
        const runs = isObject(cell) ? cell.content : cell
        return (
          runs === undefined ||
          (Array.isArray(runs) && runs.every(isShowableRun))
        )
      }),
  )
}

/**
 * Whether a block's `content.text` has a shape the editor can draw. A
 * damaged value would otherwise stop the whole page from opening.
 */
export function isShowableText(text: JsonValue | undefined): boolean {
  if (text === undefined || typeof text === 'string') return true
  if (Array.isArray(text)) return text.every(isShowableRun)
  return isObject(text) && isShowableTable(text)
}

/** One record as the editor accepts it, without its children (live sync). */
export const recordToEditorBlock = (record: Block): EditorPartialBlock => {
  const { children: _kids, ...block } = toEditorBlock(record, []) as {
    children: unknown
  }
  void _kids
  return block as EditorPartialBlock
}

function toEditorBlock(
  record: Block,
  children: EditorPartialBlock[],
): EditorPartialBlock {
  const { text, ...props } = toJson<JsonObject>(record.content)
  // Shown as a plain line; the stored record is not touched, because the
  // comparison for saving starts from what the editor shows (diff.ts).
  if (!isShowableText(text)) {
    return {
      id: record.id,
      type: 'paragraph',
      content: plainText(t('editor.damagedBlock')),
      children,
    } as unknown as EditorPartialBlock
  }
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
