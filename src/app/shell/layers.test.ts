import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LAYERS } from '../overlay'
import { breakpointFor } from './useBreakpoint'
import {
  isAbove,
  layerToken,
  layerVar,
  SHELL_LAYERS,
  type ShellLayer,
} from './layers'

const tokens = readFileSync('src/design/tokens.css', 'utf8')
const tokenValue = (name: string) =>
  Number(new RegExp(name + ': *([0-9]+)').exec(tokens)?.[1])

describe('shell layers (SH-14)', () => {
  it('match the --z-* tokens in tokens.css', () => {
    for (const k of Object.keys(SHELL_LAYERS) as ShellLayer[])
      expect(tokenValue(layerToken(k)), k).toBe(SHELL_LAYERS[k])
  })

  it('keep the order tab bar < bars < chips < drawer < sheet < dialog < pop < toast', () => {
    const order: ShellLayer[] = [
      'tabbar',
      'fbar',
      'chip',
      'drawerScrim',
      'drawer',
      'sheetScrim',
      'sheet',
      'dialog',
      'pop',
      'tagpick',
      'toast',
    ]
    for (let i = 1; i < order.length; i++)
      expect(isAbove(order[i], order[i - 1]), order[i]).toBe(true)
  })

  it('agrees with the overlay manager on which floating layer is above which', () => {
    expect(LAYERS.sheet).toBeLessThan(LAYERS.dialog)
    expect(LAYERS.dialog).toBeLessThan(LAYERS.toast)
    expect(SHELL_LAYERS.sheet).toBeLessThan(SHELL_LAYERS.dialog)
    expect(SHELL_LAYERS.dialog).toBeLessThan(SHELL_LAYERS.toast)
  })

  it('names a layer as a CSS variable', () => {
    expect(layerVar('sheet')).toBe('var(--z-sheet)')
    expect(layerVar('drawerScrim')).toBe('var(--z-drawer-scrim)')
  })
})

describe('breakpoints (SH-14)', () => {
  it('has three sizes: 640 and 1180 are the only edges', () => {
    expect(breakpointFor(639, 800)).toBe('phone')
    expect(breakpointFor(640, 800)).toBe('mid')
    expect(breakpointFor(1179, 800)).toBe('mid')
    expect(breakpointFor(1180, 800)).toBe('wide')
  })
  it('a short window counts as a phone', () => {
    expect(breakpointFor(900, 400)).toBe('phone')
  })
})
