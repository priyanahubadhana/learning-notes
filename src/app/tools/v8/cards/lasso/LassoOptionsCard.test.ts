import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

let layers: unknown[] | null = null
vi.mock('../../../../../ink/inkRuntime', () => ({
  useInk: () => (layers ? { doc: { layers } } : null),
  bumpInk: () => {},
}))
// Server rendering has no store snapshot: the row stays at its default.
vi.mock('../../../../../ink/lassoMenu', async (real) => {
  const m = await real<typeof import('../../../../../ink/lassoMenu')>()
  return { ...m, lassoRow: { ...m.lassoRow, useValue: () => m.DEFAULT_ROW } }
})

const { LassoOptionsCard } = await import('./LassoOptionsCard')

const hint = (list: unknown[] | null) => {
  layers = list
  const html = renderToStaticMarkup(createElement(LassoOptionsCard))
  return /<span class="fgroup-hint">([^<]*)<\/span>/g.exec(
    html.slice(html.indexOf('Layers')),
  )?.[1]
}

describe('Lasso Options card: the "N layers" hint under Layers (2A.11)', () => {
  it('says 0 layers when the page has none or no ink yet', () => {
    expect(hint(null)).toBe('0 layers')
    expect(hint([])).toBe('0 layers')
  })
  it('says 1 layer for one', () => {
    expect(hint([{ id: 'a' }])).toBe('1 layer')
  })
  it('says the count for many', () => {
    expect(hint([{ id: 'a' }, { id: 'b' }, { id: 'c' }])).toBe('3 layers')
  })
})
