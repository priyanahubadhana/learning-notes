import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { startGripDrag } from '../gripDrag'
import { createPortal } from 'react-dom'
import type { Editor } from '../../../editor/barActions'
import type { Place } from '../toolbarState'
import { t, type MessageKey } from '../../../i18n/t'
import { Tip } from '../../../help/Help'
import { insideAny, usePopup } from '../../popups'
import { Icon } from '../icons'
import { BarScroll } from '../BarScroll'
import { DetailCard } from './DetailCard'
import {
  activeTool,
  closePill,
  openCard,
  openPillTool,
  pillPinned,
  shownPill,
} from './mainTools'
import {
  cardAnchor,
  clampInside,
  defaultPlace,
  dropZones,
  nearestEdge,
  nudgePlace,
  pillPlaceStore,
  positionOf,
  snapPlace,
  vertical,
  type Edge,
} from './pillPlace'
import { PillContent } from './PillContent'
import { SelectionMenu } from './SelectionMenu'
import { keepFocus } from './pillKit'
import { reducedMotion } from './pillRoom'
import { useRoom } from './useRoom'

/**
 * The options pill: the second, smaller pill with the options of the tool
 * you tapped. Drag its grip and it snaps to the top, left, right or bottom
 * edge (drop zones show while dragging). It moves with CSS transforms
 * (will-change, requestAnimationFrame, pointer capture) and never changes
 * the page layout. Its place is saved per device. At the top of the page it
 * sits in the page's top gap (R8-1); scrolled down, or on any other edge, it
 * floats over the page.
 */

export function OptionsPill({
  editor,
  barPlace,
}: {
  editor: Editor | null
  barPlace: Place
}) {
  const opened = openPillTool.useValue()
  const pinned = pillPinned.useValue()
  const active = activeTool.useValue()
  const tool = shownPill(opened, pinned, active)
  if (!tool) return null
  return (
    <Pill tool={tool} editor={editor} barPlace={barPlace} pinned={pinned} />
  )
}

function Pill({
  tool,
  editor,
  barPlace,
  pinned,
}: {
  tool: NonNullable<ReturnType<typeof shownPill>>
  editor: Editor | null
  barPlace: Place
  pinned: boolean
}) {
  const room = useRoom()
  const saved = pillPlaceStore.useValue()
  const place = saved ?? defaultPlace(barPlace === 'bottom')
  const card = openCard.useValue()
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [dragging, setDragging] = useState(false)
  const [hot, setHot] = useState<Edge | null>(null)
  const grab = useRef({ dx: 0, dy: 0 })
  const frame = useRef(0)
  const isVertical = vertical(place.edge)

  // The pill's own size (it changes with the options and the orientation).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize((old) =>
        Math.abs(old.width - r.width) < 0.5 &&
        Math.abs(old.height - r.height) < 0.5
          ? old
          : { width: r.width, height: r.height },
      )
    }
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    return () => watch.disconnect()
  }, [tool, isVertical])

  const pos = useMemo(() => positionOf(place, size, room), [place, size, room])

  // Follows the rule for every pop-up (closes on a tap outside, Esc, another
  // pop-up or a page scroll) unless it is pinned.
  usePopup(
    !pinned,
    closePill,
    insideAny('[data-pill-root]', '[data-bar-tool]', '[data-bar="tray"]'),
  )

  // ---- Dragging by the grip ----
  const moveTo = useCallback(
    (x: number, y: number) => {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => {
        const el = ref.current
        if (!el) return
        const at = clampInside(x, y, size, room)
        el.style.transform = `translate3d(${Math.round(at.x)}px, ${Math.round(at.y)}px, 0)`
        const edge = nearestEdge(at.x, at.y, size, room)
        setHot((old) => (old === edge ? old : edge))
      })
    },
    [room, size],
  )
  const onGripDown = (e: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current
    if (!el) return
    e.preventDefault()
    startGripDrag(e.currentTarget, e.pointerId)
    const r = el.getBoundingClientRect()
    grab.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    el.style.transition = 'none'
    setDragging(true)
    setHot(place.edge)
  }
  const onGripMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return
    moveTo(e.clientX - grab.current.dx, e.clientY - grab.current.dy)
  }
  const onGripUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return
    cancelAnimationFrame(frame.current)
    const el = ref.current
    const x = e.clientX - grab.current.dx
    const y = e.clientY - grab.current.dy
    const at = clampInside(x, y, size, room)
    const next = snapPlace(at.x, at.y, size, room)
    // The same place may be dropped again: put the pill there ourselves.
    if (el) {
      const target = positionOf(next, size, room)
      el.style.transition = reducedMotion()
        ? 'none'
        : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)'
      el.style.transform = `translate3d(${Math.round(target.x)}px, ${Math.round(target.y)}px, 0)`
      window.setTimeout(() => {
        if (ref.current) ref.current.style.transition = ''
      }, 260)
    }
    pillPlaceStore.set(next)
    setDragging(false)
    setHot(null)
  }
  const onGripKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown'
    ) {
      e.preventDefault()
      pillPlaceStore.set(nudgePlace(place, e.key))
    } else if (e.key === 'Home') {
      e.preventDefault()
      pillPlaceStore.set(null)
    }
  }

  // The card sits next to the pill.
  const screen = { width: window.innerWidth, height: window.innerHeight }
  const anchor = cardAnchor(pos, size, place.edge, screen)
  const zones = dropZones(room)
  const label = t(`main.pill.${tool}` as MessageKey)

  return (
    <>
      {createPortal(
        <>
          <div
            ref={ref}
            role="toolbar"
            aria-label={label}
            aria-orientation={isVertical ? 'vertical' : 'horizontal'}
            data-pill-root
            data-options-pill={tool}
            data-edge={place.edge}
            data-dragging={dragging || undefined}
            style={{
              transform: `translate3d(${Math.round(pos.x)}px, ${Math.round(pos.y)}px, 0)`,
              // Measured first, then shown: never a flash in the wrong place.
              visibility: size.width > 0 ? 'visible' : 'hidden',
              touchAction: 'none',
              maxWidth: isVertical ? undefined : room.width,
              // A side strip scrolls inside 60% of the room, so it never ties
              // with the top and bottom edges when it is dragged.
              maxHeight: isVertical ? Math.round(room.height * 0.6) : undefined,
            }}
            className={`fixed top-0 left-0 z-40 flex items-center gap-0.5 rounded-2xl border border-ink-soft bg-bg p-1 text-ink shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.16)] ${
              isVertical ? 'flex-col overflow-y-auto' : ''
            } ${dragging ? 'cursor-grabbing' : ''}`}
          >
            <Tip
              id="pill.grip"
              touchInfo={false}
              className="inline-flex shrink-0"
            >
              <button
                type="button"
                data-pill-grip
                data-pen-own
                aria-label={t('main.pill.move')}
                onPointerDown={onGripDown}
                onPointerMove={onGripMove}
                onPointerUp={onGripUp}
                onPointerCancel={onGripUp}
                onKeyDown={onGripKey}
                onMouseDown={keepFocus}
                style={{ touchAction: 'none' }}
                className="grid min-h-11 min-w-8 shrink-0 cursor-grab place-items-center rounded-xl text-ink-soft hover:bg-hover hover:text-ink active:cursor-grabbing"
              >
                <Icon
                  name="grip"
                  size={18}
                  className={isVertical ? 'rotate-90' : ''}
                />
              </button>
            </Tip>
            {isVertical ? (
              <PillContent tool={tool} editor={editor} />
            ) : (
              // A wide pill in a narrow window: the bar's cue and handle (item 7).
              <BarScroll className="shrink">
                <PillContent tool={tool} editor={editor} />
              </BarScroll>
            )}
            <Tip
              id="pill.pin"
              touchInfo={false}
              className="inline-flex shrink-0"
            >
              <button
                type="button"
                data-pill-pin
                aria-pressed={pinned}
                aria-label={
                  tool === 'text' ? t('textTool.pin') : t('main.pill.pin')
                }
                onMouseDown={keepFocus}
                onClick={() => pillPinned.set(!pinned)}
                className={`grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl hover:bg-hover ${
                  pinned ? 'bg-hover text-accent' : 'text-ink-soft'
                }`}
              >
                <Icon name={pinned ? 'pin' : 'pinOff'} size={18} />
              </button>
            </Tip>
            <button
              type="button"
              data-pill-close
              aria-label={t('popup.close')}
              onMouseDown={keepFocus}
              onClick={() => {
                pillPinned.set(false)
                closePill()
              }}
              className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-hover hover:text-ink"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          {dragging && (
            <div
              aria-hidden
              data-drop-zones
              className="pointer-events-none fixed inset-0 z-30"
            >
              {(Object.keys(zones) as Edge[]).map((edge) => (
                <div
                  key={edge}
                  data-drop-zone={edge}
                  data-hot={hot === edge || undefined}
                  style={{
                    left: zones[edge].left,
                    top: zones[edge].top,
                    width: zones[edge].width,
                    height: zones[edge].height,
                  }}
                  className={`absolute rounded-2xl border-2 border-dashed border-accent motion-safe:transition-colors ${
                    hot === edge ? 'bg-accent/25' : 'bg-accent/8'
                  }`}
                />
              ))}
            </div>
          )}
          {card && card.tool === tool && (
            <div
              data-pill-root
              data-pill-card
              style={{
                left: anchor.left,
                top: anchor.top,
                bottom: anchor.bottom,
                maxHeight: anchor.maxHeight,
                width: Math.min(340, screen.width - 16),
              }}
              className="fixed z-[45] overflow-y-auto rounded-2xl border border-ink-soft bg-bg p-1.5 text-ink shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.2)]"
            >
              <DetailCard
                card={card}
                editor={editor}
                onPage={(page) => openCard.set({ tool, page })}
                onClose={() => openCard.set(null)}
              />
            </div>
          )}
          {tool === 'lasso' && editor && !card && (
            <SelectionMenu editor={editor} anchor={anchor} />
          )}
        </>,
        document.body,
      )}
    </>
  )
}
