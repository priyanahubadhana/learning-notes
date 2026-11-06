import type { CaptureInput } from './captureService'

/**
 * "Copy prompt" (CR2): the text the user pastes into Gemini, Claude or any
 * AI. It holds the source (the link, or the pasted transcript), the notes
 * format (`ln-notes/1`) and the user's own extra instructions. Nothing is
 * sent anywhere by the app.
 */

/** Longest pasted text put into a prompt (characters); the rest is cut. */
export const MAX_PROMPT_SOURCE = 120_000

export const NOTES_FORMAT_PROMPT = `Write study notes in exactly this Markdown format (ln-notes/1). Use only these headings, in this order. Skip a section if it does not fit.

# <A short title for the notes>

## Key points
- Short keyword notes, one idea per line (6 to 12 lines).

## Steps
1. The workflow or procedure, one step per line, in order.

## Mind map
- Central topic
  - Branch
    - Sub-branch
(an indented bullet list, at most 3 levels)

## Cards
Q: A question that tests one idea?
A: The short answer.
Cloze: A sentence with the {{key word}} hidden.
(8 to 20 cards; plain Q/A or Cloze lines; no numbering)

## Screenshots
[12:34] What to capture at that moment (only for videos; time as m:ss or h:mm:ss)

Rules: answer with the Markdown only (no introduction, no code fence). Keep every line short. Do not invent facts that are not in the source.`

/** The whole prompt. */
export function buildPrompt(input: CaptureInput, extra: string): string {
  const parts: string[] = []
  const url = input.url?.trim()
  const text = input.text?.trim()
  if (url) parts.push(`Use this source: ${url}`)
  if (input.title?.trim()) parts.push(`Title: ${input.title.trim()}`)
  if (text) {
    parts.push(
      text.length > MAX_PROMPT_SOURCE
        ? `${text.slice(0, MAX_PROMPT_SOURCE)}\n[cut here]`
        : text,
    )
  }
  parts.push(NOTES_FORMAT_PROMPT)
  if (extra.trim()) parts.push(`My extra instructions:\n${extra.trim()}`)
  return parts.join('\n\n')
}

// ---- Presets (device setting, at most 20) ----

export interface PromptPreset {
  id: string
  name: string
  text: string
}

export const MAX_PRESETS = 20
export const MAX_PRESET_TEXT = 2000

export function isPresetList(v: unknown): v is PromptPreset[] {
  return (
    Array.isArray(v) &&
    v.length <= MAX_PRESETS &&
    v.every(
      (p) =>
        !!p &&
        typeof p === 'object' &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        p.name.length > 0 &&
        p.name.length <= 80 &&
        typeof p.text === 'string' &&
        p.text.length <= MAX_PRESET_TEXT,
    )
  )
}

/** Adds (or replaces, same name) a preset; null when the list is full. */
export function withPreset(
  list: readonly PromptPreset[],
  preset: PromptPreset,
): PromptPreset[] | null {
  const name = preset.name.trim().slice(0, 80)
  if (!name) return list.slice()
  const rest = list.filter((p) => p.name !== name)
  if (rest.length >= MAX_PRESETS) return null
  return [
    ...rest,
    { ...preset, name, text: preset.text.slice(0, MAX_PRESET_TEXT) },
  ]
}
