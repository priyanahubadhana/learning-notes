import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { startGripDrag } from '../gripDrag'
import { createPortal } from 'react-dom'
import { t } from '../../../i18n/t'
import type { Editor } from '../../../editor/barActions'
import { addLineAfterCursor } from '../../../editor/lineActions'
import { noteTyped } from '../../../editor/typedSignal'
import { Icon } from '../icons'
import { DEFAULT_KEYS_PLACE, miniKeysOn, miniKeysPlace } from './miniKeys'
import { useFlag } from '../../flags'
import { useBarSettings } from '../../../settings/deviceModeSettings'
import { PasteButton } from './PasteButton'
import { floatingBarShown } from './pasteButtons'
import { dictating, heardText, stopMic, toggleMic } from './micControl'
import { BackspaceButton } from './MainBar'
import { clampInside, positionOf, snapPlace, vertical } from './pillPlace'
import { keepFocus } from './pillKit'
import { useRoom } from './useRoom'
import { reducedMotion } from './pillRoom'

/**
 * The mini keyboard strip (round 5): speak to type, Enter and Backspace. Drag
 * its grip and it snaps to the nearest edge, like the pills; the place is
 * remembered. The buttons never take focus, so the caret stays in the page.
 */

const BUBBLE = {
  left: 'left-full ml-2 top-1/2 -translate-y-1/2',
  right: 'right-full mr-2 top-1/2 -translate-y-1/2',
  top: 'top-full mt-2 left-1/2 -translate-x-1/2',
  bottom: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
} as const

const BTN =
  'grid min-h-11 min-w-11 place-items-center rounded-xl text-ink-soft hover:bg-hover hover:text-ink select-none'

/**
 * A strip button acts when the tip lifts on it (a Pencil or a finger), not on
 * "click": a Pencil tap may never send one (C17). A click that follows is
 * ignored; a click with no touch before it (keyboard, VoiceOver) acts.
 */
function KeyButton({
  action,
  className,
  children,
  ...rest
}: {
  action: () => void
  className: string
  children: ReactNode
  'data-keys': string
  'aria-label': string
  'aria-pressed'?: boolean
}) {
  const lastAct = useRef(0)
  return (
    <button
      type="button"
      data-pen-own
      {...rest}
      onMouseDown={keepFocus}
      onPointerDown={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
      onPointerUp={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          return
        lastAct.current = performance.now()
        action()
      }}
      onClick={() => {
        if (performance.now() - lastAct.current < 700) return
        action()
      }}
      className={className}
    >
      {children}
    </button>
  )
}

export function MiniKeys({ editor }: { editor: Editor }) {
  const toggledOn = miniKeysOn.useValue()
  const switchedOn = useFlag('page.menus')
  const { mode } = useBarSettings()
  const listening = dictating.useValue()
  if (!floatingBarShown({ mode, toggledOn, dictating: listening, switchedOn }))
    return null
  return <Strip editor={editor} switchedOn={switchedOn} />
}

function Strip({
  editor,
  switchedOn,
}: {
  editor: Editor
  switchedOn: boolean
}) {
  const saved = miniKeysPlace.useValue()
  const place = saved ?? DEFAULT_KEYS_PLACE
  const isVertical = vertical(place.edge)
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const room = useRoom()
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const grab = useRef({ dx: 0, dy: 0 })
  // The newest drag point (state alone can lag behind a quick pointer up).
  const dragAt = useRef<{ x: number; y: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize((old) =>
        Math.abs(old.width - r.width) < 0.5 &&
        Math.abs(old.height - r.height) < 0.5
          ? old
          : { width: r.width, height: r.height },
      )
    }
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    return () => watch.disconnect()
  }, [isVertical])

  const pos = useMemo(() => positionOf(place, size, room), [place, size, room])
  const at = drag ? clampInside(drag.x, drag.y, size, room) : pos

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current
    if (!el) return
    e.preventDefault()
    e.stopPropagation()
    startGripDrag(e.currentTarget, e.pointerId)
    const r = el.getBoundingClientRect()
    grab.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    dragAt.current = { x: r.left, y: r.top }
    setDrag(dragAt.current)
  }
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragAt.current) return
    dragAt.current = {
      x: e.clientX - grab.current.dx,
      y: e.clientY - grab.current.dy,
    }
    setDrag(dragAt.current)
  }
  const up = () => {
    const last = dragAt.current
    if (!last) return
    dragAt.current = null
    const p = clampInside(last.x, last.y, size, room)
    miniKeysPlace.set(snapPlace(p.x, p.y, size, room))
    setDrag(null)
  }

  const listening = dictating.useValue()
  const heard = heardText.useValue()
  useEffect(() => stopMic, [])
  const mic = useCallback(() => toggleMic(editor), [editor])

  const micLabel = listening ? t('keys.micStop') : t('keys.mic')
  return createPortal(
    <div
      ref={ref}
      role="toolbar"
      aria-label={t('keys.label')}
      aria-orientation={isVertical ? 'vertical' : 'horizontal'}
      data-mini-keys
      data-pill-root
      data-edge={place.edge}
      style={{
        transform: `translate3d(${Math.round(at.x)}px, ${Math.round(at.y)}px, 0)`,
        visibility: size.width > 0 ? 'visible' : 'hidden',
        touchAction: 'none',
        transition:
          drag || reducedMotion()
            ? 'none'
            : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className={`fixed top-0 left-0 z-[var(--z-mini)] flex items-center gap-0.5 rounded-2xl border border-ink-soft bg-bg p-1 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.2)] ${
        isVertical ? 'flex-col' : ''
      }`}
    >
      <button
        type="button"
        data-keys="grip"
        aria-label={t('keys.move')}
        onMouseDown={keepFocus}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className={`${BTN} cursor-grab`}
      >
        <Icon name="grip" />
      </button>
      <KeyButton
        data-keys="mic"
        aria-label={micLabel}
        aria-pressed={listening}
        action={mic}
        className={`${BTN} ${listening ? 'bg-hover !text-accent' : ''}`}
      >
        <Icon name="mic" />
      </KeyButton>
      <KeyButton
        data-keys="enter"
        aria-label={t('keys.enter')}
        action={() => {
          addLineAfterCursor(editor)
          noteTyped()
        }}
        className={BTN}
      >
        <Icon name="newLine" />
      </KeyButton>
      <BackspaceButton editor={editor} min={44} />
      {switchedOn && <PasteButton editor={editor} testId="floating-paste" />}
      <KeyButton
        data-keys="close"
        aria-label={t('keys.close')}
        action={() => {
          stopMic()
          miniKeysOn.set(false)
        }}
        className={BTN}
      >
        <Icon name="close" />
      </KeyButton>
      {listening && heard && (
        <span
          data-keys="heard"
          aria-live="polite"
          // A bubble beside the strip: the strip itself keeps its size.
          className={`pointer-events-none absolute max-w-48 truncate rounded-xl border border-ink-soft bg-bg px-3 py-1.5 text-xs text-ink-soft ${BUBBLE[place.edge]}`}
        >
          {heard}
        </span>
      )}
    </div>,
    document.body,
  )
}
