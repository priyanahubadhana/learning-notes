import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { aboveTabBar } from '../../app/aboveTabBar'
import { openInTopLayer, type Rect } from '../../app/overlay'
import { Icon, type IconName } from '../../app/tools/icons'
import { CommandList } from './CommandList'
import type { Command, CommandGroup } from './commandListLogic'
import {
  placeStrip,
  itemWidth,
  splitStripItems,
  STRIP_PHONE_MAX,
  type StripPlacement,
} from './contextStripPlace'
import { useLevel } from '../../settings/level'
import { lastInputWasKey } from './inputModality'
import { motionMs } from './motion'
import { tm } from './textMenus'
import './ContextStrip.css'

export type StripMenuItem = { id: string; label: string; hint?: string }

export type StripItem = {
  id: string
  icon: IconName
  label: string
  /** Delete: red, always last. */
  danger?: boolean
  disabled?: boolean
  /** A ▾ item: opens a 304 px picker below the strip. */
  menu?: StripMenuItem[]
  /** Heading of the picker (default: the item's name). */
  menuTitle?: string
}

export type ContextStripProps = {
  items: StripItem[]
  /** More commands for "⋯" (after the items that did not fit). */
  commands?: CommandGroup[]
  recent?: string[]
  onRecent?(ids: string[]): void
  /** The selection. Needed when `mode` is floating. */
  target?: Rect | (() => Rect)
  /** More rects to keep clear (selection handles, the B / I / U bar). */
  avoid?: Rect[]
  /** `inline` draws the strip where it is (gallery, tests). */
  mode?: 'floating' | 'inline'
  /** Force the phone shape (inline, gallery). */
  phone?: boolean
  /** Inline only: show this item's picker, or the list, open at start. */
  initialPicker?: string
  initialList?: boolean
  opener?: HTMLElement | null
  /** A button, or a picker row (`sub`), or a "⋯" command. */
  onAction(id: string, sub?: string): void
  onClose(): void
  testId?: string
  /**
   * Keep the strip inside this box (a content pane) instead of the whole
   * screen. A strip wider than the box scrolls sideways with a thin track.
   */
  bounds?: () => Rect | null
  /** Show every item at every level (the caller already chose them). */
  allLevels?: boolean
  /** Phone shape: put the name under each icon, so no icon is a guess. */
  phoneLabels?: boolean
}

const SEP = '\u0001'

/** Beginner sees only these on the strip, in this order; Professional sees every item. */
const BEGINNER_STRIP_IDS = ['cut', 'copy', 'paste', 'delete'] as const

/**
 * The strip over a selection (SP-40..SP-44): Cut, Copy, Paste ▾, Delete, ⋯.
 * Placed by `placeStrip` (above, else below, else beside; 12 px inside every
 * edge). Esc / tap outside close it through `src/app/overlay`.
 */
export function ContextStrip(props: ContextStripProps) {
  const { commands, onAction, mode = 'floating' } = props
  const beginner = useLevel() === 'beginner'
  // The full set stays reachable: what Beginner does not show on the strip folds into "⋯".
  const items =
    beginner && !props.allLevels
      ? BEGINNER_STRIP_IDS.flatMap((id) =>
          props.items.filter((i) => i.id === id),
        )
      : props.items
  const hidden =
    beginner && !props.allLevels
      ? props.items.filter((i) => !items.includes(i))
      : []
  const floating = mode === 'floating'
  const rootRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [opener] = useState<HTMLElement | null>(() =>
    props.opener !== undefined
      ? props.opener
      : typeof document !== 'undefined' &&
          document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null,
  )
  const [vw, setVw] = useState(() =>
    typeof document === 'undefined'
      ? 1024
      : document.documentElement.clientWidth || window.innerWidth,
  )
  const [pos, setPos] = useState<StripPlacement | null>(null)
  // The room the strip may use: the whole screen, or the `bounds` box.
  const [room, setRoom] = useState<{ left: number; width: number } | null>(null)
  const [picker, setPicker] = useState<{
    id: string
    el: HTMLElement | null
  } | null>(() =>
    props.initialPicker ? { id: props.initialPicker, el: null } : null,
  )
  const [view, setView] = useState<'strip' | 'list'>(
    props.initialList ? 'list' : 'strip',
  )
  const [focusIdx, setFocusIdx] = useState(0)
  // The focus ring is for the keyboard: hidden until a key is pressed here.
  const [keys, setKeys] = useState(() => lastInputWasKey())
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const handleRef = useRef<{ close(): void } | null>(null)
  const onCloseRef = useRef(props.onClose)
  const targetRef = useRef(props.target)
  const avoidRef = useRef(props.avoid)
  const boundsRef = useRef(props.bounds)
  useLayoutEffect(() => {
    boundsRef.current = props.bounds
    onCloseRef.current = props.onClose
    targetRef.current = props.target
    avoidRef.current = props.avoid
  })

  const phone = props.phone ?? vw < STRIP_PHONE_MAX
  const split = splitStripItems(items, {
    phone,
    maxWidth: (room ? room.width : vw) - 24,
    hasExtra: !!commands?.some((g) => g.items.length) || hidden.length > 0,
  })
  const { shown } = split
  const overflow = [...split.overflow, ...hidden]
  const showMore = split.showMore || hidden.length > 0
  // The width the whole strip wants on the full screen.
  const natural =
    shown.reduce((n, i) => n + itemWidth(i), 0) + (showMore ? 60 : 0) + 16

  // "⋯" list: the items that did not fit (a ▾ item becomes one row per choice), then the extra commands.
  const listGroups = ((): CommandGroup[] => {
    const rows: Command[] = []
    for (const i of overflow) {
      if (i.menu)
        for (const m of i.menu)
          rows.push({
            id: `${i.id}${SEP}${m.id}`,
            label: `${i.label}: ${m.label}`,
            icon: i.icon,
            danger: i.danger,
          })
      else
        rows.push({ id: i.id, label: i.label, icon: i.icon, danger: i.danger })
    }
    const out: CommandGroup[] = []
    if (rows.length)
      out.push({ id: 'strip', label: tm('parts.menus.actions'), items: rows })
    for (const g of commands ?? []) if (g.items.length) out.push(g)
    return out
  })()

  const request = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    handleRef.current?.close()
    timerRef.current = setTimeout(() => onCloseRef.current(), motionMs(120))
  }, [])

  const finish = useCallback(() => {
    // After a pick: close now and give focus back to where the strip came from.
    clearTimeout(timerRef.current)
    closingRef.current = true
    handleRef.current?.close()
    onCloseRef.current()
    opener?.focus?.()
  }, [opener])

  // Overlay: Esc and a tap outside close the strip (and a picker first).
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!floating || !el) return
    let live = true
    closingRef.current = false
    handleRef.current = openInTopLayer(el, {
      id: 'ctx-strip',
      layer: 'menu',
      opener,
      onClose: () => {
        if (live) request()
      },
    })
    return () => {
      live = false
      clearTimeout(timerRef.current)
      handleRef.current?.close()
      handleRef.current = null
    }
  }, [floating, opener, request])

  // The screen width (phone shape) and the place; both re-measured without window listeners.
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const run = () => {
      setVw(document.documentElement.clientWidth || window.innerWidth)
      if (!floating) return
      // Inside the box only while the whole strip fits there; else the screen.
      const box = boundsRef.current?.() ?? null
      const b = box && (phone || natural <= box.width - 24) ? box : null
      setRoom((prev) =>
        b
          ? prev && prev.left === b.left && prev.width === b.width
            ? prev
            : { left: b.left, width: b.width }
          : null,
      )
      const bar = barRef.current
      if (!bar || !bar.offsetWidth) return
      const t = targetRef.current
      if (!t) return
      const rect = typeof t === 'function' ? t() : t
      const p = placeStrip(
        rect,
        { width: bar.offsetWidth, height: bar.offsetHeight },
        b
          ? { left: b.left, width: b.width, height: window.innerHeight }
          : {
              width: document.documentElement.clientWidth || window.innerWidth,
              height: window.innerHeight,
            },
        avoidRef.current,
      )
      setPos((prev) =>
        prev &&
        prev.left === p.left &&
        prev.top === p.top &&
        prev.side === p.side &&
        prev.arrowX === p.arrowX
          ? prev
          : p,
      )
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(el)
    if (barRef.current) ro.observe(barRef.current)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [floating, props.target, shown.length, showMore, phone, natural])

  const placed = !floating || !!pos
  useEffect(() => {
    if (!placed || view !== 'strip' || picker) return
    const first = barRef.current?.querySelector<HTMLElement>('[data-strip-btn]')
    if (floating && first && !barRef.current?.contains(document.activeElement))
      first.focus()
    // Focus once, when the strip first shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, floating])

  const buttons: Array<{ key: string; item?: StripItem }> = [
    ...shown.map((item) => ({ key: item.id, item })),
    ...(showMore ? [{ key: 'more' }] : []),
  ]

  const move = (e: KeyboardEvent, to: number) => {
    e.preventDefault()
    const n = (to + buttons.length) % buttons.length
    setFocusIdx(n)
    const all =
      barRef.current?.querySelectorAll<HTMLElement>('[data-strip-btn]')
    all?.[n]?.focus()
  }
  const onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement
    if (!t.hasAttribute('data-strip-btn')) return
    if (e.key === 'ArrowRight') move(e, focusIdx + 1)
    else if (e.key === 'ArrowLeft') move(e, focusIdx - 1)
    else if (e.key === 'Home') move(e, 0)
    else if (e.key === 'End') move(e, buttons.length - 1)
    else if (e.key === 'ArrowDown') {
      const b = buttons[focusIdx]
      if (b?.item?.menu) {
        e.preventDefault()
        setPicker({ id: b.item.id, el: t })
      }
    } else if (e.key === 'Escape' && !floating) props.onClose()
  }

  const activate = (b: { key: string; item?: StripItem }, el: HTMLElement) => {
    if (!b.item) {
      setPicker(null)
      setView('list')
      return
    }
    if (b.item.menu) {
      setPicker((p) => (p?.id === b.item!.id ? null : { id: b.item!.id, el }))
      return
    }
    onAction(b.item.id)
    if (floating) finish()
  }

  const pickerItem = picker
    ? props.items.find((i) => i.id === picker.id)
    : undefined
  const side = pos?.side ?? 'above'
  const style: CSSProperties & Record<string, string | number | undefined> =
    floating
      ? {
          left: pos?.left ?? 0,
          top: pos?.top ?? 0,
          visibility: pos ? 'visible' : 'hidden',
        }
      : {}
  if (floating && pos?.arrowX != null) style['--arrow-x'] = `${pos.arrowX}px`
  if (floating && room) style['--cs-max'] = `${room.width - 24}px`

  const bar = (
    <div
      ref={rootRef}
      className="cs"
      data-testid={props.testId ?? 'context-strip'}
      data-mode={mode}
      data-side={floating ? side : undefined}
      data-phone={phone || undefined}
      data-labels={phone && props.phoneLabels ? '' : undefined}
      data-state={closing ? 'closing' : 'open'}
      data-view={view}
      data-keys={keys || undefined}
      onKeyDownCapture={() => setKeys(true)}
      style={style}
    >
      <div
        ref={barRef}
        className="cs__bar"
        role="menubar"
        aria-orientation="horizontal"
        aria-label={tm('parts.menus.stripLabel')}
        hidden={view === 'list'}
        onKeyDown={onKeyDown}
      >
        {floating && pos?.arrowX != null && (
          <span className="cs__arrow" aria-hidden="true" />
        )}
        <div className="cs__scroll">
          {buttons.map((b, i) => {
            const it = b.item
            const label = it ? it.label : tm('parts.menus.moreLabel')
            const open = !!it && picker?.id === it.id
            return (
              <span key={b.key} className="cs__slot">
                {(!it || it.danger) && i > 0 && (
                  <span className="cs__sep" aria-hidden="true" />
                )}
                <button
                  type="button"
                  role="menuitem"
                  data-strip-btn
                  data-testid={`cs-${b.key}`}
                  aria-label={label}
                  aria-haspopup={
                    it ? (it.menu ? 'menu' : undefined) : 'listbox'
                  }
                  aria-expanded={it?.menu ? open : undefined}
                  disabled={it?.disabled}
                  data-popup-trigger={it?.menu ? '' : undefined}
                  data-pressed={open || undefined}
                  tabIndex={i === focusIdx ? 0 : -1}
                  className={`cs__btn ${it?.danger ? 'cs__btn--danger' : ''}`}
                  onFocus={() => setFocusIdx(i)}
                  onClick={(e) => activate(b, e.currentTarget)}
                >
                  <Icon name={it ? it.icon : 'more'} size={18} />
                  {(!phone || props.phoneLabels) && it && (
                    <span className="cs__name">{it.label}</span>
                  )}
                  {(!phone || props.phoneLabels) && !it && (
                    <span className="cs__name">{tm('parts.menus.more')}</span>
                  )}
                  {it?.menu && (
                    <Icon name="chevronDown" size={14} className="cs__caret" />
                  )}
                </button>
              </span>
            )
          })}
        </div>
      </div>
      {!floating && pickerItem?.menu && (
        <PickerCard
          item={pickerItem}
          onPick={(sub) => {
            onAction(pickerItem.id, sub)
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
          inline
        />
      )}
      {!floating && view === 'list' && (
        <CommandList
          mode="inline"
          groups={listGroups}
          recent={props.recent}
          onRecent={props.onRecent}
          onPick={(id) => onAction(...(id.split(SEP) as [string, string?]))}
          onClose={() => setView('strip')}
        />
      )}
    </div>
  )

  if (!floating) return bar
  return (
    <>
      {createPortal(bar, document.body)}
      {pickerItem?.menu && picker && (
        <FloatingPicker
          item={pickerItem}
          anchor={picker.el}
          onPick={(sub) => {
            onAction(pickerItem.id, sub)
            finish()
          }}
          onClose={() => {
            setPicker(null)
          }}
        />
      )}
      {view === 'list' && (
        <CommandList
          groups={listGroups}
          recent={props.recent}
          onRecent={props.onRecent}
          target={props.target}
          avoid={props.avoid}
          parentId="ctx-strip"
          opener={opener}
          onPick={(id) => onAction(...(id.split(SEP) as [string, string?]))}
          onClose={finish}
        />
      )}
    </>
  )
}

/** The ▾ picker as a floating card below its item; Esc and a tap outside close it. */
function FloatingPicker(props: {
  item: StripItem
  anchor: HTMLElement | null
  onPick(sub: string): void
  onClose(): void
}) {
  const { item, anchor, onClose } = props
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const closeRef = useRef(onClose)
  useLayoutEffect(() => {
    closeRef.current = onClose
  })
  useLayoutEffect(() => {
    if (!node) return
    let live = true
    const handle = openInTopLayer(node, {
      id: 'ctx-picker',
      layer: 'card',
      parentId: 'ctx-strip',
      opener: anchor,
      onClose: () => {
        if (live) closeRef.current()
      },
    })
    return () => {
      live = false
      handle.close()
    }
  }, [node, anchor])
  // Below the strip, left edges aligned, 8 px gap; a tall card shrinks (and
  // scrolls) to the room left, or opens above the strip when below is too tight.
  const [pos, setPos] = useState<{
    left: number
    top: number
    maxHeight: number
  } | null>(null)
  useLayoutEffect(() => {
    const strip = anchor?.closest<HTMLElement>('.cs__bar')
    if (!node || !anchor) return
    const run = () => {
      const root = document.documentElement
      const vw = root.clientWidth
      const vh = window.innerHeight
      const bar = (strip ?? anchor).getBoundingClientRect()
      const w = node.offsetWidth
      const left = Math.max(12, Math.min(bar.left, vw - 12 - w))
      // Measure to the phone tab bar, not the screen bottom (gate 3 v24).
      const floor = aboveTabBar() ?? 12
      const below = vh - floor - (bar.bottom + 8)
      const above = bar.top - 8 - 12
      const h = node.scrollHeight
      // Above when the whole card fits there but not below, or below is tight.
      const useAbove =
        (below < h && above >= h) || (below < Math.min(h, 220) && above > below)
      const room = useAbove ? above : below
      const maxHeight = Math.max(120, room)
      const used = Math.min(h, maxHeight)
      const top = useAbove ? bar.top - 8 - used : bar.bottom + 8
      setPos((p) =>
        p && p.left === left && p.top === top && p.maxHeight === maxHeight
          ? p
          : { left, top, maxHeight },
      )
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(node)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [anchor, node])
  useEffect(() => {
    if (pos) node?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    // Focus the first choice once the card is visible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!pos])
  return createPortal(
    <PickerCard
      item={item}
      onPick={props.onPick}
      onClose={onClose}
      onNode={setNode}
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        maxHeight: pos?.maxHeight,
        visibility: pos ? 'visible' : 'hidden',
      }}
    />,
    document.body,
  )
}

function PickerCard(props: {
  item: StripItem
  onPick(sub: string): void
  onClose(): void
  inline?: boolean
  onNode?: (el: HTMLDivElement | null) => void
  style?: CSSProperties
}) {
  const { item } = props
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const rows = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    )
    const at = rows.indexOf(document.activeElement as HTMLElement)
    const n =
      (at + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length
    rows[n]?.focus()
  }
  return (
    <div
      ref={(el) => props.onNode?.(el)}
      className="cs-pick"
      data-testid="cs-picker"
      data-inline={props.inline || undefined}
      style={props.style}
      onKeyDown={onKeyDown}
    >
      <div className="cs-pick__head">
        <h2 className="cs-pick__title">{item.menuTitle ?? item.label}</h2>
        <button
          type="button"
          className="cs-pick__x"
          aria-label={tm('parts.menus.closePicker')}
          data-testid="cs-picker-close"
          onClick={props.onClose}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="cs-pick__well" role="menu" aria-label={item.label}>
        {item.menu?.map((m) => (
          <button
            key={m.id}
            type="button"
            role="menuitem"
            data-testid={`cs-pick-${m.id}`}
            className="cs-pick__row"
            onClick={() => props.onPick(m.id)}
          >
            <span className="cs-pick__name">{m.label}</span>
            {m.hint && <span className="cs-pick__hint">{m.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
