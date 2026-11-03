import { describe, expect, it } from 'vitest'
import {
  barButtonPx,
  DEFAULT_PINNED,
  detectDeviceMode,
  isDeviceMode,
  isHardwareKey,
  isPinnedList,
  keepKnown,
  MODE_PRESETS,
  moveAction,
  pinAction,
  unpinAction,
} from './deviceMode'

const only = (query: string) => (q: string) => q === query

describe('mode presets', () => {
  it('Computer floats, compact, with tips and shortcut hints', () => {
    expect(MODE_PRESETS.computer).toEqual({
      placement: 'floating',
      size: 'compact',
      hoverTips: 'on',
      shortcutHints: 'on',
      autoHide: 'off',
    })
  })
  it('Touch docks on top, normal size', () => {
    expect(MODE_PRESETS.touch).toMatchObject({
      placement: 'top',
      size: 'normal',
      hoverTips: 'off',
    })
  })
  it('Pencil docks at the bottom, large', () => {
    expect(MODE_PRESETS.pencil).toMatchObject({
      placement: 'bottom',
      size: 'large',
    })
  })
})

describe('first-run detection', () => {
  it('a mouse computer is Computer', () => {
    expect(detectDeviceMode(only('(pointer: fine) and (hover: hover)'))).toBe(
      'computer',
    )
  })
  it('a touch screen is Touch', () => {
    expect(detectDeviceMode(only('(pointer: coarse)'))).toBe('touch')
  })
  it('never picks Pencil, and falls back to Computer', () => {
    expect(detectDeviceMode(() => false)).toBe('computer')
  })
})

describe('button size', () => {
  it('uses 36 / 44 / 54 px on a computer', () => {
    expect(barButtonPx('compact', 'computer')).toBe(36)
    expect(barButtonPx('normal', 'computer')).toBe(44)
    expect(barButtonPx('large', 'computer')).toBe(54)
  })
  it('never goes under 44 px in Touch and Pencil', () => {
    expect(barButtonPx('compact', 'touch')).toBe(44)
    expect(barButtonPx('compact', 'pencil')).toBe(44)
    expect(barButtonPx('large', 'pencil')).toBe(54)
  })
})

describe('validation', () => {
  it('accepts only the three modes', () => {
    expect(isDeviceMode('touch')).toBe(true)
    expect(isDeviceMode('tablet')).toBe(false)
    expect(isDeviceMode(null)).toBe(false)
  })
  it('accepts a clean, unique list of button ids', () => {
    expect(isPinnedList(['bold', 'mark:key'])).toBe(true)
    expect(isPinnedList([])).toBe(true)
    expect(isPinnedList(['bold', 'bold'])).toBe(false)
    expect(isPinnedList(['<script>'])).toBe(false)
    expect(isPinnedList([1])).toBe(false)
    expect(isPinnedList('bold')).toBe(false)
    expect(isPinnedList(Array.from({ length: 41 }, (_, i) => `a${i}`))).toBe(
      false,
    )
  })
})

describe('pin, unpin, reorder, reset', () => {
  it('pins at the end once', () => {
    expect(pinAction(['bold'], 'link')).toEqual(['bold', 'link'])
    expect(pinAction(['bold', 'link'], 'link')).toEqual(['bold', 'link'])
  })
  it('unpins', () => {
    expect(unpinAction(['bold', 'link'], 'bold')).toEqual(['link'])
  })
  it('moves up and down but stays inside the list', () => {
    const list = ['a', 'b', 'c']
    expect(moveAction(list, 'c', -1)).toEqual(['a', 'c', 'b'])
    expect(moveAction(list, 'a', -1)).toEqual(['a', 'b', 'c'])
    expect(moveAction(list, 'c', 1)).toEqual(['a', 'b', 'c'])
    expect(moveAction(list, 'a', 1)).toEqual(['b', 'a', 'c'])
    expect(moveAction(list, 'zzz', 1)).toEqual(list)
  })
  it('drops buttons that no longer exist', () => {
    expect(keepKnown(['bold', 'mark:gone'], ['bold'])).toEqual(['bold'])
  })
  it('the default bar has the planned buttons', () => {
    expect(DEFAULT_PINNED).toEqual([
      'bold',
      'italic',
      'underline',
      'mark:key',
      'card',
      'newLine',
    ])
  })
})

describe('real keyboard detection', () => {
  const key = (k: string, mods = {}) => ({
    key: k,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...mods,
  })
  it('sees shortcuts and navigation keys, not plain typing', () => {
    expect(isHardwareKey(key('b', { ctrlKey: true }))).toBe(true)
    expect(isHardwareKey(key('ArrowDown'))).toBe(true)
    expect(isHardwareKey(key('Tab'))).toBe(true)
    expect(isHardwareKey(key('a'))).toBe(false)
    expect(isHardwareKey(key('Enter'))).toBe(false)
  })
})
