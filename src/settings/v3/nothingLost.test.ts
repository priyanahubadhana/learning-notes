import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { settingsRegistry } from '../builtinSettings'
import '../toolbarSettings'
import '../spaceSettings'
import '../labSettings'
import '../flagSettings'
import '../readingSettings'
import '../lockSettings'
import '../../ai/aiSettings'
import '../../connector/claudeSettings'
import '../../sync/syncSettings'
import '../accountSettings'
import {
  CUSTOM_SECTIONS,
  buildSections,
  sectionBadge,
  sectionIdsOf,
  showsEmptyState,
} from './sections'

/** "Nothing lost": everything today's Settings shows has a home in v3. */
describe('Settings v3 loses nothing from today', () => {
  const sectionIds = new Set(buildSections(true, true).map((s) => s.id))

  it('every registry setting lives in a v3 section', () => {
    const all = settingsRegistry.list()
    expect(all.length).toBeGreaterThan(50)
    const lost = all
      .filter((d) => !sectionIdsOf(d).some((id) => sectionIds.has(id)))
      .map((d) => d.id)
    expect(lost).toEqual([])
  })

  it('every registry category is a v3 section', () => {
    const lost = settingsRegistry
      .categories()
      .filter((c) => !sectionIds.has(c.id))
      .map((c) => c.id)
    expect(lost).toEqual([])
  })

  it('every custom section today renders has a v3 home', () => {
    const source = readFileSync(
      new URL('../SettingsScreen.tsx', import.meta.url),
      'utf8',
    )
    const rendered = [
      ...source.matchAll(/<([A-Z][A-Za-z]*(?:Section|Area))\b/g),
    ].map((m) => m[1])
    expect(rendered.length).toBeGreaterThanOrEqual(9)
    const known = new Map(CUSTOM_SECTIONS.map((c) => [c.today, c.section]))
    expect(rendered.filter((n) => !known.has(n))).toEqual([])
    for (const [, section] of known) expect(sectionIds.has(section)).toBe(true)
  })
})

describe('sections with a custom screen', () => {
  it('show no 0 badge and never the empty text', () => {
    for (const id of ['account', 'sync', 'lock']) {
      expect(sectionBadge(id, 0)).toBeUndefined()
      expect(showsEmptyState(id, 0)).toBe(false)
    }
    expect(sectionBadge('account', 3)).toBe(3)
    expect(sectionBadge('journal', 0)).toBe(0)
    expect(showsEmptyState('journal', 0)).toBe(true)
  })
})
