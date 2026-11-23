import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { onRouted } from '../../app/input/eventRouter'
import { dockArea } from './oneBarArea'
import type { LearningNotesDB } from '../../core/db'
import type { PaperBox } from '../../core/types'
import { usePhone } from '../../design/parts/useAnchoredCard'
import { boxesOf } from '../boxes'
import OneBarView from './OneBar'
import { barFits, clampFree, dockStyle, type Area } from './oneBarDockModel'
import {
  barFolded,
  barMoved,
  barPin,
  dropBar,
  placeFor,
  togglePin,
} from './oneBarPlaceStore'

/** The box the bar acts on: the picked one, else the one the caret is in. */
function readTarget(): string | null {
  const picked = document.querySelector(
    '[data-paper-box][data-picked], [data-paper-box="main"][data-main-picked]',
  )
  if (picked) return picked.getAttribute('data-paper-box')
  const live = document.activeElement?.closest?.('[data-paper-box]')
  return live?.getAttribute('data-paper-box') ?? null
}

function useTargetBox(): string | null {
  const [id, setId] = useState<string | null>(readTarget)
  useEffect(() => {
    const check = () => requestAnimationFrame(() => setId(readTarget()))
    const offs = (['pointerup', 'keyup', 'focusin', 'focusout'] as const).map(
      (type) => onRouted(type, () => void check()),
    )
    // A box picked by the Lasso or let go by Esc changes the attribute only.
    const mo = new MutationObserver(check)
    mo.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-picked', 'data-main-picked'],
    })
    return () => {
      offs.forEach((off) => off())
      mo.disconnect()
    }
  }, [])
  return id
}

/**
 * Draws again whenever the page column changes (a panel opens, the screen
 * turns, a scroll bar appears): the area is read from the page, so a bar placed
 * before the page had its final size must be placed again (#60, #63).
 */
function useAreaTick(on: boolean): Area {
  const [area, setArea] = useState<Area>(() => dockArea())
  useEffect(() => {
    if (!on) return
    let raf = 0
    const read = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const a = dockArea()
        setArea((p) =>
          p.left === a.left &&
          p.top === a.top &&
          p.right === a.right &&
          p.bottom === a.bottom
            ? p
            : a,
        )
      })
    }
    read()
    const ro = new ResizeObserver(read)
    const main = document.querySelector('main')
    if (main) ro.observe(main)
    const mo = new MutationObserver(read)
    mo.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', read)
    document.addEventListener('transitionend', read, true)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('resize', read)
      document.removeEventListener('transitionend', read, true)
    }
  }, [on])
  return area
}

/**
 * Box bar part B: the one bar when it was moved, docked or pinned. It stands
 * in the page (not in a box), so it stays put for every box and every page,
 * with nothing selected (box buttons off) and while typing (it acts on the box
 * being typed in). A pinned or docked place is kept on this device.
 */
export default function PinnedBoxBar({
  db,
  pageId,
  canEdit,
  onDelete,
  onMenu,
  onLine,
}: {
  db: LearningNotesDB
  pageId: string
  canEdit: boolean
  onDelete: (box: PaperBox) => void
  onMenu: (box: PaperBox, at: DOMRect) => void
  onLine: (box: PaperBox, line: 'tight' | 'loose' | undefined) => void
}) {
  const pin = barPin.useValue()
  const moved = barMoved.useValue()
  const target = useTargetBox()
  const phone = usePhone()
  const page = useLiveQuery(() => db.pages.get(pageId), [db, pageId])
  const box =
    page && target ? boxesOf(page).find((b) => b.id === target) : undefined
  const place = placeFor(pin, moved, target ?? undefined)
  const [live, setLive] = useState<{ left: number; top: number } | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el && (el.offsetWidth !== size.w || el.offsetHeight !== size.h))
      setSize({ w: el.offsetWidth, h: el.offsetHeight })
  })
  // Docked: the page keeps that strip free, so no words lie under the bar.
  const dockedSide = place && place.side !== 'free' ? place.side : null
  useEffect(() => {
    if (!dockedSide) return
    const root = document.documentElement
    const pad =
      (dockedSide === 'left' || dockedSide === 'right' ? size.w : size.h) + 16
    root.setAttribute('data-ob1-dock', dockedSide)
    root.style.setProperty('--ob1-pad', `${pad}px`)
    return () => {
      root.removeAttribute('data-ob1-dock')
      root.style.removeProperty('--ob1-pad')
    }
  }, [dockedSide, size.w, size.h])
  const area = useAreaTick(!!place)
  // No room (a panel took it, or the page is too narrow): fold, keep the pin.
  const folded =
    !!place &&
    !barFits(
      area,
      place.side === 'left' || place.side === 'right'
        ? { w: 56, h: 280 }
        : { w: 280, h: 56 },
    )
  useEffect(() => {
    barFolded.set(folded)
    return () => barFolded.set(false)
  }, [folded])
  if (!place || folded) return null

  const docked = place.side !== 'free'
  const dock = docked
    ? dockStyle(place.side as Exclude<typeof place.side, 'free'>, area)
    : null
  const vertical = !!dock?.vertical && !live
  const style = live
    ? { left: live.left, top: live.top }
    : dock
      ? dock.css
      : clampFree(place, area, size)
  const compact = vertical
    ? area.bottom - area.top < 640
    : area.right - area.left < 640

  return createPortal(
    <div
      ref={ref}
      data-box-bar
      data-pinned-bar={place.pinned ? '' : undefined}
      data-ui
      style={style}
      className="fixed"
    >
      <OneBarView
        pageId={pageId}
        box={box}
        canEdit={canEdit}
        compact={compact || phone}
        onDelete={() => box && onDelete(box)}
        onMenu={(at) => box && onMenu(box, at)}
        onLine={(line) => box && onLine(box, line)}
        mover={{
          place,
          vertical,
          dock: docked ? place.side : undefined,
          onLive: setLive,
          onDrop: (p) => dropBar(target ?? box?.id ?? '', p),
          onPin: () => togglePin(place),
        }}
      />
    </div>,
    document.body,
  )
}
