import { useState, type ReactNode } from 'react'
import { MenuPopover, type MenuItem } from '../../app/ui'
import { t } from '../../i18n/t'
import './StudyTabHeader.css'

export interface HeaderChip {
  id: string
  label: string
  onRemove: () => void
  /** A saved filter: tapping the name applies it. */
  onSelect?: () => void
}

/**
 * The one header of every study tab (slice 15, flag study.v2): 52 px, title,
 * count pill, Filter ▾, Sort ▾, "⋯". A menu with no items has no button, so a
 * tab shows only what it can do. Active filters show as chips with ✕ below.
 */
export function StudyTabHeader({
  title,
  count,
  countLabel,
  filterItems,
  sortItems,
  moreItems,
  chips = [],
  action,
  filterLabel,
}: {
  title: string
  count: number
  /** Spoken text for the count pill ("12 cards"). */
  countLabel: string
  filterItems?: MenuItem[]
  sortItems?: MenuItem[]
  moreItems?: MenuItem[]
  chips?: HeaderChip[]
  /** The tab's main button (Practise). */
  action?: ReactNode
  /** Name of the first menu when it is not a filter ("Show"). */
  filterLabel?: string
}) {
  const [open, setOpen] = useState<{
    kind: 'filter' | 'sort' | 'more'
    anchor: DOMRect
  } | null>(null)
  const menu = (
    kind: 'filter' | 'sort' | 'more',
    label: string,
    items: MenuItem[] | undefined,
    text: string,
  ) =>
    items &&
    items.length > 0 && (
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open?.kind === kind}
        aria-label={label}
        data-testid={`study-header-${kind}`}
        onClick={(e) =>
          setOpen({ kind, anchor: e.currentTarget.getBoundingClientRect() })
        }
        className="study-header__btn"
      >
        {text}
      </button>
    )
  const items =
    open?.kind === 'filter'
      ? filterItems
      : open?.kind === 'sort'
        ? sortItems
        : moreItems
  return (
    <div data-testid="study-header" className="study-header-wrap">
      <header className="study-header">
        <h2 className="study-header__title">{title}</h2>
        <span
          className="study-header__count"
          aria-label={countLabel}
          data-testid="study-header-count"
        >
          {count}
        </span>
        <span className="study-header__gap" />
        {menu(
          'filter',
          filterLabel ?? t('st2.filter'),
          filterItems,
          `${filterLabel ?? t('st2.filter')} ▾`,
        )}
        {menu('sort', t('st2.sort'), sortItems, `${t('st2.sort')} ▾`)}
        {menu('more', t('st2.more'), moreItems, '⋯')}
        {action}
      </header>
      {chips.length > 0 && (
        <ul className="study-header__chips" aria-label={t('st2.filter')}>
          {chips.map((chip) => (
            <li key={chip.id} className="study-header__chip">
              {chip.onSelect ? (
                <button
                  type="button"
                  onClick={chip.onSelect}
                  className="study-header__chipname"
                >
                  {chip.label}
                </button>
              ) : (
                chip.label
              )}
              <button
                type="button"
                aria-label={t('st2.filter.remove', { name: chip.label })}
                onClick={chip.onRemove}
                className="study-header__chipx"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && items && (
        <MenuPopover
          anchor={open.anchor}
          items={items}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}
