import { useLiveQuery } from 'dexie-react-hooks'
import {
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import type { Annotation, HighlightColour } from '../core/types'
import { t } from '../i18n/t'
import { createPage } from '../pages/pageService'
import { getBookFile, saveProgress } from '../library/libraryService'
import { addBlocks } from '../core/blockBulk'
import {
  createAnnotation,
  deleteAnnotation,
  listAnnotations,
  locatorOf,
} from './annotations/annotationService'
import { AnnotationsPanel } from './annotations/AnnotationsPanel'
import { NoteSheet } from './annotations/NoteSheet'
import { SaveToSheet, type SaveTarget } from './annotations/SaveToSheet'
import { saveAnnotationTo } from './annotations/saveToNotes'
import { SelectionPopup } from './annotations/SelectionPopup'
import type { OutlineItem, PdfSelection } from './pdf/PdfView'

const PdfView = lazy(() =>
  import('./pdf/PdfView').then((m) => ({ default: m.PdfView })),
)
const EpubView = lazy(() =>
  import('./epub/EpubView').then((m) => ({ default: m.EpubView })),
)

/** What the reader needs of a selection, whatever the format. */
export interface ReaderSelection {
  text: string
  rect: PdfSelection['rect']
  anchor: Annotation['anchor']
  quote?: Annotation['quote']
  chapter?: string
}

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

/**
 * The book reader screen (C2/C3/C4): a PDF or EPUB with the selection pop-up,
 * Contents, the annotations panel, bookmarks and saved reading position.
 * Highlights are saved as annotations and copied to the book page's
 * Highlights & notes section automatically.
 */
export function BookReader({
  db,
  pageId,
  at,
  onOpenPage,
  extraPopupActions,
  extraPanel,
}: {
  db: LearningNotesDB
  pageId: string
  at?: string
  onOpenPage: (pageId: string) => void
  /** Make card from the selection (CR3). */
  extraPopupActions?: (
    sel: ReaderSelection,
    saved: () => Promise<Annotation>,
  ) => { onMakeCard?: () => void }
  /** More controls in the annotations panel (CR3). */
  extraPanel?: (annotations: Annotation[]) => {
    onMakeCard?: (a: Annotation) => void
    onMakeCards?: (list: Annotation[]) => void
  }
}) {
  const { toast } = useContext(AppUiContext)
  const page = useLiveQuery(() => db.pages.get(pageId), [db, pageId])
  const [data, setData] = useState<ArrayBuffer | null | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const [pageCount, setPageCount] = useState(0)
  const [position, setPosition] = useState<{
    page: number
    label: string
  } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [panel, setPanel] = useState<'contents' | 'annotations' | null>(null)
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [selection, setSelection] = useState<ReaderSelection | null>(null)
  const [noting, setNoting] = useState<ReaderSelection | null>(null)
  const [saving, setSaving] = useState<Annotation | null>(null)
  const [noText, setNoText] = useState(false)
  const [target, setTarget] = useState<{
    at: string
    nonce: number
    glow?: string
  } | null>(at ? { at, nonce: 0 } : null)
  const annotations = useLiveQuery(
    () => listAnnotations(db, pageId),
    [db, pageId],
  )
  const format = page?.source?.format

  // The book file.
  useEffect(() => {
    let current = true
    void getBookFile(db, pageId).then((file) => {
      if (current) setData(file ? file.data : null)
    })
    return () => {
      current = false
    }
  }, [db, pageId])

  // A deep link while the reader is open jumps there.
  const [seenAt, setSeenAt] = useState(at)
  if (at !== seenAt) {
    setSeenAt(at)
    if (at) setTarget((prev) => ({ at, nonce: (prev?.nonce ?? 0) + 1 }))
  }

  // Reading progress: on 2 s still, on hide, every 30 s; never per scroll.
  const latest = useRef<{ progress: number; at: string } | null>(null)
  const dirty = useRef(false)
  const stillTimer = useRef(0)
  const flush = useCallback(() => {
    if (!dirty.current || !latest.current) return
    dirty.current = false
    runTask(
      saveProgress(db, pageId, {
        progress: latest.current.progress,
        at: latest.current.at,
        openedAt: Date.now(),
        ...(pageCount ? { pageCount } : {}),
      }),
    )
  }, [db, pageId, pageCount])
  const report = useCallback(
    (progress: number, locator: string, label: string, pageNo: number) => {
      latest.current = { progress, at: locator }
      dirty.current = true
      setPosition({ page: pageNo, label })
      window.clearTimeout(stillTimer.current)
      stillTimer.current = window.setTimeout(flush, 2000)
    },
    [flush],
  )
  useEffect(() => {
    const every = window.setInterval(flush, 30_000)
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      window.clearInterval(every)
      window.clearTimeout(stillTimer.current)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])
  useEffect(() => {
    // Opening a book counts as reading it (for "Continue" ordering).
    if (page?.source) {
      runTask(saveProgress(db, pageId, { openedAt: Date.now() }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, pageId, !!page?.source])

  const chapterAt = useCallback(
    (pageNo: number) => {
      let found: string | undefined
      for (const item of outline) {
        if (item.page <= pageNo) found = item.title
        else break
      }
      return found
    },
    [outline],
  )

  // ---- Selection actions ----
  const whereOf = (sel: ReaderSelection) =>
    sel.anchor.type === 'pdf'
      ? t('annot.page', { page: sel.anchor.page })
      : (sel.chapter ?? '')

  const makeAnnotation = async (
    sel: ReaderSelection,
    kind: Annotation['kind'],
    colour?: HighlightColour,
    note?: string,
  ): Promise<Annotation> => {
    const a = await createAnnotation(db, {
      pageId,
      kind,
      anchor: sel.anchor,
      colour,
      quote: sel.quote,
      note,
      chapter: sel.chapter,
    })
    // Highlights and notes land on the book page by themselves.
    if (kind !== 'bookmark' && sel.quote) {
      await saveAnnotationTo(db, a, pageId, whereOf(sel), 'highlights')
    }
    return a
  }
  const clearSelection = () => {
    document.getSelection()?.removeAllRanges()
    setSelection(null)
  }
  const onColour = (c: HighlightColour) => {
    const sel = selection
    if (!sel) return
    clearSelection()
    runTask(
      makeAnnotation(sel, 'highlight', c).then(() => toast(t('annot.saved'))),
    )
  }

  const saveTo = async (a: Annotation, target: SaveTarget) => {
    const where =
      a.anchor.type === 'pdf'
        ? t('annot.page', { page: a.anchor.page })
        : (a.chapter ?? '')
    if (target.kind === 'book') {
      await saveAnnotationTo(db, a, pageId, where, 'highlights')
      toast(t('annot.savedTo', { page: page?.title || t('review.untitled') }))
    } else if (target.kind === 'page') {
      await saveAnnotationTo(db, a, target.pageId, where)
      const p = await db.pages.get(target.pageId)
      toast(t('annot.savedTo', { page: p?.title || t('review.untitled') }))
    } else {
      const created = await createPage(
        db,
        page?.notebookId ?? '',
        null,
        `${t('annot.highlightsPageTitle')} · ${page?.title ?? ''}`.slice(
          0,
          200,
        ),
      )
      await addBlocks(db, created.id, [])
      await saveAnnotationTo(db, a, created.id, where)
      toast(t('annot.savedTo', { page: created.title }))
    }
  }

  const jump = (a: Annotation) => {
    const loc = locatorOf(a.anchor)
    if (!loc) return
    setPanel(null)
    setTarget((prev) => ({
      at: loc,
      nonce: (prev?.nonce ?? 0) + 1,
      glow: a.id,
    }))
  }

  if (!page || data === undefined) {
    return <p className="p-6 text-muted">{t('bookreader.loading')}</p>
  }
  if (data === null || !page.source) {
    return (
      <div className="p-6">
        <p className="mb-3">{t('library.fileMissing')}</p>
        <button
          type="button"
          onClick={() => onOpenPage(pageId)}
          className="min-h-11 rounded-lg border border-line px-4 text-sm"
        >
          {t('bookreader.close')}
        </button>
      </div>
    )
  }

  const panelBtn = (active: boolean) =>
    `min-h-11 min-w-11 rounded-lg px-3 text-sm hover:bg-hover ${active ? 'bg-hover' : ''}`
  const pageNo = position?.page ?? 1
  const bookmarked = (annotations ?? []).some(
    (a) =>
      a.kind === 'bookmark' &&
      a.anchor.type === 'pdf' &&
      a.anchor.page === pageNo,
  )
  const panelProps = extraPanel?.(annotations ?? []) ?? {}

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      data-testid="book-reader"
      aria-label={t('bookreader.label')}
    >
      <div
        data-chrome
        className="flex flex-wrap items-center gap-1 border-b border-line bg-bg px-2 py-1"
      >
        <button
          type="button"
          onClick={() => onOpenPage(pageId)}
          aria-label={t('bookreader.close')}
          data-testid="reader-close"
          className={panelBtn(false)}
        >
          ✕
        </button>
        <h1 className="min-w-0 flex-1 truncate text-sm font-medium">
          {page.title}
        </h1>
        {format === 'pdf' && (
          <>
            <span className="text-xs text-muted" data-testid="reader-page">
              {pageCount
                ? t('bookreader.page', { page: pageNo, total: pageCount })
                : ''}
            </span>
            <button
              type="button"
              aria-label={t('bookreader.zoomOut')}
              className={panelBtn(false)}
              onClick={() =>
                setZoom(
                  (z) =>
                    ZOOMS[Math.max(0, ZOOMS.findIndex((v) => v >= z) - 1)] ?? z,
                )
              }
            >
              −
            </button>
            <button
              type="button"
              aria-label={t('bookreader.fitWidth')}
              className={panelBtn(false)}
              onClick={() => setZoom(1)}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              aria-label={t('bookreader.zoomIn')}
              className={panelBtn(false)}
              onClick={() =>
                setZoom((z) => ZOOMS.find((v) => v > z + 0.001) ?? z)
              }
            >
              +
            </button>
          </>
        )}
        <button
          type="button"
          aria-label={
            bookmarked ? t('bookreader.bookmarked') : t('bookreader.bookmark')
          }
          aria-pressed={bookmarked}
          data-testid="reader-bookmark"
          className={panelBtn(bookmarked)}
          onClick={() =>
            runTask(
              (async () => {
                const existing = (annotations ?? []).find(
                  (a) =>
                    a.kind === 'bookmark' &&
                    a.anchor.type === 'pdf' &&
                    a.anchor.page === pageNo,
                )
                if (existing) {
                  await deleteAnnotation(db, existing.id)
                  toast(t('bookreader.bookmarkRemoved'))
                } else {
                  await createAnnotation(db, {
                    pageId,
                    kind: 'bookmark',
                    anchor: { type: 'pdf', page: pageNo, rects: [] },
                    chapter: chapterAt(pageNo),
                  })
                  toast(t('bookreader.bookmarked'))
                }
              })(),
            )
          }
        >
          {bookmarked ? '★' : '☆'}
        </button>
        <button
          type="button"
          data-testid="reader-contents"
          aria-pressed={panel === 'contents'}
          className={panelBtn(panel === 'contents')}
          onClick={() =>
            setPanel((p) => (p === 'contents' ? null : 'contents'))
          }
        >
          {t('bookreader.contents')}
        </button>
        <button
          type="button"
          data-testid="reader-annotations"
          aria-pressed={panel === 'annotations'}
          className={panelBtn(panel === 'annotations')}
          onClick={() =>
            setPanel((p) => (p === 'annotations' ? null : 'annotations'))
          }
        >
          {t('bookreader.annotations')}
        </button>
      </div>
      {noText && format === 'pdf' && (
        <p className="bg-soft px-3 py-1 text-xs text-muted">
          {t('bookreader.noText')}
        </p>
      )}
      <div className="relative flex min-h-0 flex-1">
        <Suspense
          fallback={<p className="p-6 text-muted">{t('bookreader.loading')}</p>}
        >
          {failed ? (
            <p className="p-6">{t('bookreader.failed')}</p>
          ) : format === 'pdf' ? (
            <PdfView
              data={data}
              startAt={at ?? page.source.at}
              annotations={annotations ?? []}
              zoom={zoom}
              target={target}
              chapterAt={chapterAt}
              onReady={(info) => setPageCount(info.pageCount)}
              onOutline={setOutline}
              onPosition={(pos) =>
                report(
                  pos.progress,
                  `pdf:${pos.page}:${pos.y.toFixed(4)}`,
                  t('bookreader.pageShort', { page: pos.page }),
                  pos.page,
                )
              }
              onSelection={setSelection}
              onFailed={() => setFailed(true)}
              onNoText={() => setNoText(true)}
            />
          ) : (
            <EpubView
              data={data}
              startAt={at ?? page.source.at}
              annotations={annotations ?? []}
              target={target}
              onOutline={setOutline}
              onPosition={(pos) =>
                report(pos.progress, pos.locator, pos.label, 0)
              }
              onSelection={setSelection}
              onFailed={() => setFailed(true)}
            />
          )}
        </Suspense>
        {panel && (
          <aside
            data-chrome
            className="absolute inset-y-0 end-0 z-20 w-full max-w-sm overflow-auto border-s border-line bg-bg p-3 shadow-lg"
          >
            {panel === 'contents' ? (
              <ContentsList
                items={outline}
                onPick={(item) => {
                  setPanel(null)
                  setTarget((prev) => ({
                    at: item.at ?? `pdf:${item.page}:0`,
                    nonce: (prev?.nonce ?? 0) + 1,
                  }))
                }}
              />
            ) : (
              <AnnotationsPanel
                db={db}
                pageId={pageId}
                title={page.title}
                onJump={jump}
                {...panelProps}
              />
            )}
          </aside>
        )}
      </div>
      {selection && !noting && !saving && (
        <SelectionPopup
          rect={selection.rect}
          selected={selection.text}
          onColour={onColour}
          onNote={() => {
            setNoting(selection)
            clearSelection()
          }}
          onCopy={() => {
            const text = selection.text
            clearSelection()
            runTask(
              navigator.clipboard
                .writeText(text)
                .then(() => toast(t('annot.copied'))),
            )
          }}
          onPin={() => {
            const sel = selection
            clearSelection()
            runTask(
              makeAnnotation(sel, 'bookmark').then(() =>
                toast(t('bookreader.bookmarked')),
              ),
            )
          }}
          onSaveTo={() => {
            const sel = selection
            clearSelection()
            runTask(
              createAnnotation(db, {
                pageId,
                kind: 'highlight',
                anchor: sel.anchor,
                colour: 'yellow',
                quote: sel.quote,
                chapter: sel.chapter,
              }).then(setSaving),
            )
          }}
          onMakeCard={
            extraPopupActions?.(selection, () =>
              createAnnotation(db, {
                pageId,
                kind: 'highlight',
                anchor: selection.anchor,
                colour: 'yellow',
                quote: selection.quote,
                chapter: selection.chapter,
              }),
            ).onMakeCard
          }
        />
      )}
      {noting && (
        <NoteSheet
          quote={noting.text}
          onCancel={() => setNoting(null)}
          onSave={(note) => {
            const sel = noting
            setNoting(null)
            runTask(
              makeAnnotation(sel, 'note', 'yellow', note).then(() =>
                toast(t('annot.noteSaved')),
              ),
            )
          }}
        />
      )}
      {saving && (
        <SaveToSheet
          db={db}
          excludePageId={pageId}
          onCancel={() => setSaving(null)}
          onPick={(tg) => {
            const a = saving
            setSaving(null)
            runTask(saveTo(a, tg))
          }}
        />
      )}
    </div>
  )
}

function ContentsList({
  items,
  onPick,
}: {
  items: (OutlineItem & { at?: string })[]
  onPick: (item: OutlineItem & { at?: string }) => void
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">{t('bookreader.noContents')}</p>
  }
  return (
    <nav aria-label={t('bookreader.contents')}>
      <ul>
        {items.map((item, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onPick(item)}
              style={{ paddingInlineStart: 8 + item.depth * 14 }}
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg pe-2 text-start text-sm hover:bg-hover"
            >
              <span className="truncate">{item.title}</span>
              {item.page > 0 && (
                <span className="shrink-0 text-xs text-muted">{item.page}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
