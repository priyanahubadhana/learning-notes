import type { ReactNode } from 'react'
import { Card, type CardCloseReason } from '../../../design/parts/Card'
import { t } from '../../../i18n/t'
import { Icon, type IconName } from '../icons'
import './toolbarV8.css'

export interface FoldEntry {
  id: string
  label: string
  icon?: IconName
  pressed?: boolean
  onPick: () => void
}

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

/**
 * The list behind "⋯ n": everything that did not fit, each one tappable
 * (TB-08, TB-57). A tap runs the entry; the list closes or is replaced by the
 * entry's own card (never a card from a card).
 */
export function FoldCard({
  anchor,
  entries,
  onClose,
  testId,
  title,
  children,
}: {
  anchor: HTMLElement
  entries: FoldEntry[]
  onClose: (reason: CardCloseReason) => void
  testId: string
  title?: string
  /** More below the list (the ⋯ card's own group). */
  children?: ReactNode
}) {
  return (
    <Card
      anchor={anchor}
      size="pick"
      title={title ?? t('v8.fold.title')}
      onClose={onClose}
      testId={testId}
    >
      <div className="v8fold" role="group" aria-label={t('v8.fold.title')}>
        {entries.length === 0 ? (
          <p className="v8note">{t('v8.card.empty')}</p>
        ) : null}
        {entries.map((e) => (
          <button
            key={e.id}
            type="button"
            data-chrome
            data-testid={`v8-fold-${e.id}`}
            className="v8fold-row"
            aria-pressed={e.pressed}
            onMouseDown={keepFocus}
            onClick={e.onPick}
          >
            {e.icon ? <Icon name={e.icon} size={18} /> : null}
            <span>{e.label}</span>
          </button>
        ))}
      </div>
      {children}
    </Card>
  )
}
