import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import {
  ensureLibrary,
  listPrompts,
  ratePrompt,
  restorePrompt,
  savePrompt,
  seedLibrary,
  trashPrompt,
} from './libraryDb'
import { SEEDS } from './seedPrompts'
import {
  allSubjects,
  filterItems,
  newPrompt,
  subjectList,
  versionStats,
} from './promptModel'

let db: LearningNotesDB
let ws: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})
afterEach(async () => {
  await db.delete()
})

describe('prompt library database', () => {
  it('is made once, seeded once, and edits survive a second open', async () => {
    const lib = await ensureLibrary(db, ws)
    expect(lib.database.kind).toBe('promptLibrary')
    expect(Object.keys(lib.cols)).toHaveLength(15)
    expect(await seedLibrary(db, lib, new Set())).toHaveLength(SEEDS.length)
    const first = (await listPrompts(db, lib)).find(
      (i) => i.starterId === 'own.summarise',
    )!
    await savePrompt(db, lib, { ...first, text: 'My own wording' }, first)
    const again = await ensureLibrary(db, ws)
    expect(again.database.id).toBe(lib.database.id)
    expect(await seedLibrary(db, again, new Set())).toEqual([])
    const items = await listPrompts(db, again)
    expect(items).toHaveLength(SEEDS.length)
    const edited = items.find((i) => i.starterId === 'own.summarise')!
    expect(edited.text).toBe('My own wording')
    expect(edited.versions).toHaveLength(1)
    expect(edited.versions[0].text).toContain('Summarise the text')
  })

  it('keeps licence notes on the shipped CC0 ideas', async () => {
    const cc0 = SEEDS.filter((s) => s.starterId.startsWith('cc0.'))
    expect(cc0.length).toBeGreaterThan(0)
    expect(cc0.every((s) => s.licence.includes('CC0'))).toBe(true)
  })

  it('makes a new prompt, rates it, and Undo brings a deleted one back', async () => {
    const lib = await ensureLibrary(db, ws)
    const saved = await savePrompt(db, lib, {
      ...newPrompt('prompt'),
      name: 'Check my maths',
      subjects: subjectList('Maths, exam, maths'),
      text: 'Check each step.',
    })
    expect(saved.subjects).toEqual(['maths', 'exam'])
    const item = (await listPrompts(db, lib))[0]
    const rated = await ratePrompt(db, lib, item, 4)
    await ratePrompt(db, lib, rated, 5)
    const reread = (await listPrompts(db, lib))[0]
    expect(reread.ratings).toHaveLength(2)
    expect(reread.stars).toBe(4.5)
    const trashed = await trashPrompt(db, saved.id)
    expect(await listPrompts(db, lib)).toHaveLength(0)
    await restorePrompt(db, trashed)
    expect(await listPrompts(db, lib)).toHaveLength(1)
  })

  it('refuses a prompt without a name', async () => {
    const lib = await ensureLibrary(db, ws)
    await expect(savePrompt(db, lib, newPrompt('prompt'))).rejects.toThrow()
  })
})

describe('library search and filters', () => {
  const items = SEEDS.map((s, i) => ({ ...s, id: `r${i}` }))
  const none = { q: '', purpose: '', subject: '', kind: '' } as const

  it('ranks the name above the text and needs every word', () => {
    const r = filterItems(items, { ...none, q: 'quiz' })
    expect(r[0].name.startsWith('Quiz')).toBe(true)
    expect(r.map((x) => x.name)).toContain('Quiz me')
    expect(filterItems(items, { ...none, q: 'quiz zebra' })).toEqual([])
  })

  it('filters by purpose, subject and kind', () => {
    expect(
      filterItems(items, { ...none, purpose: 'recall' }).every(
        (i) => i.purpose === 'recall',
      ),
    ).toBe(true)
    expect(allSubjects(items)).toContain('exam')
    expect(
      filterItems(items, { ...none, subject: 'exam' }).length,
    ).toBeGreaterThan(2)
    expect(
      filterItems(items, { ...none, kind: 'skill' }).every(
        (i) => i.kind === 'skill',
      ),
    ).toBe(true)
  })
})

describe('versions and ratings', () => {
  it('a rating belongs to the version that was current, and Restore keeps the history', async () => {
    const lib = await ensureLibrary(db, ws)
    const first = await savePrompt(db, lib, {
      ...newPrompt('prompt'),
      name: 'Explain',
      text: 'Version one.',
    })
    const r1 = await ratePrompt(db, lib, first, 2)
    const second = await savePrompt(
      db,
      lib,
      { ...r1, text: 'Version two.' },
      r1,
    )
    const r2 = await ratePrompt(db, lib, second, 5)
    await ratePrompt(db, lib, r2, 4)
    const item = (await listPrompts(db, lib))[0]
    const stats = versionStats(item)
    expect(stats.map((s) => s.text)).toEqual(['Version one.', 'Version two.'])
    expect(stats[0]).toMatchObject({ count: 1, average: 2, current: false })
    expect(stats[1]).toMatchObject({ count: 2, average: 4.5, current: true })
    expect(item.stars).toBeCloseTo(3.7, 1)
  })

  it('keeps at most 30 old versions', async () => {
    const lib = await ensureLibrary(db, ws)
    let item = await savePrompt(db, lib, {
      ...newPrompt('prompt'),
      name: 'Many',
      text: 'v0',
    })
    for (let i = 1; i <= 35; i++) {
      item = await savePrompt(db, lib, { ...item, text: `v${i}` }, item)
    }
    const stored = (await listPrompts(db, lib))[0]
    expect(stored.versions).toHaveLength(30)
    expect(stored.versions.at(-1)?.text).toBe('v34')
  })
})
