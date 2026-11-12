import { useRef } from 'react'
import './readerV2.css'
import { Icon } from '../../app/tools/icons'
import type { Annotation } from '../../core/types'
import { t } from '../../i18n/t'
import { stickyHold } from './stickyDrag'
import {
  isDeliberateTap,
  isSticky,
  stickyArmed,
  stickyLift,
  stickyPlace,
  stickyView,
} from './sticky'

/**
 * What one PDF page shows for sticky notes (slice 7c): a small paper pin for
 * each note, and, only while the Sticky tool is armed, a layer that turns ONE
 * short tap into a new note. Pencil, finger and mouse never make a note any
 * other way (no hover, no scroll, no pinch, no drag).
 */
export function StickyPins({
  pageNo,
  notes,
}: {
  pageNo: number
  notes: readonly Annotation[]
}) {
  const armed = stickyArmed.useValue()
  const lift = stickyLift.useValue()
  const down = useRef<{
    x: number
    y: number
    at: number
    pointers: number
  } | null>(null)
  const pointers = useRef(new Set<number>())
  const mine = notes.filter(isSticky)

  return (
    <>
      {mine.map((a) => {
        const p = stickyPlace(a)
        if (!p) return null
        return (
          <button
            key={a.id}
            type="button"
            className="rv2-stk-pin"
            data-sticky-pin={a.id}
            data-testid="rv2-sticky-pin"
            data-lifted={lift?.id === a.id ? '' : undefined}
            aria-label={t('readerv2.sticky.pin')}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            onClick={() => {
              if (stickyHold.swallowClick()) return
              stickyView.set({ mode: 'read', id: a.id })
            }}
          >
            <Icon name="tape" size={16} />
          </button>
        )
      })}
      {armed && (
        <div
          className="rv2-stk-catch"
          data-testid="rv2-sticky-catch"
          onPointerDown={(e) => {
            pointers.current.add(e.pointerId)
            down.current = {
              x: e.clientX,
              y: e.clientY,
              at: Date.now(),
              pointers: pointers.current.size,
            }
          }}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId)
            down.current = null
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId)
            const d = down.current
            down.current = null
            if (
              !d ||
              !isDeliberateTap(d, {
                x: e.clientX,
                y: e.clientY,
                at: Date.now(),
              })
            )
              return
            const box = e.currentTarget.getBoundingClientRect()
            if (box.width === 0 || box.height === 0) return
            stickyArmed.set(false)
            stickyView.set({
              mode: 'new',
              page: pageNo,
              x: (e.clientX - box.left) / box.width,
              y: (e.clientY - box.top) / box.height,
            })
          }}
        />
      )}
    </>
  )
}
