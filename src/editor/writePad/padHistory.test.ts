import { beforeEach, describe, expect, it } from 'vitest'
import {
  bindPadHistory,
  padHistoryState,
  recordPadText,
  redoPad,
  resetPadHistory,
  undoPad,
} from './padHistory'

describe('pad history', () => {
  let box = ''
  beforeEach(() => {
    box = ''
    bindPadHistory((text) => (box = text))
    resetPadHistory('')
  })

  it('undoes and redoes whole steps, merging quick typing', () => {
    recordPadText('a', 1000)
    recordPadText('ab', 1100)
    recordPadText('ab\n', 3000) // a key, much later: its own step
    expect(padHistoryState.get().canUndo).toBe(true)
    expect(undoPad()).toBe(true)
    expect(box).toBe('ab')
    expect(undoPad()).toBe(true)
    expect(box).toBe('')
    expect(undoPad()).toBe(false)
    expect(padHistoryState.get()).toEqual({ canUndo: false, canRedo: true })
    expect(redoPad()).toBe(true)
    expect(box).toBe('ab')
    expect(redoPad()).toBe(true)
    expect(box).toBe('ab\n')
    expect(redoPad()).toBe(false)
  })

  it('a new edit drops the redo steps; reset clears everything', () => {
    recordPadText('a', 1000)
    undoPad()
    recordPadText('b', 5000)
    expect(padHistoryState.get().canRedo).toBe(false)
    resetPadHistory('')
    expect(undoPad()).toBe(false)
    expect(padHistoryState.get().canUndo).toBe(false)
  })
})
