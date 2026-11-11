import { lazy, Suspense, useContext, useEffect, useRef, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { routeToHash } from '../../app/router'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import { getBookFile } from '../../library/libraryService'
import { ocrPdf } from './ocr'
import { applyPlan, flattenMarks, pageSizesOf, PdfEditError } from './pdfEdit'
import { applyPageEdit, undoPageEdit, type EditUndo } from './pdfEditService'
import { identityPlan, type PagePlan } from './pageOps'
import { downloadPdf, pdfName, saveAsBook } from './saveBook'

const OrganiseSheet = lazy(() => import('./OrganiseSheet'))
const CombineSheet = lazy(() => import('./CombineSheet'))
const ScanSheet = lazy(() => import('./ScanSheet'))
const OcrSheet = lazy(() => import('./OcrSheet'))

export type PdfTool =
  'organise' | 'combine' | 'scan' | 'ocr' | 'export' | 'clean'

/**
 * The PDF menu's tools (Q8). This whole file, the sheets and pdf-lib load only
 * when a tool is chosen, so none of it is in the first download. A tool that
 * changes the open book saves the new file with its marks moved to match and
 * offers Undo; a tool that makes a new PDF puts it in the Library.
 */
export default function PdfTools({
  tool,
  db,
  pageId,
  title,
  data,
  onClose,
  onEdited,
}: {
  tool: PdfTool
  db: LearningNotesDB
  pageId: string
  title: string
  data: ArrayBuffer
  onClose: () => void
  /** The book now holds this file (reload the pages). */
  onEdited: (data: ArrayBuffer) => void
}) {
  const { toast } = useContext(AppUiContext)
  const [status, setStatus] = useState('')
  const message = t('pdftools.err.open')

  /** Drawing not yet written is saved first, so it is moved with its page. */
  const settleInk = async () => {
    const { flushAllInk } = await import('../../ink/inkDoc')
    await flushAllInk()
  }

  const reloadAfterUndo = async (undo: EditUndo) => {
    await undoPageEdit(db, undo)
    const file = await getBookFile(db, pageId)
    if (file) onEdited(file.data)
    toast(t('pdftools.undone'))
  }

  /** Saves new bytes as the book's file, marks following `plan`. */
  const save = async (plan: PagePlan, bytes: Uint8Array, done: string) => {
    await settleInk()
    const sizes = await pageSizesOf(data, message)
    const undo = await applyPageEdit(db, pageId, plan, sizes, bytes)
    const file = await getBookFile(db, pageId)
    if (file) onEdited(file.data)
    onClose()
    toast(done, {
      label: t('annot.undo'),
      onSelect: () => void reloadAfterUndo(undo),
    })
  }

  const openNew = (pageId: string, name: string) => {
    onClose()
    toast(t('pdftools.newBook', { title: name }), {
      label: t('pdftools.open'),
      onSelect: () => {
        window.location.hash = routeToHash({ kind: 'read', pageId })
      },
    })
  }

  // Export tools have no sheet: do the work, then close.
  const started = useRef(false)
  useEffect(() => {
    if (started.current || (tool !== 'export' && tool !== 'clean')) return
    started.current = true
    void (async () => {
      try {
        if (tool === 'clean') {
          downloadPdf(pdfName(title, ' (clean)'), new Uint8Array(data))
          toast(t('pdftools.exported.clean'))
          return
        }
        toast(t('pdftools.exporting'))
        await settleInk()
        const [annotations, chunks, layers] = await Promise.all([
          db.annotations.where('pageId').equals(pageId).toArray(),
          db.inkChunks.where('pageId').equals(pageId).toArray(),
          db.inkLayers.where('pageId').equals(pageId).toArray(),
        ])
        const hidden = new Set(
          layers
            .filter((l) => l.hidden || l.deletedAt !== null)
            .map((l) => l.id),
        )
        const bytes = await flattenMarks(
          data,
          {
            annotations,
            chunks: chunks.filter((c) => !hidden.has(c.layerId)),
            labels: {
              notes: t('pdftools.export.notes'),
              page: t('pdftools.export.page'),
            },
          },
          message,
        )
        downloadPdf(pdfName(title, ' (annotated)'), bytes)
        toast(t('pdftools.exported.marked'))
      } catch (e) {
        toast(e instanceof PdfEditError ? e.message : t('pdftools.err.failed'))
      } finally {
        onClose()
      }
    })()
  }, [tool, data, db, pageId, title, message, onClose, toast])

  if (tool === 'export' || tool === 'clean') return null

  return (
    <Suspense fallback={null}>
      {tool === 'organise' && (
        <OrganiseSheet
          data={data}
          title={title}
          onClose={onClose}
          onSave={async (plan) => {
            const bytes = await applyPlan(data, plan, message)
            await save(
              plan,
              bytes,
              t('pdftools.org.saved', { count: plan.length }),
            )
          }}
          onExtract={async (bytes, count) => {
            const page = await saveAsBook(
              db,
              pageId,
              bytes,
              pdfName(title, ` (${count} pages)`),
            )
            openNew(page.id, page.title)
          }}
        />
      )}
      {tool === 'combine' && (
        <CombineSheet
          data={data}
          title={title}
          onClose={onClose}
          onCombine={async (bytes, count) => {
            const page = await saveAsBook(
              db,
              pageId,
              bytes,
              pdfName(title, ` + ${count - 1}`),
            )
            openNew(page.id, page.title)
          }}
        />
      )}
      {tool === 'scan' && (
        <ScanSheet
          title={title}
          status={status}
          onClose={onClose}
          onCreate={async (bytes, searchable) => {
            let out = bytes
            if (searchable) {
              try {
                const r = await ocrPdf(bytes.slice().buffer as ArrayBuffer, {
                  onProgress: (p) =>
                    setStatus(
                      t('pdftools.ocr.reading', {
                        page: Math.min(p.done + 1, p.total),
                        total: p.total,
                        percent: Math.round(p.fraction * 100),
                      }),
                    ),
                  message,
                })
                out = r.bytes
              } catch (e) {
                console.error('OCR failed; saving the scan without text', e)
                toast(t('pdftools.scan.ocrFailed'))
              }
            }
            const page = await saveAsBook(
              db,
              pageId,
              out,
              pdfName(t('pdftools.scan.name', { title })),
            )
            openNew(page.id, page.title)
          }}
        />
      )}
      {tool === 'ocr' && (
        <OcrSheet
          db={db}
          pageId={pageId}
          data={data}
          onClose={onClose}
          onDone={async (bytes, pages) => {
            const sizes = await pageSizesOf(data, message)
            await save(
              identityPlan(sizes.length),
              bytes,
              t('pdftools.ocr.done', { count: pages }),
            )
          }}
        />
      )}
    </Suspense>
  )
}
