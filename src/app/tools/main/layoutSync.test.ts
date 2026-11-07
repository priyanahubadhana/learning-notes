// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../../../core/db'
import { createTestDb } from '../../../core/testing'
import {
  LAYOUT_SECRET_ID,
  applyLayout,
  startLayoutSync,
  stopLayoutSync,
} from './layoutSync'
import { extraTools, mainList, resetMainState } from './mainTools'

let db: LearningNotesDB
beforeEach(() => {
  localStorage.clear()
  resetMainState()
  db = createTestDb()
})
afterEach(() => stopLayoutSync(db))

const until = async (ok: () => Promise<boolean> | boolean) => {
  for (let i = 0; i < 60; i++) {
    if (await ok()) return
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error('timed out')
}

describe('toolbar layout as a synced setting (R7-10)', () => {
  it('applies a pulled layout, keeping what it knows and dropping unknown ids', () => {
    expect(
      applyLayout({ main: ['read', 'nope', 'pen'], extras: ['writePad'] }),
    ).toBe(true)
    expect(mainList.get()).toEqual(['read', 'pen'])
    expect(extraTools.get()).toEqual(['writePad'])
  })

  it('sends a local edit and takes a newer one from another device', async () => {
    startLayoutSync(db)
    extraTools.set(['writePad'])
    await until(async () => !!(await db.secrets.get(LAYOUT_SECRET_ID)))
    const rec = await db.secrets.get(LAYOUT_SECRET_ID)
    expect(rec?.value).toMatchObject({ extras: ['writePad'] })

    await db.secrets.put({
      ...rec!,
      value: { main: ['pen', 'text'], pills: {}, extras: ['writePad', 'x1'] },
      updatedAt: Date.now() + 10_000,
    })
    await until(() => extraTools.get().length === 2)
    expect(mainList.get()).toEqual(['pen', 'text'])
  })
})
