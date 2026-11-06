import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { showNames } from './main/mainTools'

/**
 * Names on hover (Phase A4, R4-10). A mouse, or a Pencil hovering over an iPad
 * that supports it, shows a bar icon's one-word name after 0.4 s. Touch never
 * shows it (a finger has no hover). One listener for the whole app: it looks
 * for the bar's buttons by their attributes and reads `aria-label`.
 * "Show names under icons" (Settings › Tool bar) also writes the names
 * under the icons through a data attribute on the page (index.css).
 */

export const HOVER_MS = 400
const TARGET =
  '[data-bar-btn], [data-pill-option], [data-pill-grip], [data-bar-tool]'

export function HoverName() {
  const [tip, setTip] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)
  const always = showNames.useValue()

  useEffect(() => {
    const root = document.documentElement
    if (always) root.setAttribute('data-show-names', '')
    else root.removeAttribute('data-show-names')
    return () => root.removeAttribute('data-show-names')
  }, [always])

  useEffect(() => {
    let timer = 0
    let current: Element | null = null
    const hide = () => {
      window.clearTimeout(timer)
      current = null
      setTip(null)
    }
    const over = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.buttons !== 0) return
      const el = e.target instanceof Element ? e.target.closest(TARGET) : null
      if (el === current) return
      hide()
      const text = el?.getAttribute('aria-label')
      if (!el || !text) return
      current = el
      timer = window.setTimeout(() => {
        const r = el.getBoundingClientRect()
        setTip({
          text,
          x: Math.min(Math.max(8, r.left + r.width / 2), window.innerWidth - 8),
          y: r.bottom + 6,
        })
      }, HOVER_MS)
    }
    document.addEventListener('pointerover', over, true)
    document.addEventListener('pointerdown', hide, true)
    document.addEventListener('scroll', hide, true)
    document.addEventListener('keydown', hide, true)
    return () => {
      hide()
      document.removeEventListener('pointerover', over, true)
      document.removeEventListener('pointerdown', hide, true)
      document.removeEventListener('scroll', hide, true)
      document.removeEventListener('keydown', hide, true)
    }
  }, [])

  if (!tip) return null
  return createPortal(
    <div
      role="tooltip"
      data-hover-name
      style={{ left: tip.x, top: tip.y, transform: 'translateX(-50%)' }}
      className="pointer-events-none fixed z-[70] rounded-lg bg-ink px-2 py-1 text-xs font-medium whitespace-nowrap text-bg shadow-lg"
    >
      {tip.text}
    </div>,
    document.body,
  )
}
