import { describe, expect, it } from 'vitest'
import { settingsRegistry } from '../builtinSettings'
import { searchSettings, type SearchText } from './settingsSearch'

const fake = (id: string, t: Partial<SearchText>) =>
  ({ id, __t: { name: '', help: '', keywords: '', ...t } }) as never
const textOf = (s: unknown) => (s as { __t: SearchText }).__t

describe('searchSettings (SET-B05)', () => {
  const list = [
    fake('a', { name: 'tool bar size', keywords: 'ribbon' }),
    fake('b', { name: 'ribbon speed' }),
    fake('c', { name: 'theme', help: 'ribbon colours of the app' }),
    fake('d', { name: 'other' }),
  ]
  const ids = (q: string) =>
    searchSettings(list, q, textOf).map(
      (h) => (h.definition as { id: string }).id,
    )

  it('ranks name start, name part, help, then keywords', () => {
    expect(ids('ribbon')).toEqual(['b', 'c', 'a'])
  })
  it('needs every word', () => {
    expect(ids('tool ribbon')).toEqual(['a'])
    expect(ids('tool zzz')).toEqual([])
  })
  it('is case blind and empty for an empty box', () => {
    expect(ids('THEME')).toEqual(['c'])
    expect(ids('   ')).toEqual([])
  })
  it('finds the real tool bar settings by the plain word "ribbon"', () => {
    const all = settingsRegistry.list()
    const hits = searchSettings(all, 'ribbon', (s) => ({
      name: s.id.toLowerCase(),
      help: '',
      keywords: (s.keywords ?? '').toLowerCase(),
    }))
    expect(hits.length).toBeGreaterThan(0)
  })
})
