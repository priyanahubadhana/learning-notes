// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Page } from '@playwright/test'

/**
 * Simulated Scribble interference. iPadOS Scribble collects every editable
 * element under a Pencil stroke (a multi-element hit test that, like WebKit's,
 * skips `pointer-events: none` and `inert` nodes). This does the same test in
 * the browser: it samples points across a rectangle grown by `pad` and returns
 * every element Scribble could write into.
 */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function editableTargetsInRect(
  page: Page,
  rect: Rect,
  pad = 8,
  step = 6,
): Promise<string[]> {
  return page.evaluate(
    ({ rect, pad, step }) => {
      const found = new Set<string>()
      const x0 = Math.max(0, rect.x - pad)
      const y0 = Math.max(0, rect.y - pad)
      const x1 = Math.min(window.innerWidth - 1, rect.x + rect.width + pad)
      const y1 = Math.min(window.innerHeight - 1, rect.y + rect.height + pad)
      for (let y = y0; y <= y1; y += step) {
        for (let x = x0; x <= x1; x += step) {
          for (const el of document.elementsFromPoint(x, y)) {
            const h = el as HTMLElement
            const input =
              (el instanceof HTMLInputElement &&
                !el.disabled &&
                !el.readOnly &&
                !['checkbox', 'radio', 'range', 'button'].includes(el.type)) ||
              (el instanceof HTMLTextAreaElement &&
                !el.disabled &&
                !el.readOnly)
            if (h.isContentEditable || input) {
              found.add(
                `${el.tagName.toLowerCase()}${
                  el.getAttribute('aria-label')
                    ? `[${el.getAttribute('aria-label')}]`
                    : ''
                }${h.className && typeof h.className === 'string' ? '.' + h.className.split(' ')[0] : ''}`,
              )
            }
          }
        }
      }
      return [...found]
    },
    { rect, pad, step },
  )
}
