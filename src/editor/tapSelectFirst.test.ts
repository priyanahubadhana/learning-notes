// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { boxShift, textFirstTap } from './tapSelect'

function editorIn(id: string, picked: boolean): HTMLElement {
  const box = document.createElement('div')
  box.setAttribute('data-paper-box', id)
  if (picked) box.setAttribute('data-picked', '')
  const ed = document.createElement('div')
  box.appendChild(ed)
  return ed
}

describe('boxShift with the Text tool (text box v2, TB-01)', () => {
  afterEach(() => {
    textFirstTap.on = false
  })

  it('switch off: the Text tool edits at once, as today', () => {
    expect(boxShift(editorIn('a', false), 'text')).toBe(0)
  })

  it('switch on: the first tap on a box that is not selected selects it', () => {
    textFirstTap.on = true
    expect(boxShift(editorIn('a', false), 'text')).toBe(1)
  })

  it('switch on: a selected box and the default box take the caret', () => {
    textFirstTap.on = true
    expect(boxShift(editorIn('a', true), 'text')).toBe(0)
    expect(boxShift(editorIn('main', false), 'text')).toBe(0)
  })

  it('the Lasso is not changed by the switch', () => {
    expect(boxShift(editorIn('a', false), 'lasso')).toBe(1)
  })
})
