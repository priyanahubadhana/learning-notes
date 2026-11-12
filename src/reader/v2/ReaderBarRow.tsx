import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../../app/tools/icons'
import type { MenuItem } from '../../app/ui'
import { Card, CardTrigger } from '../../design/parts/Card'
import { CardGroup, CardWell } from '../../design/parts/CardParts'
import { usePhone } from '../../design/parts/useAnchoredCard'
import { t } from '../../i18n/t'
import { bookAloudState } from '../aloud/bookAloud'
import { fitItems } from './barFit'

/** One button of the reader bar. Too many for the row: it moves into the ⋯ card. */
export interface BarItem {
  id: string
  label: string
  icon: IconName
  testId: string
  rank: number
  onClick: () => void
  pressed?: boolean
  popup?: 'dialog' | 'menu'
  expanded?: boolean
  /** Whole control instead of a plain button (Undo and Redo): shown in the card as it is. */
  node?: ReactNode
  /** Width in px (a plain button is 46). */
  w?: number
}

/** A row in the ⋯ card. */
export interface CardRowDef {
  id: string
  label: string
  icon: IconName
  testId?: string
  onClick: () => void
  checked?: boolean
  /** Stay open after the tap (zoom steps). */
  keepOpen?: boolean
}

export interface CardGroupDef {
  label: string
  rows: CardRowDef[]
  /** Existing menu items, shown as rows after `rows` (a pen-bar choice becomes one row per mode). */
  menu?: MenuItem[]
}

const asIcon = (n: string) => n as IconName

/** Menu items as card rows. */
function menuRows(list: MenuItem[]): CardRowDef[] {
  return list.flatMap((m, i): CardRowDef[] =>
    m.submenu
      ? m.submenu.map((s, j) => ({
          id: `${m.label}-${i}-${j}`,
          label: t('readerv2.more.toolBar', { mode: s.label }),
          icon: asIcon(s.icon),
          checked: s.checked,
          onClick: s.onSelect,
        }))
      : [
          {
            id: `${m.label}-${i}`,
            label: m.label,
            icon: asIcon(m.icon),
            onClick: m.onSelect,
          },
        ],
  )
}

type Rect = { left: number; top: number; width: number; height: number }

const BTN_W = 46
const MORE_W = 64
const CLOSE_W = 46
const PAGE_W = 96

/**
 * The reader bar's one row (slice 7a, RD-B01): ✕ Exit, title, "Page n of N",
 * the buttons that fit, and "⋯ ▾". What does not fit goes into the card; the
 * row never wraps and never scrolls sideways.
 */
export default function ReaderBarRow({
  lead,
  title,
  pageText,
  items: given,
  groups,
}: {
  lead: ReactNode
  title: string
  pageText: string
  items: BarItem[]
  groups: CardGroupDef[]
}) {
  // Listen shows pressed while the book is read aloud.
  const aloud = bookAloudState.useValue()
  const items = given.map((i) =>
    i.id === 'listen' ? { ...i, pressed: aloud === 'playing' } : i,
  )
  const row = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  // Where the card hangs: under the ⋯ button AND the whole bar (time-left line
  // included), so it never covers the bar.
  const [anchor, setAnchor] = useState<Rect | null>(null)

  useLayoutEffect(() => {
    const el = row.current
    if (!el) return
    const read = () => setWidth(el.getBoundingClientRect().width)
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const avail = width - CLOSE_W - MORE_W - (pageText ? PAGE_W : 0)
  const keep = fitItems(
    items.map((i) => ({ id: i.id, w: i.w ?? BTN_W, rank: i.rank })),
    avail,
  )
  const shown = items.filter((i) => keep.has(i.id))
  const hidden = items.filter((i) => !keep.has(i.id))
  const close = () => setAnchor(null)
  const phone = usePhone()
  // The card opens BELOW the bar and never over its buttons: its list scrolls
  // inside the room under the bar (a phone shows a sheet instead).
  const room =
    anchor && !phone
      ? Math.max(
          160,
          Math.floor(window.innerHeight - (anchor.top + anchor.height) - 104),
        )
      : undefined

  return (
    <div ref={row} className="rv2-row" data-testid="rv2-row" data-chrome>
      {lead}
      <h1 className="rv2-row__title">{title}</h1>
      {pageText && (
        <span className="rv2-row__page" data-testid="reader-page">
          {pageText}
        </span>
      )}
      {shown.map((i) =>
        i.node ? (
          <span key={i.id} className="rv2-row__node">
            {i.node}
          </span>
        ) : (
          <button
            key={i.id}
            type="button"
            className="rv2-btn"
            data-testid={i.testId}
            aria-label={i.label}
            aria-pressed={i.popup ? undefined : i.pressed}
            aria-haspopup={i.popup}
            aria-expanded={i.popup ? i.expanded : undefined}
            data-pressed={i.pressed || undefined}
            onClick={i.onClick}
          >
            <Icon name={i.icon} size={18} />
          </button>
        ),
      )}
      <CardTrigger
        open={!!anchor}
        label={t('reader.more')}
        testId="reader-more"
        className="rv2-more"
        onClick={(el) => {
          if (anchor) return setAnchor(null)
          const r = el.getBoundingClientRect()
          const bar = el.closest('.rv2-bar')?.getBoundingClientRect()
          setAnchor({
            left: r.left,
            top: r.top,
            width: r.width,
            height: Math.max(r.height, (bar?.bottom ?? r.bottom) - r.top),
          })
        }}
      >
        <Icon name="more" size={18} />
      </CardTrigger>
      {anchor && (
        <Card
          anchor={anchor}
          size="panel"
          title={t('reader.more')}
          onClose={close}
          testId="reader-more-card"
        >
          <div
            className="rv2-card-scroll"
            style={room ? { maxHeight: room } : undefined}
          >
            {hidden.length > 0 && (
              <CardGroup label={t('readerv2.more.bar')}>
                <CardWell>
                  {hidden.map((i) =>
                    i.node ? (
                      <div key={i.id} className="rv2-card-node">
                        {i.node}
                      </div>
                    ) : (
                      <button
                        key={i.id}
                        type="button"
                        className="pcard-row"
                        data-testid={`${i.testId}-card`}
                        onClick={() => {
                          close()
                          i.onClick()
                        }}
                      >
                        <span>{i.label}</span>
                        <Icon name={i.icon} size={18} />
                      </button>
                    ),
                  )}
                </CardWell>
              </CardGroup>
            )}
            {groups
              .map((g) => ({
                ...g,
                rows: [...g.rows, ...menuRows(g.menu ?? [])],
              }))
              .filter((g) => g.rows.length > 0)
              .map((g) => (
                <CardGroup key={g.label} label={g.label}>
                  <CardWell>
                    {g.rows.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="pcard-row"
                        data-testid={r.testId}
                        aria-pressed={r.checked}
                        onClick={() => {
                          if (!r.keepOpen) close()
                          r.onClick()
                        }}
                      >
                        <span>{r.label}</span>
                        {r.checked ? (
                          <Icon name="check" size={18} />
                        ) : (
                          <Icon name={r.icon} size={18} />
                        )}
                      </button>
                    ))}
                  </CardWell>
                </CardGroup>
              ))}
          </div>
        </Card>
      )}
    </div>
  )
}
