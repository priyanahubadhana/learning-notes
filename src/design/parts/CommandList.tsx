import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { LAYERS, overlay, type Rect } from '../../app/overlay'
import { Icon } from '../../app/tools/icons'
import {
  buildList,
  moveIndex,
  pushRecent,
  type Command,
  type CommandGroup,
} from './commandListLogic'
import { motionMs } from './motion'
import {
  placeStrip,
  STRIP_GAP,
  STRIP_MARGIN,
  STRIP_PHONE_MAX,
  unionRect,
} from './contextStripPlace'
import { tm } from './textMenus'
import './CommandList.css'

export type CommandListProps = {
  groups: CommandGroup[]
  /** Last picked ids, newest first (the list shows the last 3). */
  recent?: string[]
  onRecent?(ids: string[]): void
  onPick(id: string): void
  /** Esc, a tap outside, or after a pick. */
  onClose(): void
  /** `inline` draws the card where it is (gallery, tests). */
  mode?: 'floating' | 'inline'
  /** Floating: the selection (or point) to stay clear of; omit to centre. */
  target?: Rect | (() => Rect)
  avoid?: Rect[]
  /** Floating: keep this overlay open (the strip that opened the list). */
  parentId?: string
  opener?: HTMLElement | null
  initialQuery?: string
  initialShowAll?: boolean
  /** Items shown before "Show all". */
  limit?: number
  /** Force the phone width (gallery). */
  phone?: boolean
  testId?: string
}

/** A rect for a screen point; used when no target is given. */
const centreRect = (): Rect => ({
  left: window.innerWidth / 2,
  top: window.innerHeight / 3,
  width: 0,
  height: 0,
})

/**
 * The searchable command list (SP-45..SP-48): type to filter by name and
 * alias, groups, Recent on top, "Show all", arrows + Enter + Esc. Focus stays
 * in the search box (combobox); the highlighted row is `aria-activedescendant`.
 */
export function CommandList(props: CommandListProps) {
  const {
    groups,
    onPick,
    onClose,
    mode = 'floating',
    target,
    avoid,
    parentId,
    limit,
  } = props
  const floating = mode === 'floating'
  const uid = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(props.initialQuery ?? '')
  const [showAll, setShowAll] = useState(!!props.initialShowAll)
  const [recent, setRecent] = useState<string[]>(props.recent ?? [])
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [closing, setClosing] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [maxH, setMaxH] = useState<number | null>(null)
  const closingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const handleRef = useRef<{ close(): void } | null>(null)
  const onCloseRef = useRef(onClose)
  const targetRef = useRef(target)
  const avoidRef = useRef(avoid)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
    targetRef.current = target
    avoidRef.current = avoid
  })

  const built = useMemo(
    () => buildList({ groups, query, recent, showAll, limit }),
    [groups, query, recent, showAll, limit],
  )
  const navCount = built.navKeys.length
  const activeKey = built.navKeys[Math.min(active, navCount - 1)] ?? null
  const idOf = (key: string) => `${uid}-${key}`

  const request = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    handleRef.current?.close()
    timerRef.current = setTimeout(() => onCloseRef.current(), motionMs(120))
  }, [])

  // Overlay: Esc and a tap outside close it; the strip that opened it stays.
  useEffect(() => {
    if (!floating) return
    closingRef.current = false
    const el = rootRef.current
    const opener =
      props.opener ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null)
    handleRef.current = overlay.open({
      id: 'command-list',
      layer: 'card',
      parentId,
      opener,
      close: request,
      inside: (n) => !!el && el.contains(n),
    })
    return () => {
      closingRef.current = true
      clearTimeout(timerRef.current)
      handleRef.current?.close()
      handleRef.current = null
    }
  }, [floating, parentId, props.opener, request])

  // Place it the same way as the strip: above, else below, else beside.
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!floating || !el) return
    const run = () => {
      const vw = document.documentElement.clientWidth || window.innerWidth
      setNarrow(!!props.phone || vw < STRIP_PHONE_MAX)
      const t = targetRef.current
      const rect = t ? (typeof t === 'function' ? t() : t) : centreRect()
      const vh = window.innerHeight
      // Up to 420 px tall; shorter (never under 240) when that keeps it clear of the selection.
      const listEl = el.querySelector<HTMLElement>('.cl__list')
      const chrome = el.offsetHeight - (listEl?.clientHeight ?? 0)
      const natural = Math.min(
        420,
        chrome + (listEl?.scrollHeight ?? 0),
        vh - 24,
      )
      const u = unionRect(rect, avoidRef.current)
      const room = Math.max(
        u.top - STRIP_GAP - STRIP_MARGIN,
        vh - (u.top + u.height) - STRIP_GAP - STRIP_MARGIN,
      )
      let h = Math.max(240, natural)
      if (room >= 240 && h > room) h = Math.floor(room)
      setMaxH(h)
      const p = placeStrip(
        rect,
        { width: el.offsetWidth, height: h },
        { width: vw, height: vh },
        avoidRef.current,
      )
      setPos((prev) =>
        prev && prev.left === p.left && prev.top === p.top
          ? prev
          : { left: p.left, top: p.top },
      )
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(el)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [floating, target, props.phone])

  const placed = !floating || !!pos
  useEffect(() => {
    if (placed) inputRef.current?.focus()
  }, [placed])

  useEffect(() => {
    if (!activeKey) return
    document
      .getElementById(idOf(activeKey))
      ?.scrollIntoView?.({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey])

  const pick = (key: string) => {
    if (key === 'show-all') {
      setShowAll(true)
      inputRef.current?.focus()
      return
    }
    const row = built.rows.find((r) => r.kind === 'item' && r.key === key)
    if (!row || row.kind !== 'item') return
    const next = pushRecent(recent, row.item.id)
    setRecent(next)
    props.onRecent?.(next)
    onPick(row.item.id)
    if (floating) request()
    else onClose()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(moveIndex(active, e.key === 'ArrowDown' ? 1 : -1, navCount))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeKey) pick(activeKey)
    } else if (e.key === 'Escape' && !floating) {
      e.preventDefault()
      onClose()
    }
  }

  const listId = `${uid}-list`
  const style = floating
    ? {
        zIndex: LAYERS.card,
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        maxHeight: maxH ?? undefined,
        visibility: pos ? ('visible' as const) : ('hidden' as const),
      }
    : undefined

  const card = (
    <div
      ref={rootRef}
      className="cl"
      data-testid={props.testId ?? 'command-list'}
      data-mode={mode}
      data-phone={narrow || props.phone || undefined}
      data-state={closing ? 'closing' : 'open'}
      style={style}
      onKeyDown={onKeyDown}
    >
      <div className="cl__search">
        <Icon name="search" size={18} />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeKey ? idOf(activeKey) : undefined}
          aria-label={tm('parts.menus.search')}
          placeholder={tm('parts.menus.searchPlaceholder')}
          autoComplete="off"
          spellCheck={false}
          className="cl__input"
          data-testid="cl-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
        />
      </div>
      <div
        id={listId}
        role="listbox"
        aria-label={tm('parts.menus.listLabel')}
        className="cl__list"
        data-testid="cl-list"
      >
        {built.rows.map((r) => {
          if (r.kind === 'heading')
            return (
              <div
                key={r.key}
                role="presentation"
                className="cl__group"
                data-testid={`cl-group-${r.key.slice(2)}`}
              >
                {r.key === 'h-recent' ? tm('parts.menus.recent') : r.label}
              </div>
            )
          const on = r.key === activeKey
          if (r.kind === 'showAll')
            return (
              <div
                key={r.key}
                id={idOf(r.key)}
                role="option"
                aria-selected={on}
                data-testid="cl-show-all"
                className="cl__row cl__row--all"
                data-active={on || undefined}
                onClick={() => pick(r.key)}
              >
                <span className="cl__label">{tm('parts.menus.showAll')}</span>
              </div>
            )
          return (
            <Row
              key={r.key}
              id={idOf(r.key)}
              item={r.item}
              on={on}
              recent={r.recent}
              onClick={() => pick(r.key)}
            />
          )
        })}
        {navCount === 0 && (
          <div className="cl__none" role="status" data-testid="cl-none">
            {tm('parts.menus.noMatch')}
          </div>
        )}
      </div>
      <span className="cl__sr" role="status" aria-live="polite">
        {query && navCount > 0
          ? tm('parts.menus.results', { count: built.matches })
          : ''}
      </span>
    </div>
  )
  return floating ? createPortal(card, document.body) : card
}

function Row({
  id,
  item,
  on,
  recent,
  onClick,
}: {
  id: string
  item: Command
  on: boolean
  recent: boolean
  onClick(): void
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={on}
      data-testid={`${recent ? 'cl-recent' : 'cl-item'}-${item.id}`}
      data-recent={recent || undefined}
      data-active={on || undefined}
      className={`cl__row ${item.danger ? 'cl__row--danger' : ''}`}
      onClick={onClick}
    >
      {item.icon && <Icon name={item.icon} size={18} />}
      <span className="cl__label">
        {item.label}
        {item.hint && <span className="cl__hint">{item.hint}</span>}
      </span>
      {item.shortcut && <kbd className="cl__key">{item.shortcut}</kbd>}
    </div>
  )
}
