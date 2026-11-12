import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  countWords,
  clampPage,
  pageCount,
  pagedProgress,
  scrollProgress,
} from './readingMath'
import { getResume, saveResume } from './readingMarks'
import { scrollParent } from './domSpeech'
import { glideTo, landOn, prefersReducedMotion, targetTopFor } from './glide'
import { readDeviceSetting } from '../../settings/settingsService'
import { readingGlideSetting } from '../../settings/readingSettings'

/**
 * Where you are in the page while reading: progress (a percentage), the
 * resume point saved per page on this device, and the page turns of the
 * full-screen reader's paged mode.
 */

export interface ReadingPosition {
  progress: number
  words: number
  pageIndex: number
  pageTotal: number
  /** Scroll mode: by a screen. Paged mode: by a page. */
  turn: (direction: 1 | -1) => void
  goToProgress: (progress: number) => void
  /** instant: put the block at the top at once, no glide or glow (resuming). */
  goToBlock: (blockId: string, instant?: boolean) => boolean
  /** The block at the top of the screen/page. */
  topBlockId: () => string | null
}

export const PAGE_GAP = 56

/** Where an element starts inside the columns (not moved by the page turn). */
const leftIn = (el: HTMLElement, inner: HTMLElement): number =>
  el.getBoundingClientRect().left - inner.getBoundingClientRect().left

const blockEls = (root: HTMLElement) => [
  ...root.querySelectorAll<HTMLElement>('.bn-block-outer[data-id]'),
]

interface Options {
  /** Reading is on. */
  active: boolean
  paged: boolean
  pageId: string
  /** The element that scrolls (scroll mode) or clips the pages (paged mode). */
  outer: HTMLElement | null
  /** The element holding the text (the columns in paged mode). */
  inner: HTMLElement | null
  /** Re-measure when these change (size, spacing, font …). */
  layoutKey: string
}

export function useReadingPosition(o: Options): ReadingPosition {
  const { active, paged, pageId, outer, inner, layoutKey } = o
  const [progress, setProgress] = useState(0)
  const [words, setWords] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageTotal, setPageTotal] = useState(1)
  const indexRef = useRef(0)
  const totalRef = useRef(1)
  /** Paged: the share of the page to go back to once the pages are counted. */
  const pendingRef = useRef<number | null>(null)

  const scroller = useCallback(
    (): HTMLElement | null =>
      paged
        ? null
        : outer &&
          (getComputedStyle(outer).overflowY === 'auto'
            ? outer
            : scrollParent(outer)),
    [paged, outer],
  )

  const topBlockId = useCallback((): string | null => {
    if (!inner) return null
    const els = blockEls(inner)
    if (paged) {
      const step = inner.clientWidth + PAGE_GAP
      const left = indexRef.current * step
      const hit = els.find(
        (el) => leftIn(el, inner) + el.offsetWidth > left + 4,
      )
      return hit?.dataset.id ?? els[0]?.dataset.id ?? null
    }
    const s = scroller()
    const top = s ? s.getBoundingClientRect().top : 0
    const hit = els.find((el) => el.getBoundingClientRect().bottom > top + 48)
    return hit?.dataset.id ?? els[0]?.dataset.id ?? null
  }, [inner, paged, scroller])

  // Words in the page (for "about N min left").
  useEffect(() => {
    if (!active || !inner) return
    const count = () => setWords(countWords(inner.innerText ?? ''))
    count()
    const observer = new MutationObserver(count)
    observer.observe(inner, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    return () => observer.disconnect()
  }, [active, inner, pageId])

  // Paged: how many pages there are, now and when things resize.
  useLayoutEffect(() => {
    if (!active || !paged || !inner || !outer) return
    const measure = () => {
      const step = inner.clientWidth + PAGE_GAP
      const total = pageCount(inner.scrollWidth + PAGE_GAP, step)
      totalRef.current = total
      setPageTotal(total)
      if (pendingRef.current !== null && total > 1) {
        indexRef.current = Math.round(pendingRef.current * (total - 1))
        pendingRef.current = null
      }
      const clamped = clampPage(indexRef.current, total)
      indexRef.current = clamped
      setPageIndex(clamped)
      setProgress(pagedProgress(clamped, total))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(inner)
    observer.observe(outer)
    // The columns grow when text, pictures or fonts load, which does not
    // change the box of `inner` itself, so watch the content too.
    const content = new MutationObserver(measure)
    content.observe(inner, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    void document.fonts?.ready.then(measure)
    return () => {
      observer.disconnect()
      content.disconnect()
    }
  }, [active, paged, inner, outer, layoutKey, pageId])

  // Scroll: progress follows the scroll position.
  useEffect(() => {
    if (!active || paged || !outer) return
    const s = scroller()
    const target: HTMLElement | Window = s ?? window
    const read = () => {
      const el = s ?? document.documentElement
      setProgress(
        scrollProgress(el.scrollTop, el.scrollHeight, el.clientHeight),
      )
    }
    read()
    target.addEventListener('scroll', read, { passive: true })
    const observer = new ResizeObserver(read)
    if (inner) observer.observe(inner)
    return () => {
      target.removeEventListener('scroll', read)
      observer.disconnect()
    }
  }, [active, paged, outer, inner, scroller, pageId])

  const showIndex = useCallback((index: number) => {
    const next = clampPage(index, totalRef.current)
    indexRef.current = next
    setPageIndex(next)
    setProgress(pagedProgress(next, totalRef.current))
  }, [])

  const goToBlock = useCallback(
    (blockId: string, instant = false): boolean => {
      if (!inner) return false
      const el = inner.querySelector<HTMLElement>(
        `.bn-block-outer[data-id="${CSS.escape(blockId)}"]`,
      )
      if (!el) return false
      if (paged) {
        // Not clamped: the page count may still be settling; measuring clamps it.
        const at = Math.max(
          0,
          Math.floor(leftIn(el, inner) / (inner.clientWidth + PAGE_GAP)),
        )
        indexRef.current = at
        setPageIndex(at)
        // The page slides (300 ms), then the arrival point glows.
        if (!instant) window.setTimeout(() => landOn(el), 300)
      } else {
        const s = scroller()
        if (s && instant) {
          s.scrollTop +=
            el.getBoundingClientRect().top - s.getBoundingClientRect().top
          return true
        }
        if (s) {
          glideTo(
            s,
            targetTopFor(s, el),
            readDeviceSetting(readingGlideSetting),
            {
              instant: prefersReducedMotion(),
            },
          )
        }
        landOn(el)
      }
      return true
    },
    [inner, paged, scroller],
  )

  const goToProgress = useCallback(
    (p: number) => {
      if (paged) {
        showIndex(Math.round(p * (totalRef.current - 1)))
        return
      }
      const s = scroller()
      const el = s ?? document.documentElement
      const top = p * (el.scrollHeight - el.clientHeight)
      if (s) s.scrollTo({ top })
      else window.scrollTo({ top })
    },
    [paged, scroller, showIndex],
  )

  const turn = useCallback(
    (direction: 1 | -1) => {
      if (paged) {
        showIndex(indexRef.current + direction)
        return
      }
      const s = scroller()
      const by = (s?.clientHeight ?? window.innerHeight) * 0.9 * direction
      if (s) s.scrollBy({ top: by })
      else window.scrollBy({ top: by })
    },
    [paged, scroller, showIndex],
  )

  // Resume where you stopped (once the page's text is on screen).
  useEffect(() => {
    if (!active || !inner) return
    let done = false
    /** Where the jump left the scroll; the place is held there until the reader scrolls. */
    let heldAt: number | null = null
    /** The saved place as it was when reading started (saving moves it later). */
    let point: ReturnType<typeof getResume> | null = null
    const restore = () => {
      if (done || !inner.querySelector('.bn-block-outer[data-id]')) return
      point ??= getResume(pageId) ?? null
      if (!point) {
        done = true
        return
      }
      // Paged: by share of the pages, once they are counted (a block that
      // runs across a page break has no single page).
      if (paged) {
        done = true
        pendingRef.current = point.progress
        return
      }
      // The text arrives and settles in pieces (the saved block may not be
      // there yet; pictures and fonts above it change heights). So the place
      // is put back each time the page changes, until the reader scrolls.
      const s = scroller()
      if (heldAt !== null && s && Math.abs(s.scrollTop - heldAt) > 2) {
        done = true
        return
      }
      if (goToBlock(point.blockId, true)) heldAt = s?.scrollTop ?? 0
      else if (heldAt === null) {
        goToProgress(point.progress)
        heldAt = s?.scrollTop ?? 0
      }
    }
    restore()
    if (done) return
    const observer = new MutationObserver(restore)
    observer.observe(inner, { childList: true, subtree: true })
    const sizes = new ResizeObserver(restore)
    sizes.observe(inner)
    if (inner.parentElement) sizes.observe(inner.parentElement)
    return () => {
      observer.disconnect()
      sizes.disconnect()
    }
    // Only when reading starts or the page changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, inner, pageId, paged])

  // Remember the place (not while the page has not loaded yet).
  const latest = useRef({ progress, topBlockId })
  useEffect(() => {
    latest.current = { progress, topBlockId }
  })
  useEffect(() => {
    if (!active) return
    const save = () => {
      const blockId = latest.current.topBlockId()
      if (!blockId) return
      saveResume(pageId, {
        blockId,
        progress: latest.current.progress,
        at: Date.now(),
      })
    }
    const timer = setTimeout(save, 300)
    return () => clearTimeout(timer)
  }, [active, pageId, progress, pageIndex])
  useEffect(() => {
    if (!active) return
    const save = () => {
      const blockId = latest.current.topBlockId()
      if (blockId) {
        saveResume(pageId, {
          blockId,
          progress: latest.current.progress,
          at: Date.now(),
        })
      }
    }
    const onHide = () => document.visibilityState === 'hidden' && save()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', save)
    return () => {
      // No save here: by now the layout may already have changed back.
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', save)
    }
  }, [active, pageId])

  return {
    progress,
    words,
    pageIndex,
    pageTotal,
    turn,
    goToProgress,
    goToBlock,
    topBlockId,
  }
}
