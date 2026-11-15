import type { ToastAction } from '../../app/appUi'
import { copyName } from '../../app/panel/v2/pageOrganise'
import {
  duplicatePages,
  trashPages,
} from '../../app/panel/v2/pageOrganiseService'
import type { LearningNotesDB } from '../../core/db'
import type { Page } from '../../core/types'
import { sampleName } from '../../i18n/defaultNames'
import { t } from '../../i18n/t'
import { listPages, movePage } from '../pageService'

type Toast = (message: string, action?: ToastAction) => void

/** Copies this page (with its sub-pages) right after it; Undo sends the copy to Trash. */
export async function duplicateThisPage(
  db: LearningNotesDB,
  page: Page,
  toast: Toast,
): Promise<void> {
  const siblings = (await listPages(db, page.notebookId)).filter(
    (p) => p.parentId === page.parentId,
  )
  const at = siblings.findIndex((p) => p.id === page.id)
  const made = await duplicatePages(
    db,
    [{ sourceId: page.id, parentId: page.parentId, toIndex: at + 1 }],
    (p) => copyName(sampleName(p) || t('review.untitled'), t('lp2.copySuffix')),
  )
  toast(t('pageMenus.sheet.duplicated'), {
    label: t('reading.undo'),
    onSelect: () => void trashPages(db, made),
  })
}

/** Moves this page to the end of another page's sub-pages (null = top level); Undo puts it back. */
export async function moveThisPage(
  db: LearningNotesDB,
  page: Page,
  parentId: string | null,
  toast: Toast,
): Promise<void> {
  const siblings = (await listPages(db, page.notebookId)).filter(
    (p) => p.parentId === page.parentId,
  )
  const was = siblings.findIndex((p) => p.id === page.id)
  await movePage(db, page.id, parentId, Number.MAX_SAFE_INTEGER)
  toast(t('pageMenus.sheet.moved'), {
    label: t('reading.undo'),
    onSelect: () => void movePage(db, page.id, page.parentId, was),
  })
}
