import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AppUiContext } from '../../app/appUi'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import { getBookFile } from '../../library/libraryService'
import { undoPageEdit, type EditUndo } from '../pdfTools/pdfEditService'
import type { PageOp } from './pageEdit'

/** What the Pages grid may ask the reader to do (flag reader.v2). */
export interface PageEditApi {
  /** The first copy of the book is on this device, so Restore original works. */
  hasOriginal: boolean
  /** Size of the book now, bytes (the first copy is kept only up to 200 MB). */
  size: number
  /** An edit is being saved. */
  busy: boolean
  /** One edit of a book with `count` pages. */
  run: (count: number, op: PageOp) => Promise<void>
  restore: () => Promise<void>
}

/**
 * Page edits for the open PDF (7f). The heavy part (pdf-lib) is loaded on the
 * first edit. Every edit shows a toast with Undo; Undo restores the file,
 * marks, ink and reading place from the snapshot taken in the same
 * transaction as the edit.
 */
export function usePageEdit({
  db,
  pageId,
  data,
  enabled,
  onData,
}: {
  db: LearningNotesDB
  pageId: string
  data: ArrayBuffer | null
  enabled: boolean
  /** The book now holds this file: show it. */
  onData: (data: ArrayBuffer) => void
}): PageEditApi | undefined {
  const { toast } = useContext(AppUiContext)
  const [hasOriginal, setHasOriginal] = useState(false)
  const [busy, setBusy] = useState(false)
  const working = useRef(false)
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  })

  // Is the first copy already kept (from an earlier visit)?
  useEffect(() => {
    if (!enabled) return
    let live = true
    void getBookFile(db, pageId).then((f) => {
      if (live) setHasOriginal(!!f?.original)
    })
    return () => {
      live = false
    }
  }, [db, pageId, enabled])

  const reload = useCallback(async () => {
    const f = await getBookFile(db, pageId)
    if (f) {
      setHasOriginal(!!f.original)
      onData(f.data)
    }
  }, [db, pageId, onData])

  const undoer = useCallback(
    (undo: EditUndo) => () => {
      void (async () => {
        await undoPageEdit(db, undo)
        await reload()
        toast(t('pdftools.undone'))
      })()
    },
    [db, reload, toast],
  )

  const guarded = useCallback(
    async (job: () => Promise<{ undo: EditUndo; done: string } | null>) => {
      if (working.current || !dataRef.current) return
      working.current = true
      setBusy(true)
      try {
        const out = await job()
        if (!out) return
        await reload()
        toast(out.done, {
          label: t('annot.undo'),
          onSelect: undoer(out.undo),
        })
      } catch {
        toast(t('pdftools.err.failed'))
      } finally {
        working.current = false
        setBusy(false)
      }
    },
    [reload, toast, undoer],
  )

  const size = data?.byteLength ?? 0
  return useMemo(
    () =>
      enabled
        ? {
            hasOriginal,
            size,
            busy,
            run: (count: number, op: PageOp) =>
              guarded(async () => {
                const m = await import('./pageEdit')
                const plan = m.planFor(count, op)
                const current = dataRef.current
                if (!plan || !current) return null
                const undo = await m.runPageEdit(db, pageId, current, plan)
                return { undo, done: m.doneText(op) }
              }),
            restore: () =>
              guarded(async () => {
                const m = await import('./pageEdit')
                const current = dataRef.current
                if (!current) return null
                const undo = await m.restoreOriginal(db, pageId, current)
                return { undo, done: t('readerv2.pages.restored') }
              }),
          }
        : undefined,
    [enabled, hasOriginal, size, busy, guarded, db, pageId],
  )
}
