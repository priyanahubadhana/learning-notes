import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Settings Preview dock and sheet', () => {
  const css = readFileSync('src/settings/v3/settingsV3.css', 'utf8')
  const rail = css.slice(
    css.indexOf('@media (min-width: 40rem) and (min-height: 32rem)'),
  )
  it('keep the home-bar space in the rail layout and on phone', () => {
    const block = rail.slice(0, rail.indexOf('/* Tablet and up'))
    expect(block.match(/env\(safe-area-inset-bottom/g)?.length).toBe(2)
    expect(css.slice(0, css.indexOf('.sv3-pill {'))).toContain(
      'env(safe-area-inset-bottom',
    )
  })
})
