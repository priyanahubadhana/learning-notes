/**
 * @vitest-environment jsdom
 */
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToolsBoundary } from './ToolsBoundary'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let fail = true
function Maybe() {
  if (fail) throw new Error('boom')
  return h('p', null, 'tool')
}

afterEach(() => {
  vi.useRealTimers()
  fail = true
})

describe('ToolsBoundary (owner item 17)', () => {
  it('a failing tool leaves the rest standing, then comes back', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(
        h(
          'div',
          null,
          h('span', null, 'app'),
          h(ToolsBoundary, { name: 'test' }, h(Maybe)),
        ),
      )
    })
    // The tool is gone, the app is not blank.
    expect(host.textContent).toBe('app')
    fail = false
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    expect(host.textContent).toBe('apptool')
    await act(async () => root.unmount())
  })

  it('a tool that always fails stops retrying', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const host = document.createElement('div')
    const root = createRoot(host)
    await act(async () => {
      root.render(h(ToolsBoundary, { name: 'always' }, h(Maybe)))
    })
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(900)
      })
    }
    expect(host.textContent).toBe('')
    await act(async () => root.unmount())
  })
})
