import type { ToastAction } from '../app/appUi'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import { pageDeleteBlocked } from '../core/editLock'
import { isReadOnlyGate } from '../core/readOnlyGate'
import { descendantIds } from '../core/records'
import type { Page } from '../core/types'
import { sampleName } from '../i18n/defaultNames'
import { t } from '../i18n/t'
import { deletePage } from './pageService'

/**
 * Moves a page (and its sub-pages) to Trash with an Undo toast. Refused with
 * a message when the page or its notebook is edit-locked. `onGone` runs after
 * the move (e.g. leave the page); `onBack` after an Undo.
 */
export async function trashPageWithUndo(
  db: LearningNotesDB,
  page: Page,
  toast: (message: string, action?: ToastAction) => void,
  hooks: { onGone?: () => void; onBack?: () => void } = {},
): Promise<void> {
  if (await pageDeleteBlocked(db, page.id)) {
    toast(t(isReadOnlyGate() ? 'gate.pageBar' : 'editLock.refused'))
    return
  }
  const live = (
    await db.pages.where('notebookId').equals(page.notebookId).toArray()
  ).filter((p) => p.deletedAt === null)
  const subs = descendantIds(live, page.id).length
  await deletePage(db, page.id)
  hooks.onGone?.()
  const name = sampleName(page) || t('review.untitled')
  toast(
    subs > 0
      ? t('trashDel.pageSubs', { name, count: subs })
      : t('trashDel.page', { name }),
    {
      label: t('reading.undo'),
      onSelect: () =>
        runTask(
          import('../trash/trashService')
            .then((m) => m.restorePage(db, page.id))
            .then(() => hooks.onBack?.()),
        ),
    },
  )
}
