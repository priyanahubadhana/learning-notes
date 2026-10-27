import type { JsonValue } from '../core/types'
import { MARK_STYLE, type MarkLabel } from '../revise/reviseMarks'
import type { AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']

/**
 * Marks the selected words with a Revise label; with the same label
 * already on them, removes it (another label replaces the old one).
 */
export function toggleMark(editor: Editor, label: MarkLabel): void {
  const active = editor.getActiveStyles() as Record<string, unknown>
  if (active[MARK_STYLE] === label) {
    editor.removeStyles({ [MARK_STYLE]: label } as never)
  } else {
    editor.addStyles({ [MARK_STYLE]: label } as never)
  }
}

/**
 * Marks (or un-marks) the whole line of a block: every text run of it gets
 * the label, or loses it when they all have it already. Used by the ⠿ menu.
 */
export function markWholeBlock(
  editor: Editor,
  block: { content?: unknown },
  label: MarkLabel,
): void {
  const content = block.content
  if (!Array.isArray(content)) return
  const runs = content as { type: string; styles?: Record<string, unknown> }[]
  const text = runs.filter((r) => r.type === 'text')
  if (text.length === 0) return
  const allOn = text.every((r) => r.styles?.[MARK_STYLE] === label)
  const next = runs.map((run) => {
    if (run.type !== 'text') return run
    const styles = { ...run.styles }
    if (allOn) delete styles[MARK_STYLE]
    else styles[MARK_STYLE] = label
    return { ...run, styles } as JsonValue
  })
  editor.updateBlock(block as never, { content: next } as never)
}
