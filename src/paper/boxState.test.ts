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
