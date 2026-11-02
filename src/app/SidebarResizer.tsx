import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { t } from '../i18n/t'
import {
  SIDEBAR_DEFAULT,
  SIDEBAR_MIN,
  clampSidebarWidth,
  sidebarMax,
} from './sidebarWidth'

const KEY_STEP = 16

/** The handle between the sidebar and the page: drag it to share the screen. */
export function SidebarResizer({
  width,
  onChange,
}: {
  width: number
  onChange: (width: number) => void
}) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null)
  const change = (next: number) =>
    onChange(clampSidebarWidth(next, window.innerWidth))
  const endDrag = () => {
    drag.current = null
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startX: e.clientX, startWidth: width }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current)
      change(drag.current.startWidth + e.clientX - drag.current.startX)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    change(width + (e.key === 'ArrowRight' ? KEY_STEP : -KEY_STEP))
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t('nav.resizeMenu')}
      aria-valuemin={SIDEBAR_MIN}
      aria-valuemax={sidebarMax(window.innerWidth)}
      aria-valuenow={width}
      title={t('nav.resizeMenuHint')}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => change(SIDEBAR_DEFAULT)}
      onKeyDown={onKeyDown}
      style={{ marginTop: 'calc(3.25rem + var(--top-clear))' }}
      className="group relative z-20 -mr-5 flex w-5 shrink-0 cursor-col-resize touch-none items-center justify-start outline-none phone:hidden"
    >
      <span className="ms-1 h-12 w-1 rounded-full bg-line group-hover:bg-accent group-focus-visible:bg-accent group-active:bg-accent" />
    </div>
  )
}
