import { useEffect, useRef, useState } from 'react'
import { onRouted } from '../../app/input/eventRouter'
import type { PaperBox } from '../../core/types'
import { frameOfBox } from './listPlace'
import OneBarView from './OneBar'
import { barMoved, barPin, dropBar, placeFor } from './oneBarPlaceStore'
import { placeOneBar, SAFE, type Rect } from './oneBarPlace'
import './oneBar.css'

/** A page column narrower than this gets the short bar (px). */
const SHORT_UNDER = 640

/** The element that scrolls the page this bar sits in. */
function scrollerOf(from: Element): HTMLElement | null {
  for (let n = from.parentElement; n; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY
    if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight)
      return n
  }
  return null
}

/** Is the caret blinking in this box with nothing selected? */
function caretIn(boxId: string): boolean {
  const box = document.querySelector(
    '[data-paper-box="' + CSS.escape(boxId) + '"]',
  )
  const ed = box?.querySelector('.ProseMirror')
  const sel = window.getSelection()
  if (!ed || !sel?.anchorNode || !ed.contains(sel.anchorNode)) return false
  return sel.isCollapsed && ed.contains(document.activeElement)
}

const rectOf = (r: DOMRect): Rect => ({
  left: r.left,
  top: r.top,
  right: r.right,
  bottom: r.bottom,
})

/**
 * Box bar part A (switch textbox.v2; docs/mockups/box-bar/index.html): the one
 * bar of a selected box, replacing today's box bar (TB-24, TB-30, TB-31) and
 * the text format bar. Here it places itself (oneBarPlace.ts): above the box,
 * under it when there is no room, and only when the box leaves no room around
 * it, in any free space of the page; never over words, never past the page
 * frame. What it draws and does is OneBar.tsx.
 */
export default function BoxBarV2({
  pageId,
  box,
  canEdit,
  onDelete,
  onMenu,
  onLine,
}: {
  pageId: string
  box: PaperBox
  canEdit: boolean
  onDelete: () => void
  /** Opens the ⋯ list beside the ⋯ button. */
  onMenu: (at: DOMRect) => void
  /** Sets this box's line spacing (unset = normal). */
  onLine: (line: 'tight' | 'loose' | undefined) => void
}) {
  const wrap = useRef<HTMLDivElement>(null)
  // Moved, docked or pinned: the page's bar (PinnedBoxBar) stands in for this one.
  const place = placeFor(barPin.useValue(), barMoved.useValue(), box.id)
  // True while the grip is held: the bar follows the finger, not its place.
  const held = useRef(false)
  // The ⋯ list is a lazy piece: fetch it now, so the first ⋯ tap shows it at once.
  useEffect(() => {
    void import('./BoxMoreHost')
  }, [])
  // While a caret blinks in the box (typing), the bar steps aside; with words
  // selected, or the box only picked, it stays and acts on them.
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    const check = () => requestAnimationFrame(() => setTyping(caretIn(box.id)))
    check()
    const offs = (['pointerup', 'keyup', 'focusin', 'focusout'] as const).map(
      (type) => onRouted(type, () => void check()),
    )
    return () => offs.forEach((off) => off())
  }, [box.id])

  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const el = wrap.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    let moved = false
    const fit = () => {
      if (held.current) return
      el.style.translate = '0 0'
      const r = el.getBoundingClientRect()
      const frameEl = el.closest('[data-paper-box], [data-main-chrome]')
      // The first box's chrome has no height: its frame is the box.
      const mainChrome = !!frameEl?.matches('[data-main-chrome]')
      const boxEl = (
        mainChrome ? frameEl?.querySelector('[data-main-frame]') : frameEl
      )?.getBoundingClientRect()
      if (!frameEl || !boxEl || !r.width) return
      const page = frameOfBox(frameEl)
      // Words of other boxes and the Add-a-box button: never covered (the empty
      // part of another box may lie under the bar; the holder passes taps through).
      const others = [
        ...document.querySelectorAll(
          '[data-paper-box] .bn-block-content, [data-paper-add-end], [data-page-tabs]',
        ),
      ]
        .filter(
          (n) =>
            !frameEl.contains(n) &&
            !(mainChrome && n.closest('[data-paper-box="main"]')),
        )
        .map((n) => rectOf(n.getBoundingClientRect()))
        .filter((o) => o.bottom > o.top)
      // The room is what the page shows (a bottom bar is not room).
      const scroller = scrollerOf(el)
      const sc = scroller?.getBoundingClientRect()
      const view: Rect = {
        left: 0,
        top: sc ? Math.max(0, sc.top) : 0,
        right: innerWidth,
        bottom: sc ? sc.bottom : innerHeight,
      }
      const frame: Rect = page
        ? { left: page.left, right: page.right, top: 0, bottom: innerHeight }
        : view
      setNarrow(frame.right - frame.left < SHORT_UNDER)
      // The first box's tab may sit under the box (tabs crowd it above): the
      // bar then goes under the tab, never over it.
      const tab = mainChrome
        ? frameEl.querySelector('[data-box-grip]')?.getBoundingClientRect()
        : undefined
      const tabBelow = tab && tab.top > boxEl.bottom ? rectOf(tab) : undefined
      const to = placeOneBar({
        bar: { w: r.width, h: r.height },
        box: rectOf(boxEl),
        frame,
        view,
        others,
        tabBelow,
      })
      if (
        to.where === 'free' &&
        scroller &&
        !moved &&
        to.y + r.height + SAFE > view.bottom
      ) {
        // Nothing is free: the page moves up (once) to make room under the box.
        moved = true
        scroller.scrollBy(0, to.y + r.height + SAFE - view.bottom)
        requestAnimationFrame(fit)
      }
      el.style.translate = `${to.x - r.left}px ${to.y - r.top}px`
    }
    fit()
    const io = new IntersectionObserver(fit, {
      rootMargin: `-${SAFE}px 0px 0px 0px`,
      threshold: Array.from({ length: 21 }, (_, i) => i / 20),
    })
    io.observe(el)
    const off = onRouted('resize', () => void fit())
    return () => {
      io.disconnect()
      off()
    }
  })

  if (typing || place) return null
  return (
    <div ref={wrap} data-box-bar data-ui>
      <OneBarView
        pageId={pageId}
        box={box}
        canEdit={canEdit}
        compact={narrow}
        onDelete={onDelete}
        onMenu={onMenu}
        onLine={onLine}
        mover={{
          place: null,
          vertical: false,
          onLive: (at) => {
            const el = wrap.current
            held.current = !!at
            if (!el || !at) return
            const r = el.getBoundingClientRect()
            const [tx = 0, ty = 0] = el.style.translate
              .split(' ')
              .map((v) => parseFloat(v) || 0)
            el.style.translate = `${tx + at.left - r.left}px ${ty + at.top - r.top}px`
          },
          onDrop: (p) => dropBar(box.id, p),
          onPin: () => {},
        }}
      />
    </div>
  )
}
