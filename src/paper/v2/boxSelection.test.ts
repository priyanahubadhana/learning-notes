import { describe, expect, it } from 'vitest'
import { createSelectionStore } from '../../app/selection/store'
import {
  BOX_OWNER,
  clearBoxes,
  inputModeFor,
  isTap,
  selectBoxes,
  tapAction,
} from './boxSelection'

describe('boxSelection (text box v2, TB-01 to TB-03)', () => {
  it('selecting a box replaces any other kind of selection (one kind at a time)', () => {
    const s = createSelectionStore()
    s.select({ kind: 'text', owner: 'editor', from: 1, to: 4 })
    selectBoxes(s, ['a'])
    expect(s.getSnapshot()).toEqual({
      kind: 'box',
      owner: BOX_OWNER,
      boxIds: ['a'],
    })
    s.select({ kind: 'ink', owner: 'ink', strokeIds: ['x'] })
    selectBoxes(s, ['b', 'c'])
    expect(s.getSnapshot().kind).toBe('box')
  })

  it('selecting no boxes clears only the box selection', () => {
    const s = createSelectionStore()
    selectBoxes(s, ['a'])
    selectBoxes(s, [])
    expect(s.getSnapshot().kind).toBe('none')
    s.select({ kind: 'text', owner: 'editor', from: 0, to: 2 })
    clearBoxes(s)
    expect(s.getSnapshot().kind).toBe('text')
  })

  it('the first tap on a box that is not selected selects it, whatever the tool', () => {
    expect(tapAction({ picked: false })).toBe('select')
    expect(tapAction({ picked: true })).toBe('caret')
  })

  it('a Pencil never opens the keyboard; a finger and a mouse may', () => {
    expect(inputModeFor('pen')).toBe('none')
    expect(inputModeFor('touch')).toBe('text')
    expect(inputModeFor('mouse')).toBe('text')
  })

  it('a tap is short and barely moves (12 px, 300 ms)', () => {
    expect(isTap(5, 120)).toBe(true)
    expect(isTap(13, 120)).toBe(false)
    expect(isTap(5, 400)).toBe(false)
  })
})
