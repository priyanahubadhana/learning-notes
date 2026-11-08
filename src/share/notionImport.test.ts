import { zipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { listRows } from '../databases/databaseService'
import {
  guessNotionType,
  notionDate,
  NotionImportError,
  notionMarkdownToBlocks,
  planNotionStream,
  planNotionZip,
  runNotionImport,
  splitName,
  undoNotionImport,
} from './notionImport'

let db: LearningNotesDB
let ws: string
beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})
afterEach(async () => {
  await db.delete()
})

const enc = (s: string) => new TextEncoder().encode(s)
const ID1 = 'a'.repeat(32)
const ID2 = 'b'.repeat(32)
const ID3 = 'c'.repeat(32)
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5, 6, 7, 8])

function sample() {
  return zipSync({
    [`Home ${ID1}.md`]: enc(
      `# Home\n\nSee [Child](Home%20${ID1}/Child%20${ID2}.md) and **bold**.\n\n![pic](Home%20${ID1}/pic.png)\n\n---\n\n<details>\n<summary>Fold</summary>\n\nHidden\n\n</details>\n\n<aside>\n🔥 Hot\n</aside>\n\n| a | b |\n|---|---|\n| 1 | 2 |\n`,
    ),
    [`Home ${ID1}/Child ${ID2}.md`]: enc('# Child\n\nHello\n'),
    [`Home ${ID1}/pic.png`]: PNG,
    [`Tasks ${ID3}.csv`]: enc(
      'Name,Due,Done,Tags\nOne,"November 9, 2026",Yes,"a, b"\nTwo,"November 10, 2026",No,"a, c"\n',
    ),
    [`Tasks ${ID3}/One ${'d'.repeat(32)}.md`]: enc(
      '# One\n\nDue: November 9, 2026\n\nRow body text\n',
    ),
  })
}

describe('Notion export', () => {
  it('reads names, dates and column types', () => {
    expect(splitName(`Roadmap ${ID1}`)).toEqual({ title: 'Roadmap', id: ID1 })
    expect(notionDate('@November 9, 2026 3:00 PM')).toBe('2026-11-09')
    expect(guessNotionType(['November 9, 2026', 'May 1, 2026'])).toBe('date')
    expect(guessNotionType(['1', '2.5'])).toBe('number')
    expect(guessNotionType(['Yes', 'No'])).toBe('checkbox')
    expect(guessNotionType(['https://a.test', 'https://b.test'])).toBe('url')
    expect(guessNotionType(['a, b', 'a, c'])).toBe('choices')
    expect(guessNotionType(['x', 'y', 'x'])).toBe('choice')
    expect(guessNotionType(['one', 'two', 'three'])).toBe('text')
  })
  it('plans counts and refuses empty or damaged zips', () => {
    const plan = planNotionZip(sample(), 'My export.zip')
    expect(plan).toMatchObject({
      name: 'My export',
      pages: 2,
      databases: 1,
      rows: 2,
      images: 1,
    })
    expect(() => planNotionZip(enc('not a zip'))).toThrow(NotionImportError)
    expect(() => planNotionZip(zipSync({ 'a.txt': enc('x') }))).toThrow(
      NotionImportError,
    )
    // Names that climb out of the zip are never read.
    expect(() => planNotionZip(zipSync({ '../evil.md': enc('x') }))).toThrow(
      NotionImportError,
    )
  })
  it('streams the same plan as the in-memory read and keeps the limits', async () => {
    const bytes = sample()
    const a = planNotionZip(bytes, 'My export.zip')
    const b = await planNotionStream(
      new Blob([bytes as BlobPart]),
      'My export.zip',
    )
    expect(b.nodes.map((n) => n.key)).toEqual(a.nodes.map((n) => n.key))
    expect(b).toMatchObject({ pages: 2, databases: 1, rows: 2, images: 1 })
    await expect(planNotionStream(new Blob(['not a zip']))).rejects.toThrow(
      NotionImportError,
    )
    await expect(
      planNotionStream(
        new Blob([zipSync({ '../evil.md': enc('x') }) as BlobPart]),
      ),
    ).rejects.toThrow(NotionImportError)
  })
  it('turns Notion Markdown into toggles, callouts, dividers, tables and quotes', () => {
    const blocks = notionMarkdownToBlocks(
      `# T\n\n<details>\n<summary>Fold</summary>\n\n<details>\n<summary>In</summary>\n\nDeep\n\n</details>\n\n</details>\n\n<aside>\n💡 Tip\n</aside>\n\n---\n\n> q\n\n- [x] done\n`,
      { link: () => null, media: () => null },
    )
    const types = blocks.map((b) => b.type)
    expect(types).toEqual([
      'toggleListItem',
      'callout',
      'divider',
      'quote',
      'checkListItem',
    ])
    expect(blocks[0].children?.[0].type).toBe('toggleListItem')
    expect(blocks[1].content.emoji).toBe('💡')
  })
  it('imports pages, a database with typed columns, row pages, pictures and links, and undoes it', async () => {
    const plan = planNotionZip(sample(), 'My export.zip')
    const result = await runNotionImport(db, ws, plan, null)
    expect(result).toMatchObject({ databases: 1, rows: 2, images: 1 })
    const pages = (await db.pages.toArray()).filter((p) => !p.deletedAt)
    const home = pages.find((p) => p.title === 'Home')!
    const child = pages.find((p) => p.title === 'Child')!
    expect(child.parentId).toBe(home.id)
    const blocks = await listBlocks(db, home.id)
    const types = blocks.map((b) => b.type)
    expect(types).toEqual(
      expect.arrayContaining([
        'image',
        'divider',
        'toggleListItem',
        'callout',
        'table',
      ]),
    )
    expect(JSON.stringify(blocks)).toContain(child.id) // the link was rewritten
    const database = (await db.databases.toArray())[0]
    const cols = await db.dbColumns
      .where('databaseId')
      .equals(database.id)
      .toArray()
    expect(cols.map((c) => c.type).sort()).toEqual([
      'checkbox',
      'choices',
      'date',
    ])
    const rows = await listRows(db, database.id)
    expect(rows.map((r) => r.title).sort()).toEqual(['One', 'Two'])
    const one = rows.find((r) => r.title === 'One')!
    expect(JSON.stringify(await listBlocks(db, one.id))).toContain(
      'Row body text',
    )
    expect(JSON.stringify(await listBlocks(db, one.id))).not.toContain('Due:')
    await undoNotionImport(db, result.created)
    expect((await db.notebooks.toArray()).every((n) => n.deletedAt)).toBe(true)
  })
})
