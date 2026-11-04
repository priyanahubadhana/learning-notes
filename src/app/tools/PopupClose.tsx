import { t } from '../../i18n/t'

/**
 * The visible ✕ every pop-up, menu and tray carries (44 px target, named
 * "Close"), in addition to tapping outside it, Esc and scrolling.
 */
export function PopupClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      data-popup-close
      aria-label={t('popup.close')}
      title={t('popup.close')}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClose}
      className="grid size-11 shrink-0 place-items-center rounded-lg text-lg leading-none text-ink-soft hover:bg-hover hover:text-ink"
    >
      <span aria-hidden>✕</span>
    </button>
  )
}

/** The pop-up's title row: its name on the left, the ✕ in the top corner. */
export function PopupHeader({
  title,
  onClose,
}: {
  title?: string
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 ps-2">
      <span className="truncate text-[11px] tracking-[0.06em] text-muted uppercase">
        {title}
      </span>
      <PopupClose onClose={onClose} />
    </div>
  )
}
