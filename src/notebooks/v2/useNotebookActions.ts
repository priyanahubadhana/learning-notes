import { useContext } from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { notebookDeleteBlocked } from '../../core/editLock'
import type { LearningNotesDB } from '../../core/db'
import type { Notebook } from '../../core/types'
import { displayName, sampleName } from '../../i18n/defaultNames'
import { t } from '../../i18n/t'
import { createPage } from '../../pages/pageService'
import { rememberNotebookPage } from '../lastPage'
import { nextColour, notebookColour } from '../notebookLook'
import {
  createNotebook,
  deleteNotebook,
  moveNotebook,
  renameNotebook,
  setNotebookCover,
  setNotebookStarred,
} from '../notebookService'
import { tn } from './tn'
import { duplicateNotebook, undoDuplicateNotebook } from './duplicateNotebook'

export const notebookName = (n: Notebook): string =>
  displayName(sampleName(n)) || t('review.untitled')

/** The services behind the Home strip, with the toasts and Undo of the spec. */
export function useNotebookActions(
  db: LearningNotesDB,
  onOpen: (id: string) => void,
) {
  const { toast, chooseTemplate } = useContext(AppUiContext)

  /** NB-B07: pin or unpin, with an Undo toast. */
  const togglePin = (n: Notebook) => {
    const to = !n.starred
    runTask(
      setNotebookStarred(db, n.id, to).then(() =>
        toast(
          tn(to ? 'nbv2.pinned' : 'nbv2.unpinned', { name: notebookName(n) }),
          {
            label: tn('nbv2.undo'),
            onSelect: () => runTask(setNotebookStarred(db, n.id, !to)),
          },
        ),
      ),
    )
  }

  const rename = (n: Notebook, title: string) => {
    const before = n.title
    runTask(
      renameNotebook(db, n.id, title).then(() =>
        toast(tn('nbv2.renamed', { name: title }), {
          label: tn('nbv2.undo'),
          onSelect: () => runTask(renameNotebook(db, n.id, before)),
        }),
      ),
    )
  }

  /** NB-B06: creates at the end of the list with its first page, then opens it. */
  const create = async (title: string) => {
    const [workspace] = (await db.workspaces.toArray()).filter(
      (w) => w.deletedAt === null,
    )
    if (!workspace) return
    const notebook = await createNotebook(db, workspace.id, title)
    const page = await createPage(db, notebook.id, null)
    rememberNotebookPage(notebook.id, page.id)
    toast(tn('nbv2.new.done'))
    onOpen(notebook.id)
  }

  /** NB-B09: soft delete (Trash) with an Undo toast; a locked one refuses. */
  const remove = async (n: Notebook) => {
    if (await notebookDeleteBlocked(db, n.id))
      return toast(tn('nbv2.delete.locked'))
    await deleteNotebook(db, n.id)
    toast(tn('nbv2.delete.done', { name: notebookName(n) }), {
      label: tn('nbv2.undo'),
      onSelect: () =>
        runTask(
          import('../../trash/trashService').then((m) =>
            m.restoreNotebook(db, n.id),
          ),
        ),
    })
  }

  const pageCount = async (n: Notebook): Promise<number> =>
    (await db.pages.where('notebookId').equals(n.id).toArray()).filter(
      (p) => p.deletedAt === null,
    ).length

  const cover = (n: Notebook, sub: string | undefined) => {
    if (sub === 'page') runTask(setNotebookCover(db, n.id, { cover: 'page' }))
    else if (sub === 'colour')
      runTask(setNotebookCover(db, n.id, { cover: undefined }))
    else if (sub === 'next')
      runTask(
        setNotebookCover(db, n.id, {
          colour: nextColour(notebookColour(n)),
          cover: undefined,
        }),
      )
  }

  /** NB-P05: a blank page, opened. */
  const addPage = (n: Notebook) =>
    runTask(
      createPage(db, n.id, null).then((p) => {
        rememberNotebookPage(n.id, p.id)
        onOpen(n.id)
      }),
    )

  /** NB-P06: the template picker, then the page. */
  const addFromTemplate = (n: Notebook) =>
    runTask(
      chooseTemplate('new').then(async (id) => {
        if (!id) return
        const { createPageFromTemplate } =
          await import('../../templates/templateService')
        const p = await createPageFromTemplate(db, n.id, null, id)
        rememberNotebookPage(n.id, p.id)
        onOpen(n.id)
      }),
    )

  /** NB-P03: one place up or down, or to the top. */
  const move = (n: Notebook, toIndex: number, fromIndex: number) =>
    runTask(
      moveNotebook(db, n.id, toIndex).then(() =>
        toast(tn('nbv2.moved', { name: notebookName(n) }), {
          label: tn('nbv2.undo'),
          onSelect: () => runTask(moveNotebook(db, n.id, fromIndex)),
        }),
      ),
    )

  /** NB-B08: a copy of the notebook with all its pages; Undo sends it to Trash. */
  const duplicate = (n: Notebook) =>
    runTask(
      duplicateNotebook(
        db,
        n,
        tn('nbv2.duplicate.name', { name: notebookName(n) }),
      ).then((id) => {
        if (!id) return toast(tn('nbv2.duplicate.none'))
        toast(tn('nbv2.duplicated', { name: notebookName(n) }), {
          label: tn('nbv2.undo'),
          onSelect: () => runTask(undoDuplicateNotebook(db, id)),
        })
      }),
    )

  return {
    duplicate,
    togglePin,
    rename,
    create,
    remove,
    pageCount,
    cover,
    addPage,
    addFromTemplate,
    move,
  }
}
