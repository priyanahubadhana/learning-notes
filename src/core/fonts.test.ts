import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from './db'
import { MAX_FONT_BYTES, fontFormat, fontNameOf } from './fontFile'
import { FontError, listFonts, removeFont, saveFont } from './fontService'
import { createTestDb } from './testing'
import { readFullFile } from '../share/readFull'
import { replaceWithFile } from '../share/restore'
import { writeFullFile } from '../share/fullFile'
import {
  customFamily,
  fontStack,
  isCustomFont,
  isReadingFont,
} from '../app/reading/readingPrefs'

const bytes = (tag: number[], length = 64) => {
  const a = new Uint8Array(length)
  a.set(tag)
  return a
}
const OTF = [0x4f, 0x54, 0x54, 0x4f]
const TTF = [0, 1, 0, 0]
const WOFF2 = [0x77, 0x4f, 0x46, 0x32]

let db: LearningNotesDB
beforeEach(() => {
  db = createTestDb()
})
afterEach(async () => {
  await db.delete()
})

describe('font file checks', () => {
  it('knows the three formats by their first bytes', () => {
    expect(fontFormat(bytes(OTF))).toBe('otf')
    expect(fontFormat(bytes(TTF))).toBe('ttf')
    expect(fontFormat(bytes(WOFF2))).toBe('woff2')
  })

  it('refuses other files, tiny files and files over 10 MB', () => {
    expect(fontFormat(bytes([0x89, 0x50, 0x4e, 0x47]))).toBeNull()
    expect(fontFormat(bytes(TTF, 8))).toBeNull()
    expect(fontFormat(new Uint8Array(MAX_FONT_BYTES + 1))).toBeNull()
  })

  it('names a font after its file', () => {
    expect(fontNameOf('My Hand.ttf')).toBe('My Hand')
    expect(fontNameOf('.ttf')).toBe('Font')
  })
})

describe('font choices', () => {
  it('accepts built-in ids and custom ids only', () => {
    expect(isReadingFont('lexend')).toBe(true)
    expect(isReadingFont('custom:3f2b8c1e-9a4d-4e6b')).toBe(true)
    expect(isReadingFont('custom:<script>')).toBe(false)
    expect(isReadingFont('comic')).toBe(false)
    expect(isCustomFont('custom:abc')).toBe(false)
  })

  it('builds the CSS stack', () => {
    expect(fontStack('literata')).toContain('Literata')
    expect(fontStack('custom:3f2b8c1e-9a4d-4e6b')).toBe(
      `"${customFamily('custom:3f2b8c1e-9a4d-4e6b')}", system-ui, sans-serif`,
    )
  })
})

describe('font storage', () => {
  it('stores, lists and removes an imported font', async () => {
    const file = new File([bytes(TTF)], 'Hand.ttf')
    const font = await saveFont(db, file)
    expect(font.format).toBe('ttf')
    expect((await listFonts(db)).map((f) => f.name)).toEqual(['Hand'])
    await removeFont(db, font.id)
    expect(await listFonts(db)).toEqual([])
  })

  it('refuses a file that is not a font', async () => {
    await expect(
      saveFont(db, new File([bytes([1, 2, 3, 4])], 'x.ttf')),
    ).rejects.toBeInstanceOf(FontError)
  })

  it('travels in a full backup and comes back', async () => {
    const font = await saveFont(db, new File([bytes(WOFF2)], 'W.woff2'))
    const target = createTestDb()
    await target.open()
    try {
      const parsed = await readFullFile(await writeFullFile(db, 'full'), target)
      await replaceWithFile(target, parsed, { saveSafety: async () => {} })
      const back = await listFonts(target)
      expect(back.map((f) => f.id)).toEqual([font.id])
      expect(back[0].data.byteLength).toBe(64)
    } finally {
      await target.delete()
    }
  })
})
