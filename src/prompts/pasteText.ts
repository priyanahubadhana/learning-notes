import type { PromptItem } from './promptModel'
import { composePrompt } from './promptRun'
import { skillCopyText } from './skillRun'
import type { FormatProblem } from './skillFormat'

/**
 * The paste-in path (free, no API): a prompt or skill copies itself together
 * with the exact answer format; you run it in any AI chat and paste the
 * answer back. The pasted text goes through the same checks as an answer
 * from the app, and then the same preview. Nothing is ever run or opened.
 */

/** Largest pasted plain answer (characters). Skill answers have their own limit. */
export const MAX_PASTED_ANSWER = 200_000

/** Shown where the user's text goes when none is chosen yet. */
export const INPUT_PLACEHOLDER = '[PASTE YOUR TEXT HERE]'

/** The whole text to paste into an AI chat: the prompt, the format, the input. */
export function copyTextFor(item: PromptItem, input: string): string {
  const text = input.trim() || INPUT_PLACEHOLDER
  return item.kind === 'skill'
    ? skillCopyText(item, text)
    : composePrompt(item, text)
}

/** Control characters, zero-width and bidirectional marks, line and paragraph separators. */
const invisible = (c: number): boolean =>
  c <= 8 ||
  c === 11 ||
  c === 12 ||
  (c >= 14 && c <= 31) ||
  c === 127 ||
  (c >= 0x200b && c <= 0x200f) ||
  c === 0x2028 ||
  c === 0x2029 ||
  (c >= 0x202a && c <= 0x202e) ||
  c === 0x2060 ||
  c === 0xfeff

/**
 * A pasted plain answer, cleaned: invisible and control characters removed,
 * line ends made plain. It is only ever shown as text and turned into
 * ordinary blocks (links need https), never run.
 */
export function readPastedAnswer(
  raw: string,
): { ok: true; text: string } | { ok: false; problem: FormatProblem } {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, problem: 'empty' }
  }
  if (raw.length > MAX_PASTED_ANSWER) return { ok: false, problem: 'tooLong' }
  const text = [...raw.replace(/\r\n?/g, '\n')]
    .filter((ch) => !invisible(ch.codePointAt(0) ?? 0))
    .join('')
    .trim()
  return text ? { ok: true, text } : { ok: false, problem: 'empty' }
}
