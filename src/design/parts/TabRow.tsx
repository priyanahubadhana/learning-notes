import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { overlay, placeBeside } from '../../app/overlay'
import { Icon } from '../../app/tools/icons'
import { CreateTab, TabEditor } from './TabEditor'
import { canAdd, localTabSetStore, type TabSetStore } from './tabSets'
import { tp } from './tp'
import { useTabSet, type TabDef, type TabSource } from './useTabSet'
import './TabRow.css'

export type { TabDef, TabSource } from './useTabSet'

export type TabRowProps = {
  /** Where this row's choice is saved ('pageTabs', 'panel', 'library'...). */
  setKey: string
  catalog: TabDef[]
  defaults: string[]
  value: string
  onPick(id: string): void
  variant?: 'underline' | 'pill'
  /** Shows the "+" (default true). */
  editable?: boolean
  /** "Create your own tab" pointers (saved filters, shelves...). */
  sources?: () => TabSource[]
  /** Professional entries show only when their unlock id is on. */
  unlocked?: (id: string) => boolean
  /** Accessible name of the row. */
  label?: string
  store?: TabSetStore
}

const ITEMS = '[role="menuitem"]:not([disabled])'

interface Scroll {
  left: number
  client: number
  total: number
}

/** SP-03: one line of tabs that scrolls sideways, with a "+" to add, create and edit. */
export function TabRow(props: TabRowProps) {
  const {
    setKey,
    catalog,
    defaults,
    value,
    onPick,
    variant = 'underline',
    editable = true,
    sources,
    unlocked,
    store = localTabSetStore,
  } = props
  const usable = useMemo(
    () => catalog.filter((c) => !c.pro || (unlocked ? unlocked(c.pro) : true)),
    [catalog, unlocked],
  )
  const set = useTabSet(setKey, usable, defaults, store)
  const { tabs } = set
  const rowId = useId()
  const scroller = useRef<HTMLDivElement | null>(null)
  const [plus, setPlus] = useState<HTMLButtonElement | null>(null)
  const menuEl = useRef<HTMLDivElement | null>(null)
  const [scroll, setScroll] = useState<Scroll>({ left: 0, client: 0, total: 0 })
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialog, setDialog] = useState<'edit' | 'create' | null>(null)

  const measure = () => {
    const el = scroller.current
    if (!el) return
    const next = {
      left: el.scrollLeft,
      client: el.clientWidth,
      total: el.scrollWidth,
    }
    setScroll((p) =>
      p.left === next.left && p.client === next.client && p.total === next.total
        ? p
        : next,
    )
  }
  useEffect(() => {
    const el = scroller.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [tabs.length])

  const overflows = scroll.total > scroll.client + 1
  const thumbW = overflows ? (scroll.client / scroll.total) * 100 : 100
  const thumbX = overflows ? (scroll.left / scroll.total) * 100 : 0

  const selected = tabs.some((x) => x.id === value) ? value : tabs[0]?.id
  const focusTab = (i: number) => {
    const btns = scroller.current?.querySelectorAll<HTMLElement>('[role="tab"]')
    const b = btns?.[i]
    b?.focus()
    b?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const n = tabs.length
    let to = -1
    if (e.key === 'ArrowRight') to = (i + 1) % n
    else if (e.key === 'ArrowLeft') to = (i - 1 + n) % n
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = n - 1
    if (to < 0) return
    e.preventDefault()
    focusTab(to)
  }

  // SP-08: a newly added tab scrolls into view (instantly with reduced motion).
  const prevIds = useRef<string[] | null>(null)
  useEffect(() => {
    const before = prevIds.current
    prevIds.current = tabs.map((t) => t.id)
    if (!before) return
    const added = tabs.find((t) => !before.includes(t.id))
    if (!added) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const el = scroller.current?.querySelector<HTMLElement>(
      `[data-tab-id="${CSS.escape(added.id)}"]`,
    )
    el?.scrollIntoView?.({
      block: 'nearest',
      inline: 'nearest',
      behavior: reduce?.matches ? 'auto' : 'smooth',
    })
  }, [tabs])

  const inSet = new Set(set.data.ids)
  const addable = usable.filter((c) => !inSet.has(c.id))
  const room = canAdd(set.data)

  useEffect(() => {
    if (!menuOpen) return
    const el = menuEl.current
    const b = plus
    if (!el || !b) return
    const r = b.getBoundingClientRect()
    const p = placeBeside(
      { left: r.left, top: r.top, width: r.width, height: r.height },
      { width: el.offsetWidth, height: el.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    )
    // Position the menu once it is measured; no other state depends on it.
    el.style.left = `${p.left}px`
    el.style.top = `${p.top}px`
    el.querySelector<HTMLElement>(ITEMS)?.focus()
    const h = overlay.open({
      id: `tabrow-menu-${rowId}`,
      layer: 'menu',
      opener: b,
      close: () => setMenuOpen(false),
      inside: (n) => el.contains(n),
    })
    return () => h.close()
  }, [menuOpen, rowId, plus])

  const onMenuKey = (e: KeyboardEvent) => {
    const items = Array.from(
      menuEl.current?.querySelectorAll<HTMLElement>(ITEMS) ?? [],
    )
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(i + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length]?.focus()
    }
  }
  const pick = (fn: () => void) => {
    setMenuOpen(false)
    fn()
  }

  const srcs = dialog === 'create' ? (sources?.() ?? []) : []

  return (
    <div className="tabrow" data-variant={variant} data-testid="tabrow">
      <div className="tabrow-line">
        <div
          ref={scroller}
          className="tabrow-scroll"
          role="tablist"
          aria-label={props.label ?? tp('parts.tabs.label')}
          onScroll={measure}
        >
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className="tabrow-tab"
              aria-selected={tab.id === selected}
              tabIndex={tab.id === selected ? 0 : -1}
              data-tab-id={tab.id}
              onClick={() => onPick(tab.id)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {tab.icon ? <Icon name={tab.icon} size={16} /> : null}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        {editable ? (
          <button
            ref={setPlus}
            type="button"
            className="tabrow-plus"
            data-testid="tabrow-plus"
            data-popup-trigger=""
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={tp('parts.tabs.add')}
            onClick={() => {
              setMenuOpen((o) => !o)
            }}
          >
            <Icon name="plus" size={18} />
          </button>
        ) : null}
      </div>
      <div
        className="tabrow-track"
        data-testid="tabrow-track"
        hidden={!overflows}
        aria-hidden="true"
      >
        <span
          className="tabrow-thumb"
          style={{ width: `${thumbW}%`, left: `${thumbX}%` }}
        />
      </div>
      {menuOpen
        ? createPortal(
            <div
              ref={menuEl}
              role="menu"
              className="tabrow-menu"
              aria-label={tp('parts.tabs.add')}
              onKeyDown={onMenuKey}
            >
              {room
                ? addable.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="menuitem"
                      data-testid="tabrow-add"
                      onClick={() => pick(() => set.add(c.id))}
                    >
                      {tp('parts.tabs.add')}: {c.label}
                    </button>
                  ))
                : null}
              <button
                type="button"
                role="menuitem"
                data-testid="tabrow-create"
                disabled={!room}
                onClick={() => pick(() => setDialog('create'))}
              >
                {tp('parts.tabs.create')}
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="tabrow-edit"
                onClick={() => pick(() => setDialog('edit'))}
              >
                {tp('parts.tabs.edit')}
              </button>
            </div>,
            document.body,
          )
        : null}
      {dialog === 'edit' ? (
        <TabEditor set={set} anchor={plus} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === 'create' ? (
        <CreateTab
          sources={srcs}
          anchor={plus}
          onClose={() => setDialog(null)}
          onCreate={(label, source) => {
            set.addCustom(label, source)
            setDialog(null)
          }}
        />
      ) : null}
    </div>
  )
}
