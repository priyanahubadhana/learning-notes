import { describe, expect, it } from 'vitest'
import { nextTuck, type TuckState } from './tuck'

const base: TuckState = { tucked: false, peeking: false, toolUsed: false }
const on = { hideWhileWriting: true }
const off = { hideWhileWriting: false }

describe('BUG-003: hide the tool bar while writing', () => {
  it('setting on: writing tucks the bar away (TB-74)', () => {
    expect(nextTuck(base, { type: 'write' }, on).tucked).toBe(true)
  })
  it('setting off: writing leaves the bar alone (default off)', () => {
    expect(nextTuck(base, { type: 'write' }, off).tucked).toBe(false)
  })
  it('the pill brings the bar back; a tool pick and more writing hides it again', () => {
    let s = nextTuck(base, { type: 'write' }, on)
    s = nextTuck(s, { type: 'show' }, on)
    expect(s.tucked).toBe(false)
    s = nextTuck(s, { type: 'tool' }, on)
    s = nextTuck(s, { type: 'write' }, on)
    expect(s.tucked).toBe(true)
  })
  it('TB-75: bar was off, Show peeks; it stays while no tool was used', () => {
    let s = nextTuck(base, { type: 'show', wasOff: true }, off)
    expect(s.peeking).toBe(true)
    s = nextTuck(s, { type: 'write' }, off)
    expect(s.tucked).toBe(false)
  })
  it('TB-75: after a tool and writing, a peek hides again', () => {
    let s = nextTuck(base, { type: 'show', wasOff: true }, off)
    s = nextTuck(s, { type: 'tool' }, off)
    s = nextTuck(s, { type: 'write' }, off)
    expect(s.tucked).toBe(true)
    expect(s.peeking).toBe(false)
  })
})
