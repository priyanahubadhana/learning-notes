import { useRef, type KeyboardEvent } from 'react'
import { Icon } from '../../app/tools/icons'
import { ScrollTrack } from '../../design/parts/ScrollTrack'
import { t } from '../../i18n/t'
import type { ReviewScope } from '../../recall/reviewService'
import { chipKey, chipScope, type ChipKey } from './chipScope'

export interface ChipDeck {
  id: string
  name: string
  colour?: string
}

export interface ChipsProps {
  decks: ChipDeck[]
  wrongCount: number
  scope: ReviewScope
  onScope: (s: ReviewScope) => void
  /** Present = the More button shows, first in the row. */
  onMore?: () => void
}

/**
 * The Professional row of Review home: More first, then one line of chips
 * (All cards, a chip per deck, Got wrong) that scrolls sideways with a thin
 * track. A chip changes what the hero below counts and what Start opens.
 */
export function Chips({
  decks,
  wrongCount,
  scope,
  onScope,
  onMore,
}: ChipsProps) {
  const current = chipKey(scope)
  const all: { key: ChipKey; label: string; colour?: string }[] = [
    { key: 'all', label: t('rv2.chip.all') },
    ...decks.map((d) => ({
      key: `deck:${d.id}`,
      label: d.name,
      colour: d.colour,
    })),
    { key: 'wrong', label: t('rv2.chip.wrong', { count: wrongCount }) },
  ]
  const root = useRef<HTMLDivElement>(null)
  // A radiogroup: arrows move the pick, only the picked chip takes Tab.
  const move = (e: KeyboardEvent, i: number) => {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0
    if (!step) return
    e.preventDefault()
    const j = (i + step + all.length) % all.length
    onScope(chipScope(all[j].key))
    root.current?.querySelectorAll<HTMLElement>('[role="radio"]')[j]?.focus()
  }
  return (
    <div className="rv2-prow" ref={root}>
      {onMore && (
        <button
          type="button"
          className="rv2-btn rv2-btn--sm rv2-more"
          data-testid="rv2-more"
          aria-haspopup="dialog"
          onClick={(e) => {
            // Safari does not focus a tapped button: focus it so the sheet can give focus back.
            e.currentTarget.focus()
            onMore()
          }}
        >
          <Icon name="sliders" size={16} />
          {t('rv2.more')} <span aria-hidden>▾</span>
        </button>
      )}
      <ScrollTrack
        wrapClassName="rv2-chips-wrap"
        className="rv2-chips"
        role="radiogroup"
        aria-label={t('rv2.chip.label')}
        data-testid="rv2-chips"
      >
        {all.map((c, i) => (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={c.key === current}
            tabIndex={c.key === current ? 0 : -1}
            className="rv2-chip"
            onClick={() => onScope(chipScope(c.key))}
            onKeyDown={(e) => move(e, i)}
          >
            {c.colour && (
              <span
                className="rv2-chip__dot"
                style={{ background: c.colour }}
                aria-hidden
              />
            )}
            {c.label}
          </button>
        ))}
      </ScrollTrack>
    </div>
  )
}
