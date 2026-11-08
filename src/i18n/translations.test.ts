import { describe, expect, it } from 'vitest'
import { en as enCore } from './en'
import { enO } from './enO'
import { es } from './es'
import { hi } from './hi'

/** All English texts: the first-download ones and the late-loaded ones. */
const en: Record<string, string> = { ...enCore, ...enO }

const languages = { hi, es } as const

/** `{name}` placeholders of a text, sorted. */
const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

/** Texts that may stay the same as English (names, symbols, key names). */
const SAME_AS_ENGLISH = new Set([
  'unit.percent',
  'notion.title',
  'lp.outline.numbers',
  'interval.countdown',
  'dashboard.share',
  'dashboard.heatLabel',
  'settings.dateStyle.dayFirst',
  'settings.dateStyle.monthFirst',
])

describe.each(Object.entries(languages))('%s translation', (_code, texts) => {
  const entries = Object.entries(texts as Record<string, string>)

  it('has no keys the app does not know', () => {
    const unknown = entries.map(([k]) => k).filter((k) => !(k in en))
    expect(unknown).toEqual([])
  })

  it('keeps every {placeholder} of the English text', () => {
    const wrong = entries
      .filter(
        ([k, v]) =>
          k in en &&
          placeholders(v).join() !==
            placeholders(en[k as keyof typeof en]).join(),
      )
      .map(([k]) => k)
    expect(wrong).toEqual([])
  })

  it('has no empty texts and no leftover markup', () => {
    const bad = entries
      .filter(([, v]) => v.trim() === '' || /<[a-z/]/i.test(v))
      .map(([k]) => k)
    expect(bad).toEqual([])
  })

  it('has the same key set as English (the two lists below are empty)', () => {
    const own = new Set(Object.keys(texts))
    const english = new Set(Object.keys(en))
    const onlyEnglish = [...english].filter(
      (k) => !own.has(k) && !SAME_AS_ENGLISH.has(k),
    )
    const onlyHere = [...own].filter((k) => !english.has(k))
    expect({ onlyEnglish, onlyHere }).toEqual({ onlyEnglish: [], onlyHere: [] })
  })

  it('translates every text', () => {
    const missing = Object.keys(en).filter(
      (k) => !(k in texts) && !SAME_AS_ENGLISH.has(k),
    )
    expect(missing).toEqual([])
  })
})
