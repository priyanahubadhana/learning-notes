import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { t } from '../i18n/t'
import type { PaperBox } from '../core/types'
import { BOX_COLOURS, sheetSegments } from './boxes'

/** How a press on a box is dragged: moves it, or changes its width. */
export type GrabHow = 'move' | 'left' | 'right'

/**
 * One box other than the default one: placed at its x, y (mm), its own block
 * editor inside. A grip on top moves it; the left and right edges (and the
 * handles of a selected box) change its width; the height follows the text.
 * With the Lasso tool the frame shows on hover and a tap on it (or on the
 * grip) selects the box. The drag itself is run by the paper (`PaperFrame`),
 * which knows the other boxes. A box that crosses a sheet gap is framed once
 * per sheet, never across the gap.
 */
export function BoxFrame({
  box,
  shown,
  k,
  zoom,
  lineH,
  sheetPx,
  gapPx,
  sheets,
  onBottom,
  onHeight,
  onMenu,
  picked,
  lasso,
  dragging,
  pushed,
  onGrab,
  onDragMove,
  onDragEnd,
  onEmptyDelete,
  stacked,
  bar,
  children,
}: {
  box: PaperBox
  /** Where it is drawn now (while it is dragged or pushed). */
  shown: PaperBox
  k: number
  zoom: number
  /** Text line height in the box's own px: the paper's line spacing. */
  lineH: number
  /** Sheet height, gap between sheets (px) and how many sheets. */
  sheetPx: number
  gapPx: number
  sheets: number
  onBottom: (px: number) => void
  /** The box's own height (px), for the box grid. */
  onHeight?: (px: number) => void
  onMenu: (at: DOMRect) => void
  /** Selected (tap on the frame, or the Lasso). */
  picked: boolean
  /** The Lasso tool is on: hovering shows the frame, a tap on it selects. */
  lasso: boolean
  /** Being dragged: a see-through copy that follows the pointer. */
  dragging: boolean
  /** Pushed down by a drop: slides to its new place. */
  pushed: boolean
  onGrab: (how: GrabHow, e: ReactPointerEvent) => void
  onDragMove: (e: ReactPointerEvent) => void
  onDragEnd: (e: ReactPointerEvent) => void
  /** Backspace or Delete in a box with nothing in it: the box goes. */
  onEmptyDelete?: () => void
  /** Fit width (step 6): in the page's flow at this x and width (mm). */
  stacked: { x: number; w: number } | null
  /** The floating bar under a selected box. */
  bar?: ReactNode
  children: ReactNode
}) {
  const el = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(0)
  useEffect(() => {
    const node = el.current
    if (!node) return
    const measure = () => {
      onBottom(node.offsetTop + node.offsetHeight)
      onHeight?.(node.offsetHeight)
      setH(node.offsetHeight)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    return () => ro.disconnect()
  }, [onBottom, onHeight])

  const pointer = {
    onPointerMove: onDragMove,
    onPointerUp: onDragEnd,
    onPointerCancel: onDragEnd,
  }
  const colour = box.colour
    ? `color-mix(in srgb, ${BOX_COLOURS[box.colour] ?? box.colour} 14%, transparent)`
    : undefined
  const segments = stacked
    ? [{ top: 0, height: h }]
    : sheetSegments(shown.y * k, h, sheetPx, gapPx, sheets)
  const movable = !box.locked && !stacked
  return (
    <div
      ref={el}
      data-paper-box={box.id}
      data-locked={box.locked ? '' : undefined}
      data-picked={picked ? '' : undefined}
      data-dragging={dragging ? '' : undefined}
      data-lasso={lasso ? '' : undefined}
      onKeyDownCapture={(e) => {
        if (e.key !== 'Backspace' && e.key !== 'Delete') return
        if (!onEmptyDelete || box.locked || !el.current) return
        if (!isEmptyBox(el.current)) return
        e.preventDefault()
        e.stopPropagation()
        onEmptyDelete()
      }}
      className={
        (stacked ? 'relative mt-8 ' : 'absolute ') +
        'group' +
        (dragging ? ' opacity-60' : '') +
        (pushed && !dragging
          ? ' transition-[left,top,width] duration-150 motion-reduce:transition-none'
          : '')
      }
      style={
        stacked
          ? { marginLeft: stacked.x * k, width: stacked.w * k }
          : { left: shown.x * k, top: shown.y * k, width: shown.w * k }
      }
    >
      {segments.map((s, i) => (
        <div
          key={i}
          aria-hidden
          data-box-frame={i}
          className={
            'pointer-events-none absolute inset-x-0 rounded-md border border-dashed border-transparent group-hover:border-line group-focus-within:border-line group-data-lasso:group-hover:border-solid group-data-lasso:group-hover:border-accent group-data-picked:border-solid group-data-picked:border-accent' +
            (dragging ? ' !border-solid !border-accent' : '')
          }
          style={{ top: s.top, height: s.height, background: colour }}
        />
      ))}
      <div
        data-chrome
        className="absolute -top-6 left-0 right-0 flex h-6 items-center justify-between opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 group-data-picked:opacity-100 pointer-coarse:opacity-100"
      >
        {box.locked || stacked ? (
          <span aria-hidden className="px-1 text-xs text-muted">
            🔒
          </span>
        ) : (
          <button
            type="button"
            data-box-grip
            aria-label={t('paper.box.move')}
            onPointerDown={(e) => onGrab('move', e)}
            {...pointer}
            className="h-6 min-w-10 cursor-grab touch-none rounded px-2 text-xs leading-none text-muted hover:bg-hover"
          >
            ⠿
          </button>
        )}
        <button
          type="button"
          data-box-menu
          aria-label={t('paper.box.menu')}
          aria-haspopup="menu"
          onClick={(e) => onMenu(e.currentTarget.getBoundingClientRect())}
          className="h-6 min-w-8 rounded px-1 text-sm leading-none text-muted hover:bg-hover"
        >
          ⋯
        </button>
      </div>
      {!stacked &&
        (lasso || picked) &&
        // The frame itself, as four thin strips: a tap selects the box, a
        // drag moves it (the text inside stays free to edit).
        (['top', 'bottom', 'left', 'right'] as const).map((side) => (
          <div
            key={side}
            data-box-band={side}
            onPointerDown={(e) => onGrab('move', e)}
            {...pointer}
            className={
              'absolute touch-none ' +
              (movable ? 'cursor-move ' : 'cursor-pointer ') +
              (side === 'top' || side === 'bottom'
                ? 'inset-x-0 h-2.5 '
                : 'inset-y-0 w-2.5 ')
            }
            style={{ [side]: -10 }}
          />
        ))}
      <div
        className="px-1"
        style={{
          ...(zoom === 1 ? {} : { zoom }),
          ['--box-line' as string]: lineH + 'px',
        }}
      >
        {children}
      </div>
      {picked && !dragging && bar && (
        <div data-box-bar-holder className="absolute top-full left-0 z-20 mt-2">
          {bar}
        </div>
      )}
    </div>
  )
}

/** Is there only one empty line in this box (no text, no picture, nothing)? */
function isEmptyBox(el: HTMLElement): boolean {
  const lines = el.querySelectorAll('.bn-editor .bn-block-outer')
  if (lines.length > 1) return false
  const content = el.querySelector('.bn-editor .bn-block-content')
  if (!content) return true
  return (
    content.getAttribute('data-content-type') === 'paragraph' &&
    (content.textContent ?? '').trim() === ''
  )
}
