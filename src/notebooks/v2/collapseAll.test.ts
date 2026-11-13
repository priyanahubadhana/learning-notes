import { describe, expect, it } from 'vitest'
import { collapseAllState } from './collapseAll'

describe('collapseAllState (NB-B22)', () => {
  it('says collapse while any notebook is open', () => {
    expect(collapseAllState(['a', 'b'], (id) => id === 'b')).toEqual({
      action: 'collapse',
      disabled: false,
    })
  })
  it('says expand when all are folded', () => {
    expect(collapseAllState(['a', 'b'], () => false).action).toBe('expand')
  })
  it('is off with no notebooks', () => {
    expect(collapseAllState([], () => true).disabled).toBe(true)
  })
})
