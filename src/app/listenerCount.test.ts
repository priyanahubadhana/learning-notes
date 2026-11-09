// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { installListenerCount, listenerCounts } from './listenerCount'
import { toolState } from './gestureReset'

describe('listenerCount', () => {
  it('counts document listeners by type and phase, once per listener', () => {
    installListenerCount(document, window)
    const a = () => {}
    const b = () => {}
    document.addEventListener('pointerdown', a, true)
    document.addEventListener('pointerdown', a, true) // the same: one
    document.addEventListener('pointerdown', b, { capture: true })
    document.addEventListener('keydown', a)
    const row = listenerCounts().document
    expect(row['pointerdown (capture)']).toBe(2)
    expect(row['keydown']).toBe(1)
    document.removeEventListener('pointerdown', a, true)
    expect(listenerCounts().document['pointerdown (capture)']).toBe(1)
    expect(toolState().listeners.pointerTotal).toBe(1)
    document.removeEventListener('pointerdown', b, true)
    document.removeEventListener('keydown', a)
    expect(listenerCounts().document['pointerdown (capture)']).toBeUndefined()
  })
})
