import type { Block, JsonValue } from '../core/types'
import { t, type MessageKey } from '../i18n/t'

/**
 * Revise marks: words in a note marked as a Key point, Keyword, Must know
 * or Formula (an inline style named "mark" whose value is the label id,
 * stored in the note like a blank). A lesson's revision sheet is made of
 * its marks.
 */

export const MARK_STYLE = 'mark'

export const MARK_LABELS = ['key', 'keyword', 'must', 'formula'] as const
export type MarkLabel = (typeof MARK_LABELS)[number]

export const isMarkLabel = (v: unknown): v is MarkLabel =>
  MARK_LABELS.includes(v as MarkLabel)

export const markName = (label: MarkLabel): string =>
  t(`revise.label.${label}` as MessageKey)

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
  return MARK_LABELS.map((label) => ({
    label,
    marks: marks.filter((m) => m.label === label),
  })).filter((g) => g.marks.length > 0)
}
