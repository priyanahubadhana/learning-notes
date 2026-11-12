import { useContext, useEffect, useMemo, useRef } from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import type { LearningNotesDB } from '../../core/db'
import type { Annotation } from '../../core/types'
import { t } from '../../i18n/t'
import {
  StickyHistory,
  addSticky,
  editSticky,
  moveSticky,
  removeSticky,
  stickyArmed,
  stickyLift,
  stickyView,
  type StickyStep,
} from './sticky'
import { StickyEdit, StickyGhost, StickyRead } from './StickyDialogs'
import { useStickyDrag } from './stickyDrag'

/**
 * The sticky-note side of the new reader (slice 7c): the read view, the edit
 * dialog, the lifted note while it is dragged, and Undo / Redo with a toast
 * after every change. The pins themselves are drawn inside each PDF page
 * (StickyPins).
 */
export default function StickyHost({
  db,
  pageId,
  annotations,
  canEditSticky = true,
  canEditNote = true,
}: {
  db: LearningNotesDB
  pageId: string
  annotations: readonly Annotation[]
  /** False in Reading mode, View only and Frozen: sticky notes can be read, not changed or moved. */
  canEditSticky?: boolean
  /** False in View only and Frozen: the note of a highlight can be read, not changed. */
  canEditNote?: boolean
}) {
  const { toast } = useContext(AppUiContext)
  const view = stickyView.useValue()
  const lift = stickyLift.useValue()
  const armed = stickyArmed.useValue()
  const history = useMemo(() => new StickyHistory(), [])
  const list = useRef(annotations)
  useEffect(() => {
    list.current = annotations
  })
  const find = (id: string) =>
    annotations.find((a) => a.id === id && !a.deletedAt)

  // The Sticky tool says what to do, once.
  const hinted = useRef(false)
  useEffect(() => {
    if (armed && !hinted.current) toast(t('readerv2.sticky.hint'))
    hinted.current = armed
  }, [armed, toast])
  // A note left open never outlives the reader.
  useEffect(
    () => () => {
      stickyView.set(null)
      stickyArmed.set(false)
    },
    [],
  )
  // A view of a note that is gone (deleted elsewhere or undone) closes.
  useEffect(() => {
    if (view && view.mode !== 'new' && !find(view.id)) stickyView.set(null)
  })

  const undoNow = async () => {
    if (await history.undo())
      toast(t('readerv2.sticky.undone'), {
        label: t('readerv2.sticky.redo'),
        onSelect: () => runTask(redoNow()),
      })
  }
  const redoNow = async () => {
    if (await history.redo())
      toast(t('readerv2.sticky.redone'), {
        label: t('annot.undo'),
        onSelect: () => runTask(undoNow()),
      })
  }
  const announce = (message: string, step: StickyStep) => {
    history.push(step)
    toast(message, {
      label: t('annot.undo'),
      onSelect: () => runTask(undoNow()),
    })
  }

  useStickyDrag({
    enabled: canEditSticky,
    note: (id) => list.current.find((a) => a.id === id && !a.deletedAt),
    onLift: () => toast(t('readerv2.sticky.lifted')),
    onDrop: (a, to) =>
      runTask(
        moveSticky(db, a, to).then((step) =>
          announce(t('readerv2.sticky.moved'), step),
        ),
      ),
  })

  // Close only if this same view is still the one showing (Save moves on to the read view).
  const closeThis = () => {
    if (stickyView.get() === view) stickyView.set(null)
  }
  const current = view && view.mode !== 'new' ? find(view.id) : undefined
  const canEdit = current?.kind === 'sticky' ? canEditSticky : canEditNote
  return (
    <>
      {view?.mode === 'read' && current && (
        <StickyRead
          text={current.note ?? ''}
          canEdit={canEdit}
          onEdit={() =>
            canEdit && stickyView.set({ mode: 'edit', id: current.id })
          }
          onClose={closeThis}
        />
      )}
      {view?.mode === 'edit' && current && canEdit && (
        <StickyEdit
          initial={current.note ?? ''}
          isNew={false}
          onClose={closeThis}
          onSave={(text) => {
            stickyView.set({ mode: 'read', id: current.id })
            if (text === (current.note ?? '')) return
            runTask(
              editSticky(db, current, text).then((step) =>
                announce(t('readerv2.sticky.saved'), step),
              ),
            )
          }}
          onDelete={
            current.kind === 'sticky'
              ? () => {
                  stickyView.set(null)
                  runTask(
                    removeSticky(db, current).then((step) =>
                      announce(t('readerv2.sticky.deleted'), step),
                    ),
                  )
                }
              : undefined
          }
        />
      )}
      {view?.mode === 'new' && canEditSticky && (
        <StickyEdit
          initial=""
          isNew
          onClose={closeThis}
          onSave={(text) => {
            stickyView.set(null)
            runTask(
              addSticky(db, pageId, view, text).then(({ step }) =>
                announce(t('readerv2.sticky.added'), step),
              ),
            )
          }}
        />
      )}
      {lift && <StickyGhost x={lift.x} y={lift.y} />}
    </>
  )
}
