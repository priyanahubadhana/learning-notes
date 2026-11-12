import { Glyph } from '../../app/tools/icons'
import { tp } from './textMisc'
import './partsMisc.css'

export type EmptyStateProps = {
  /** page: calm, no border, centred. inline: today's dashed box. */
  variant?: 'page' | 'inline'
  /** default; offline and error fill in plain words when text is left out. */
  kind?: 'default' | 'offline' | 'error'
  icon?: string
  title?: string
  text?: string
  /** The label of the one primary button. */
  action?: string
  onAction?: () => void
  secondary?: string
  onSecondary?: () => void
  /** Opens a pop-up explanation (never swaps the content). */
  learnMore?: () => void
  /** True when this replaces content after a filter: announces itself. */
  replacesContent?: boolean
  testId?: string
  className?: string
}

/**
 * The one empty screen of the app (SP-08): an icon, one line that says what
 * this is, and one button for the next step. Same words in both modes.
 */
export function EmptyState({
  variant = 'page',
  kind = 'default',
  icon,
  title,
  text,
  action,
  onAction,
  secondary,
  onSecondary,
  learnMore,
  replacesContent = false,
  testId = 'empty-state',
  className = '',
}: EmptyStateProps) {
  const offline = kind === 'offline'
  const error = kind === 'error'
  const shownIcon = icon ?? (offline ? 'network' : error ? 'rotate' : 'inbox')
  const shownTitle =
    title ??
    (offline
      ? tp('parts.empty.offlineTitle')
      : error
        ? tp('parts.empty.errorTitle')
        : undefined)
  const shownText =
    text ??
    (offline
      ? tp('parts.empty.offlineText')
      : error
        ? tp('parts.empty.errorText')
        : '')
  const shownAction = action ?? (error ? tp('parts.empty.tryAgain') : undefined)
  const iconSize = variant === 'page' ? 40 : 28

  return (
    <div
      data-testid={testId}
      data-variant={variant}
      data-kind={kind}
      role={replacesContent ? 'status' : undefined}
      className={`pm-empty pm-empty--${variant} ${className}`.trim()}
    >
      {variant === 'page' ? (
        <span aria-hidden className="pm-empty__disc">
          <Glyph icon={shownIcon} size={iconSize} />
        </span>
      ) : (
        <span aria-hidden>
          <Glyph icon={shownIcon} size={iconSize} />
        </span>
      )}
      {shownTitle && <h3 className="pm-empty__title">{shownTitle}</h3>}
      {shownText && <p className="pm-empty__text">{shownText}</p>}
      {shownAction && onAction && (
        <button
          type="button"
          className="pm-btn"
          data-testid={`${testId}-action`}
          onClick={onAction}
        >
          {shownAction}
        </button>
      )}
      {secondary && onSecondary && (
        <button
          type="button"
          className="pm-btn pm-btn--quiet"
          data-testid={`${testId}-secondary`}
          onClick={onSecondary}
        >
          {secondary}
        </button>
      )}
      {learnMore && (
        <button
          type="button"
          className="pm-btn pm-btn--quiet"
          data-testid={`${testId}-learn`}
          onClick={learnMore}
        >
          {tp('parts.empty.learnMore')}
        </button>
      )}
    </div>
  )
}
