import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Icon, type IconName } from '../../app/tools/icons'
import { LAYERS } from '../../app/overlay'
import { placeBar, splitActions } from './objectBarPlace'
import { tp } from './textMisc'
import './partsMisc.css'

export type ObjectBarAction = {
  id: string
  icon: IconName
  label: string
  danger?: boolean
  /** The area's unlock id: Pro actions live in the "…" menu. */
  pro?: string
  pressed?: boolean
  disabled?: boolean
  menu?: { id: string; label: string; danger?: boolean }[]
}

export type ObjectBarProps = {
  kind: 'box' | 'text' | 'picture' | 'table' | 'node' | 'rows'
  /** The selected thing; leave out to draw the bar in place (gallery). */
  target?: DOMRect | (() => DOMRect)
  actions: ObjectBarAction[]
  /** "3 selected" */
  count?: number
  /** Force a narrower bar (tests, gallery overflow demo). */
  maxWidth?: number
  onAction(id: string): void
  /** Esc: give focus back to the selected object. */
  onEscape?: () => void
}

/**
 * The bar that appears over a selected thing (SP-09). One toolbar, roving
 * focus, 44 pt buttons, overflow goes to a "…" menu (never sideways scroll).
 */
export function ObjectBar({
  kind,
  target,
  actions,
  count,
  maxWidth,
  onAction,
  onEscape,
}: ObjectBarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [vw, setVw] = useState(
    maxWidth ?? (typeof window === 'undefined' ? 1024 : window.innerWidth - 24),
  )
  const [open, setOpen] = useState(false)
  const [focusIdx, setFocusIdx] = useState(0)

  const label = count && count > 1 ? tp('parts.objbar.selected', { count }) : ''
  const { shown, overflow } = splitActions(actions, vw, label ? 110 : 0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = maxWidth ?? window.innerWidth - 24
    if (w !== vw) setVw(w)
    if (!target) return
    const rect = typeof target === 'function' ? target() : target
    setPos(
      placeBar(
        rect,
        { width: el.offsetWidth, height: el.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    )
  }, [target, shown.length, overflow.length, maxWidth, vw])

  const buttons: ObjectBarAction[] = [...shown]
  const hasMore = overflow.length > 0
  const total = buttons.length + (hasMore ? 1 : 0)

  const move = (e: KeyboardEvent, delta: number) => {
    e.preventDefault()
    const next = (focusIdx + delta + total) % total
    setFocusIdx(next)
    ref.current
      ?.querySelectorAll<HTMLElement>('[data-bar-btn]')
      [next]?.focus()
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') move(e, 1)
    else if (e.key === 'ArrowLeft') move(e, -1)
    else if (e.key === 'Home') move(e, -focusIdx)
    else if (e.key === 'End') move(e, total - 1 - focusIdx)
    else if (e.key === 'Escape') {
      if (open) setOpen(false)
      else onEscape?.()
    }
  }

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={tp('parts.objbar.label')}
      data-testid="object-bar"
      data-kind={kind}
      className={`pm-ob ${target ? 'pm-ob--fixed' : ''}`}
      style={{
        zIndex: LAYERS.pill,
        maxWidth: maxWidth ?? undefined,
        ...(pos ? { left: pos.left, top: pos.top } : {}),
        ...(target && !pos ? { visibility: 'hidden' } : {}),
      }}
      onKeyDown={onKeyDown}
    >
      {label && (
        <span className="pm-ob__state" data-testid="object-bar-count">
          {label}
        </span>
      )}
      {buttons.map((a, i) => (
        <button
          key={a.id}
          type="button"
          data-bar-btn
          data-testid={`ob-${a.id}`}
          aria-label={a.label}
          title={a.label}
          aria-pressed={a.pressed === undefined ? undefined : a.pressed}
          disabled={a.disabled}
          tabIndex={i === focusIdx ? 0 : -1}
          className={`pm-ob__btn ${a.danger ? 'pm-ob__btn--danger' : ''}`}
          onFocus={() => setFocusIdx(i)}
          onClick={() => onAction(a.id)}
        >
          <Icon name={a.icon} size={20} />
        </button>
      ))}
      {hasMore && (
        <>
          <button
            type="button"
            data-bar-btn
            data-testid="ob-more"
            aria-label={tp('parts.objbar.more')}
            title={tp('parts.objbar.more')}
            aria-haspopup="menu"
            aria-expanded={open}
            tabIndex={buttons.length === focusIdx ? 0 : -1}
            className="pm-ob__btn"
            onFocus={() => setFocusIdx(buttons.length)}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name="more" size={20} />
          </button>
          {open && (
            <div role="menu" className="pm-ob__menu" data-testid="ob-menu">
              {overflow.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="menuitem"
                  disabled={a.disabled}
                  data-testid={`ob-menu-${a.id}`}
                  className={`pm-ob__item ${a.danger ? 'pm-ob__item--danger' : ''}`}
                  onClick={() => {
                    setOpen(false)
                    onAction(a.id)
                  }}
                >
                  <Icon name={a.icon} size={18} />
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
