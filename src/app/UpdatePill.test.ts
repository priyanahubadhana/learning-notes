// @vitest-environment jsdom
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UpdatePill from './UpdatePill'
import { updateStatus } from './updateStatus'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

/** update-v2 UV-1 (the pill says "Update ready") and UV-12 ("Updated to <version>" for 4 s). */
describe('the update pill', () => {
  let host: HTMLDivElement
  let root: Root
  beforeEach(() => {
    vi.useFakeTimers()
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    updateStatus.set({ phase: 'idle' })
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.useRealTimers()
  })
  const show = (s: Parameters<typeof updateStatus.set>[0]) => {
    act(() => {
      updateStatus.set(s)
      root.render(createElement(UpdatePill))
    })
  }

  it('UV-1: a found update of the same level shows "Update ready" and stays', () => {
    show({ phase: 'ready' })
    expect(host.textContent).toBe('Update ready')
    act(() => void vi.advanceTimersByTime(10_000))
    expect(host.textContent).toBe('Update ready')
  })

  it('UV-12: an installed update shows "Updated to version <v>" for 4 s, then goes', () => {
    show({ phase: 'updated', version: 'abc1234' })
    expect(host.textContent).toBe('Updated to version abc1234')
    act(() => void vi.advanceTimersByTime(3900))
    expect(host.textContent).toBe('Updated to version abc1234')
    act(() => void vi.advanceTimersByTime(200))
    expect(host.textContent).toBe('')
  })
})
