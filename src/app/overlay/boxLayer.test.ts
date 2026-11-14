/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import { ownTouches } from '../input/ownTouches'
import { layerAbove } from './boxLayer'

const box = (parent: Element, z?: string) => {
  const el = document.createElement('div')
  if (z) el.style.zIndex = z
  parent.append(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
  document.documentElement.style.removeProperty('--z-bar')
})

describe('layerAbove: a part drawn for a list in a floating box sits above that box', () => {
  it('no layer around the list: the part keeps its own layer', () => {
    expect(layerAbove(box(box(document.body)))).toBeUndefined()
  })

  it('one above the outermost layer around the list', () => {
    const panel = box(document.body, '39')
    const list = box(box(panel, '2'))
    expect(layerAbove(list)).toBe(40)
  })

  it('a box below the bars does not lift the part', () => {
    document.documentElement.style.setProperty('--z-bar', '20')
    expect(layerAbove(box(box(document.body, '5')))).toBeUndefined()
    expect(layerAbove(box(box(document.body, '20')))).toBe(21)
  })
})

describe('ownTouches: a part that works from pointer events cancels its touches', () => {
  it('a touch that starts on it is cancelled, until the undo', () => {
    const el = box(document.body)
    const inner = box(el)
    const touch = () => {
      const e = new Event('touchstart', { bubbles: true, cancelable: true })
      inner.dispatchEvent(e)
      return e.defaultPrevented
    }
    const release = ownTouches(el)
    expect(touch()).toBe(true)
    release()
    expect(touch()).toBe(false)
  })
})
