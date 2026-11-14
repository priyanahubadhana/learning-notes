/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MAX_MOVE } from '../penTap'
import { createEventRouter, type EventRouter } from './eventRouter'
import { CLICK_TAIL_MS, installPenScroll, penScrollerOf } from './penScroll'

/** A box that scrolls (jsdom has no layout: the sizes are set by hand). */
function list(parent: Element, attrs: Record<string, string> = {}) {
  const el = document.createElement('div')
  el.style.overflowY = 'auto'
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  Object.defineProperty(el, 'scrollHeight', { value: 1000 })
  Object.defineProperty(el, 'clientHeight', { value: 300 })
  const row = document.createElement('button')
  el.append(row)
  parent.append(el)
  return { el, row }
}

let router: EventRouter
let stop: () => void
let on = true
let time = 0
const pointer = (
  type: string,
  target: Element,
  y: number,
  init: Record<string, unknown> = {},
) => {
  const e = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientY: y,
    buttons: type === 'pointerup' ? 0 : 1,
  })
  const props = { pointerId: 7, pointerType: 'pen', ...init }
  for (const [k, v] of Object.entries(props))
    Object.defineProperty(e, k, { value: v })
  target.dispatchEvent(e)
  return e
}

beforeEach(() => {
  on = true
  time = 1000
  router = createEventRouter()
  stop = installPenScroll(
    () => on,
    router,
    () => time,
  )
})
afterEach(() => {
  stop()
  router.destroy()
  document.body.innerHTML = ''
})

describe('penScrollerOf: which list a Pencil drag scrolls', () => {
  it('the nearest box that scrolls, inside the app chrome', () => {
    const menu = document.createElement('div')
    menu.setAttribute('data-bar', 'tray')
    document.body.append(menu)
    const { el, row } = list(menu)
    expect(penScrollerOf(row)).toBe(el)
  })

  it('never the note page, an editor or a drawing: the Pencil writes there', () => {
    const page = list(document.body, { 'data-page-scroller': '' })
    expect(penScrollerOf(page.row)).toBeNull()
    const chrome = document.createElement('div')
    chrome.setAttribute('data-chrome', '')
    document.body.append(chrome)
    const withCanvas = list(chrome)
    withCanvas.el.append(document.createElement('canvas'))
    expect(penScrollerOf(withCanvas.row)).toBeNull()
    // A menu inside the page still scrolls by itself.
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    page.el.append(menu)
    const inner = list(menu)
    expect(penScrollerOf(inner.row)).toBe(inner.el)
  })

  it('not outside the app chrome, and not on a field, a slider or a draggable row', () => {
    const plain = list(document.body)
    expect(penScrollerOf(plain.row)).toBeNull()
    const chrome = document.createElement('div')
    chrome.setAttribute('data-chrome', '')
    document.body.append(chrome)
    const { el } = list(chrome)
    for (const make of [
      () => document.createElement('input'),
      () => {
        const d = document.createElement('div')
        d.setAttribute('data-pen-native', '')
        return d
      },
      () => {
        const d = document.createElement('div')
        d.setAttribute('draggable', 'true')
        return d
      },
    ]) {
      const n = make()
      el.append(n)
      expect(penScrollerOf(n)).toBeNull()
    }
  })
})

describe('a Pencil drag scrolls a list like a finger', () => {
  const menu = () => {
    const m = document.createElement('div')
    m.setAttribute('data-chrome', '')
    document.body.append(m)
    return list(m)
  }

  it('the list follows the tip once it has moved past the tap slop, with no jump', () => {
    const { el, row } = menu()
    el.scrollTop = 100
    pointer('pointerdown', row, 200)
    pointer('pointermove', row, 200 - (MAX_MOVE - 1))
    expect(el.scrollTop).toBe(100)
    pointer('pointermove', row, 200 - MAX_MOVE)
    expect(el.scrollTop).toBe(100)
    pointer('pointermove', row, 200 - MAX_MOVE - 50)
    expect(el.scrollTop).toBe(150)
    pointer('pointermove', row, 200 - MAX_MOVE + 30)
    expect(el.scrollTop).toBe(70)
    // No text is selected on the way; the list's own style comes back at the lift.
    expect(el.style.userSelect).toBe('none')
    pointer('pointerup', row, 200 - MAX_MOVE + 30)
    expect(el.style.userSelect).toBe('')
  })

  it('the click after a scroll drag chooses nothing; a plain tap still clicks', () => {
    const { row } = menu()
    let clicks = 0
    row.addEventListener('click', () => clicks++)
    pointer('pointerdown', row, 200)
    pointer('pointermove', row, 150)
    pointer('pointermove', row, 100)
    row.click() // the app's own Pencil click, sent at the lift
    pointer('pointerup', row, 100)
    row.click() // and the browser's late one
    expect(clicks).toBe(0)
    time += CLICK_TAIL_MS + 1
    row.click()
    expect(clicks).toBe(1)
    pointer('pointerdown', row, 200)
    pointer('pointerup', row, 201)
    row.click()
    expect(clicks).toBe(2)
  })

  it('a finger, a mouse, the switch off and a hover move scroll nothing', () => {
    const { el, row } = menu()
    for (const pointerType of ['touch', 'mouse']) {
      pointer('pointerdown', row, 200, { pointerType })
      pointer('pointermove', row, 100, { pointerType })
      pointer('pointermove', row, 50, { pointerType })
      pointer('pointerup', row, 50, { pointerType })
    }
    on = false
    pointer('pointerdown', row, 200)
    pointer('pointermove', row, 100)
    pointer('pointermove', row, 50)
    pointer('pointerup', row, 50)
    on = true
    // The lift was lost: the next move has no button (the Pencil only hovers).
    pointer('pointerdown', row, 200)
    pointer('pointermove', row, 100, { buttons: 0 })
    pointer('pointermove', row, 50)
    expect(el.scrollTop).toBe(0)
  })

  it('while the Pencil is down on a list the browser does not pan it too; a cancel ends the drag', () => {
    const { el, row } = menu()
    const touch = () => {
      const e = new Event('touchmove', { bubbles: true, cancelable: true })
      row.dispatchEvent(e)
      return e.defaultPrevented
    }
    expect(touch()).toBe(false)
    pointer('pointerdown', row, 200)
    expect(touch()).toBe(true)
    pointer('pointermove', row, 150)
    pointer('pointercancel', row, 150)
    expect(touch()).toBe(false)
    pointer('pointermove', row, 50)
    expect(el.scrollTop).toBe(0)
  })
})
