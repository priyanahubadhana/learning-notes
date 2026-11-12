import { describe, expect, it } from 'vitest'
import { applyLayerVars, LAYERS, layerCssVars } from './layers'

describe('layers', () => {
  it('orders bottom to top', () => {
    const v = Object.values(LAYERS)
    expect([...v].sort((a, b) => a - b)).toEqual(v)
    expect(LAYERS.toast).toBe(700)
  })
  it('builds css vars', () => {
    expect(layerCssVars()).toBe(
      '--z-bar:100;--z-pill:200;--z-menu:300;--z-card:400;--z-sheet:500;--z-dialog:600;--z-toast:700;',
    )
  })
  it('applies vars to a root', () => {
    applyLayerVars(document.documentElement)
    expect(document.documentElement.style.getPropertyValue('--z-card')).toBe(
      '400',
    )
  })
})
