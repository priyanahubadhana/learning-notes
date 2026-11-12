import { afterEach, describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { AboutSection } from './AboutSection'
import { resetFlags, setFlag } from '../app/flags'
import { setLevel } from './level'

afterEach(() => {
  resetFlags()
  setLevel('professional')
})

describe('About (update.v2)', () => {
  it('flag off: shows what it shows today (no level line)', () => {
    const html = renderToString(<AboutSection />)
    expect(html).toContain('data-about-last')
    expect(html).not.toContain('data-about-level')
  })
  it('flag on, Professional: shows the level', () => {
    setFlag('update.v2', true)
    expect(renderToString(<AboutSection />)).toContain('Update level 1')
  })
  it('flag on, Beginner without the unlock: only the check button', () => {
    setFlag('update.v2', true)
    setLevel('beginner')
    const html = renderToString(<AboutSection />)
    expect(html).not.toContain('data-about-level')
    expect(html).not.toContain('data-about-last')
    expect(html).toContain('Check for updates now')
  })
})
