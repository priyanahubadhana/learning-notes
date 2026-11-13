import { t } from '../i18n/t'

const primary =
  'aifw-primary inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-on-accent sm:w-auto'

/**
 * The bottom row of Build and Studio (owner comment A1). On a phone it is
 * stacked: the path (it wraps), then the effort chip with the estimate, then
 * a full-width Run. From a tablet up it is one row, so nothing overlaps.
 */
export function RunBar({
  path,
  chip,
  estimate,
  runLabel,
  disabled,
  onRun,
  runTestId,
  children,
}: {
  /** Where the result goes, in words; empty = not chosen yet. */
  path: string
  /** The effort level, as a small label. */
  chip: string
  /** The cost line, already worded (it says "estimated"). */
  estimate: string
  runLabel: string
  disabled: boolean
  onRun: () => void
  runTestId: string
  /** Extra buttons placed before Run (for example Clear plan). */
  children?: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
      data-testid="aifw-runbar"
    >
      <p
        className="min-w-0 text-sm break-words sm:min-w-48 sm:flex-1"
        data-testid="aifw-runbar-path"
      >
        {path ? t('aifw.bar.path', { path }) : t('aifw.bar.pathNone')}
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span
          className="inline-flex min-h-8 items-center rounded-full border border-line px-3 text-xs"
          data-testid="aifw-runbar-chip"
        >
          {chip}
        </span>
        <span className="text-xs text-muted" data-testid="aifw-runbar-estimate">
          {estimate}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {children}
        <button
          type="button"
          data-testid={runTestId}
          disabled={disabled}
          className={primary}
          onClick={onRun}
        >
          {runLabel}
        </button>
      </div>
    </div>
  )
}
