import { beforeEach, describe, expect, it } from 'vitest'
import {
  bindPadHistory,
  padHistoryState,
  recordApply,
  recordPad,
  recordPage,
  redoPad,
  resetPadHistory,
  undoPad,
  type PadSnap,
} from './padHistory'

const snap = (text: string, mode: PadSnap['mode'] = 'scribble'): PadSnap => ({
  text,
  mode,
  strokes: [],
})

describe('pad history', () => {
  let box: PadSnap = snap('')
  let pageCalls: string[] = []
  beforeEach(() => {
    box = snap('')
    pageCalls = []
    bindPadHistory(
      (s) => (box = s),
      (kind) => {
        pageCalls.push(kind)
        return true
      },
    )
    resetPadHistory('')
  })

  it('undoes and redoes whole steps, merging quick typing', () => {
    recordPad(snap('a'), { now: 1000, typing: true })
    recordPad(snap('ab'), { now: 1100, typing: true })
    recordPad(snap('ab\n'), { now: 3000 }) // a key: its own step
    expect(undoPad()).toBe(true)
    expect(box.text).toBe('ab')
    expect(undoPad()).toBe(true)
    expect(box.text).toBe('')
    expect(undoPad()).toBe(false)
    expect(padHistoryState.get()).toEqual({ canUndo: false, canRedo: true })
    expect(redoPad()).toBe(true)
    expect(box.text).toBe('ab')
    expect(redoPad()).toBe(true)
    expect(box.text).toBe('ab\n')
    expect(redoPad()).toBe(false)
  })

  it('a new edit drops the redo steps; reset clears everything', () => {
    recordPad(snap('a'), { now: 1000 })
    undoPad()
    recordPad(snap('b'), { now: 5000 })
    expect(padHistoryState.get().canRedo).toBe(false)
    resetPadHistory('')
    expect(undoPad()).toBe(false)
    expect(padHistoryState.get().canUndo).toBe(false)
  })

  it('Undo of an Insert undoes the page and puts the text back in the pad (R7-20)', () => {
    recordPad(snap('hello'), { now: 1000 })
    recordApply(snap(''))
    expect(undoPad()).toBe(true)
    expect(pageCalls).toEqual(['undo'])
    expect(box.text).toBe('hello')
    expect(redoPad()).toBe(true)
    expect(pageCalls).toEqual(['undo', 'redo'])
    expect(box.text).toBe('')
  })

  it('mode switches, Read results and Clear are steps (R7-21, R7-22)', () => {
    recordPad(snap('x'), { now: 1000 })
    recordPad(snap('x', 'ai'), { now: 2000 })
    recordPad(snap('x read', 'ai'), { now: 3000 })
    recordPad(snap('', 'ai'), { now: 4000 }) // Clear
    undoPad()
    expect(box).toEqual(snap('x read', 'ai'))
    undoPad()
    undoPad()
    expect(box).toEqual(snap('x'))
  })

  it('page edits keep their place in the order', () => {
    recordPad(snap('a'), { now: 1000 })
    recordPage()
    recordPad(snap('ab'), { now: 5000 })
    undoPad() // the pad step
    expect(pageCalls).toEqual([])
    undoPad() // the page edit goes to the page's own history
    expect(pageCalls).toEqual(['undo'])
    expect(box.text).toBe('a')
  })
})
