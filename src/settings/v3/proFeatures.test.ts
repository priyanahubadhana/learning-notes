// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseProFeatureText } from '../../../scripts/gen-pro-feature-text.mjs'
import { settingsRegistry } from '../builtinSettings'
import '../toolbarSettings'
import '../spaceSettings'
import '../labSettings'
import '../readingSettings'
import '../accountSettings'
import { reloadLevel, setLevel, setUnlocked } from '../level'
import { PRO_FEATURES, type ProFeatureId } from '../proFeatures.gen'
import { reloadExperience, rowShown } from './experience'
import { PRO_FEATURE_TEXT } from './proFeatureText.gen'
import { proFeatureText } from './proFeatureText'
import { proGroups } from './proGroups'
import { searchSettings } from './settingsSearch'
import { tv, type V3Key } from './tv'

beforeEach(() => {
  localStorage.clear()
  reloadLevel()
  reloadExperience()
  setLevel('beginner')
})

describe('the Professional features list', () => {
  it('has a name and a plain line for every one of the 219 switches', () => {
    expect(PRO_FEATURES).toHaveLength(219)
    for (const f of PRO_FEATURES) {
      const text = PRO_FEATURE_TEXT[f.id]
      expect(text, f.id).toBeDefined()
      expect(text[0].length, f.id).toBeGreaterThan(1)
      expect(text[1].length, f.id).toBeGreaterThan(1)
    }
  })

  it('every feature has a name and a plain line in Spanish and Hindi, different from English', () => {
    for (const f of PRO_FEATURES) {
      const en = PRO_FEATURE_TEXT[f.id]
      for (const lang of ['es', 'hi']) {
        const text = proFeatureText(f.id, lang)
        expect(text[0].length, `${f.id} ${lang}`).toBeGreaterThan(1)
        expect(text[1].length, `${f.id} ${lang}`).toBeGreaterThan(1)
        // The plain line is always translated; a name may stay (Anki, Markdown).
        expect(text[1], `${f.id} ${lang} line`).not.toBe(en[1])
      }
    }
  })

  it('the generated texts are current with docs/mockups/pro-features.md', () => {
    const rows = parseProFeatureText(
      readFileSync('docs/mockups/pro-features.md', 'utf8'),
    )
    expect(rows).toHaveLength(Object.keys(PRO_FEATURE_TEXT).length)
    for (const r of rows)
      expect(PRO_FEATURE_TEXT[r.id], r.id).toEqual([r.name, r.does])
  })

  it('every switch is in exactly one group, in the spec order, with a title in all languages', () => {
    const groups = proGroups(PRO_FEATURES)
    expect(groups.map((g) => g.slug).slice(0, 9)).toEqual([
      'home',
      'notebooks',
      'toolbar',
      'reader',
      'library',
      'review',
      'search',
      'ai',
      'settings',
    ])
    const all = groups.flatMap((g) => g.ids)
    expect(all).toHaveLength(219)
    expect(new Set(all).size).toBe(219)
    for (const g of groups)
      for (const lang of ['en', 'es', 'hi'])
        expect(tv(`sv3.group.${g.slug}` as V3Key, undefined, lang)).not.toBe(
          `sv3.group.${g.slug}`,
        )
  })
})

/** SET-P01 to P29 (the rows that exist in the registry): one assertion per id. */
const settingRows = PRO_FEATURES.filter(
  (f) =>
    f.group === 'Settings' &&
    settingsRegistry.get(f.id) &&
    !settingsRegistry.get(f.id)!.searchOnly,
).map((f) => f.id)

describe('a Professional row follows its own switch', () => {
  it('covers the registry rows of the Settings group', () => {
    expect(settingRows.length).toBeGreaterThanOrEqual(24)
  })
  for (const id of settingRows) {
    it(`${id}: hidden and not found in Beginner, shown and found once on`, () => {
      const find = () =>
        searchSettings(
          settingsRegistry.list().filter((s) => rowShown(s.id)),
          'a',
          () => ({ name: 'a', help: '', keywords: '' }),
        ).some((h) => h.definition.id === id)
      if (id === 'general.newPageStudy') {
        // Always shown; its switch only widens the template picker.
        expect(rowShown(id)).toBe(true)
        return
      }
      expect(rowShown(id)).toBe(false)
      expect(find()).toBe(false)
      setUnlocked(id as ProFeatureId, true)
      expect(rowShown(id)).toBe(true)
      expect(find()).toBe(true)
      setUnlocked(id as ProFeatureId, false)
      expect(rowShown(id)).toBe(false)
    })
  }
})
