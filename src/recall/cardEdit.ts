import type { JsonObject, JsonValue } from '../core/types'
import { maskedText } from './cardService'

/**
 * The Review card editor changes a card's question as plain text. A question
 * with styling, links or blanks is not rewritten (that would lose them): the
 * editor shows it read-only and sends the person to the note.
 */

/** True when every run is unstyled text, so plain text keeps all of it. */
export function isPlainQuestion(runs: JsonValue | undefined): boolean {
  if (runs === undefined) return true
  if (!Array.isArray(runs)) return false
  return runs.every((run) => {
    if (!run || typeof run !== 'object' || Array.isArray(run)) return false
    if (run.type !== 'text') return false
    const styles = run.styles
    return (
      styles === undefined ||
      (typeof styles === 'object' &&
        styles !== null &&
        !Array.isArray(styles) &&
        Object.keys(styles).length === 0)
    )
  })
}

/** The question as plain text. */
export const questionText = (content: JsonObject): string =>
  maskedText(content.text)

/** The block content with its question replaced by plain `text`. */
export function withQuestion(content: JsonObject, text: string): JsonObject {
  return {
    ...content,
    text: text === '' ? [] : [{ type: 'text', text, styles: {} }],
  }
}
