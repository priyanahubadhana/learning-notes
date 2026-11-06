import type { Page } from '../core/types'
import { byOrder } from '../core/order'

/** Where a dragged page lands on a row: above it, below it, or inside it. */
export type DropIntent = 'before' | 'after' | 'inside'

export interface PageMovePlan {
  parentId: string | null
  index: number
}

/** The intent from the pointer's height on a row: top 25 %, bottom 25 %, middle. */
export function dropIntent(offsetY: number, height: number): DropIntent {
  if (height <= 0) return 'inside'
  const part = offsetY / height
  return part < 0.25 ? 'before' : part > 0.75 ? 'after' : 'inside'
}

/** The new parent and index for `movePage`, or null when it is not allowed. */
export function planPageMove(
  pages: readonly Page[],
  dragId: string,
  targetId: string,
  intent: DropIntent,
): PageMovePlan | null {
  const drag = pages.find((p) => p.id === dragId)
  const target = pages.find((p) => p.id === targetId)
  if (!drag || !target || drag.id === target.id) return null
  if (drag.notebookId !== target.notebookId) return null
  // Never inside itself or its own sub-pages.
  const seen = new Set<string>()
  for (
    let cur: Page | undefined = target;
    cur && !seen.has(cur.id);
    cur = pages.find((p) => p.id === cur?.parentId)
  ) {
    if (cur.id === drag.id) return null
    seen.add(cur.id)
  }
  const siblingsOf = (parentId: string | null) =>
    pages
      .filter((p) => p.parentId === parentId && p.id !== drag.id)
      .sort(byOrder)
  if (intent === 'inside') {
    return { parentId: target.id, index: siblingsOf(target.id).length }
  }
  const siblings = siblingsOf(target.parentId)
  const at = siblings.findIndex((p) => p.id === target.id)
  return {
    parentId: target.parentId,
    index: at + (intent === 'after' ? 1 : 0),
  }
}

/** Keyboard move: one place up (-1) or down (1) among the siblings. */
export function planStep(
  pages: readonly Page[],
  id: string,
  step: -1 | 1,
): PageMovePlan | null {
  const page = pages.find((p) => p.id === id)
  if (!page) return null
  const siblings = pages
    .filter((p) => p.parentId === page.parentId)
    .sort(byOrder)
  const at = siblings.findIndex((p) => p.id === id)
  const to = at + step
  if (at < 0 || to < 0 || to >= siblings.length) return null
  return { parentId: page.parentId, index: to }
}

/** Where a page sits now, as a plan (to put it back after an Undo). */
export function currentPlace(
  pages: readonly Page[],
  id: string,
): PageMovePlan | null {
  const page = pages.find((p) => p.id === id)
  if (!page) return null
  const siblings = pages
    .filter((p) => p.parentId === page.parentId)
    .sort(byOrder)
  return {
    parentId: page.parentId,
    index: siblings.findIndex((p) => p.id === id),
  }
}
