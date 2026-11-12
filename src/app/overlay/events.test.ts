/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { domOverlayEvents } from './events'

describe('domOverlayEvents', () => {
  it('Esc, pointerdown, background; unsub stops them', () => {
    const ev = domOverlayEvents(document)
    const esc = vi.fn()
    const pd = vi.fn()
    const bg = vi.fn()
    const u = [ev.onEscape(esc), ev.onPointerDown(pd), ev.onBackground(bg)]
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    window.dispatchEvent(new Event('popstate'))
    window.dispatchEvent(new Event('hashchange'))
    expect(esc).toHaveBeenCalledTimes(1)
    expect(pd).toHaveBeenCalledWith(document.body)
    expect(bg).toHaveBeenCalledTimes(2)
    u.forEach((f) => f())
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    window.dispatchEvent(new Event('popstate'))
    expect(esc).toHaveBeenCalledTimes(1)
    expect(bg).toHaveBeenCalledTimes(2)
  })
})
