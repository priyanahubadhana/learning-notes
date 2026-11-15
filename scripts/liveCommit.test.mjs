import { describe, expect, it } from 'vitest'
import { pickAppCommit } from './liveCommit.mjs'

describe('which commit should be live', () => {
  it('picks the app commit when a docs-only commit comes after it', () => {
    const commits = [
      { sha: 'docs2', files: ['docs/PENDING.md'] },
      { sha: 'docs1', files: ['README.md', 'docs/a/b.png'] },
      { sha: 'app', files: ['src/App.tsx', 'docs/CHANGELOG.md'] },
      { sha: 'older', files: ['src/old.ts'] },
    ]
    expect(pickAppCommit(commits)).toBe('app')
  })

  it('picks the head when it changed app code (stays strict)', () => {
    expect(pickAppCommit([{ sha: 'head', files: ['src/a.ts'] }])).toBe('head')
    expect(pickAppCommit([{ sha: 'p', files: ['public/x.png'] }])).toBe('p')
    expect(pickAppCommit([{ sha: 'v', files: ['vite.config.ts'] }])).toBe('v')
  })

  it('skips commits that only touch ci.yml, scripts or tests', () => {
    const commits = [
      {
        sha: 'ci',
        files: [
          '.github/workflows/ci.yml',
          'scripts/x.mjs',
          'e2e/a.spec.ts',
          'package.json',
        ],
      },
      { sha: 'app', files: ['src/a.ts'] },
    ]
    expect(pickAppCommit(commits)).toBe('app')
  })

  it('returns null when nothing but docs is found', () => {
    expect(pickAppCommit([{ sha: 'd', files: ['docs/x.md'] }])).toBeNull()
  })
})
