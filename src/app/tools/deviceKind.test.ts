import { describe, expect, it } from 'vitest'
import { modeForKind, suggestKind } from './deviceKind'

describe('device picker', () => {
  it('maps a choice to a device mode', () => {
    expect(modeForKind('computer', true)).toBe('computer')
    expect(modeForKind('phone', true)).toBe('touch')
    expect(modeForKind('tablet', false)).toBe('touch')
    expect(modeForKind('tablet', true)).toBe('pencil')
  })

  it('preselects from detection, including an iPad that says it is a Mac', () => {
    const base = {
      mode: 'computer',
      ipadAsMac: false,
      coarsePointer: false,
      shortSide: 900,
    } as const
    expect(suggestKind(base)).toEqual({ kind: 'computer', pencil: false })
    expect(
      suggestKind({ ...base, ipadAsMac: true, mode: 'touch', shortSide: 820 }),
    ).toEqual({ kind: 'tablet', pencil: false })
    expect(
      suggestKind({
        ...base,
        coarsePointer: true,
        mode: 'touch',
        shortSide: 390,
      }),
    ).toEqual({ kind: 'phone', pencil: false })
  })

  it('keeps what an existing user already uses', () => {
    const base = {
      ipadAsMac: false,
      coarsePointer: false,
      shortSide: 1200,
    } as const
    expect(suggestKind({ ...base, mode: 'pencil' })).toEqual({
      kind: 'tablet',
      pencil: true,
    })
    expect(suggestKind({ ...base, mode: 'touch' })).toEqual({
      kind: 'tablet',
      pencil: false,
    })
    expect(suggestKind({ ...base, mode: 'computer' })).toEqual({
      kind: 'computer',
      pencil: false,
    })
  })
})
