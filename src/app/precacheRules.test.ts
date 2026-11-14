import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  isPrecached,
  PRECACHE_GLOB,
  PRECACHE_IGNORES,
  PRECACHE_MAX_BYTES,
} from './precacheRules'

describe('precache list = what the offline copy saves', () => {
  it('lists saved kinds', () => {
    for (const f of ['assets/a-1.js', 'assets/a.css', 'index.html', 'x.wasm'])
      expect(isPrecached(f, 10)).toBe(true)
  })
  it('does not list .mjs (the worker never saves them), nor a dot-lookalike', () => {
    expect(isPrecached('assets/pdf.worker.min-ab.mjs', 10)).toBe(false)
    expect(isPrecached('assets/xjs', 10)).toBe(false)
    expect(isPrecached('assets/a.json', 10)).toBe(false)
  })
  it('skips ignored and too-large files', () => {
    expect(isPrecached('404.html', 10)).toBe(false)
    expect(isPrecached('assets/tesseract-core-simd.wasm', 10)).toBe(false)
    expect(isPrecached('assets/big.js', PRECACHE_MAX_BYTES + 1)).toBe(false)
    expect(isPrecached('assets/big.js', PRECACHE_MAX_BYTES)).toBe(true)
  })
  it('the build config feeds the worker from the same rules', () => {
    const cfg = readFileSync('vite.config.ts', 'utf8')
    expect(cfg).toContain('globPatterns: [PRECACHE_GLOB]')
    expect(cfg).toContain('globIgnores: PRECACHE_IGNORES')
    expect(cfg).toContain('maximumFileSizeToCacheInBytes: PRECACHE_MAX_BYTES')
    expect(cfg).toContain('isPrecached(f.fileName')
    expect(PRECACHE_GLOB).toBe('**/*.{js,css,html,svg,png,wasm,woff2}')
    expect(PRECACHE_IGNORES).toEqual(['404.html', '**/tesseract-core*'])
  })
})
