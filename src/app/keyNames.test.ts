import { describe, expect, it } from 'vitest'
import { keyNameFor, keyNamesShown } from './keyNames'
import { DEVICE_MODES } from './deviceMode'

describe('T31 key names only in Computer mode', () => {
  it('shows in Computer, hides in Touch and Pencil', () => {
    expect(keyNamesShown('computer')).toBe(true)
    expect(keyNamesShown('touch')).toBe(false)
    expect(keyNamesShown('pencil')).toBe(false)
  })
  it('hands the label back only in Computer mode', () => {
    expect(keyNameFor('computer', '⌘⇧K')).toBe('⌘⇧K')
    for (const m of DEVICE_MODES.filter((x) => x !== 'computer'))
      expect(keyNameFor(m, '⌘⇧K')).toBeUndefined()
  })
  it('keeps "no label" as no label', () => {
    expect(keyNameFor('computer', undefined)).toBeUndefined()
  })
})
