import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Guards for what ships to the live site (security audit, 12 Nov 2026).
describe('site rules', () => {
  const headers = readFileSync('public/_headers', 'utf8')

  it('HSTS covers subdomains and is not preloaded', () => {
    const line = headers.split('\n').find((l) => l.includes('Strict-Transport'))
    expect(line).toMatch(/max-age=\d{7,}/)
    expect(line).toContain('includeSubDomains')
    expect(line).not.toMatch(/preload/i)
  })

  it('the Pencil test page is not shipped (it lives in dev/)', () => {
    for (const f of ['html', 'css', 'js']) {
      expect(existsSync(`public/pencil-test.${f}`)).toBe(false)
      expect(existsSync(`dev/pencil-test/pencil-test.${f}`)).toBe(true)
    }
  })

  it("the service worker keeps only the build's own files (no runtime caching, so no opaque or cross-origin responses)", () => {
    const config = readFileSync('vite.config.ts', 'utf8')
    expect(config).not.toMatch(
      /runtimeCaching|cacheableResponse|statuses:\s*\[0/,
    )
  })
})
