/**
 * @vitest-environment jsdom
 */
import { act, createElement as h, Fragment, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import type { Editor } from '../../../editor/barActions'
import { useEditorRedraw } from './useEditorRedraw'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

/** A stand-in editor: a selection text and its change listeners. */
function fakeEditor() {
  const listeners = new Set<() => void>()
  const on = (fn: () => void) => {
    listeners.add(fn)
    return () => void listeners.delete(fn)
  }
  const ed = {
    text: '',
    select(text: string) {
      ed.text = text
      for (const fn of listeners) fn()
    },
    onChange: on,
    onSelectionChange: on,
  }
  return ed
}

describe('useEditorRedraw', () => {
  // Cause of the TB-33 flake (CI run 46122961075, ipad-webkit): the selection
  // bar is a lazy part that mounts when the Lasso is chosen; on a slow page
  // the keys that select the words come after its first draw but before its
  // listeners are attached (React attaches them a task later). That change
  // was never heard and the bar stayed hidden. A layout effect here makes the
  // change in that same gap.
  it('draws again for a change made after the first draw, before it listens', () => {
    const ed = fakeEditor()
    function Shows() {
      useEditorRedraw(ed as unknown as Editor)
      return h('span', null, ed.text || 'none')
    }
    function SelectsInTheGap() {
      useLayoutEffect(() => ed.select('The nucleus'), [])
      return null
    }
    const host = document.createElement('div')
    const root = createRoot(host)
    act(() => root.render(h(Fragment, null, h(Shows), h(SelectsInTheGap))))
    expect(host.textContent).toBe('The nucleus')
    act(() => root.unmount())
  })

  it('draws again on later changes', () => {
    const ed = fakeEditor()
    function Shows() {
      useEditorRedraw(ed as unknown as Editor)
      return h('span', null, ed.text || 'none')
    }
    const host = document.createElement('div')
    const root = createRoot(host)
    act(() => root.render(h(Shows)))
    expect(host.textContent).toBe('none')
    act(() => ed.select('DNA'))
    expect(host.textContent).toBe('DNA')
    act(() => root.unmount())
  })
})
