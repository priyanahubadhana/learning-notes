// @vitest-environment jsdom
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Sheet } from './Sheet'
import { $, byLabel, cleanDom, click, key, mount } from './testHelpers'

afterEach(() => {
  vi.useRealTimers()
  cleanDom()
})

const sheet = (onClose = vi.fn(), extra = {}) =>
  h(
    Sheet,
    { title: 'Settings', onClose, footer: h('button', null, 'Done'), ...extra },
    h('p', null, 'Body'),
  )

describe('Sheet', () => {
  it('has a dialog role, a title, a body and a footer', () => {
    mount(sheet())
    const d = $('[role="dialog"]')
    expect(d?.getAttribute('aria-labelledby')).toBeTruthy()
    expect($('.fb-sheet__title')?.textContent).toBe('Settings')
    expect($('[data-testid="fb-sheet-body"]')?.textContent).toBe('Body')
    expect($('[data-testid="fb-sheet-foot"]')).not.toBeNull()
  })

  it('closes with the close button (after the closing motion)', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    mount(sheet(onClose))
    click(byLabel('Close'))
    expect(onClose).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes with Esc and returns focus to the opener', () => {
    vi.useFakeTimers()
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const onClose = vi.fn()
    const m = mount(sheet(onClose, { opener }))
    key(document.body, 'Escape')
    vi.advanceTimersByTime(200)
    expect(onClose).toHaveBeenCalledTimes(1)
    m.unmount()
    expect(document.activeElement).toBe(opener)
  })

  it('closes once even when asked twice', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    mount(sheet(onClose))
    click(byLabel('Close'))
    click(byLabel('Close'))
    vi.advanceTimersByTime(400)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('draws in place without the overlay when inline', () => {
    mount(sheet(vi.fn(), { mode: 'inline' }))
    expect($('.fb-sheet')?.getAttribute('data-mode')).toBe('inline')
    expect($('.fb-sheet')?.hasAttribute('popover')).toBe(false)
  })
})
