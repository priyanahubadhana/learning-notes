import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import { AppUiContext } from '../appUi'
import {
  aloudContinues,
  aloudState,
  continueAloud,
  readFromPoint,
  setAloudNotifier,
  setNextPageHandler,
  stopAloud,
} from './aloudController'
import { nextPageInNotebook } from './nextPage'
import { PAGE_GAP, useReadingPosition } from './useReadingPosition'
import { minutesLeft, swipeDirection, tapZone } from './readingMath'
import { addReadingSeconds } from './readingMarks'
import { AloudPanel } from './ReadingPanels'
import { AaSheet } from './AaSheet'
import { BookmarksPanel } from './BookmarksPanel'
import { ContentsPane } from './ContentsPane'
import { ReaderFind } from './ReaderFind'
import { ReaderControls } from './ReaderControls'
import { useReaderBarVisible } from './useReaderBar'
import { clearBookmarkRibbons, syncBookmarkRibbons } from './bookmarkRibbons'
import { revealBlock } from '../../editor/revealBlock'
import { ReadingRuler } from './ReadingRuler'
import { ReadingSelection } from './ReadingSelection'
import { stopReading, type ReadingView } from './readingState'
import {
  readerControls,
  readingPanel,
  surfaceStyle,
  useReadingSettings,
} from './useReadingSettings'
import { MARGIN_PX, WIDTH_PX } from './readingPrefs'
import { lockIdle } from './wakeLock'
import { ensureFont } from './fonts'
import { useDeviceSetting } from '../../settings/useSetting'
import {
  readingDimSetting,
  readingSpeedSetting,
} from '../../settings/readingSettings'

/**
 * Wraps the page's title and text and turns them into Reading mode:
 * - in place: the page itself, with progress, ruler, highlight-while-reading
 *   and the Read panels (the look is applied by the page around this);
 * - reader: a full-screen reader that hides everything else, with controls
 *   a tap in the middle shows and page turns by tapping or swiping the edges.
 * The same elements are always there (only their style changes), so the
 * editor inside is never rebuilt when Reading mode turns on or off.
 */

const INTERACTIVE =
  'a, button, input, textarea, select, [role="button"], [data-blank], [contenteditable="true"], .bn-side-menu'

interface FrameProps {
  db: LearningNotesDB
  pageId: string
  pageTitle: string
  view: ReadingView
  flags: { page: boolean; notebook: boolean }
  onReadFirst: (kind: 'page' | 'notebook', on: boolean) => void
  /** Opens another page (the next one while reading aloud). */
  onOpenPage: (pageId: string) => void
  children: ReactNode
}

export function ReadingFrame({
  db,
  pageId,
  pageTitle,
  view,
  flags,
  onReadFirst,
  onOpenPage,
  children,
}: FrameProps) {
  const settings = useReadingSettings()
  const [speed] = useDeviceSetting(readingSpeedSetting)
  const [dim] = useDeviceSetting(readingDimSetting)
  const { toast } = useContext(AppUiContext)
  const active = view !== 'off'
  const reader = view === 'reader'
  const paged = reader && settings.flow === 'paged'
  const [outer, setOuter] = useState<HTMLDivElement | null>(null)
  const [inner, setInner] = useState<HTMLDivElement | null>(null)
  const panel = readingPanel.useValue()
  const controls = readerControls.useValue()
  const aloud = aloudState.useValue()
  const continues = aloudContinues.useValue()

  const position = useReadingPosition({
    active,
    paged,
    pageId,
    outer,
    inner,
    layoutKey: [
      settings.size,
      settings.spacing,
      settings.margin,
      settings.width,
      settings.font,
    ].join('|'),
  })

  useEffect(() => {
    if (active) void ensureFont(settings.font)
  }, [active, settings.font])

  // The margin ribbons of this page's bookmarks (reading and editing).
  useEffect(() => {
    syncBookmarkRibbons(pageId)
    return clearBookmarkRibbons
  }, [pageId])

  // What scrolls: the reader itself, or the page area when reading in place.
  const barScroller = reader
    ? paged
      ? null
      : outer
    : active
      ? (outer?.closest('main') ?? null)
      : null
  const barVisible = useReaderBarVisible(barScroller, active)

  // Panels belong to Reading mode: closing it closes them.
  useEffect(() => {
    if (!active) readingPanel.set(null)
  }, [active])

  // In place: the look reaches the whole reading area, not only the column.
  useEffect(() => {
    if (view !== 'inPlace' || !outer) return
    const main = outer.closest('main')
    if (!main) return
    const before = [main.style.background, main.style.color]
    main.style.background = settings.colors.bg
    main.style.color = settings.colors.fg
    return () => {
      main.style.background = before[0]
      main.style.color = before[1]
    }
  }, [view, outer, settings.colors.bg, settings.colors.fg])

  // Read aloud: when a page ends, the next page of the notebook opens and
  // reading goes on there (like an audiobook).
  useEffect(() => {
    if (!active) return
    setNextPageHandler(async () => {
      const next = await nextPageInNotebook(db, pageId)
      if (!next) return null
      onOpenPage(next.id)
      return next.id
    })
    setAloudNotifier((what) =>
      toast(
        t(what === 'sleep' ? 'reading.aloud.sleepDone' : 'reading.aloud.end'),
      ),
    )
    return () => {
      setNextPageHandler(null)
      setAloudNotifier(null)
    }
  }, [active, db, pageId, onOpenPage, toast])

  // The next page has loaded: carry on reading it.
  useEffect(() => {
    if (!active || continues !== pageId || !inner) return
    const start = () => {
      if (!inner.querySelector('.bn-block-outer[data-id]')) return false
      continueAloud(inner, { title: pageTitle, pageId })
      return true
    }
    if (start()) return
    const observer = new MutationObserver(() => {
      if (start()) observer.disconnect()
    })
    observer.observe(inner, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [active, continues, inner, pageId, pageTitle])

  // Leaving Reading mode stops the voice.
  useEffect(() => {
    if (!active) stopAloud()
  }, [active])

  // Reading time for the streak, and the screen stays awake.
  useEffect(() => {
    if (!active) return
    let last = Date.now()
    let touched = Date.now()
    const touch = () => (touched = Date.now())
    const events = ['pointerdown', 'keydown', 'scroll', 'wheel'] as const
    for (const e of events) document.addEventListener(e, touch, true)
    const timer = setInterval(() => {
      const now = Date.now()
      const idle = now - touched > 90_000 && aloudState.get() !== 'playing'
      if (document.visibilityState === 'visible' && !idle) {
        addReadingSeconds((now - last) / 1000)
      }
      last = now
    }, 5000)
    return () => {
      clearInterval(timer)
      for (const e of events) document.removeEventListener(e, touch, true)
    }
  }, [active])
  useEffect(() => lockIdle(active && settings.awake), [active, settings.awake])

  // A blank hidden for self-test shows when tapped (until Reading mode ends).
  const onClick = useCallback((e: React.MouseEvent) => {
    const el = (e.target as Element).closest('.recall-blank')
    if (el) {
      if (el.hasAttribute('data-revealed')) el.removeAttribute('data-revealed')
      else el.setAttribute('data-revealed', '')
    }
  }, [])

  // ---- The reader's taps and swipes ----
  const down = useRef<{ x: number; y: number; time: number } | null>(null)
  const onPointerDown = (e: ReactPointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY, time: Date.now() }
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    const start = down.current
    down.current = null
    if (!reader || !start || !outer) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const swipe = swipeDirection(dx, dy)
    if (swipe) {
      position.turn(swipe === 'next' ? 1 : -1)
      return
    }
    if (Math.hypot(dx, dy) > 10 || Date.now() - start.time > 500) return
    if (!window.getSelection()?.isCollapsed) return
    const target = e.target as Element
    if (target.closest(INTERACTIVE) || target.closest('[data-reader-chrome]')) {
      return
    }
    // Read aloud: a tap on text reads from there.
    if (aloud !== 'idle' && inner) {
      readFromPoint(inner, e.clientX, e.clientY)
      return
    }
    const rect = outer.getBoundingClientRect()
    const zone = tapZone(e.clientX - rect.left, rect.width)
    if (zone === 'middle') readerControls.set(!readerControls.get())
    else position.turn(zone === 'next' ? 1 : -1)
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!reader) return
    if ((e.target as Element).closest('input, textarea, select')) return
    if (e.key === 'Escape' && !panel) {
      if (!stopReading()) toast(t('reading.lockedExit'))
    } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      if (paged) {
        e.preventDefault()
        position.turn(1)
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      if (paged) {
        e.preventDefault()
        position.turn(-1)
      }
    }
  }
  // The reader takes the focus so the keys work at once.
  useEffect(() => {
    if (reader) outer?.focus({ preventScroll: true })
  }, [reader, outer])

  // In place, a tap on text while reading aloud reads from there.
  useEffect(() => {
    if (view !== 'inPlace' || !inner) return
    const tap = (e: PointerEvent) => {
      if (aloudState.get() === 'idle') return
      if ((e.target as Element).closest(INTERACTIVE)) return
      if (!window.getSelection()?.isCollapsed) return
      readFromPoint(inner, e.clientX, e.clientY)
    }
    inner.addEventListener('click', tap as never)
    return () => inner.removeEventListener('click', tap as never)
  }, [view, inner])

  const fontPx = 16 * (settings.size / 100)
  const lineHeight = fontPx * (settings.spacing / 100)
  const left = minutesLeft(position.words, position.progress)
  const percent = Math.round(position.progress * 100)
  const progressText =
    (paged
      ? `${t('reading.page', { n: position.pageIndex + 1, total: position.pageTotal })} · `
      : '') +
    `${percent}% · ` +
    (left === 0
      ? t('reading.timeDone')
      : t('reading.timeLeft', { count: left }))

  // ---- Style ----
  const margin = MARGIN_PX[settings.margin]
  const pageWidth = Math.min(WIDTH_PX[settings.width], 4000)
  const outerStyle = reader
    ? {
        ...surfaceStyle(settings),
        ...(paged
          ? { overflow: 'hidden' as const, touchAction: 'pan-y' as const }
          : { overflowY: 'auto' as const }),
      }
    : undefined
  let innerStyle: React.CSSProperties | undefined
  if (reader && paged && outer) {
    const w = Math.max(200, Math.min(pageWidth, outer.clientWidth - margin * 2))
    innerStyle = {
      width: w,
      height: '100%',
      margin: `0 auto`,
      columnWidth: w,
      columnGap: PAGE_GAP,
      columnFill: 'auto',
      transform: `translateX(${-position.pageIndex * (w + PAGE_GAP)}px)`,
      transition: 'none',
    }
  } else if (reader) {
    innerStyle = {
      maxWidth: pageWidth,
      margin: '0 auto',
      padding: `56px ${margin}px 120px`,
    }
  }
  // Paged text sits inside a frame with room for the controls.
  const pagedFrame: React.CSSProperties | undefined =
    reader && paged
      ? { position: 'absolute', inset: '56px 0 52px 0', overflow: 'hidden' }
      : undefined

  return (
    <div
      ref={setOuter}
      data-testid="reading-frame"
      data-view={view}
      data-flow={paged ? 'paged' : 'scroll'}
      tabIndex={reader ? -1 : undefined}
      role={reader ? 'region' : undefined}
      aria-label={reader ? t('reading.reader') : undefined}
      onKeyDown={onKeyDown}
      onPointerDown={reader ? onPointerDown : undefined}
      onPointerUp={reader ? onPointerUp : undefined}
      onClick={onClick}
      style={outerStyle}
      className={
        reader
          ? `reading-surface reading-reader fixed inset-0 z-[35] outline-none ${
              settings.blanks === 'hide' ? 'reading-hide-blanks' : ''
            }`
          : `contents ${active && settings.blanks === 'hide' ? 'reading-hide-blanks' : ''}`
      }
    >
      {active && (!reader || controls) && (
        <ReaderControls
          view={view === 'reader' ? 'reader' : 'inPlace'}
          title={pageTitle}
          visible={barVisible}
          showTitle={reader}
        />
      )}
      {reader && (
        <ReaderChrome
          visible={controls}
          progressText={progressText}
          progress={position.progress}
          onSeek={position.goToProgress}
        />
      )}
      {active && dim > 0 && (
        <div
          aria-hidden
          data-testid="reading-dim"
          className="pointer-events-none fixed inset-0 z-[37]"
          style={{ background: 'rgba(0,0,0,' + dim / 100 + ')' }}
        />
      )}
      {view === 'inPlace' && (
        <div
          aria-hidden
          style={{ height: 'calc(52px + env(safe-area-inset-top))' }}
        />
      )}
      <div style={pagedFrame}>
        <div
          ref={setInner}
          style={innerStyle}
          className={reader ? '' : 'contents'}
        >
          {children}
        </div>
      </div>
      {view === 'inPlace' && (
        <div
          data-testid="reading-progress"
          role="status"
          className="pointer-events-none fixed bottom-2 left-3 z-30 rounded-full border border-line bg-bg px-3 py-1 text-xs text-ink-soft"
        >
          {progressText}
        </div>
      )}
      {active && settings.ruler !== 'off' && (
        <ReadingRuler mode={settings.ruler} lineHeight={lineHeight} />
      )}
      {active && <ReadingSelection root={inner} />}
      {active && panel === 'settings' && (
        <AaSheet
          s={settings}
          flags={flags}
          onReadFirst={onReadFirst}
          onClose={() => readingPanel.set(null)}
        />
      )}
      {active && panel === 'aloud' && (
        <AloudPanel
          root={inner}
          speed={speed}
          title={pageTitle}
          pageId={pageId}
          onClose={() => readingPanel.set(null)}
        />
      )}
      {active && panel === 'contents' && (
        <ContentsPane
          scroller={barScroller}
          position={position}
          onClose={() => readingPanel.set(null)}
        />
      )}
      {active && panel === 'bookmarks' && (
        <BookmarksPanel
          pageId={pageId}
          position={position}
          onClose={() => readingPanel.set(null)}
        />
      )}
      {active && panel === 'find' && (
        <ReaderFind
          db={db}
          pageId={pageId}
          inner={inner}
          scroller={barScroller}
          position={position}
          onOpenPage={(id, blockId) => {
            onOpenPage(id)
            if (blockId) revealBlock(blockId)
          }}
          onClose={() => readingPanel.set(null)}
        />
      )}
    </div>
  )
}

/** The full-screen reader's bottom bar: the seek slider and progress text. */
function ReaderChrome({
  visible,
  progressText,
  progress,
  onSeek,
}: {
  visible: boolean
  progressText: string
  progress: number
  onSeek: (p: number) => void
}) {
  const cls =
    'absolute inset-x-0 z-10 flex items-center gap-1 px-2 transition-opacity motion-reduce:transition-none ' +
    (visible ? 'opacity-100' : 'pointer-events-none opacity-0')
  const style = { background: 'var(--rd-bg)', color: 'var(--rd-fg)' }
  return (
    <div
      data-reader-chrome
      data-chrome
      data-testid="reader-bottom"
      aria-hidden={!visible}
      className={cls + ' bottom-0 h-[52px] flex-col justify-center border-t'}
      style={{ ...style, borderColor: 'var(--rd-soft)' }}
      {...(visible ? {} : { inert: true })}
    >
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(progress * 100)}
        aria-label={t('reading.seek')}
        onChange={(e) => onSeek(Number(e.target.value) / 100)}
        className="h-6 w-full max-w-[600px] accent-[var(--rd-fg)]"
      />
      <span role="status" className="text-xs" data-testid="reader-progress">
        {progressText}
      </span>
    </div>
  )
}
