import { useContext, useEffect, useRef, useState } from 'react'
import { onRouted } from '../../app/input/eventRouter'
import { AppUiContext } from '../../app/appUi'
import type { PaperBox } from '../../core/types'
import { ObjectBar, type ObjectBarAction } from '../../design/parts/ObjectBar'
import { t } from '../../i18n/t'
import { boxEditors } from '../activeBox'
import { openBoxStyle } from '../boxStyleBus'

/** All the text of a box as plain lines (no focus change, so the bar stays). */
function boxText(pageId: string, boxId: string): string {
  const view = boxEditors.get(pageId, boxId)?.prosemirrorView
  if (!view) return ''
  const doc = view.state.doc
  return doc.textBetween(0, doc.content.size, '\n', ' ')
}

/** The bar never gets nearer than this to the top of the screen (px). */
const SAFE_TOP = 12
/** Under a box the bar clears the 8 dots, which sit 16 px outside the edge. */
const BELOW_GAP = 24
/** Above a box the bar clears the tab row (44 pt + its 28 px margin). */
const ABOVE_GAP = 72

/** The element that scrolls the page this bar sits in. */
function scrollerOf(from: Element): HTMLElement | null {
  for (let n = from.parentElement; n; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY
    if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight)
      return n
  }
  return null
}

/** Is the caret in this box, or any of its words selected? */
function textActiveIn(boxId: string): boolean {
  const box = document.querySelector(
    '[data-paper-box="' + CSS.escape(boxId) + '"]',
  )
  const ed = box?.querySelector('.ProseMirror')
  const sel = window.getSelection()
  if (!ed || !sel?.anchorNode || !ed.contains(sel.anchorNode)) return false
  return !sel.isCollapsed || ed.contains(document.activeElement)
}

/**
 * TB-24, TB-30, TB-31 (switch textbox.v2): the one Object bar over a selected
 * box (Cut, Copy, Duplicate, Delete, Box style, ⋯) and its ⋯ list. It copies
 * today's BoxBar (BoxBar.tsx) action for action, on the shared Object bar.
 */
export default function BoxBarV2({
  pageId,
  box,
  canEdit,
  onDuplicate,
  onDelete,
  onMenu,
}: {
  pageId: string
  box: PaperBox
  canEdit: boolean
  onDuplicate: () => void
  onDelete: () => void
  /** Opens the ⋯ list beside the ⋯ button. */
  onMenu: (at: DOMRect) => void
}) {
  const { toast } = useContext(AppUiContext)
  const wrap = useRef<HTMLDivElement>(null)
  // The ⋯ list is a lazy piece: fetch it now, so the first ⋯ tap shows it at once.
  useEffect(() => {
    void import('./BoxMoreHost')
  }, [])
  // One bar at a time: while the caret or selected words are in the box, the
  // text bar is the one that shows (spec: the box bar shows when you are NOT
  // typing), so this one steps aside.
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    const check = () =>
      requestAnimationFrame(() => setTyping(textActiveIn(box.id)))
    check()
    const offs = (['pointerup', 'keyup', 'focusin', 'focusout'] as const).map(
      (type) => onRouted(type, () => void check()),
    )
    return () => offs.forEach((off) => off())
  }, [box.id])

  // The safe top zone: a box scrolled to the top of the screen must not drag
  // the bar into the top 12 px. Watched with an observer (no scroll listener).
  useEffect(() => {
    const el = wrap.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    let moved = false
    const fit = () => {
      el.style.translate = '0 0'
      const r = el.getBoundingClientRect()
      const frame = el.closest('[data-paper-box], [data-main-chrome]')
      // The first box's chrome has no height: its frame is the box.
      const mainChrome = !!frame?.matches('[data-main-chrome]')
      const box = (
        mainChrome ? frame?.querySelector('[data-main-frame]') : frame
      )?.getBoundingClientRect()
      if (!frame || !box) return
      // Above the box (clear of its tab row), else under it (clear of its dots),
      // always off other text and off the Add-a-box button; the top 12 px of
      // the screen stay free. Nothing fits: the top of the screen.
      const others = [
        ...document.querySelectorAll(
          '[data-paper-box] .bn-block-content, [data-paper-add-end]',
        ),
      ]
        .filter(
          (n) =>
            !frame.contains(n) &&
            !(mainChrome && n.closest('[data-paper-box="main"]')),
        )
        .map((n) => n.getBoundingClientRect())
        .filter((o) => o.height > 0)
      // The room is what the page shows (a bottom bar is not room).
      const scroller = scrollerOf(el)
      const room = scroller
        ? scroller.getBoundingClientRect().bottom
        : innerHeight
      const free = (top: number) =>
        top >= SAFE_TOP &&
        top + r.height <= room - SAFE_TOP &&
        !others.some((o) => o.top < top + r.height && o.bottom > top)
      const above = box.top - ABOVE_GAP - r.height
      // The first box's tab may sit under the box (tabs crowd it above): the
      // bar then goes under the tab, never over it.
      const tab = mainChrome
        ? frame?.querySelector('[data-box-grip]')?.getBoundingClientRect()
        : undefined
      const below =
        tab && tab.top > box.bottom ? tab.bottom + 12 : box.bottom + BELOW_GAP
      const add = document
        .querySelector('[data-paper-add-end]')
        ?.getBoundingClientRect()
      const beyond = add ? add.bottom + 8 : below
      const to = free(above)
        ? above
        : free(below)
          ? below
          : free(beyond)
            ? beyond
            : null
      if (to === null) {
        // Nothing is free: the page moves up (once) to make room under the box.
        const need = beyond + r.height + SAFE_TOP - room
        if (scroller && need > 0 && !moved) {
          moved = true
          scroller.scrollBy(0, need)
          requestAnimationFrame(fit)
        }
        el.style.translate = `0 ${Math.min(beyond, room - SAFE_TOP - r.height) - r.top}px`
        return
      }
      el.style.translate = `0 ${to - r.top}px`
    }
    fit()
    const io = new IntersectionObserver(fit, {
      rootMargin: `-${SAFE_TOP}px 0px 0px 0px`,
      threshold: Array.from({ length: 21 }, (_, i) => i / 20),
    })
    io.observe(el)
    return () => io.disconnect()
  })

  /** Copies the text; says so when the clipboard refuses. */
  const copy = async (): Promise<boolean> => {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard')
      await navigator.clipboard.writeText(boxText(pageId, box.id))
      return true
    } catch {
      toast(t('paper.box.copyFailed'))
      return false
    }
  }
  // Cut removes the box only after the copy worked: a blocked clipboard
  // must never turn Cut into a plain delete of the owner's text.
  const cut = () => void copy().then((ok) => ok && onDelete())

  const actions: ObjectBarAction[] = [
    ...(canEdit
      ? [{ id: 'cut', icon: 'scissors', label: t('pic.act.cut') } as const]
      : []),
    { id: 'copy', icon: 'clipboard', label: t('pic.act.copy') },
    { id: 'duplicate', icon: 'copy', label: t('paper.box.duplicate') },
    ...(canEdit
      ? ([
          {
            id: 'delete',
            icon: 'trash',
            label: t('paper.box.delete'),
            danger: true,
          },
          { id: 'style', icon: 'palette', label: t('boxStyle.title') },
        ] as const)
      : []),
    { id: 'boxmore', icon: 'more', label: t('paper.box.menu') },
  ]

  const openMore = () => {
    const btn = wrap.current?.querySelector<HTMLElement>(
      '[data-testid="ob-boxmore"]',
    )
    if (btn) onMenu(btn.getBoundingClientRect())
  }
  // The ⋯ button is a trigger of its list (a press on it never closes it first).
  useEffect(() => {
    wrap.current
      ?.querySelector('[data-testid="ob-boxmore"]')
      ?.setAttribute('data-popup-trigger', '')
  })

  const onAction = (id: string) => {
    if (id === 'cut') cut()
    else if (id === 'copy') void copy()
    else if (id === 'duplicate') onDuplicate()
    else if (id === 'delete') onDelete()
    else if (id === 'style') openBoxStyle(box.id)
    else if (id === 'boxmore') openMore()
  }

  if (typing) return null
  return (
    <div ref={wrap} data-box-bar data-ui>
      <ObjectBar kind="box" actions={actions} onAction={onAction} />
    </div>
  )
}
