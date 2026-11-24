import { act, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

// jsdom has no ResizeObserver or scrollIntoView; the parts only use them to measure.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
if (!Element.prototype.scrollIntoView)
  Element.prototype.scrollIntoView = () => {}

const live = new Set<() => void>()

/** Mounts an element into the document and returns small DOM helpers. */
export function mount(el: ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => root.render(el))
  const unmount = () => {
    if (!live.delete(unmount)) return
    act(() => root.unmount())
    host.remove()
  }
  live.add(unmount)
  return {
    host,
    rerender: (next: ReactElement) => act(() => root.render(next)),
    unmount,
  }
}

/** Query anywhere in the page (portals included). */
export const $ = <T extends HTMLElement = HTMLElement>(sel: string) =>
  document.body.querySelector<T>(sel)
export const $$ = <T extends HTMLElement = HTMLElement>(sel: string) =>
  Array.from(document.body.querySelectorAll<T>(sel))
export const byLabel = <T extends HTMLElement = HTMLElement>(label: string) =>
  $<T>(`[aria-label="${label}"]`)

export const click = (el: Element | null) => {
  if (!el) throw new Error('click: element not found')
  act(() => {
    ;(el as HTMLElement).click()
  })
}

export const key = (
  el: Element | null,
  k: string,
  init: KeyboardEventInit = {},
) => {
  if (!el) throw new Error('key: element not found')
  act(() => {
    el.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: k,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    )
  })
}

/** Types into a controlled React input. */
export const type = (el: HTMLInputElement | null, value: string) => {
  if (!el) throw new Error('type: element not found')
  const set = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set
  act(() => {
    set?.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

export const cleanDom = () => {
  for (const u of [...live]) u()
  document.body.innerHTML = ''
}
