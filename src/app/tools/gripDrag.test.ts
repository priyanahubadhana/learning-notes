/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import { resetGestures } from '../gestureReset'
import { gripDragging, resetGripDrags, startGripDrag } from './gripDrag'

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms))

afterEach(() => {
  resetGripDrags()
  document.body.innerHTML = ''
})

describe('a grip drag whose lift was lost (R7-3)', () => {
  it('the watchdog ends it: the page is editable again and the ink listens again', async () => {
    document.body.innerHTML =
      '<div data-grip></div><div contenteditable="true" id="page"></div>'
    const grip = document.querySelector('[data-grip]')!
    const page = document.getElementById('page')!
    startGripDrag(grip, 5)
    expect(gripDragging()).toBe(true)
    expect(page.getAttribute('contenteditable')).toBe('false')
    expect(document.documentElement.hasAttribute('data-grip-drag')).toBe(true)
    // No pointerup ever comes: the app went to the background. It comes back.
    resetGestures('visible')
    expect(page.getAttribute('contenteditable')).toBe('true')
    await tick(80)
    expect(gripDragging()).toBe(false)
    expect(document.documentElement.hasAttribute('data-grip-drag')).toBe(false)
  })

  it('a normal lift still ends it, and a second reset changes nothing', async () => {
    document.body.innerHTML = '<div data-grip></div>'
    const grip = document.querySelector('[data-grip]')!
    startGripDrag(grip, 9)
    document.dispatchEvent(new Event('pointerup'))
    await tick(80)
    expect(gripDragging()).toBe(false)
    resetGestures('visible')
    await tick(80)
    expect(gripDragging()).toBe(false)
  })
})

describe('a different pointer is never part of the drag (owner item 17)', () => {
  it('a Pencil that goes down while a mouse grip drag is still open is free', async () => {
    document.body.innerHTML = '<div data-grip></div>'
    const grip = document.querySelector('[data-grip]')!
    startGripDrag(grip, 1)
    expect(gripDragging({ pointerId: 1, pointerType: 'mouse' })).toBe(true)
    expect(gripDragging({ pointerId: 31, pointerType: 'pen' })).toBe(false)
    // A second finger still belongs to a touch drag.
    resetGripDrags()
    startGripDrag(grip, 4)
    expect(gripDragging({ pointerId: 5, pointerType: 'touch' })).toBe(true)
    expect(gripDragging({ pointerId: 6, pointerType: 'pen' })).toBe(false)
    resetGripDrags()
    await tick(80)
  })
})
