import { X } from 'lucide-react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createToastQueue, stackPositions } from '../app/overlay'
import { t } from '../i18n/t'

export interface ToastAction {
  label: string
  run: () => void
}

export interface BuildToastsApi {
  push(message: string, action?: ToastAction): void
  /** Closes every message (the screen moved on to its next state). */
  clear(): void
}

/** A plain message closes by itself after 4 s; one with Undo stays 8 s. */
const PLAIN_MS = 4000
const ACTION_MS = 8000

const TITLE = '[data-aifw-title]'

/**
 * Messages at the bottom of the Build screen, from the shared toast queue.
 * They sit in the browser's top layer (a manual popover), so no stacking
 * number is needed, and each one moves above the plan title if it would
 * cover it.
 */
export const BuildToasts = forwardRef<BuildToastsApi>(
  function BuildToasts(_props, ref) {
    const queue = useMemo(
      () => createToastQueue({ max: 3, timeoutMs: PLAIN_MS }),
      [],
    )
    const actions = useRef(new Map<number, ToastAction>())
    const [, bump] = useState(0)
    useEffect(() => queue.subscribe(() => bump((n) => n + 1)), [queue])
    useImperativeHandle(
      ref,
      () => ({
        push(message, action) {
          // One message at a time: the new one replaces the old (no stacking).
          for (const old of queue.visible()) queue.dismiss(old.id)
          const id = queue.push({
            message,
            timeoutMs: action ? ACTION_MS : PLAIN_MS,
          })
          if (action) actions.current.set(id, action)
        },
        clear() {
          for (const old of queue.visible()) queue.dismiss(old.id)
        },
      }),
      [queue],
    )
    const items = queue.visible()
    const host = useRef<HTMLDivElement>(null)
    const nodes = useRef(new Map<number, HTMLDivElement>())
    const [tops, setTops] = useState<Record<number, number>>({})
    const [view, setView] = useState({ w: 0, h: 0 })

    const place = useCallback(() => {
      const shown = queue.visible()
      const viewport = { width: window.innerWidth, height: window.innerHeight }
      const title = document.querySelector(TITLE)?.getBoundingClientRect()
      const avoid = title
        ? [
            {
              left: title.left,
              top: title.top,
              width: title.width,
              height: title.height,
            },
          ]
        : []
      const heights = shown.map(
        (s) => nodes.current.get(s.id)?.offsetHeight || 56,
      )
      const width = Math.min(360, viewport.width - 16)
      const list = stackPositions(heights, viewport, avoid, { width })
      const next: Record<number, number> = {}
      shown.forEach((s, i) => (next[s.id] = list[i]))
      setTops((old) =>
        shown.every((s) => old[s.id] === next[s.id]) &&
        Object.keys(old).length === shown.length
          ? old
          : next,
      )
    }, [queue])

    useLayoutEffect(() => {
      place()
    }, [place, items.length, view.w, view.h])

    useEffect(() => {
      const ro = new ResizeObserver(() =>
        setView({ w: window.innerWidth, h: window.innerHeight }),
      )
      ro.observe(document.documentElement)
      return () => ro.disconnect()
    }, [])

    useEffect(() => {
      const el = host.current
      if (!el) return
      try {
        if (items.length) el.showPopover?.()
        else el.hidePopover?.()
      } catch {
        // Already in the wanted state.
      }
      place()
    }, [items.length, place])

    if (!items.length) return null
    const width = Math.min(
      360,
      (typeof window === 'undefined' ? 360 : window.innerWidth) - 16,
    )
    const left = Math.max(8, (window.innerWidth - width) / 2)
    return (
      <div
        ref={host}
        popover="manual"
        data-testid="aifw-toasts"
        style={{
          inset: 0,
          width: '100vw',
          height: '100vh',
          margin: 0,
          padding: 0,
          border: 0,
          background: 'transparent',
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        {items.map((item) => {
          const action = actions.current.get(item.id)
          return (
            <div
              key={item.id}
              ref={(n) => {
                if (n) nodes.current.set(item.id, n)
                else nodes.current.delete(item.id)
              }}
              role="status"
              data-testid="aifw-toast"
              style={{
                position: 'fixed',
                top: tops[item.id] ?? -1000,
                left,
                width,
                pointerEvents: 'auto',
              }}
              className="flex items-center gap-2 rounded-xl border border-line bg-bg p-2 pl-4 text-sm shadow-lg"
            >
              <span className="min-w-0 flex-1">{item.message}</span>
              {action && (
                <button
                  type="button"
                  data-testid="aifw-toast-action"
                  className="min-h-11 shrink-0 rounded-lg px-3 font-semibold text-accent hover:bg-hover"
                  onClick={() => {
                    action.run()
                    queue.dismiss(item.id)
                  }}
                >
                  {action.label}
                </button>
              )}
              <button
                type="button"
                aria-label={t('aifw.toast.close')}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-hover"
                onClick={() => queue.dismiss(item.id)}
              >
                <X size={18} strokeWidth={1.6} aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    )
  },
)
