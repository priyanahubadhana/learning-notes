import { IconButton, MenuPopover, NameDialog, type MenuItem } from '../app/ui'
import { Icon } from '../app/tools/icons'
import { tapZone } from '../app/reading/readingMath'
import { readerBridge } from './readerBridge'
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
import { isBoolean, readPref } from '../app/uiPrefs'
import { stepSize } from './epub/epubLoader'
import { getBookFile, saveProgress } from '../library/libraryService'
import { addBlocks } from '../core/blockBulk'
import {
  createAnnotation,
  deleteAnnotation,
  listAnnotations,
  locatorOf,
} from './annotations/annotationService'
import { BulkCardsDialog } from './annotations/BulkCardsDialog'
import {
  makeCardsFromAnnotations,
  undoMakeCards,
} from '../recall/cardFromAnnotation'
import { addVocabulary, vocabContext, vocabWord } from '../recall/vocabulary'
import { NoteSheet } from './annotations/NoteSheet'
import { ReaderInkBar } from './ReaderInkBar'
import { ReadingLock } from './ReadingLock'
import {
  cleanStyle,
  dictionaryWord,
  isInkBarMode,
  type InkBarMode,
  DEFAULT_STYLE,
  isReadStyle,
  pageSurface,
  pdfFilter,
  type ReadStyle,
} from './readStyle'
import { bookSource } from './aloud/bookText'
import { setBookAloudHost } from './aloud/bookAloud'
import { HistoryButtons } from '../app/tools/HistoryButtons'
import { activeTool, type ModeTool } from '../app/tools/main/mainTools'
import { SaveToSheet, type SaveTarget } from './annotations/SaveToSheet'
import {
  saveAnnotationTo,
  saveAnnotationToSummary,
} from './annotations/saveToNotes'
import { SelectionPopup } from './annotations/SelectionPopup'
import type { OutlineItem, PdfSelection } from './pdf/PdfView'
import { requestOutline } from '../app/panel/outlineRequest'
import { FindPanel } from './pdf/FindPanel'
import { pageText } from './pdf/pdfSearch'
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
// Ask this book (Phase P): the AI code loads only when the panel opens.
const AaSheet = lazy(() => import('./AaSheet'))
const DictionarySheet = lazy(() => import('./DictionarySheet'))
const ZoomPreview = lazy(() => import('./pdf/ZoomPreview'))
const AskBook = lazy(() =>
  import('../ai/AskBook').then((m) => ({ default: m.AskBook })),
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
  const [panel, setPanel] = useState<'find' | 'ask' | null>(null)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [flipOpen, setFlipOpen] = useState(false)
  // C2b: drawing on the pages (the Pen is on).
  const [inking, setInking] = useState(false)
  const toolBefore = useRef<ModeTool | null>(null)
  const [flipFrom, setFlipFrom] = useState<{
    locator: string
    where: string
  } | null>(null)
  const [wordsPerPage, setWordsPerPage] = useState(300)
  const [moreAt, setMoreAt] = useState<DOMRect | null>(null)
  const [goTo, setGoTo] = useState(false)
  // Kindle-style full screen (item 29): only the text; a tap in the middle
  // shows the bar, taps at the edges turn the page.
  const [full, setFull] = useState(false)
  const [barShown, setBarShown] = useState(false)
  // Aa sheet, reading lock, dictionary, pen tool bar choice (items 34-41).
  const [lookRaw, setLookRaw] = usePref<ReadStyle>(
    'reader.look',
    isReadStyle,
    DEFAULT_STYLE,
  )
  const look = cleanStyle(lookRaw)
  const setLook = (patch: Partial<ReadStyle>) =>
    setLookRaw(cleanStyle({ ...look, ...patch }))
  const [aaOpen, setAaOpen] = useState(false)
  const [locked, setLocked] = useState(false)
  const [dict, setDict] = useState<string | null>(null)
  const [askSeed, setAskSeed] = useState('')
  const [penBar, setPenBar] = usePref<InkBarMode>(
    'reader.penBar',
    isInkBarMode,
    'simple',
  )
  const clock = useClock(look.clock)
  const contentRef = useRef<HTMLDivElement>(null)
  const tapDown = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastTap = useRef<{ x: number; y: number; t: number } | null>(null)
  const tapTimer = useRef(0)
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
  // The Ask AI button shows only when AI is on (Settings › AI).
  const aiOn = readPref('ai.enabled', isBoolean, false)

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

  // Leaving the reader (or the Pen) gives the notes' tool back.
  const stopInking = useCallback(() => {
    if (toolBefore.current) activeTool.set(toolBefore.current)
    toolBefore.current = null
    setInking(false)
  }, [])
  useEffect(
    () => () => {
      if (toolBefore.current) activeTool.set(toolBefore.current)
    },
    [],
  )
  // Pages mode cannot hold ink (the text breaks across columns): Scroll only.
  const drawing = inking && !(format === 'epub' && epubFlow === 'paginated')

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
  }, [target?.nonce, command?.nonce])
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
    if (target.kind === 'summary') {
      const ok = await saveAnnotationToSummary(db, a, pageId, where)
      toast(t(ok ? 'summary.saved' : 'summary.full'))
    } else if (target.kind === 'book') {
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

  /** Contents and Notes live in the left panel (one place). */
  const openLeft = (tab: 'outline' | 'annotations' | 'audio') => {
    setFull(false)
    requestOutline(tab)
  }

  // The left panel shows this book while the reader is open (items 32, 45).
  const bridgeFormat = format === 'pdf' ? 'pdf' : 'epub'
  const bridgeTitle = page?.title ?? ''
  const bridgePage = position?.page ?? 1
  const bridgeLabel = position?.label ?? ''
  const bridgeProgress = position?.progress ?? 0
  useEffect(() => {
    readerBridge.set({
      pageId,
      title: bridgeTitle,
      format: bridgeFormat,
      pageCount,
      page: bridgePage,
      label: bridgeLabel,
      progress: bridgeProgress,
      outline,
      doc: pdfDoc,
      go: (at) => setTarget((prev) => ({ at, nonce: (prev?.nonce ?? 0) + 1 })),
      makeCards: (list) => setBulk(list),
      jump: (a) => {
        const loc = locatorOf(a.anchor)
        if (!loc) return
        setTarget((prev) => ({
          at: loc,
          nonce: (prev?.nonce ?? 0) + 1,
          glow: a.id,
        }))
      },
    })
  }, [
    pageId,
    bridgeTitle,
    bridgeFormat,
    pageCount,
    bridgePage,
    bridgeLabel,
    bridgeProgress,
    outline,
    pdfDoc,
  ])
  useEffect(() => () => readerBridge.set(null), [])

  // Read aloud for a PDF: the text layer of the open page; next = next page.
  // (An EPUB supplies its own source from EpubView.)
  const aloudNow = useRef({
    page: 1,
    count: 0,
    go: null as null | ((p: number) => void),
  })
  useEffect(() => {
    aloudNow.current = {
      page: bridgePage,
      count: pageCount,
      go: (p) =>
        setTarget((prev) => ({
          at: `pdf:${p}:0`,
          nonce: (prev?.nonce ?? 0) + 1,
        })),
    }
  })
  useEffect(() => {
    if (bridgeFormat !== 'pdf') return
    setBookAloudHost({
      source: () => {
        const box = contentRef.current
        const layer = box?.querySelector<HTMLElement>(
          `[data-pdf-page="${aloudNow.current.page}"] .textLayer`,
        )
        if (!box || !layer || !layer.textContent?.trim()) return null
        return bookSource(layer, () => {
          const b = box.getBoundingClientRect()
          return { left: b.left, top: b.top, right: b.right, bottom: b.bottom }
        })
      },
      next: async () => {
        const { page, count, go } = aloudNow.current
        if (page >= count) return false
        go?.(page + 1)
        for (let i = 0; i < 20; i++) {
          await new Promise((res) => setTimeout(res, 150))
          if (aloudNow.current.page === page + 1) return true
        }
        return false
      },
    })
    return () => setBookAloudHost(null)
  }, [bridgeFormat])

  // Full screen: the browser's own too where there is one; Esc leaves.
  useEffect(() => {
    if (!full) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFull(false)
    }
    const onChange = () => {
      if (!document.fullscreenElement) setFull(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onChange)
    void document.documentElement.requestFullscreen?.().catch(() => {})
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onChange)
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {})
      }
    }
  }, [full])
  useEffect(() => () => window.clearTimeout(tapTimer.current), [])

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

  const locationText =
    format === 'pdf' && pageCount
      ? t('reader.fs.progressPage', {
          page: pageNo,
          total: pageCount,
          percent: Math.round((position?.progress ?? 0) * 100),
        })
      : t('reader.fs.progress', {
          percent: Math.round((position?.progress ?? 0) * 100),
        })
  const progressText =
    look.progress === 'chapter' && chapterLeft > 0
      ? t('reader.progress.chapter', {
          time: formatMinutes(minutesFor(chapterLeft, wpm)),
        })
      : look.progress === 'book' && bookLeft > 0
        ? t('reader.progress.book', {
            time: formatMinutes(minutesFor(bookLeft, wpm)),
          })
        : `${locationText}${timeLeftText ? ` · ${timeLeftText}` : ''}`

  const goPage = (p: number) =>
    setTarget((prev) => ({ at: `pdf:${p}:0`, nonce: (prev?.nonce ?? 0) + 1 }))
  const toggleBookmark = () =>
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
            chapter: format === 'epub' ? position?.label : chapterAt(pageNo),
          })
          toast(t('bookreader.bookmarked'))
        }
      })(),
    )
  const turn = (dir: 1 | -1) => {
    if (format === 'pdf') {
      goPage(Math.min(pageCount || 1, Math.max(1, pageNo + dir)))
    } else {
      setCommand((c) => ({
        type: dir > 0 ? 'next' : 'prev',
        nonce: (c?.nonce ?? 0) + 1,
      }))
    }
  }
  /** A tap in full screen: edges turn the page, the middle shows the bar. */
  const onEdgeTap = (x: number, width: number) => {
    if (!full) return
    const zone = tapZone(x, width)
    if (zone === 'previous') turn(-1)
    else if (zone === 'next') turn(1)
    else {
      const next = !barShown
      setBarShown(next)
      setFlipOpen(next)
    }
  }
  /** Double tap (item 44): zoom in around the spot, or back to fit width. */
  const toggleZoom = (x: number, y: number) => {
    if (zoom > 1.05) return setZoom(1)
    const sc = contentRef.current?.querySelector<HTMLElement>(
      '[data-testid="pdf-scroller"]',
    )
    if (!sc) return setZoom(2)
    const box = sc.getBoundingClientRect()
    const fx = (sc.scrollLeft + x - box.left) / (sc.scrollWidth || 1)
    const fy = (sc.scrollTop + y - box.top) / (sc.scrollHeight || 1)
    setZoom(2)
    window.setTimeout(() => {
      sc.scrollLeft = fx * sc.scrollWidth - (x - box.left)
      sc.scrollTop = fy * sc.scrollHeight - (y - box.top)
    }, 160)
  }
  const pdfTap = (x: number, y: number) => {
    const now = Date.now()
    const prev = lastTap.current
    window.clearTimeout(tapTimer.current)
    if (prev && now - prev.t < 320 && Math.hypot(x - prev.x, y - prev.y) < 40) {
      lastTap.current = null
      return toggleZoom(x, y)
    }
    lastTap.current = { x, y, t: now }
    if (!full) return
    tapTimer.current = window.setTimeout(() => {
      lastTap.current = null
      const box = contentRef.current?.getBoundingClientRect()
      if (box) onEdgeTap(x - box.left, box.width)
    }, 330)
  }
  const goToSubmit = (value: string) => {
    setGoTo(false)
    const n = Number(value.replace('%', '').trim().replace(',', '.'))
    const [min, max] = format === 'pdf' ? [1, pageCount || 1] : [0, 100]
    if (!value.trim() || !Number.isFinite(n) || n < min || n > max) {
      return toast(t('reader.goTo.bad', { min, max }))
    }
    if (format === 'pdf') goPage(Math.round(n))
    else {
      setCommand((c) => ({
        type: 'fraction',
        value: n / 100,
        nonce: (c?.nonce ?? 0) + 1,
      }))
    }
  }
  const syncFurthest = () => {
    const far = page.source?.furthest
    const farAt = page.source?.furthestAt
    if (far === undefined || !farAt) return toast(t('reader.syncFurthest.none'))
    if (Math.abs((position?.progress ?? 0) - far) < 0.005) {
      return toast(t('reader.syncFurthest.here'))
    }
    setTarget((prev) => ({ at: farAt, nonce: (prev?.nonce ?? 0) + 1 }))
    toast(t('reader.syncFurthest.done'))
  }
  const moreItems: MenuItem[] = [
    {
      label: t('reader.toolBar'),
      icon: 'pen',
      onSelect: () => {},
      submenu: (['simple', 'compact', 'full'] as const).map((m) => ({
        label: t(`reader.toolBar.${m}` as 'reader.toolBar.simple'),
        icon: 'pen',
        checked: penBar === m,
        onSelect: () => setPenBar(m),
      })),
    },
    {
      label: t('reader.goTo'),
      icon: 'crosshair',
      onSelect: () => setGoTo(true),
    },
    {
      label: t('reader.syncFurthest'),
      icon: 'swap',
      onSelect: syncFurthest,
    },
  ]
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
      className={
        full
          ? 'fixed inset-0 z-[60] flex min-h-0 flex-col bg-bg'
          : 'flex h-full min-h-0 flex-col'
      }
      data-full={full ? 'true' : undefined}
      data-testid="book-reader"
      aria-label={t('bookreader.label')}
    >
      <div
        data-chrome
        data-testid="reader-bar"
        hidden={locked || (full && !barShown)}
        className={`flex flex-wrap items-center gap-1 border-b border-line bg-bg px-2 py-1 ${
          full ? 'absolute inset-x-0 top-0 z-30 shadow-md' : ''
        }`}
      >
        <HistoryButtons />
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
          </>
        )}
        <button
          type="button"
          data-testid="reader-ink"
          aria-pressed={drawing}
          aria-label={t('reader.ink.label')}
          className={panelBtn(drawing)}
          onClick={() => {
            if (inking) return stopInking()
            if (format === 'epub' && epubFlow === 'paginated') {
              toast(t('reader.ink.scrollOnly'))
              return
            }
            toolBefore.current = activeTool.get()
            activeTool.set('pen')
            setInking(true)
          }}
        >
          {t('reader.ink')}
        </button>
        <button
          type="button"
          data-testid="reader-flip"
          aria-pressed={flipOpen}
          className={panelBtn(flipOpen)}
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
          onClick={toggleBookmark}
        >
          {bookmarked ? '★' : '☆'}
        </IconButton>
        <button
          type="button"
          data-testid="reader-contents"
          className={panelBtn(false)}
          onClick={() => openLeft('outline')}
        >
          {t('bookreader.contents')}
        </button>
        <button
          type="button"
          data-testid="reader-annotations"
          className={panelBtn(false)}
          onClick={() => openLeft('annotations')}
        >
          {t('bookreader.annotations')}
        </button>
        {aiOn && (
          <IconButton
            tip="reader.askAi"
            bare
            tipClassName="inline-flex shrink-0"
            type="button"
            data-testid="reader-ask"
            aria-pressed={panel === 'ask'}
            className={panelBtn(panel === 'ask')}
            onClick={() => setPanel((p) => (p === 'ask' ? null : 'ask'))}
          >
            {t('ai.book.button')}
          </IconButton>
        )}
        <button
          type="button"
          data-testid="reader-aa"
          aria-haspopup="dialog"
          aria-expanded={aaOpen}
          aria-label={t('aa.title')}
          className={panelBtn(aaOpen)}
          onClick={() => setAaOpen((v) => !v)}
        >
          Aa
        </button>
        <button
          type="button"
          data-testid="reader-lock"
          aria-label={t('reader.lock')}
          className={panelBtn(false)}
          onClick={() => {
            stopInking()
            clearSelection()
            setPanel(null)
            setAaOpen(false)
            setBarShown(false)
            setFlipOpen(false)
            setLocked(true)
          }}
        >
          <Icon name="lock" size={18} />
        </button>
        <button
          type="button"
          data-testid="reader-fullscreen"
          aria-pressed={full}
          aria-label={t(full ? 'reader.fullscreen.exit' : 'reader.fullscreen')}
          className={panelBtn(full)}
          onClick={() => {
            setBarShown(false)
            setFull((v) => !v)
          }}
        >
          <Icon name="maximize" size={18} />
        </button>
        <button
          type="button"
          data-testid="reader-more"
          aria-label={t('reader.more')}
          aria-haspopup="menu"
          className={panelBtn(!!moreAt)}
          onClick={(e) => setMoreAt(e.currentTarget.getBoundingClientRect())}
        >
          <Icon name="more" size={18} />
        </button>
      </div>
      {drawing && !full && !locked && (
        <ReaderInkBar onDone={stopInking} mode={penBar} />
      )}
      {noText && format === 'pdf' && (
        <p className="bg-soft px-3 py-1 text-xs text-muted">
          {t('bookreader.noText')}
        </p>
      )}
      {(timeLeftText || clock) && !full && (
        <p
          className="truncate px-3 py-0.5 text-xs text-muted"
          data-testid="reader-timeleft"
          aria-label={t('reader.timeLeft.label')}
        >
          {look.progress === 'location' ? timeLeftText : progressText}
          {clock ? ` · ${clock}` : ''}
        </p>
      )}
      <div
        ref={contentRef}
        data-read-page={look.page}
        className="relative flex min-h-0 flex-1"
        style={{ background: pageSurface(look.page)?.bg }}
        onPointerDownCapture={(e) => {
          tapDown.current = { x: e.clientX, y: e.clientY, t: Date.now() }
        }}
        onPointerUpCapture={(e) => {
          const d = tapDown.current
          tapDown.current = null
          if (!d || format !== 'pdf' || drawing) return
          if (
            (e.target as Element).closest('[data-chrome], button, a, input')
          ) {
            return
          }
          if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return
          if (Date.now() - d.t > 400) return
          if (!document.getSelection()?.isCollapsed) return
          pdfTap(e.clientX, e.clientY)
        }}
      >
        <style>{`[data-read-page] [data-pdf-page] canvas{filter:${pdfFilter(look.page)}}[data-pdf-page] .textLayer ::selection{background:var(--select-tint)}`}</style>
        {look.dim > 0 && (
          <div
            aria-hidden
            data-testid="reader-dim"
            className="pointer-events-none absolute inset-0 z-[24] bg-black"
            style={{ opacity: look.dim / 100 }}
          />
        )}
        {locked && (
          <ReadingLock onUnlock={() => setLocked(false)} onSwipe={turn} />
        )}
        {full && (
          <>
            <p
              data-testid="reader-fs-title"
              className="pointer-events-none absolute inset-x-0 top-0 z-10 truncate px-12 pt-0.5 text-center text-[11px] text-muted"
            >
              {page.title}
            </p>
            {!flipOpen && (
              <p
                data-testid="reader-fs-progress"
                className="pointer-events-none absolute inset-x-0 bottom-0 z-10 truncate bg-bg/80 px-12 pb-0.5 text-center text-[11px] text-muted"
              >
                {progressText}
                {clock ? ` · ${clock}` : ''}
              </p>
            )}
          </>
        )}
        <button
          type="button"
          data-chrome
          data-testid="reader-ribbon"
          aria-pressed={bookmarked}
          aria-label={t(
            bookmarked ? 'reader.ribbon.remove' : 'reader.ribbon.add',
          )}
          onClick={toggleBookmark}
          className="absolute end-8 top-0 z-10 grid h-11 w-8 place-items-start justify-items-center"
        >
          <svg width="22" height="34" viewBox="0 0 22 34" aria-hidden>
            <path
              d="M2 0h18v32l-9-7-9 7z"
              fill={bookmarked ? 'var(--color-accent)' : 'transparent'}
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              opacity={bookmarked ? 1 : 0.45}
            />
          </svg>
        </button>
        <Suspense
          fallback={<p className="p-6 text-muted">{t('bookreader.loading')}</p>}
        >
          {failed ? (
            <p className="p-6">{t('bookreader.failed')}</p>
          ) : format === 'pdf' ? (
            <PdfView
              data={data}
              ink={{ db, pageId, on: drawing }}
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
              ink={{ db, pageId, on: drawing }}
              startAt={at ?? page.source.at}
              annotations={annotations ?? []}
              target={target}
              size={epubSize}
              look={look}
              flow={epubFlow}
              command={command}
              onOutline={setOutline}
              onPosition={(pos) =>
                report(pos.progress, pos.locator, pos.label, 0, pos.unitsLeft)
              }
              onSelection={setSelection}
              onTap={onEdgeTap}
              onFailed={() => setFailed(true)}
            />
          )}
          {format === 'pdf' && pdfDoc && zoom > 1.05 && !drawing && (
            <ZoomPreview
              doc={pdfDoc}
              page={pageNo}
              onClose={() => setZoom(1)}
            />
          )}
        </Suspense>
        {flipOpen && (
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
            {panel === 'ask' ? (
              <Suspense fallback={null}>
                <AskBook
                  key={askSeed}
                  initialQuestion={
                    askSeed ? t('reader.askSeed', { text: askSeed }) : undefined
                  }
                  db={db}
                  page={page}
                  format={format === 'pdf' ? 'pdf' : 'epub'}
                  pdfDoc={pdfDoc}
                  epubData={format === 'epub' ? data : null}
                  outline={outline}
                  pageCount={pageCount}
                  position={position}
                  onGo={(at) =>
                    setTarget((prev) => ({
                      at,
                      nonce: (prev?.nonce ?? 0) + 1,
                    }))
                  }
                />
              </Suspense>
            ) : panel === 'find' ? (
              <FindPanel
                doc={pdfDoc}
                noText={noText}
                onJump={(p) => {
                  setPanel(null)
                  goPage(p)
                }}
              />
            ) : null}
          </aside>
        )}
      </div>
      {aaOpen && (
        <Suspense fallback={null}>
          <AaSheet
            look={look}
            onLook={setLook}
            size={epubSize}
            onSize={setEpubSize}
            flow={epubFlow}
            onFlow={setEpubFlow}
            format={bridgeFormat}
            onClose={() => setAaOpen(false)}
          />
        </Suspense>
      )}
      {dict && (
        <Suspense fallback={null}>
          <DictionarySheet word={dict} onClose={() => setDict(null)} />
        </Suspense>
      )}
      {moreAt && (
        <MenuPopover
          anchor={moreAt}
          items={moreItems}
          label={t('reader.more')}
          onClose={() => setMoreAt(null)}
        />
      )}
      {goTo && (
        <NameDialog
          title={t(
            format === 'pdf' ? 'reader.goTo.titlePdf' : 'reader.goTo.titleEpub',
          )}
          label={
            format === 'pdf'
              ? t('reader.goTo.labelPdf', { max: pageCount || 1 })
              : t('reader.goTo.labelEpub')
          }
          initialValue={
            format === 'pdf'
              ? String(pageNo)
              : String(Math.round((position?.progress ?? 0) * 100))
          }
          confirmLabel={t('reader.goTo.go')}
          onConfirm={goToSubmit}
          onCancel={() => setGoTo(false)}
        />
      )}
      {selection && !noting && !saving && look.menuOnSelect && (
        <SelectionPopup
          onDefine={
            dictionaryWord(selection.text)
              ? () => {
                  const w = dictionaryWord(selection.text)
                  clearSelection()
                  setDict(w)
                }
              : undefined
          }
          onAsk={
            aiOn
              ? () => {
                  const text = selection.text.slice(0, 300)
                  clearSelection()
                  setAskSeed(text)
                  setPanel('ask')
                }
              : undefined
          }
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

/** The time of day as HH:MM, refreshed each half minute; '' when off. */
function useClock(on: boolean): string {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!on) return
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [on])
  return on
    ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''
}
