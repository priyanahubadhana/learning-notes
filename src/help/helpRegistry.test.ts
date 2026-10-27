/// <reference types="node" />
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { en } from '../i18n/en'
import {
  HELP_LINES,
  TIPS,
  helpListMarkdown,
  type HelpLineId,
  type TipId,
} from './helpRegistry'

const FILE = new URL('../../HELP-TEXTS.md', import.meta.url)

/** All source text of the app (not tests, not the registry itself). */
function appSource(): string {
  const parts: string[] = []
  const walk = (dir: URL) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir)
      if (entry.isDirectory()) walk(url)
      else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
        if (entry.name !== 'helpRegistry.ts' && entry.name !== 'en.ts') {
          parts.push(readFileSync(url, 'utf8'))
        }
      }
    }
  }
  walk(new URL('../', import.meta.url))
  return parts.join('\n')
}

describe('help texts', () => {
  it('every registered tip and line is used somewhere in the app', () => {
    const source = appSource()
    const used = (id: string) => {
      // A tip picked by a variable is written as a template ("tracker.level.${l}").
      const stem = id.slice(0, id.lastIndexOf('.') + 1)
      return source.includes(id) || source.includes(stem + '${')
    }
    const unused = [...Object.keys(TIPS), ...Object.keys(HELP_LINES)].filter(
      (id) => !used(id),
    )
    expect(unused).toEqual([])
  })

  it('every tip and help line has its texts', () => {
    for (const id of Object.keys(TIPS) as TipId[]) {
      expect(en, id).toHaveProperty(`help.tip.${id}.meaning`)
      expect(en, id).toHaveProperty(`help.tip.${id}.example`)
    }
    for (const id of Object.keys(HELP_LINES) as HelpLineId[]) {
      expect(en, id).toHaveProperty(`help.line.${id}`)
    }
  })

  it('every help text in en.ts belongs to a registered tip or line', () => {
    for (const key of Object.keys(en)) {
      const tip = /^help\.tip\.(.+)\.(meaning|example)$/.exec(key)
      if (tip) expect(TIPS, key).toHaveProperty(tip[1])
      const line = /^help\.line\.(.+)$/.exec(key)
      if (line) expect(HELP_LINES, key).toHaveProperty(line[1])
    }
  })

  it('keeps tips to one plain sentence plus a short example', () => {
    for (const id of Object.keys(TIPS) as TipId[]) {
      const meaning = en[`help.tip.${id}.meaning` as keyof typeof en]
      expect(meaning.length, id).toBeLessThanOrEqual(130)
    }
  })

  it('HELP-TEXTS.md lists exactly these texts', () => {
    const text = helpListMarkdown()
    if (process.env.UPDATE_HELP) writeFileSync(FILE, text)
    expect(readFileSync(FILE, 'utf8')).toBe(text)
  })
})
