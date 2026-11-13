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

  const value = (name) =>
    headers
      .split('\n')
      .find((l) => l.trim().startsWith(`${name}:`))
      ?.trim()
      .slice(name.length + 1)
      .trim()

  it('the enforced policy stays, and the stricter one runs in report-only mode (S16)', () => {
    const enforced = value('Content-Security-Policy')
    expect(enforced).toContain(
      "script-src 'self' 'wasm-unsafe-eval' https://accounts.google.com/gsi/client;",
    )
    expect(enforced).toContain("worker-src 'self' blob:")
    expect(enforced).toMatch(/frame-ancestors 'self'(;|$)/)
    const strict = value('Content-Security-Policy-Report-Only')
    expect(strict).toContain("script-src-attr 'none'")
    expect(strict).toContain("manifest-src 'self'")
    expect(strict).toContain('upgrade-insecure-requests')
    expect(strict).toContain("'wasm-unsafe-eval'")
    expect(strict).toContain("worker-src 'self' blob:")
    expect(strict).toContain('https://accounts.google.com')
    expect(strict).toContain('https://www.youtube-nocookie.com')
    // Pictures must still load after the person allows them.
    expect(strict).toMatch(/img-src [^;]*https:/)
  })

  // EPUB guard 1 (DECISIONS 13 Nov, "EPUB on iPad"): book frames run with
  // `allow-scripts`, so the site policy must never let inline or blob scripts in.
  it('script-src stays strict in both policies: no unsafe-inline, unsafe-eval, blob:, data: or wildcard', () => {
    for (const name of [
      'Content-Security-Policy',
      'Content-Security-Policy-Report-Only',
    ]) {
      const policy = value(name)
      const scripts = policy
        .split(';')
        .map((d) => d.trim())
        .filter((d) => /^script-src(-elem|-attr)?\s/.test(d))
      expect(scripts.length).toBeGreaterThan(0)
      for (const d of scripts) {
        expect(d).not.toContain("'unsafe-inline'")
        expect(d).not.toContain("'unsafe-eval'")
        expect(d).not.toMatch(/(^|\s)(blob:|data:|\*|https:|http:)(\s|$)/)
      }
      expect(policy).toMatch(/(^|;\s*)script-src 'self'[ ;]/)
      expect(policy).toContain("object-src 'none'")
      // No default-src fallback that could widen scripts either.
      expect(policy).toMatch(/default-src 'self';/)
    }
  })

  it('the other security headers are there (S16)', () => {
    expect(value('X-Content-Type-Options')).toBe('nosniff')
    expect(value('X-Frame-Options')).toBe('DENY')
    expect(value('Referrer-Policy')).toBe('no-referrer')
    expect(value('Permissions-Policy')).toBe(
      'camera=(self), microphone=(self), clipboard-read=(self), clipboard-write=(self), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), browsing-topics=()',
    )
  })

  it('no header that would break Google sign-in, embeds or remote pictures', () => {
    for (const name of [
      'Cross-Origin-Opener-Policy',
      'Cross-Origin-Resource-Policy',
      'Cross-Origin-Embedder-Policy',
      'Origin-Agent-Cluster',
    ])
      expect(value(name)).toBeUndefined()
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
