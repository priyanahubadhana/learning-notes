import { describe, expect, it } from 'vitest'
import { liveProblems } from './liveChecks.mjs'

const good = {
  version: { status: 200, json: { commit: 'abc' } },
  home: { status: 200, csp: "default-src 'self'; object-src 'none'" },
  worker: { status: 200, cacheControl: 'no-cache' },
  missing: { status: 404 },
}

describe('the live site check', () => {
  it('passes a good site', () => {
    expect(liveProblems('abc', good)).toEqual([])
  })

  it('catches another version (a manual upload)', () => {
    expect(liveProblems('new', good).join()).toContain('version.json says abc')
    const none = { ...good, version: { status: 404, json: null } }
    expect(liveProblems('abc', none).join()).toContain('says nothing')
  })

  it('catches a lost security policy', () => {
    const site = { ...good, home: { status: 200, csp: null } }
    expect(liveProblems('abc', site).join()).toContain('CSP')
  })

  it('catches a cached service worker', () => {
    const site = { ...good, worker: { status: 200, cacheControl: 'max-age=9' } }
    expect(liveProblems('abc', site).join()).toContain('sw.js')
  })

  it('catches a missing file answered with a page', () => {
    const site = { ...good, missing: { status: 200 } }
    expect(liveProblems('abc', site).join()).toContain('answers 200')
  })
})
