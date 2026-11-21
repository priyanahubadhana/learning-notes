import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** B10-10: the Handwritten font (Patrick Hand) is under the Open Font Licence and listed in our notices. */
describe('B10-10 Patrick Hand licence', () => {
  const read = (p: string) => readFileSync(p, 'utf8')
  it('the package licence is the SIL Open Font Licence 1.1', () => {
    expect(read('node_modules/@fontsource/patrick-hand/LICENSE')).toContain(
      'SIL OPEN FONT LICENSE Version 1.1',
    )
  })
  it('the notices name the font and carry the licence text', () => {
    expect(read('docs/LICENCES-FONTS.md')).toMatch(
      /Patrick Hand.*Open Font Licence 1\.1/,
    )
    const ofl = read('public/licenses/fonts-OFL.txt')
    expect(ofl).toContain('===== patrick-hand =====')
    expect(ofl).toContain('Patrick Wagesreiter')
  })
})
