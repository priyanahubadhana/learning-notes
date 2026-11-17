import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { onRouted } from '../../app/input/eventRouter'
import { pageArea } from '../../app/tools/main/miniBarPrefs'
import type { LearningNotesDB } from '../../core/db'
import type { PaperBox } from '../../core/types'
import { usePhone } from '../../design/parts/useAnchoredCard'
import { boxesOf } from '../boxes'
import OneBarView from './OneBar'
import { dockStyle } from './oneBarDockModel'
import {
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
  if (!place) return null

  const area = pageArea()
  const docked = place.side !== 'free'
  const dock = docked
    ? dockStyle(place.side as Exclude<typeof place.side, 'free'>, area)
    : null
  const vertical = !!dock?.vertical && !live
  const style = live
    ? { left: live.left, top: live.top }
    : dock
      ? dock.css
      : {
          left: Math.max(
            area.left + 8,
            Math.min(place.left, area.right - 8 - size.w),
          ),
          top: Math.max(
            area.top + 8,
            Math.min(place.top, area.bottom - 8 - size.h),
          ),
        }
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
      className="fixed z-[var(--z-mini)]"
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
