import { useEffect, useId, useRef, type ReactNode } from 'react'
import { isBoolean } from './uiPrefs'
import { usePref } from './usePref'

/**
 * A folding group in the sidebar: a small uppercase heading that is a button
 * (arrow, aria-expanded), with its state remembered per device, an optional
 * action (such as "+") at the end of the heading row, and the group's rows
 * below while it is open. Keyboard and screen readers use the heading button.
 */
export function SidebarGroup({
  id,
  title,
  defaultOpen,
  prefKey,
  action,
  openSignal,
  hidden,
  children,
}: {
  /** Stable id: the saved state and the test id. */
  id: string
  title: string
  defaultOpen: boolean
  /** The saved state's key, when an older one exists (e.g. `templatesOpen`). */
  prefKey?: string
  /** A button at the end of the heading row (e.g. "+ new"). */
  action?: ReactNode
  /** When this number grows (a new item was added) a folded group opens. */
  openSignal?: number
  /** Draw nothing (the group has no items yet); its state is still kept. */
  hidden?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = usePref(
    prefKey ?? `sidebar.group.${id}`,
    isBoolean,
    defaultOpen,
  )
  const body = useId()
  const last = useRef(openSignal)
  useEffect(() => {
    if (
      openSignal !== undefined &&
      last.current !== undefined &&
      openSignal > last.current
    ) {
      setOpen(true)
    }
    last.current = openSignal
  }, [openSignal, setOpen])
  if (hidden) return null
  return (
    <section data-group={id} className="mb-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={body}
          className="flex min-h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md px-2.5 text-[11px] whitespace-nowrap font-semibold tracking-[0.06em] text-muted uppercase hover:bg-hover any-pointer-coarse:min-h-11"
        >
          <span aria-hidden className="w-3 text-[10px]">
            {open ? '▾' : '▸'}
          </span>
          <span className="min-w-0 truncate">{title}</span>
        </button>
        {action && <span className="shrink-0">{action}</span>}
      </div>
      <div id={body} hidden={!open}>
        {open && children}
      </div>
    </section>
  )
}
