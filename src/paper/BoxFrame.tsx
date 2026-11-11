import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { t } from '../i18n/t'
import type { PaperBox } from '../core/types'
import { frameCss, padOf } from '../core/boxStyle'
import { BOX_COLOURS, sheetSegments } from './boxes'
import { activeTool } from '../app/tools/main/mainTools'
import { TOUCH_PX, TOUCH_STYLE } from './safeGap'
import { FREE_MIN_W } from './grid'
import {
  caretAtEnd,
  HANDLE_AT,
  RESIZE_HANDLES,
  type ResizeHow,
} from './boxHandles'

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
  onWidth,
  autoMaxW,
  onMenu,
  picked,
  typing,
  lasso,
  dragging,
  pushed,
  onGrab,
  onDragMove,
  onDragEnd,
  onResize,
  layoutMode = false,
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
  /**
   * Text box v2: the box is as wide as its text, up to this many px (a little
   * before the right margin), then the text wraps. It reports its width (px).
   */
  autoMaxW?: number
  onWidth?: (px: number) => void
  onMenu: (at: DOMRect) => void
  /** Selected (tap on the frame, or the Lasso). */
  picked: boolean
  /** The caret is in this picked box: the bar hides, a thin outline stays. */
  typing: boolean
  /** The Lasso tool is on: hovering shows the frame, a tap on it selects. */
  lasso: boolean
  /** Being dragged: a see-through copy that follows the pointer. */
  dragging: boolean
  /** Pushed down by a drop: slides to its new place. */
  pushed: boolean
  onGrab: (how: GrabHow, e: ReactPointerEvent) => void
  onDragMove: (e: ReactPointerEvent) => void
  onDragEnd: (e: ReactPointerEvent) => void
  /** The 8 round resize handles of a selected box (B3-9). */
  onResize?: {
    down: (how: ResizeHow, e: ReactPointerEvent) => void
    move: (e: ReactPointerEvent) => void
    end: (e: ReactPointerEvent) => void
  }
  /** Layout mode: the whole box is a drag cover, no handles. */
  layoutMode?: boolean
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
  // A box narrower than the grip and ⋯ side by side (a new, small box): they
  // sit next to each other above its left edge instead of at its two ends.
  const [narrowBox, setNarrowBox] = useState(false)
  // A new empty box with the caret: accent dashed frame and "Type here".
  const [emptyFocused, setEmptyFocused] = useState(false)
  const checkEmpty = () => {
    const node = el.current
    const on =
      !!node && node.contains(document.activeElement) && isEmptyBox(node)
    setEmptyFocused((old) => (old === on ? old : on))
  }
  useEffect(() => {
    const node = el.current
    if (!node) return
    const measure = () => {
      onBottom(node.offsetTop + node.offsetHeight)
      onHeight?.(node.offsetHeight)
      // Only while the box is as wide as its text (the attribute is current,
      // a closure may be one render old): a preview that puts it in a column
      // must not change where it is hit.
      if (node.hasAttribute('data-auto')) onWidth?.(node.offsetWidth)
      setNarrowBox(node.offsetWidth < 150)
      setH(node.offsetHeight)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    return () => ro.disconnect()
  }, [onBottom, onHeight, onWidth])

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
      data-auto={autoMaxW ? '' : undefined}
      data-picked={picked ? '' : undefined}
      data-typing={typing ? '' : undefined}
      data-empty-focused={emptyFocused ? '' : undefined}
      onFocusCapture={() => window.setTimeout(checkEmpty, 0)}
      onBlurCapture={() => window.setTimeout(checkEmpty, 0)}
      onKeyUpCapture={checkEmpty}
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
        (dragging ? ' opacity-90 shadow-2xl' : '') +
        (pushed && !dragging
          ? ' transition-[left,top,width] duration-150 motion-reduce:transition-none'
          : '')
      }
      style={
        stacked
          ? { marginLeft: stacked.x * k, width: stacked.w * k }
          : dragging
            ? {
                // One moving copy: placed at its old spot and moved by a
                // transform, so a move repaints one layer and relayouts
                // nothing (item 25, the white-line flicker).
                left: box.x * k,
                top: box.y * k,
                ...(autoMaxW
                  ? { width: 'max-content', maxWidth: autoMaxW }
                  : { width: shown.w * k }),
                transform: `translate3d(${(shown.x - box.x) * k}px, ${(shown.y - box.y) * k}px, 0) scale(1.02)`,
                willChange: 'transform',
              }
            : {
                left: shown.x * k,
                top: shown.y * k,
                ...(autoMaxW
                  ? {
                      width: 'max-content',
                      maxWidth: autoMaxW,
                      minWidth: FREE_MIN_W * k,
                    }
                  : { width: shown.w * k }),
                ...(box.h ? { minHeight: box.h * k } : {}),
              }
      }
      onClick={(e) => {
        // B3-4: a tap anywhere on the frame (padding, empty corners) edits this
        // box with the Text tool; it never makes a box on top.
        const el = e.target as HTMLElement
        if (activeTool.get() !== 'text' || box.locked) return
        if (el === e.currentTarget || el.hasAttribute('data-box-content'))
          caretAtEnd(e.currentTarget)
      }}
    >
      {box.style &&
        segments.map((s, i) => (
          <div
            key={'s' + i}
            aria-hidden
            data-box-style={i}
            className="pointer-events-none absolute inset-x-0 box-border"
            style={{ top: s.top, height: s.height, ...frameCss(box.style) }}
          />
        ))}
      {segments.map((s, i) => (
        <div
          key={i}
          aria-hidden
          data-box-frame={i}
          className={
            'pointer-events-none absolute inset-x-0 rounded-md border border-dashed border-transparent group-data-picked:border-solid group-data-picked:border-accent group-data-picked:border-[1.5px]' +
            (typing ? ' !border-solid !border-line-strong' : '') +
            (dragging ? ' !border-solid !border-accent' : '')
          }
          style={{ top: s.top, height: s.height, background: colour }}
        />
      ))}
      <div
        data-chrome
        // B3-1: only on the selected box, one 44 pt target each.
        className={
          'pointer-events-none invisible absolute z-20 flex items-center group-data-picked:visible ' +
          (narrowBox
            ? 'left-1/2 -translate-x-1/2 gap-1'
            : 'left-0 right-0 justify-end pr-7')
        }
        style={{ top: -TOUCH_PX - 20, height: TOUCH_PX }}
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
            style={TOUCH_STYLE}
            className={
              'pointer-events-auto cursor-grab touch-none rounded-t-xl border border-b-0 border-accent bg-accent px-6 text-2xl leading-none text-white shadow-md ' +
              (narrowBox ? '' : 'absolute left-1/2 -translate-x-1/2')
            }
          >
            ≡
          </button>
        )}
        <button
          type="button"
          data-box-menu
          aria-label={t('paper.box.menu')}
          aria-haspopup="menu"
          onClick={(e) => onMenu(e.currentTarget.getBoundingClientRect())}
          style={TOUCH_STYLE}
          className="pointer-events-auto rounded-lg px-2 text-xl leading-none text-muted hover:bg-hover"
        >
          ⋯
        </button>
      </div>
      {!stacked &&
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
              (side === 'top'
                ? // Not over the corner handles; a small box takes its whole width.
                  narrowBox
                  ? 'inset-x-0 h-2.5 '
                  : 'left-14 right-12 h-2.5 '
                : side === 'bottom'
                  ? 'inset-x-0 h-2.5 '
                  : 'inset-y-0 w-2.5 ')
            }
            style={{ [side]: -10 }}
          />
        ))}
      <div
        data-box-content
        className={box.style ? undefined : 'px-1'}
        style={{
          ...(box.style ? { padding: padOf(box.style) + 4 } : {}),
          ...(zoom === 1 ? {} : { zoom }),
          ['--box-line' as string]: lineH + 'px',
          ['--type-here' as string]: JSON.stringify(t('textTool.typeHere')),
        }}
      >
        {children}
      </div>
      {layoutMode && !stacked && (
        <div
          data-layout-cover={box.id}
          onPointerDown={(e) => onGrab('move', e)}
          {...pointer}
          className="absolute inset-0 z-20 cursor-grab touch-none"
        />
      )}
      {onResize &&
        !layoutMode &&
        picked &&
        !stacked &&
        !box.locked &&
        !dragging && <ResizeDots onResize={onResize} />}
      {picked && !typing && !dragging && bar && (
        <BarHolder below={shown.y * k < BAR_ROOM_PX}>{bar}</BarHolder>
      )}
    </div>
  )
}

/** A box this near the top of the paper shows its bar below it (no room above). */
const BAR_ROOM_PX = 150

/**
 * Holds the box bar ABOVE the box (above the grip row), pulled left if it
 * would run off the right edge of the screen; below the box when the box is
 * at the top of the paper.
 */
function BarHolder({
  below,
  children,
}: {
  below: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.transform = ''
    const r = el.getBoundingClientRect()
    const over = r.right - (window.innerWidth - 8)
    if (over > 0) el.style.transform = `translateX(${-over}px)`
    else if (r.left < 8) el.style.transform = `translateX(${8 - r.left}px)`
  })
  return (
    <div
      ref={ref}
      data-box-bar-holder
      data-below={below ? '' : undefined}
      className={
        'absolute left-0 z-20 ' + (below ? 'top-full mt-9' : 'bottom-full')
      }
      style={below ? undefined : { marginBottom: TOUCH_PX + 28 }}
    >
      {children}
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

const OUT = 16
const OUT_Y = 8

/** The 8 handles of a selected box: round corner dots, side pills for width/height. */
export function ResizeDots({
  onResize,
}: {
  onResize: {
    down: (how: ResizeHow, e: ReactPointerEvent) => void
    move: (e: ReactPointerEvent) => void
    end: (e: ReactPointerEvent) => void
  }
}) {
  return (
    <>
      {RESIZE_HANDLES.map((how) => {
        const corner = how.length === 2
        const side = how === 'e' || how === 'w'
        // The 44 pt target sits just outside the edge, so a tap on the text
        // inside never lands on a handle; the dot is drawn back on the edge.
        const dx = how.includes('e') ? OUT : how.includes('w') ? -OUT : 0
        const dy = how.includes('s') ? OUT_Y : how.includes('n') ? -OUT_Y : 0
        return (
          <div
            key={how}
            data-resize-handle={how}
            role="separator"
            aria-label={t('paper.box.resize')}
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => onResize.down(how, e)}
            onPointerMove={onResize.move}
            onPointerUp={onResize.end}
            onPointerCancel={onResize.end}
            className="pointer-events-auto absolute z-10 grid touch-none place-items-center"
            style={{
              left: HANDLE_AT[how][0],
              top: HANDLE_AT[how][1],
              width: TOUCH_PX,
              height: TOUCH_PX,
              transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
              cursor: corner
                ? how === 'nw' || how === 'se'
                  ? 'nwse-resize'
                  : 'nesw-resize'
                : how === 'n' || how === 's'
                  ? 'ns-resize'
                  : 'ew-resize',
            }}
          >
            <span
              aria-hidden
              style={{ transform: `translate(${-dx}px, ${-dy}px)` }}
              data-handle-dot={corner ? 'corner' : 'side'}
              className={
                'border-2 border-accent bg-bg shadow-md ' +
                (corner
                  ? 'size-4 rounded-full'
                  : side
                    ? 'h-8 w-2.5 rounded-full'
                    : 'h-2.5 w-8 rounded-full')
              }
            />
          </div>
        )
      })}
    </>
  )
}
