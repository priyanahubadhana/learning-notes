/** A copy of `list` with the item at `from` moved to `to` (no change if out of range). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = [...list]
  if (from === to || from < 0 || to < 0 || from >= out.length || to >= out.length)
    return out
  const [item] = out.splice(from, 1)
  out.splice(to, 0, item)
  return out
}
