import { describe, expect, it } from 'vitest'
import { en } from './en'
import { es } from './es'
import { hi } from './hi'

const languages = { hi, es } as const

/** `{name}` placeholders of a text, sorted. */
const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

/** Texts that may stay the same as English (names, symbols, key names). */
const SAME_AS_ENGLISH = new Set([
  'unit.percent',
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

  it('translates every text', () => {
    const missing = Object.keys(en).filter(
      (k) => !(k in texts) && !SAME_AS_ENGLISH.has(k),
    )
    expect(missing).toEqual([])
  })
})
