import { describe, expect, it } from 'vitest'
import { PRO_FEATURES } from '../../settings/proFeatures.gen'
import { READER_SWITCHES, readerSwitchOn } from './proSwitches'

describe('reader Professional switches (RD-P34)', () => {
  it('lists exactly the 32 Reader switches of the generated list', () => {
    const gen = PRO_FEATURES.filter((f) => f.group === 'Reader').map((f) => f.id)
    expect(READER_SWITCHES.map((s) => s.id).sort()).toEqual([...gen].sort())
    expect(gen).toHaveLength(32)
  })
  it('names each switch with a spec line (RD-Pnn) and R-ids', () => {
    for (const s of READER_SWITCHES) {
      expect(s.spec).toMatch(/^RD-P\d\d$/)
      expect(s.rIds.length).toBeGreaterThan(0)
    }
    expect(new Set(READER_SWITCHES.map((s) => s.spec)).size).toBe(32)
  })
  it('flag off: every switch reads as on (today\'s reader untouched)', () => {
    for (const s of READER_SWITCHES) expect(readerSwitchOn(false, s.id)).toBe(true)
  })
})
