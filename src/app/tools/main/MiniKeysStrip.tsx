import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import { startGripDrag } from '../gripDrag'
import { createPortal } from 'react-dom'
import { t } from '../../../i18n/t'
import type { Editor } from '../../../editor/barActions'
import { addLineAfterCursor } from '../../../editor/lineActions'
import { setKeyboard } from '../../../editor/keyboardPolicy'
import { Icon } from '../icons'
import { currentRunner } from '../toolRuntime'
import {
  DEFAULT_KEYS_PLACE,
  finalText,
  miniKeysOn,
  miniKeysPlace,
  speechCtor,
  type Recognition,
} from './miniKeys'
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

const BTN =
  'grid min-h-11 min-w-11 place-items-center rounded-xl text-ink-soft hover:bg-hover hover:text-ink select-none'

export function MiniKeys({ editor }: { editor: Editor }) {
  const on = miniKeysOn.useValue()
  if (!on) return null
  return <Strip editor={editor} />
}

function Strip({ editor }: { editor: Editor }) {
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
  const [listening, setListening] = useState(false)
  const rec = useRef<Recognition | null>(null)

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
  useEffect(() => () => rec.current?.stop(), [])

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

  const mic = useCallback(() => {
    const toast = (m: string) => currentRunner().app?.toast(m)
    if (rec.current) {
      rec.current.stop()
      return
    }
    const Ctor = speechCtor()
    if (!Ctor) {
      // No SpeechRecognition here: the keyboard's own microphone does it.
      setKeyboard(editor, true)
      toast(t('keys.useKeyboardMic'))
      return
    }
    const r = new Ctor()
    r.lang = document.documentElement.lang || 'en'
    r.continuous = true
    r.interimResults = false
    r.onresult = (e) => {
      const text = finalText(e)
      if (text) editor.insertInlineContent(text + ' ')
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        toast(t('keys.denied'))
        setKeyboard(editor, true)
      }
    }
    r.onend = () => {
      rec.current = null
      setListening(false)
    }
    rec.current = r
    try {
      r.start()
      setListening(true)
      toast(t('keys.listening'))
    } catch {
      rec.current = null
    }
  }, [editor])

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
        transform: `translate3d(${at.x}px, ${at.y}px, 0)`,
        willChange: 'transform',
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
      <button
        type="button"
        data-keys="mic"
        data-pen-own
        aria-label={micLabel}
        aria-pressed={listening}
        onMouseDown={keepFocus}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={mic}
        className={`${BTN} ${listening ? 'bg-hover !text-accent' : ''}`}
      >
        <Icon name="mic" />
      </button>
      <button
        type="button"
        data-keys="enter"
        data-pen-own
        aria-label={t('keys.enter')}
        onMouseDown={keepFocus}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => addLineAfterCursor(editor)}
        className={BTN}
      >
        <Icon name="newLine" />
      </button>
      <BackspaceButton editor={editor} min={44} />
    </div>,
    document.body,
  )
}
