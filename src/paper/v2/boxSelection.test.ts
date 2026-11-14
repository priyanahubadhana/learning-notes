import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createSelectionStore } from '../../app/selection/store'
import {
  BOX_OWNER,
  clearBoxes,
  inputModeFor,
  isTap,
  rowUnder,
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

  it('a tap beside a box goes under that box (TB-06)', () => {
    const spans = [
      { top: 20, bottom: 40 },
      { top: 100, bottom: 120 },
    ]
    expect(rowUnder(30, spans, 3)).toBe(43)
    expect(rowUnder(60, spans, 3)).toBe(60)
    expect(rowUnder(110, spans, 3)).toBe(123)
  })

  it('a tap is short and barely moves (12 px, 300 ms)', () => {
    expect(isTap(5, 120)).toBe(true)
    expect(isTap(13, 120)).toBe(false)
    expect(isTap(5, 400)).toBe(false)
  })
})

describe('boxV2.css (the one selection look, TB-02)', () => {
  const css = readFileSync(new URL('./boxV2.css', import.meta.url), 'utf8')
  it('a selected box has a 1.5 px line and a 1 px paper halo', () => {
    expect(css).toMatch(
      /\[data-picked\] \[data-box-frame\] \{\s*border-width: 1\.5px/,
    )
    expect(css).toMatch(/box-shadow: 0 0 0 1px var\(--color-bg\)/)
  })
  it('a line or block inside never gets its own outline', () => {
    expect(css).toMatch(/\.bn-block-content[^{]*\{\s*outline: none/)
  })
})
