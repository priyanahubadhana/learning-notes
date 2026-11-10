import { pushStep, undoSince } from './historySteps'

/**
 * An AI result or an import is one step of the page's history (bug batch 1,
 * item 47): the Undo button, the toast's Undo and a reload all agree. The step
 * keeps only the batch id (data steps survive a reload; see history/pageHistory).
 */
export function recordAiBatch(
  pageId: string,
  batchId: string,
  label: string,
): number {
  const at = Date.now()
  pushStep({
    kind: 'aiBatch',
    label,
    scope: `page:${pageId}`,
    data: { pageId, batchId },
  })
  return at
}

/** A toast's Undo: the history step if it is the newest, else the old way. */
export function undoAiBatch(since: number, fallback: () => void): void {
  void undoSince(since).then((ok) => {
    if (!ok) fallback()
  })
}
