import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { overlay } from '../../app/overlay'
import { Icon } from '../../app/tools/icons'
import { PreviewBody } from './PreviewPane'
import type { LearningNotesDB } from '../../core/db'
import type { Change } from './changeNote'
import { tv } from './tv'

/**
 * SET-B02 to B04: below 1180 px wide the preview is a pill (44 pt, accent)
 * above the tab bar. Tap it and the preview opens as a sheet (max 46 vh);
 * tap again, the ✕ or Esc closes it. Settings behind the sheet stay tappable.
 * Gate 3, tenth visit: the pill sits in its own docked row (page background,
 * 60 px), so the list never scrolls under it.
 * The pill pulses 3 times when a setting changed while the sheet is shut.
 * The sheet is an overlay-manager entry (layer `sheet`): Esc and outside
 * taps are handled there. Where it shows is decided by CSS (`.sv3-pill`).
 */
/**
 * The content card's left and right edges (the Settings screen sits inside
 * it), as CSS variables for the dock and the sheet: with the sidebar open the
 * card starts further right than the rail alone says (settingsV3.css).
 */
function applyEdges(el: HTMLElement | null) {
  if (!el) return
  const r = el.getBoundingClientRect()
  if (r.width === 0) return
  const root = document.documentElement.style
  root.setProperty('--sv3-l', `${Math.round(r.left)}px`)
  root.setProperty('--sv3-r', `${Math.round(window.innerWidth - r.right)}px`)
}

function useCardEdges(area: RefObject<HTMLElement | null>): void {
  // Before the first paint when the screen is already in place (no flash over
  // the sidebar); a child's layout effect can run before the parent's ref is
  // set, so the effect below measures again and keeps watching.
  useLayoutEffect(() => applyEdges(area.current), [area])
  useEffect(() => {
    const el = area.current
    if (!el) return
    applyEdges(el)
    const ro = new ResizeObserver(() => applyEdges(el))
    ro.observe(el)
    return () => {
      ro.disconnect()
      const root = document.documentElement.style
      root.removeProperty('--sv3-l')
      root.removeProperty('--sv3-r')
    }
  }, [area])
}

export function PreviewPill({
  open,
  onToggle,
  pulse,
  area,
  last,
  db,
  section,
}: {
  open: boolean
  onToggle(): void
  /** Changes since the sheet was last shut; the pill pulses while > 0. */
  pulse: number
  /** The Settings screen: taps inside it do not close the sheet. */
  area: RefObject<HTMLElement | null>
  last: Change | null
  db: LearningNotesDB
  section: string
}) {
  const pill = useRef<HTMLButtonElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  useCardEdges(area)
  const toggle = useRef(onToggle)
  useEffect(() => {
    toggle.current = onToggle
  })

  useEffect(() => {
    if (!open) return
    let cleaning = false // closing because the sheet already shut: nothing to toggle
    const handle = overlay.open({
      id: 'settings-v3-preview',
      layer: 'sheet',
      close: () => {
        if (!cleaning) toggle.current()
      },
      inside: (el) =>
        !!(
          sheet.current?.contains(el) ||
          pill.current?.contains(el) ||
          area.current?.contains(el)
        ),
      opener: pill.current,
    })
    return () => {
      cleaning = true
      handle.close()
    }
  }, [open, area])

  return createPortal(
    <>
      {open && (
        <div
          ref={sheet}
          role="region"
          aria-label={tv('sv3.previewTitle')}
          data-preview-sheet
          className="sv3-sheet"
        >
          <div className="sv3-sheet-head">
            <h2 className="sv3-preview-title">{tv('sv3.previewTitle')}</h2>
            <button
              type="button"
              aria-label={tv('sv3.previewClose')}
              onClick={onToggle}
              className="sv3-sheet-x"
            >
              <Icon name="close" />
            </button>
          </div>
          <PreviewBody last={last} db={db} section={section} />
        </div>
      )}
      <div data-preview-dock className="sv3-dock">
        <button
          ref={pill}
          type="button"
          data-popup-trigger
          data-preview-pill
          data-pulse={pulse > 0 && !open ? 'on' : undefined}
          aria-expanded={open}
          onClick={onToggle}
          className="sv3-pill"
        >
          <Icon name="eye" />
          {tv('sv3.preview')}
        </button>
      </div>
      <span role="status" className="sr-only">
        {pulse > 0 && !open ? tv('sv3.previewChanged') : ''}
      </span>
    </>,
    document.body,
  )
}
