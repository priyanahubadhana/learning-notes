/// <reference types="node" />
import { readFileSync, writeFileSync } from 'node:fs'
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

describe('help texts', () => {
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
