import { t } from '../i18n/t'

/**
 * "12 due · Start" at the top of Home › Today (polish 2, item 11): the
 * recall cards due now across everything, one tap to start the All cards
 * session. Shows nothing while no card is due. The count is the same one the
 * sidebar's Review badge uses (read by the `due` index, not by scanning).
 */
export function DueTile({
  count,
  onStart,
}: {
  count: number
  onStart: () => void
}) {
  if (count <= 0) return null
  return (
    <button
      type="button"
      data-testid="due-tile"
      onClick={onStart}
      className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-accent bg-hover px-4 text-start hover:opacity-90"
    >
      <span className="text-base font-semibold text-accent tabular-nums">
        {t('home.due.tile', { count })}
      </span>
      <span aria-hidden className="text-accent">
        ›
      </span>
    </button>
  )
}
