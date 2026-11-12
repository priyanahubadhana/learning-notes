import { useState } from 'react'
import { SheetBase } from '../../design/parts/SheetBase'
import { t } from '../../i18n/t'
import { settingsRegistry } from '../builtinSettings'
import { tv } from './tv'

/**
 * SET-B23 "Replay starts the tour": a card that walks through Settings rows
 * one by one. The words come from the rows themselves (their name and help),
 * so they are already in the right language. "Show me" opens the row and it
 * glows. Skip with the close button or Esc at any time.
 */
export function TourPlayer({
  name,
  steps,
  onShow,
  onClose,
}: {
  name: string
  steps: readonly string[]
  /** Opens the row in its section and glows it. */
  onShow(settingId: string, sectionId: string): void
  onClose(): void
}) {
  const rows = steps
    .map((id) => settingsRegistry.get(id))
    .filter((d): d is NonNullable<typeof d> => !!d)
  const [at, setAt] = useState(0)
  const row = rows[at]
  if (!row) return null
  const last = at === rows.length - 1
  return (
    <SheetBase title={name} onClose={onClose} data-testid="sv3-tour">
      <p className="sv3-line-help" data-tour-step>
        {tv('sv3.tour.step', { n: at + 1, total: rows.length })}
      </p>
      <h3 className="sv3-row-name">{t(row.labelKey)}</h3>
      <p className="sv3-line-help">{t(row.descriptionKey)}</p>
      <div className="sv3-tour-actions">
        <button
          type="button"
          className="sv3-btn"
          data-tour-show
          onClick={() => {
            onShow(row.id, row.category)
            onClose()
          }}
        >
          {tv('sv3.tour.show')}
        </button>
        <button
          type="button"
          className="sv3-btn"
          disabled={at === 0}
          onClick={() => setAt(at - 1)}
        >
          {tv('sv3.tour.back')}
        </button>
        <button
          type="button"
          className="sv3-btn"
          data-tour-next
          data-autofocus=""
          onClick={() => (last ? onClose() : setAt(at + 1))}
        >
          {last ? tv('sv3.tour.done') : tv('sv3.tour.next')}
        </button>
      </div>
    </SheetBase>
  )
}
