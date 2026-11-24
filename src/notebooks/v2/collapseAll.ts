/**
 * NB-B22: "Collapse all" folds every notebook; the same button then reads
 * "Expand all" and opens them all. It reads "Collapse all" while at least one
 * notebook is open.
 */
export function collapseAllState(
  ids: readonly string[],
  isOpen: (id: string) => boolean,
): { action: 'collapse' | 'expand'; disabled: boolean } {
  const anyOpen = ids.some(isOpen)
  return { action: anyOpen ? 'collapse' : 'expand', disabled: ids.length === 0 }
}
