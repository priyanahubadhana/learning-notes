import type { Notebook } from '../../core/types'

/** Most cards "Continue where you stopped" shows (NB-B11). */
export const CONTINUE_MAX = 4

/**
 * NB-P01: notebooks whose name contains every typed word (case and accents
 * ignored). The typed text is only split into words, never used as a pattern.
 */
export function filterByName<T>(
  list: readonly T[],
  query: string,
  nameOf: (n: T) => string,
): T[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return [...list]
  return list.filter((n) => {
    const name = fold(nameOf(n))
    return words.every((w) => name.includes(w))
  })
}

const fold = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export interface ContinueCard {
  notebook: Notebook
  pageId: string
  openedAt: number
}

/**
 * NB-B11: the notebooks opened last that still have a remembered live page,
 * newest first, at most CONTINUE_MAX.
 */
export function continueList(
  notebooks: readonly Notebook[],
  opened: Record<string, number>,
  lastPageOf: (id: string) => string | undefined,
  max = CONTINUE_MAX,
): ContinueCard[] {
  return notebooks
    .filter((n) => opened[n.id] !== undefined && !!lastPageOf(n.id))
    .sort((a, b) => (opened[b.id] ?? 0) - (opened[a.id] ?? 0))
    .slice(0, max)
    .map((notebook) => ({
      notebook,
      pageId: lastPageOf(notebook.id) as string,
      openedAt: opened[notebook.id],
    }))
}

/** Where a notebook can move: index in the list and the neighbours. */
export function moveState(
  list: readonly { id: string }[],
  id: string,
): { index: number; canMoveUp: boolean; canMoveDown: boolean } {
  const index = list.findIndex((n) => n.id === id)
  return {
    index,
    canMoveUp: index > 0,
    canMoveDown: index >= 0 && index < list.length - 1,
  }
}
