import type { Block, JsonValue } from '../core/types'
import { t, type MessageKey } from '../i18n/t'

/**
 * Revise marks: words in a note marked as a Key point, Keyword, Must know
 * or Formula (an inline style named "mark" whose value is the label id,
 * stored in the note like a blank). A lesson's revision sheet is made of
 * its marks.
 */

export const MARK_STYLE = 'mark'

/** The four labels every notebook starts with (they cannot be deleted). */
export const BUILTIN_LABELS = ['key', 'keyword', 'must', 'formula'] as const

/** A label id: a built-in one, or the id of a label the user added. */
export type MarkLabel = string

/** A label as set in Settings (the order is the order of the toolbar). */
export type LabelDef = {
  id: MarkLabel
  /** Empty = the built-in label's own (translated) name. */
  name: string
  /** One of `LABEL_COLORS`. */
  color: string
}

/** Colours a label can have (the same set as tags). */
export const LABEL_COLORS = [
  '#d9822b',
  '#2f6feb',
  '#c8402f',
  '#2e9e6b',
  '#8a5cf6',
  '#c2417f',
] as const

export const DEFAULT_LABELS: readonly LabelDef[] = [
  { id: 'key', name: '', color: '#d9822b' },
  { id: 'keyword', name: '', color: '#2f6feb' },
  { id: 'must', name: '', color: '#c8402f' },
  { id: 'formula', name: '', color: '#2e9e6b' },
]

export const MAX_LABELS = 24
const ID_PATTERN = /^[a-z0-9-]{1,40}$/

/** True for a valid list of labels: the built-ins kept, ids unique, safe text. */
export function isLabelList(value: unknown): value is LabelDef[] {
  if (!Array.isArray(value) || value.length > MAX_LABELS) return false
  const ids = new Set<string>()
  for (const label of value) {
    if (
      !label ||
      typeof label !== 'object' ||
      typeof label.id !== 'string' ||
      !ID_PATTERN.test(label.id) ||
      ids.has(label.id) ||
      typeof label.name !== 'string' ||
      label.name.length > 40 ||
      !(LABEL_COLORS as readonly string[]).includes(label.color)
    ) {
      return false
    }
    ids.add(label.id)
  }
  return BUILTIN_LABELS.every((id) => ids.has(id))
}

let labels: readonly LabelDef[] = DEFAULT_LABELS

/** The labels in use (set from the Settings value by the app). */
export const markLabels = (): readonly LabelDef[] => labels

/**
 * Switches to a list of labels and makes the page show their colours (one
 * small style element; labels added by the user have no colour in the
 * stylesheet).
 */
export function setMarkLabels(next: readonly LabelDef[]): void {
  labels = next
  if (typeof document === 'undefined') return
  let style = document.getElementById('mark-label-colors')
  if (!style) {
    style = document.createElement('style')
    style.id = 'mark-label-colors'
    document.head.append(style)
  }
  style.textContent = next
    .map((l) => `.recall-mark[data-mark="${l.id}"]{--mark:${l.color}}`)
    .join('\n')
}

const isMarkLabel = (v: unknown): v is MarkLabel =>
  typeof v === 'string' && v !== ''

/** A label's name: the one set in Settings, or the built-in name. */
export function markName(label: MarkLabel): string {
  const found = labels.find((l) => l.id === label)
  if (found?.name) return found.name
  return (BUILTIN_LABELS as readonly string[]).includes(label)
    ? t(`revise.label.${label}` as MessageKey)
    : t('revise.label.other')
}

/** One marked piece of text and where it is. */
export interface Mark {
  label: MarkLabel
  text: string
  pageId: string
  blockId: string
}

const isObject = (v: JsonValue | undefined): v is Record<string, JsonValue> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * The marks in a block's text: neighbouring runs with the same label are
 * one mark (bold half-way through a mark does not split it).
 */
export function marksOfBlock(
  block: Pick<Block, 'id' | 'pageId' | 'content'>,
): Mark[] {
  const runs = block.content.text
  if (!Array.isArray(runs)) return []
  const marks: Mark[] = []
  let open: Mark | null = null
  for (const run of runs) {
    const styles =
      isObject(run) && isObject(run.styles) ? run.styles : undefined
    const label = styles?.[MARK_STYLE]
    if (!isObject(run) || typeof run.text !== 'string' || !isMarkLabel(label)) {
      open = null
      continue
    }
    if (open && open.label === label) open.text += run.text
    else {
      open = { label, text: run.text, pageId: block.pageId, blockId: block.id }
      marks.push(open)
    }
  }
  return marks
    .map((m) => ({ ...m, text: m.text.trim() }))
    .filter((m) => m.text !== '')
}

/** Marks grouped by label, in label order (empty groups left out). */
export function groupMarks(
  marks: readonly Mark[],
): { label: MarkLabel; marks: Mark[] }[] {
  // The labels in Settings order, then marks of labels that were deleted.
  const known = labels.map((l) => l.id)
  const extra = [...new Set(marks.map((m) => m.label))].filter(
    (id) => !known.includes(id),
  )
  return [...known, ...extra]
    .map((label) => ({
      label,
      marks: marks.filter((m) => m.label === label),
    }))
    .filter((g) => g.marks.length > 0)
}
