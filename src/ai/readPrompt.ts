import { readPref, writePref } from '../app/uiPrefs'

/**
 * A saved prompt chosen to read handwriting (Convert to text and the Write
 * pad's AI engine). Optional: nothing chosen = the built-in reading prompt,
 * exactly as before. A device preference, not synced.
 */
export interface ReadPrompt {
  name: string
  text: string
}

const KEY = 'ai.readPrompt'
const MAX_TEXT = 5_000

const isReadPrompt = (v: unknown): v is ReadPrompt =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as ReadPrompt).name === 'string' &&
  typeof (v as ReadPrompt).text === 'string'

export function getReadPrompt(): ReadPrompt | null {
  const v = readPref<ReadPrompt | null>(
    KEY,
    (x): x is ReadPrompt | null => x === null || isReadPrompt(x),
    null,
  )
  return v && v.text.trim() ? v : null
}

export function setReadPrompt(p: ReadPrompt | null): void {
  writePref(
    KEY,
    p && p.text.trim()
      ? { name: p.name.slice(0, 200), text: p.text.slice(0, MAX_TEXT) }
      : null,
  )
}

/** The words sent for reading handwriting with a saved prompt. */
export function readingInstruction(text: string): string {
  return `${text.trim()}\n\nThe picture shows handwriting. Answer with the resulting text only: no introduction, no quotes, no code fence.`
}
