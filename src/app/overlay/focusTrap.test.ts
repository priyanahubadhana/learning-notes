/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import { trapFocus } from './focusTrap'

const releases: Array<() => void> = []
afterEach(() => {
  releases.splice(0).forEach((r) => r())
  document.body.innerHTML = ''
})

function tab(shift = false) {
  const e = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: shift,
    cancelable: true,
    bubbles: true,
  })
  document.dispatchEvent(e)
  return e
}

function setup() {
  document.body.innerHTML =
    '<button id="o">open</button><div id="c"><button id="a">a</button><input id="b"><button id="z">z</button></div><button id="out">out</button>'
  const $ = (id: string) => document.getElementById(id) as HTMLElement
  const release = trapFocus($('c'), $('o'))
  releases.push(release)
  return { $, release }
}

describe('trapFocus', () => {
  it('Tab on last wraps to first; Shift+Tab on first wraps to last', () => {
    const { $ } = setup()
    $('z').focus()
    expect(tab().defaultPrevented).toBe(true)
    expect(document.activeElement).toBe($('a'))
    expect(tab(true).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe($('z'))
  })
  it('middle Tab is left to the browser', () => {
    const { $ } = setup()
    $('a').focus()
    expect(tab().defaultPrevented).toBe(false)
  })
  it('focus outside is pulled in', () => {
    const { $ } = setup()
    $('out').focus()
    tab()
    expect(document.activeElement).toBe($('a'))
  })
  it('release stops trapping and returns focus to opener, once', () => {
    const { $, release } = setup()
    $('z').focus()
    release()
    expect(document.activeElement).toBe($('o'))
    $('z').focus()
    expect(tab().defaultPrevented).toBe(false)
    release()
    expect(document.activeElement).toBe($('z'))
  })
})
