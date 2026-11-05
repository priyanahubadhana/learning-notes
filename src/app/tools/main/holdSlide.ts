import { useRef, type PointerEvent } from 'react'
import { TOOL_HOLD_MS } from './mainTools'

/**
 * Press and hold a tool for about 350 ms and its options pill opens; slide
 * onto an option and let go to choose it without lifting first (made for
 * the Pencil, works with a finger or mouse too). The option under the finger
 * gets `data-hot`; letting go clicks it. A short press is a normal tap.
 */

const clearHot = () =>
  document.querySelectorAll('[data-hot]').forEach((el) => {
    if (el.hasAttribute('data-pill-option')) el.removeAttribute('data-hot')
  })

const optionAt = (x: number, y: number): HTMLElement | null =>
  document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-pill-option]') ??
  null

export function useHoldSlide(openFor: (tool: string) => void) {
  const state = useRef<{
    timer: number
    held: boolean
    tool: string
    pointerId: number
  }>({ timer: 0, held: false, tool: '', pointerId: -1 })

  const stop = () => {
    window.clearTimeout(state.current.timer)
    state.current.timer = 0
  }

  return {
    onPointerDown(e: PointerEvent<HTMLElement>, tool: string) {
      if (e.button !== 0) return
      stop()
      state.current.held = false
      state.current.tool = tool
      state.current.pointerId = e.pointerId
      const el = e.currentTarget
      state.current.timer = window.setTimeout(() => {
        state.current.timer = 0
        state.current.held = true
        try {
          el.setPointerCapture(state.current.pointerId)
        } catch {
          // A pointer the browser does not know (a simulated pen): carry on.
        }
        openFor(tool)
      }, TOOL_HOLD_MS)
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      if (!state.current.held) return
      const over = optionAt(e.clientX, e.clientY)
      document
        .querySelectorAll('[data-pill-option][data-hot]')
        .forEach((el) => {
          if (el !== over) el.removeAttribute('data-hot')
        })
      over?.setAttribute('data-hot', '')
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      stop()
      if (!state.current.held) return
      const over = optionAt(e.clientX, e.clientY)
      clearHot()
      over?.click()
    },
    onPointerCancel() {
      stop()
      clearHot()
    },
    /** True once if the press was a hold: the click that follows is ignored. */
    consumeHeld(): boolean {
      const was = state.current.held
      state.current.held = false
      return was
    },
  }
}
