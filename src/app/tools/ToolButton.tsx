import { CopyPasteButton } from './CopyPasteMenu'
import { Icon } from './icons'
import { ThemeArrow } from './ThemePicker'
import { comingText, toolLabel, runTool, type ToolDef } from './toolRegistry'

/** Keeps the editor's selection and keyboard when a button is pressed. */
const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

/**
 * One tool as a button. On the short bar it is an icon (the name is for
 * screen readers and the tooltip); on the ribbon the name sits under the
 * icon. A tool that is not built yet looks dimmed, says why in its tooltip
 * and, when pressed, in a message.
 */
export function ToolButton(props: ToolButtonProps) {
  const { tool, px, variant } = props
  if (tool.id === 'copyPaste') {
    return <CopyPasteButton px={px} variant={variant} onRun={props.onRun} />
  }
  // The Theme button keeps its one-tap cycle; a small arrow beside it opens the list.
  if (tool.id === 'theme') {
    return (
      <span className="inline-flex shrink-0 items-stretch">
        <PlainToolButton {...props} />
        <ThemeArrow
          px={px}
          vertical={variant === 'ribbon'}
          onRun={props.onRun}
        />
      </span>
    )
  }
  return <PlainToolButton {...props} />
}

interface ToolButtonProps {
  tool: ToolDef
  px: number
  variant: 'bar' | 'ribbon'
  active?: boolean
  /** Greyed and not pressable (Undo with nothing to undo). */
  disabled?: boolean
  /** Show the name as a hover tooltip (the short bar with tips on). */
  tip?: boolean
  /** Add the shortcut to the tooltip. */
  hint?: boolean
  /** Called after the tool ran (the ribbon closes its tools). */
  onRun?: () => void
}

function PlainToolButton({
  tool,
  px,
  variant,
  active,
  disabled,
  tip,
  hint,
  onRun,
}: {
  tool: ToolDef
  px: number
  variant: 'bar' | 'ribbon'
  active?: boolean
  /** Greyed and not pressable (Undo with nothing to undo). */
  disabled?: boolean
  /** Show the name as a hover tooltip (the short bar with tips on). */
  tip?: boolean
  /** Add the shortcut to the tooltip. */
  hint?: boolean
  /** Called after the tool ran (the ribbon closes its tools). */
  onRun?: () => void
}) {
  const label = toolLabel(tool)
  const shortcut = hint ? tool.shortcut?.() : undefined
  const title = tool.coming
    ? `${label}. ${comingText(tool.coming)}`
    : tip || variant === 'ribbon'
      ? label + (shortcut ? ` (${shortcut})` : '')
      : undefined
  const min = Math.max(px, 44)
  return (
    <button
      type="button"
      data-bar-btn
      data-action={tool.id}
      data-coming={tool.coming ? '' : undefined}
      aria-label={label}
      aria-pressed={active ?? undefined}
      disabled={disabled || undefined}
      aria-disabled={tool.coming ? true : undefined}
      title={title}
      onMouseDown={keepFocus}
      onClick={() => {
        runTool(tool.id)
        if (!tool.coming && !tool.repeat) onRun?.()
      }}
      style={{ minHeight: min, minWidth: min }}
      className={`relative shrink-0 rounded-xl text-ink-soft hover:bg-hover hover:text-ink motion-safe:transition-colors aria-disabled:opacity-60 disabled:opacity-40 ${
        variant === 'ribbon'
          ? 'flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 text-[11px] leading-tight'
          : 'grid place-items-center px-2'
      } ${active ? 'bg-hover !text-accent' : ''}`}
    >
      <Icon name={tool.icon} />
      {variant === 'ribbon' && (
        <span className="max-w-[4.75rem] text-center break-words">{label}</span>
      )}
      {active && variant === 'bar' && (
        // Not colour alone: a small bar under the icon says "on".
        <span
          aria-hidden
          className="absolute bottom-1 h-0.5 w-3.5 rounded-full bg-current"
        />
      )}
    </button>
  )
}
