// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { selection } from './store'
import { useSelection } from './useSelection'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => act(() => selection.clear()))

function mount(selector?: Parameters<typeof useSelection>[0]) {
  const el = document.createElement('div')
  const seen: unknown[] = []
  let renders = 0
  function Probe() {
    renders++
    seen.push(useSelection(selector))
    return null
  }
  const root = createRoot(el)
  act(() => root.render(createElement(Probe)))
  return {
    seen,
    renders: () => renders,
    unmount: () => act(() => root.unmount()),
  }
}

describe('useSelection', () => {
  it('returns the current selection and follows changes', () => {
    const m = mount()
    expect(m.seen.at(-1)).toEqual({ kind: 'none' })
    act(() => selection.select({ kind: 'picture', owner: 'e', id: 'p' }))
    expect(m.seen.at(-1)).toEqual({ kind: 'picture', owner: 'e', id: 'p' })
    m.unmount()
  })

  it('re-renders only when the picked part changes', () => {
    const m = mount((s) => s.kind === 'box')
    const before = m.renders()
    act(() => selection.select({ kind: 'text', owner: 'e', from: 0, to: 1 }))
    act(() => selection.select({ kind: 'text', owner: 'e', from: 0, to: 2 }))
    expect(m.renders()).toBe(before)
    act(() => selection.select({ kind: 'box', owner: 'p', boxIds: ['a'] }))
    expect(m.renders()).toBe(before + 1)
    expect(m.seen.at(-1)).toBe(true)
    m.unmount()
  })

  it('stops listening after unmount', () => {
    const m = mount()
    m.unmount()
    const n = m.renders()
    act(() => selection.select({ kind: 'rows', owner: 'd', rowIds: ['r'] }))
    expect(m.renders()).toBe(n)
  })
})
