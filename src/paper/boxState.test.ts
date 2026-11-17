import { describe, expect, it } from 'vitest'
import { boxReducer, IDLE, pickedOf, type BoxState } from './boxState'

const run = (...events: Parameters<typeof boxReducer>[1][]): BoxState =>
  events.reduce(boxReducer, IDLE as BoxState)

describe('box states', () => {
  it('a frame tap selects; tapping inside types and hides the bar; the frame again selects', () => {
    let s = run({ type: 'frameTap', id: 'a' })
    expect(s).toEqual({ kind: 'selected', ids: ['a'] })
    s = boxReducer(s, { type: 'caretIn', id: 'a' })
    expect(s).toEqual({ kind: 'typing', id: 'a' })
    expect(pickedOf(s)).toEqual(['a'])
    s = boxReducer(s, { type: 'frameTap', id: 'a' })
    expect(s).toEqual({ kind: 'selected', ids: ['a'] })
    s = boxReducer(s, { type: 'caretIn', id: 'a' })
    expect(s.kind).toBe('typing')
  })
  it('typing in a box that is not picked stays idle', () => {
    expect(run({ type: 'caretIn', id: 'a' })).toEqual(IDLE)
    expect(
      run({ type: 'frameTap', id: 'a' }, { type: 'caretIn', id: 'b' }),
    ).toEqual({ kind: 'selected', ids: ['a'] })
  })
  it('the caret leaving a typing box goes back to selected', () => {
    expect(
      run(
        { type: 'frameTap', id: 'a' },
        { type: 'caretIn', id: 'a' },
        { type: 'caretOut' },
      ),
    ).toEqual({ kind: 'selected', ids: ['a'] })
  })
  it('Esc or a tap on bare paper goes to idle from every state', () => {
    expect(run({ type: 'frameTap', id: 'a' }, { type: 'clear' })).toEqual(IDLE)
    expect(
      run(
        { type: 'frameTap', id: 'a' },
        { type: 'caretIn', id: 'a' },
        { type: 'clear' },
      ),
    ).toEqual(IDLE)
  })
  it('Shift adds and removes boxes; the Lasso picks several', () => {
    let s = run(
      { type: 'frameTap', id: 'a' },
      { type: 'frameTap', id: 'b', add: true },
    )
    expect(pickedOf(s)).toEqual(['a', 'b'])
    s = boxReducer(s, { type: 'frameTap', id: 'a', add: true })
    expect(pickedOf(s)).toEqual(['b'])
    expect(pickedOf(run({ type: 'pick', ids: ['x', 'y'] }))).toEqual(['x', 'y'])
    expect(run({ type: 'pick', ids: [] })).toEqual(IDLE)
  })
})

describe('box states, text box v2 (C16): one selected box at a time', () => {
  it('typing in another box unselects the picked one (C11: that box is typing)', () => {
    const s = run(
      { type: 'frameTap', id: 'a' },
      { type: 'caretIn', id: 'b', exclusive: true },
    )
    // C11: the caret in b shows b's typing look; nothing is picked.
    expect(s).toEqual({ kind: 'typing', id: 'b', fresh: true })
    expect(pickedOf(s)).toEqual([])
  })
  it('typing in the picked box still types', () => {
    expect(
      run(
        { type: 'frameTap', id: 'a' },
        { type: 'caretIn', id: 'a', exclusive: true },
      ),
    ).toEqual({ kind: 'typing', id: 'a' })
  })
  it('several boxes picked by the Lasso: typing in one of them unselects the rest', () => {
    const s = run(
      { type: 'pick', ids: ['a', 'b'] },
      { type: 'caretIn', id: 'a', exclusive: true },
    )
    expect(s).toEqual({ kind: 'typing', id: 'a', fresh: true })
    expect(pickedOf(s)).toEqual([])
  })
})

describe('box states, text box v2 (C11): typing, outside once, outside twice', () => {
  it('the caret leaving a typing box leaves it selected; a clear then selects nothing', () => {
    let s = run(
      { type: 'frameTap', id: 'a' },
      { type: 'caretIn', id: 'a', exclusive: true },
    )
    expect(s.kind).toBe('typing')
    s = boxReducer(s, { type: 'caretOut' })
    expect(s).toEqual({ kind: 'selected', ids: ['a'] })
    expect(boxReducer(s, { type: 'clear' })).toEqual(IDLE)
  })
})

describe('box states, text box v2 (C11): typing in a box that was never picked', () => {
  it('the caret in an unpicked box is typing (thin border, no dots), not a pick', () => {
    const s = run({ type: 'caretIn', id: 'a', exclusive: true })
    expect(s).toEqual({ kind: 'typing', id: 'a', fresh: true })
    expect(pickedOf(s)).toEqual([])
  })
  it("the page's first box types the same way (TB-08)", () => {
    expect(run({ type: 'caretIn', id: 'main', exclusive: true })).toEqual({
      kind: 'typing',
      id: 'main',
      fresh: true,
    })
  })
  it('a box never picked: the caret leaving it selects nothing (a tap on paper makes the next box, TB-06)', () => {
    expect(
      run(
        { type: 'caretIn', id: 'new', exclusive: true },
        { type: 'caretOut' },
      ),
    ).toEqual(IDLE)
  })
  it('a picked box typed in: one tap outside, selected; a second, nothing', () => {
    let s = run(
      { type: 'frameTap', id: 'a' },
      { type: 'caretIn', id: 'a', exclusive: true },
    )
    expect(s).toEqual({ kind: 'typing', id: 'a' })
    s = boxReducer(s, { type: 'caretOut' })
    expect(s).toEqual({ kind: 'selected', ids: ['a'] })
    expect(boxReducer(s, { type: 'clear' })).toEqual(IDLE)
  })
  it('a fresh box, then its frame tapped and typed in again: back to the C11 states', () => {
    let s = run(
      { type: 'caretIn', id: 'a', exclusive: true },
      { type: 'frameTap', id: 'a' },
      { type: 'caretIn', id: 'a', exclusive: true },
    )
    expect(s).toEqual({ kind: 'typing', id: 'a' })
    s = boxReducer(s, { type: 'caretOut' })
    expect(s).toEqual({ kind: 'selected', ids: ['a'] })
  })
  it('the same caret again keeps the same state object (no redraw)', () => {
    const s = run({ type: 'caretIn', id: 'a', exclusive: true })
    expect(boxReducer(s, { type: 'caretIn', id: 'a', exclusive: true })).toBe(s)
  })
  it('without v2 an unpicked box still types as idle (live app unchanged)', () => {
    expect(run({ type: 'caretIn', id: 'a' })).toEqual(IDLE)
  })
})
