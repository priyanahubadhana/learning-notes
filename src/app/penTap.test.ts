// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installPenTap, penTapOptions } from './penTap'

let off = () => {}
let clicks = 0

function pen(type: 'pointerdown' | 'pointerup', el: Element, x = 10, y = 10) {
  const e = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  }) as MouseEvent & { pointerType?: string; pointerId?: number }
  Object.defineProperty(e, 'pointerType', { value: 'pen' })
  Object.defineProperty(e, 'pointerId', { value: 1 })
  el.dispatchEvent(e)
}

beforeEach(() => {
  document.body.innerHTML = `<div data-chrome>
    <button id="b">B</button>
    <button id="own" data-pen-own>O</button>
    <button id="off" disabled>D</button>
    <input id="i" />
  </div><button id="outside">x</button>`
  clicks = 0
  document.addEventListener('click', () => clicks++)
  off = installPenTap(document)
  penTapOptions.enabled = true
})
afterEach(() => off())

const $ = (id: string) => document.getElementById(id)!

describe('penTap', () => {
  it('clicks once on pen down and up', () => {
    pen('pointerdown', $('b'))
    pen('pointerup', $('b'))
    expect(clicks).toBe(1)
  })
  it('swallows the browser own late click (trusted) but not ours', () => {
    pen('pointerdown', $('b'))
    pen('pointerup', $('b'))
    // jsdom clicks are not trusted; fake a trusted one
    const late = new MouseEvent('click', { bubbles: true, cancelable: true })
    let reached = false
    $('b').addEventListener('click', () => (reached = true))
    $('b').dispatchEvent(late)
    expect(reached).toBe(false)
  })
  it('does not click after moving 20 px', () => {
    pen('pointerdown', $('b'), 10, 10)
    pen('pointerup', $('b'), 30, 10)
    expect(clicks).toBe(0)
  })
  it('skips data-pen-own, disabled, inputs and non-chrome', () => {
    for (const id of ['own', 'off', 'i', 'outside']) {
      pen('pointerdown', $(id))
      pen('pointerup', $(id))
    }
    expect(clicks).toBe(0)
  })
  it('does nothing when switched off', () => {
    penTapOptions.enabled = false
    pen('pointerdown', $('b'))
    pen('pointerup', $('b'))
    expect(clicks).toBe(0)
  })
})
