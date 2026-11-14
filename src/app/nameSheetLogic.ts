/**
 * What the "Name it" sheet's Done does: the trimmed new name, or null when
 * the box is empty or unchanged (the item keeps its current name).
 */
export function nameSheetResult(value: string, initial: string): string | null {
  const name = value.trim()
  if (!name || name === initial.trim()) return null
  return name
}
