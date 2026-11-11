/**
 * The notebook choice of "Let Claude work with my notes", as plain functions
 * (the screen in ClaudeSection.tsx only draws it). The server stores `null`
 * for "every notebook" and otherwise a list of notebook ids.
 */

export type ChoiceMode = 'all' | 'some'

/** The choice shown for what the server holds (`null` = all). */
export function modeOf(ids: readonly string[] | null): ChoiceMode {
  return ids === null ? 'all' : 'some'
}

/**
 * What to send to the server. `undefined` = not a valid choice yet ("only
 * these" with nothing ticked). Ids of notebooks that no longer exist are
 * dropped, so a deleted notebook never lingers in the list.
 */
export function scopeToSend(
  mode: ChoiceMode,
  picked: ReadonlySet<string>,
  existing: readonly string[],
): string[] | null | undefined {
  if (mode === 'all') return null
  const ids = existing.filter((id) => picked.has(id))
  return ids.length > 0 ? ids : undefined
}

/** True when the draft equals what the server already has (nothing to save). */
export function sameChoice(
  a: readonly string[] | null | undefined,
  b: readonly string[] | null,
): boolean {
  if (a === undefined) return false
  if (a === null || b === null) return a === b
  return a.length === b.length && a.every((x) => b.includes(x))
}
