import { IconButton } from '../app/ui'
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
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import type { Annotation, HighlightColour } from '../core/types'
import { t } from '../i18n/t'
import { createPage } from '../pages/pageService'
import { usePref } from '../app/usePref'
import { stepSize } from './epub/epubLoader'
import { getBookFile, saveProgress } from '../library/libraryService'
import { addBlocks } from '../core/blockBulk'
import {
  createAnnotation,
  deleteAnnotation,
  listAnnotations,
  locatorOf,
} from './annotations/annotationService'
import { AnnotationsPanel } from './annotations/AnnotationsPanel'
import { BulkCardsDialog } from './annotations/BulkCardsDialog'
import {
  makeCardsFromAnnotations,
  undoMakeCards,
} from '../recall/cardFromAnnotation'
import { addVocabulary, vocabContext, vocabWord } from '../recall/vocabulary'
import { NoteSheet } from './annotations/NoteSheet'
import { SaveToSheet, type SaveTarget } from './annotations/SaveToSheet'
import { saveAnnotationTo } from './annotations/saveToNotes'
import { SelectionPopup } from './annotations/SelectionPopup'
import type { OutlineItem, PdfSelection } from './pdf/PdfView'
import { FindPanel } from './pdf/FindPanel'
import { pageText } from './pdf/pdfSearch'
import { LiquidView } from './extras/LiquidView'
import { applyOrientation } from './extras/orientation'
import { PageFlip } from './extras/PageFlip'
import {
  SpeedTracker,
  WORDS_PER_UNIT,
  formatMinutes,
  minutesFor,
  readingWpm,
  recordSpeed,
} from './extras/timeLeft'
import { useDeviceSetting } from '../settings/useSetting'
import { readingOrientSetting } from '../settings/readingSettings'

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

const isFlow = (v: unknown): v is 'paginated' | 'scrolled' =>
  v === 'paginated' || v === 'scrolled'
const isSize = (v: unknown): v is number =>
  typeof v === 'number' && v >= 50 && v <= 300

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
}: {
  db: LearningNotesDB
  pageId: string
  at?: string
  onOpenPage: (pageId: string) => void
}) {
  const { toast } = useContext(AppUiContext)
  const page = useLiveQuery(() => db.pages.get(pageId), [db, pageId])
  const [data, setData] = useState<ArrayBuffer | null | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const [pageCount, setPageCount] = useState(0)
  const [position, setPosition] = useState<{
    page: number
    label: string
    locator: string
    progress: number
    /** EPUB: what is left, in foliate size units. */
    unitsLeft?: { chapter: number; book: number }
  } | null>(null)
  const [epubSize, setEpubSize] = usePref('epubSize', isSize, 100)
  const [epubFlow, setEpubFlow] = usePref('epubFlow', isFlow, 'scrolled')
  const [command, setCommand] = useState<{
    type: 'prev' | 'next' | 'fraction'
    nonce: number
    value?: number
  } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [panel, setPanel] = useState<
    'contents' | 'annotations' | 'find' | null
  >(null)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [flipOpen, setFlipOpen] = useState(false)
  const [flipFrom, setFlipFrom] = useState<{
    locator: string
    where: string
  } | null>(null)
  const [liquid, setLiquid] = useState(false)
  const [wordsPerPage, setWordsPerPage] = useState(300)
  const [orient] = useDeviceSetting(readingOrientSetting)
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [selection, setSelection] = useState<ReaderSelection | null>(null)
  const [noting, setNoting] = useState<ReaderSelection | null>(null)
  const [saving, setSaving] = useState<Annotation | null>(null)
  const [noText, setNoText] = useState(false)
  const [bulk, setBulk] = useState<Annotation[] | null>(null)
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
  // Measures how fast this reader reads (for the time left).
  const speed = useRef(new SpeedTracker(0))
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
    (
      progress: number,
      locator: string,
      label: string,
      pageNo: number,
      unitsLeft?: { chapter: number; book: number },
    ) => {
      latest.current = { progress, at: locator }
      dirty.current = true
      setPosition({ page: pageNo, label, locator, progress, unitsLeft })
      const sample = speed.current.update(progress, Date.now())
      if (sample) recordSpeed(sample)
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

  // ---- Reader extras (C5) ----
  // Words on a PDF page: the middle of a few sampled pages.
  useEffect(() => {
    if (!pdfDoc) return
    let cancelled = false
    void (async () => {
      const n = pdfDoc.numPages
      const picks = [
        ...new Set([
          1,
          Math.ceil(n / 4),
          Math.ceil(n / 2),
          Math.ceil((3 * n) / 4),
          n,
        ]),
      ].filter((p) => p >= 1 && p <= n)
      const counts: number[] = []
      for (const p of picks) {
        const text = await pageText(pdfDoc, p).catch(() => '')
        if (text) counts.push(text.split(' ').length)
      }
      if (cancelled || counts.length === 0) return
      counts.sort((a, b) => a - b)
      setWordsPerPage(Math.max(20, counts[Math.floor(counts.length / 2)]))
    })()
    return () => {
      cancelled = true
    }
  }, [pdfDoc])

  const bookWords =
    format === 'pdf'
      ? pageCount * wordsPerPage
      : position?.unitsLeft && position.progress < 0.97
        ? (position.unitsLeft.book * WORDS_PER_UNIT) / (1 - position.progress)
        : 0
  useEffect(() => {
    speed.current.setTotal(bookWords)
  }, [bookWords])
  // A jump or a pause is not reading.
  useEffect(() => {
    speed.current.reset()
  }, [target?.nonce, command?.nonce, liquid])
  useEffect(() => {
    const onHide = () =>
      document.visibilityState === 'hidden' && speed.current.reset()
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  // Lock the screen direction while reading, if asked.
  const toastRef = useRef(toast)
  useEffect(() => {
    toastRef.current = toast
  })
  useEffect(() => {
    let current = true
    void applyOrientation(orient).then((result) => {
      if (current && orient !== 'off' && result !== 'locked') {
        toastRef.current(t('reader.orient.help'))
      }
    })
    return () => {
      current = false
      if (orient !== 'off') void applyOrientation('off')
    }
  }, [orient])

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

  /** Cards from highlights, with one Undo for the whole batch. */
  const makeCards = (list: Annotation[]) =>
    runTask(
      (async () => {
        const made = await makeCardsFromAnnotations(db, pageId, list)
        if (made.annotationIds.length === 0) return toast(t('recall.bulkNone'))
        setBulk(null)
        toast(t('recall.bulkDone', { count: made.annotationIds.length }), {
          label: t('annot.undo'),
          onSelect: () => void runTask(undoMakeCards(db, made)),
        })
      })(),
    )

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
  const hereCfi = position?.locator.startsWith('epub:')
    ? position.locator.slice(5)
    : null
  /** The bookmark at the open page (PDF) or spot (EPUB), if any. */
  const bookmarkHere = (annotations ?? []).find(
    (a) =>
      a.kind === 'bookmark' &&
      ((a.anchor.type === 'pdf' && a.anchor.page === pageNo) ||
        (a.anchor.type === 'epub' && a.anchor.cfi === hereCfi)),
  )
  const bookmarked = !!bookmarkHere

  // Time left (C5): from this reader's measured speed, 220 words a minute until then.
  const wpm = readingWpm()
  const bookLeft =
    format === 'pdf'
      ? bookWords * (1 - (position?.progress ?? 0))
      : (position?.unitsLeft?.book ?? 0) * WORDS_PER_UNIT
  const chapterLeft = (() => {
    if (format !== 'pdf')
      return (position?.unitsLeft?.chapter ?? 0) * WORDS_PER_UNIT
    const started = outline.filter((o) => o.page > 0 && o.page <= pageNo)
    if (started.length === 0) return 0
    const next = outline.find((o) => o.page > pageNo)
    return Math.max(0, (next?.page ?? pageCount + 1) - pageNo) * wordsPerPage
  })()
  const timeLeftText =
    bookLeft > 0 && position
      ? chapterLeft > 0
        ? t('reader.timeLeft.both', {
            chapter: formatMinutes(minutesFor(chapterLeft, wpm)),
            book: formatMinutes(minutesFor(bookLeft, wpm)),
          })
        : t('reader.timeLeft.bookOnly', {
            book: formatMinutes(minutesFor(bookLeft, wpm)),
          })
      : ''

  const goPage = (p: number) =>
    setTarget((prev) => ({ at: `pdf:${p}:0`, nonce: (prev?.nonce ?? 0) + 1 }))
  const startScrub = () =>
    setFlipFrom(
      (prev) =>
        prev ??
        (position
          ? {
              locator: position.locator,
              where:
                format === 'pdf'
                  ? t('reader.flip.wherePage', { page: pageNo })
                  : t('reader.flip.wherePercent', {
                      percent: Math.round(position.progress * 100),
                    }),
            }
          : null),
    )

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
        <IconButton
          tip="reader.close"
          bare
          tipClassName="inline-flex shrink-0"
          type="button"
          onClick={() => onOpenPage(pageId)}
          aria-label={t('bookreader.close')}
          data-testid="reader-close"
          className={panelBtn(false)}
        >
          ✕
        </IconButton>
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
            <IconButton
              tip="reader.zoomOut"
              bare
              tipClassName="inline-flex shrink-0"
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
            </IconButton>
            <IconButton
              tip="reader.fitWidth"
              bare
              tipClassName="inline-flex shrink-0"
              type="button"
              aria-label={t('bookreader.fitWidth')}
              className={panelBtn(false)}
              onClick={() => setZoom(1)}
            >
              {Math.round(zoom * 100)}%
            </IconButton>
            <IconButton
              tip="reader.zoomIn"
              bare
              tipClassName="inline-flex shrink-0"
              type="button"
              aria-label={t('bookreader.zoomIn')}
              className={panelBtn(false)}
              onClick={() =>
                setZoom((z) => ZOOMS.find((v) => v > z + 0.001) ?? z)
              }
            >
              +
            </IconButton>
          </>
        )}
        {format === 'epub' && (
          <>
            <IconButton
              tip="reader.prev"
              bare
              tipClassName="inline-flex shrink-0"
              type="button"
              aria-label={t('bookreader.prev')}
              data-testid="epub-prev"
              className={panelBtn(false)}
              onClick={() =>
                setCommand((c) => ({
                  type: 'prev',
                  nonce: (c?.nonce ?? 0) + 1,
                }))
              }
            >
              ‹
            </IconButton>
            <IconButton
              tip="reader.next"
              bare
              tipClassName="inline-flex shrink-0"
              type="button"
              aria-label={t('bookreader.next')}
              data-testid="epub-next"
              className={panelBtn(false)}
              onClick={() =>
                setCommand((c) => ({
                  type: 'next',
                  nonce: (c?.nonce ?? 0) + 1,
                }))
              }
            >
              ›
            </IconButton>
            <IconButton
              tip="reader.smaller"
              bare
              tipClassName="inline-flex shrink-0"
              type="button"
              aria-label={t('bookreader.epubSmaller')}
              className={panelBtn(false)}
              onClick={() => setEpubSize((n) => stepSize(n, -1))}
            >
              A−
            </IconButton>
            <IconButton
              tip="reader.larger"
              bare
              tipClassName="inline-flex shrink-0"
              type="button"
              aria-label={t('bookreader.epubLarger')}
              data-testid="epub-larger"
              className={panelBtn(false)}
              onClick={() => setEpubSize((n) => stepSize(n, 1))}
            >
              A+
            </IconButton>
            <button
              type="button"
              aria-pressed={epubFlow === 'paginated'}
              data-testid="epub-flow"
              className={panelBtn(false)}
              onClick={() =>
                setEpubFlow((f) =>
                  f === 'paginated' ? 'scrolled' : 'paginated',
                )
              }
            >
              {epubFlow === 'paginated'
                ? t('bookreader.pages')
                : t('bookreader.scroll')}
            </button>
          </>
        )}
        {format === 'pdf' && (
          <>
            <button
              type="button"
              data-testid="reader-find"
              aria-pressed={panel === 'find'}
              className={panelBtn(panel === 'find')}
              onClick={() => setPanel((p) => (p === 'find' ? null : 'find'))}
            >
              {t('reader.find')}
            </button>
            <button
              type="button"
              data-testid="reader-liquid"
              aria-pressed={liquid}
              disabled={noText}
              className={`${panelBtn(liquid)} disabled:opacity-40`}
              onClick={() => {
                setFlipOpen(false)
                setLiquid((v) => !v)
              }}
            >
              {t('reader.liquid')}
            </button>
          </>
        )}
        <button
          type="button"
          data-testid="reader-flip"
          aria-pressed={flipOpen}
          disabled={liquid}
          className={`${panelBtn(flipOpen)} disabled:opacity-40`}
          onClick={() => setFlipOpen((v) => !v)}
        >
          {t('reader.flip')}
        </button>
        <IconButton
          tip="reader.bookmark"
          bare
          tipClassName="inline-flex shrink-0"
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
                if (bookmarkHere) {
                  await deleteAnnotation(db, bookmarkHere.id)
                  toast(t('bookreader.bookmarkRemoved'))
                } else {
                  await createAnnotation(db, {
                    pageId,
                    kind: 'bookmark',
                    anchor:
                      format === 'epub' && hereCfi
                        ? { type: 'epub', cfi: hereCfi }
                        : { type: 'pdf', page: pageNo, rects: [] },
                    chapter:
                      format === 'epub' ? position?.label : chapterAt(pageNo),
                  })
                  toast(t('bookreader.bookmarked'))
                }
              })(),
            )
          }
        >
          {bookmarked ? '★' : '☆'}
        </IconButton>
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
      {timeLeftText && (
        <p
          className="truncate px-3 py-0.5 text-xs text-muted"
          data-testid="reader-timeleft"
          aria-label={t('reader.timeLeft.label')}
        >
          {timeLeftText}
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
              onZoom={setZoom}
              onDoc={setPdfDoc}
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
              size={epubSize}
              flow={epubFlow}
              command={command}
              onOutline={setOutline}
              onPosition={(pos) =>
                report(pos.progress, pos.locator, pos.label, 0, pos.unitsLeft)
              }
              onSelection={setSelection}
              onFailed={() => setFailed(true)}
            />
          )}
        </Suspense>
        {liquid && pdfDoc && format === 'pdf' && (
          <div
            data-chrome
            className="absolute inset-0 z-10 flex flex-col bg-bg"
            data-testid="liquid-layer"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1 text-xs text-muted">
              <span className="flex-1">{t('reader.liquid.beta')}</span>
              <button
                type="button"
                aria-label={t('bookreader.epubSmaller')}
                className={panelBtn(false)}
                onClick={() => setEpubSize((n) => stepSize(n, -1))}
              >
                A−
              </button>
              <button
                type="button"
                aria-label={t('bookreader.epubLarger')}
                className={panelBtn(false)}
                onClick={() => setEpubSize((n) => stepSize(n, 1))}
              >
                A+
              </button>
              <button
                type="button"
                data-testid="liquid-original"
                className="min-h-11 rounded-lg border border-line px-3 text-sm text-ink hover:bg-hover"
                onClick={() => {
                  setLiquid(false)
                  goPage(pageNo)
                }}
              >
                {t('reader.liquid.original')}
              </button>
            </div>
            <LiquidView
              doc={pdfDoc}
              startPage={pageNo}
              size={epubSize}
              onPage={(p) =>
                report(
                  pageCount ? (p - 1) / pageCount : 0,
                  `pdf:${p}:0`,
                  t('bookreader.pageShort', { page: p }),
                  p,
                )
              }
            />
          </div>
        )}
        {flipOpen && !liquid && (
          <PageFlip
            doc={format === 'pdf' ? pdfDoc : null}
            pageCount={format === 'pdf' ? pageCount : 0}
            page={pageNo}
            progress={position?.progress ?? 0}
            onGoPage={goPage}
            onGoFraction={(value) =>
              setCommand((c) => ({
                type: 'fraction',
                value,
                nonce: (c?.nonce ?? 0) + 1,
              }))
            }
            backTo={flipFrom?.where ?? null}
            onScrubStart={startScrub}
            onBack={() => {
              const from = flipFrom
              setFlipFrom(null)
              if (from) {
                setTarget((prev) => ({
                  at: from.locator,
                  nonce: (prev?.nonce ?? 0) + 1,
                }))
              }
            }}
            onClose={() => {
              setFlipOpen(false)
              setFlipFrom(null)
            }}
          />
        )}
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
                    at: (item as { at?: string }).at ?? `pdf:${item.page}:0`,
                    nonce: (prev?.nonce ?? 0) + 1,
                  }))
                }}
              />
            ) : panel === 'find' ? (
              <FindPanel
                doc={pdfDoc}
                noText={noText}
                onJump={(p) => {
                  setPanel(null)
                  setLiquid(false)
                  goPage(p)
                }}
              />
            ) : (
              <AnnotationsPanel
                db={db}
                pageId={pageId}
                title={page.title}
                onJump={jump}
                onMakeCard={(a) => makeCards([a])}
                onMakeCards={(list) => setBulk(list)}
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
          onMakeCard={() => {
            const sel = selection
            clearSelection()
            runTask(
              makeAnnotation(sel, 'highlight', 'yellow').then((a) =>
                makeCards([a]),
              ),
            )
          }}
          onVocab={() => {
            const sel = selection
            clearSelection()
            runTask(
              addVocabulary(
                db,
                page.notebookId,
                sel.text,
                sel.quote ? vocabContext(sel.quote) : sel.text,
              ).then(() =>
                toast(t('recall.vocabAdded', { word: vocabWord(sel.text) })),
              ),
            )
          }}
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
      {bulk && (
        <BulkCardsDialog
          annotations={bulk}
          onCancel={() => setBulk(null)}
          onMake={(chosen) => makeCards(chosen)}
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
