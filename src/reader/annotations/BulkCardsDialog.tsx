import { useState } from 'react'
import type { Annotation } from '../../core/types'
import { t } from '../../i18n/t'
import { cardInputFor, cardText } from '../../recall/cardFromAnnotation'

/**
 * "Make cards from all highlights" (CR3): a preview list, untick what you do
 * not want, then one button. The caller makes the cards and offers one Undo.
 */
export function BulkCardsDialog({
  annotations,
  onMake,
  onCancel,
}: {
  annotations: readonly Annotation[]
  onMake: (chosen: Annotation[]) => void
  onCancel: () => void
}) {
  // Highlights that already have a card, or no usable text, are not listed.
  const list = annotations.filter((a) => !a.cardIds?.length && cardInputFor(a))
  const [off, setOff] = useState<ReadonlySet<string>>(new Set())
  const chosen = list.filter((a) => !off.has(a.id))
  return (
    <div
      data-chrome
      role="dialog"
      aria-label={t('recall.bulkTitle')}
      data-testid="bulk-cards"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/30 p-3"
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <div className="mt-8 w-full max-w-xl rounded-xl border border-line bg-bg p-4 shadow-xl">
        <h2 className="mb-1 text-base font-semibold">
          {t('recall.bulkTitle')}
        </h2>
        {list.length === 0 ? (
          <p className="my-3 text-sm text-muted">{t('recall.bulkNone')}</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted">{t('recall.bulkHelp')}</p>
            <ul className="mb-3 flex max-h-[50vh] flex-col gap-1 overflow-auto">
              {list.map((a) => (
                <li key={a.id}>
                  <label className="flex min-h-11 items-start gap-2 rounded-lg px-2 py-1 text-sm hover:bg-hover">
                    <input
                      type="checkbox"
                      checked={!off.has(a.id)}
                      onChange={(e) =>
                        setOff((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.delete(a.id)
                          else next.add(a.id)
                          return next
                        })
                      }
                      className="mt-1 size-5"
                    />
                    <span>
                      {a.note ? (
                        <>
                          <strong>{a.note}</strong>
                          <br />
                        </>
                      ) : null}
                      {cardText(a.quote?.exact ?? '')}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover"
          >
            {t('annot.cancel')}
          </button>
          {list.length > 0 && (
            <button
              type="button"
              data-testid="bulk-make"
              disabled={chosen.length === 0}
              onClick={() => onMake(chosen)}
              className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {t('recall.bulkMake', { count: chosen.length })}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
