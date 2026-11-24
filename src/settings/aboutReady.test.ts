import { describe, expect, it } from 'vitest'
import { aboutReady } from './aboutReady'

describe('About words match the screen (T28)', () => {
  it('restart begun: says it restarts by itself', () => {
    expect(
      aboutReady({ auto: true, phase: 'updating', dismissed: false }),
    ).toBe('updating')
    expect(
      aboutReady({ auto: false, phase: 'updating', dismissed: true }),
    ).toBe('updating')
  })
  it('automatic but not started: no promise of a restart', () => {
    expect(aboutReady({ auto: true, phase: 'ready', dismissed: false })).toBe(
      'auto',
    )
  })
  it('automatic off, notice open: points at the notice', () => {
    expect(aboutReady({ auto: false, phase: 'ready', dismissed: false })).toBe(
      'notice',
    )
  })
  it('notice closed with the cross: points at the button in About', () => {
    expect(aboutReady({ auto: false, phase: 'ready', dismissed: true })).toBe(
      'closed',
    )
    expect(aboutReady({ auto: true, phase: 'ready', dismissed: true })).toBe(
      'closed',
    )
  })
})
