import { Tip } from '../../help/Help'
import { t } from '../../i18n/t'
import { AnchoredMenu } from './AnchoredMenu'
import { useAnchoredMenu } from './useAnchoredMenu'
import { Icon } from './icons'
import { COPY_PASTE_TOOLS } from './copyPasteTools'
import { findTool, runTool, toolLabel } from './toolRegistry'

/**
 * One "Copy & paste" button with a small arrow that opens a menu: Copy as plain
 * text, Copy as Markdown, Copy page with pictures, Paste as plain text.
 */
export function CopyPasteButton({
  px,
  variant,
  onRun,
}: {
  px: number
  variant: 'bar' | 'ribbon'
  /** Called after an item ran (the ribbon closes its tools). */
  onRun?: () => void
}) {
  const menu = useAnchoredMenu()
  const label = t('tool.copyPaste')
  const min = Math.max(px, 44)
  return (
    <>
      <Tip id="tool.copyPaste" touchInfo={false} className="inline-flex">
        <button
          type="button"
          data-bar-btn
          data-action="copyPaste"
          {...menu.trigger}
          aria-label={label}
          onMouseDown={(e) => e.preventDefault()}
          onClick={menu.toggle}
          style={{ minHeight: min, minWidth: min }}
          className={`relative shrink-0 rounded-xl text-ink-soft hover:bg-hover hover:text-ink motion-safe:transition-colors ${
            variant === 'ribbon'
              ? 'flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 text-[11px] leading-tight'
              : 'inline-flex items-center justify-center gap-0.5 px-2'
          }`}
        >
          <span className="inline-flex items-center">
            <Icon name="copy" />
            <Icon name="chevronDown" size={12} />
          </span>
          {variant === 'ribbon' && (
            <span className="max-w-[4.75rem] text-center break-words">
              {label}
            </span>
          )}
        </button>
      </Tip>
      <AnchoredMenu menu={menu} label={label} width={250}>
        {COPY_PASTE_TOOLS.map((id) => {
          const tool = findTool(id)
          if (!tool) return null
          const shortcut = tool.shortcut?.()
          return (
            <button
              key={id}
              type="button"
              role="menuitem"
              data-action={id}
              onClick={() => {
                menu.close()
                runTool(id)
                onRun?.()
              }}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-sm hover:bg-hover"
            >
              <span>{toolLabel(tool)}</span>
              {shortcut && (
                <span className="text-xs text-muted">{shortcut}</span>
              )}
            </button>
          )
        })}
      </AnchoredMenu>
    </>
  )
}
