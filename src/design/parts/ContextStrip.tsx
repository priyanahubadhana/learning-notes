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
import { LAYERS, overlay, type Rect } from '../../app/overlay'
import { Icon, type IconName } from '../../app/tools/icons'
import { CommandList } from './CommandList'
import type { Command, CommandGroup } from './commandListLogic'
import {
  placeStrip,
  splitStripItems,
  STRIP_PHONE_MAX,
  type StripPlacement,
} from './contextStripPlace'
import { motionMs } from './motion'
import { tm } from './textMenus'
import { useAnchoredCard } from './useAnchoredCard'
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
}

const SEP = '\u0001'

/**
 * The strip over a selection (SP-40..SP-44): Cut, Copy, Paste ▾, Delete, ⋯.
 * Placed by `placeStrip` (above, else below, else beside; 12 px inside every
 * edge). Esc / tap outside close it through `src/app/overlay`.
 */
export function ContextStrip(props: ContextStripProps) {
  const { items, commands, onAction, mode = 'floating' } = props
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
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const handleRef = useRef<{ close(): void } | null>(null)
  const onCloseRef = useRef(props.onClose)
  const targetRef = useRef(props.target)
  const avoidRef = useRef(props.avoid)
  useLayoutEffect(() => {
    onCloseRef.current = props.onClose
    targetRef.current = props.target
    avoidRef.current = props.avoid
  })

  const phone = props.phone ?? vw < STRIP_PHONE_MAX
  const { shown, overflow, showMore } = splitStripItems(items, {
    phone,
    maxWidth: vw - 24,
    hasExtra: !!commands?.some((g) => g.items.length),
  })

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
  useEffect(() => {
    if (!floating) return
    let live = true
    closingRef.current = false
    const el = rootRef.current
    handleRef.current = overlay.open({
      id: 'ctx-strip',
      layer: 'menu',
      opener,
      close: () => {
        if (live) request()
      },
      inside: (n) => !!el && el.contains(n),
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
      const bar = barRef.current
      if (!bar || !bar.offsetWidth) return
      const t = targetRef.current
      if (!t) return
      const rect = typeof t === 'function' ? t() : t
      const p = placeStrip(
        rect,
        { width: bar.offsetWidth, height: bar.offsetHeight },
        {
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
  }, [floating, props.target, shown.length, showMore, phone])

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

  const pickerItem = picker ? items.find((i) => i.id === picker.id) : undefined
  const side = pos?.side ?? 'above'
  const style: CSSProperties & Record<string, string | number | undefined> =
    floating
      ? {
          zIndex: LAYERS.menu,
          left: pos?.left ?? 0,
          top: pos?.top ?? 0,
          visibility: pos ? 'visible' : 'hidden',
        }
      : {}
  if (floating && pos?.arrowX != null) style['--arrow-x'] = `${pos.arrowX}px`

  const bar = (
    <div
      ref={rootRef}
      className="cs"
      data-testid={props.testId ?? 'context-strip'}
      data-mode={mode}
      data-side={floating ? side : undefined}
      data-phone={phone || undefined}
      data-state={closing ? 'closing' : 'open'}
      data-view={view}
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
                aria-haspopup={it ? (it.menu ? 'menu' : undefined) : 'listbox'}
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
                {!phone && it && <span className="cs__name">{it.label}</span>}
                {!phone && !it && (
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
  useEffect(() => {
    if (!node) return
    let live = true
    const handle = overlay.open({
      id: 'ctx-picker',
      layer: 'card',
      parentId: 'ctx-strip',
      opener: anchor,
      close: () => {
        if (live) closeRef.current()
      },
      inside: (n) => node.contains(n),
    })
    return () => {
      live = false
      handle.close()
    }
  }, [node, anchor])
  const pos = useAnchoredCard({
    anchor,
    card: node,
    widthPx: 304,
    active: !!anchor && !!node,
  })
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
        zIndex: LAYERS.card,
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
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
