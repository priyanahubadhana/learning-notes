// @vitest-environment jsdom
import { createRoot } from 'react-dom/client'
import { act, createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ScrollBarHost } from '../../../design/parts/ScrollBarHost'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

describe('2B.2 the one gate, as mounted', () => {
  it('off the preview address nothing loads and no listener is added', async () => {
    const add = vi.spyOn(window, 'addEventListener')
    window.history.replaceState(null, '', '/?boxlog=1&pencilcheck=1')
    const host = document.createElement('div')
    document.body.appendChild(host)
    await act(async () => {
      createRoot(host).render(createElement(ScrollBarHost))
    })
    await new Promise((r) => setTimeout(r, 50))
    expect(location.hostname).not.toBe(
      'build-next.learning-notes-app.pages.dev',
    )
    expect(document.querySelector('[data-diag-panel]')).toBeNull()
    const types = add.mock.calls.map((c) => c[0])
    expect(types).not.toContain('pointerdown')
    expect(types).not.toContain('pagehide')
  })
})
