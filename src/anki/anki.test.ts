import { zstdCompressSync } from 'node:zlib'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { zipSync } from 'fflate'
import { createBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { JsonObject } from '../core/types'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage, renamePage } from '../pages/pageService'
import { CARD_BLOCK_TYPE, syncCardRecords } from '../recall/cardService'
import { exportApkg } from './exportApkg'
import { importAnki, NOTES_PER_PAGE } from './importApkg'
import { AnkiError, readApkg } from './readApkg'
import { loadSql } from './sqlite'

let db: LearningNotesDB
let ws: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})
afterEach(async () => {
  await db.delete()
})

const run = (text: string, styles: JsonObject = {}): JsonObject => ({
  type: 'text',
  text,
  styles,
})
const bytes = (s: string) => new TextEncoder().encode(s)

/** A collection like old Anki saves it (deck names as JSON in `col`). */
async function legacyCollection(notes: { deck: string; flds: string[] }[]) {
  const SQL = await loadSql()
  const sqlite = new SQL.Database()
  sqlite.run(`create table col (decks text);
    create table notes (id integer, flds text);
    create table cards (id integer, nid integer, did integer, ord integer);`)
  const decks: Record<string, { name: string }> = {}
  const ids = new Map<string, number>()
  for (const n of notes) {
    if (!ids.has(n.deck)) {
      ids.set(n.deck, ids.size + 10)
      decks[ids.get(n.deck)!] = { name: n.deck }
    }
  }
  sqlite.run('insert into col values (?)', [JSON.stringify(decks)])
  notes.forEach((n, i) => {
    sqlite.run('insert into notes values (?, ?)', [i + 1, n.flds.join('\x1f')])
    sqlite.run('insert into cards values (?, ?, ?, 0)', [
      i + 1,
      i + 1,
      ids.get(n.deck)!,
    ])
  })
  const out = sqlite.export()
  sqlite.close()
  return out
}

describe('readApkg', () => {
  it('reads an old-format package: notes, decks, cloze', async () => {
    const file = zipSync({
      'collection.anki21': await legacyCollection([
        {
          deck: 'Medicine::Heart',
          flds: ['What is S1?', 'Closing of <b>AV</b> valves'],
        },
        { deck: 'Medicine::Heart', flds: ['The {{c1::heart}} pumps', ''] },
      ]),
      media: bytes('{"0":"a.jpg","1":"b.mp3"}'),
    })
    const result = await readApkg(file)
    expect(result.mediaCount).toBe(2)
    expect(result.notes.map((n) => [n.deck, n.kind, n.fields[0]])).toEqual([
      ['Medicine::Heart', 'basic', 'What is S1?'],
      ['Medicine::Heart', 'cloze', 'The {{c1::heart}} pumps'],
    ])
  })

  it('reads the new compressed format (decks table, \\x1f levels)', async () => {
    const SQL = await loadSql()
    const sqlite = new SQL.Database()
    sqlite.run(`create table notes (id integer, flds text);
      create table cards (id integer, nid integer, did integer, ord integer);
      create table decks (id integer, name text);`)
    sqlite.run('insert into decks values (7, ?)', ['Bio\x1fCells'])
    sqlite.run('insert into notes values (1, ?)', ['Q?\x1fA!'])
    sqlite.run('insert into cards values (1, 1, 7, 0)')
    const compressed = zstdCompressSync(sqlite.export())
    sqlite.close()
    const placeholder = await legacyCollection([
      {
        deck: 'Default',
        flds: ['Please update to the latest Anki version', ''],
      },
    ])
    const result = await readApkg(
      zipSync({
        'collection.anki21b': new Uint8Array(compressed),
        'collection.anki2': placeholder,
      }),
    )
    expect(result.notes).toMatchObject([
      { deck: 'Bio::Cells', kind: 'basic', fields: ['Q?', 'A!'] },
    ])
  })

  it('refuses things that are not packages, with a clear message', async () => {
    await expect(readApkg(bytes('hello'))).rejects.toBeInstanceOf(AnkiError)
    await expect(
      readApkg(zipSync({ 'readme.txt': new Uint8Array([1]) })),
    ).rejects.toThrow(/no collection/)
    await expect(
      readApkg(zipSync({ 'collection.anki21': new Uint8Array([1, 2, 3]) })),
    ).rejects.toBeInstanceOf(Error)
    const old = await legacyCollection([
      {
        deck: 'Default',
        flds: ['Please update to the latest Anki version, then re-export', ''],
      },
    ])
    await expect(
      readApkg(zipSync({ 'collection.anki2': old })),
    ).rejects.toThrow(/older Anki versions/)
  })
})

describe('importAnki', () => {
  it('adds a notebook: Basic → Card blocks with answer lines, Cloze → blanks; cards start New', async () => {
    const parsed = await readApkg(
      zipSync({
        'collection.anki21': await legacyCollection([
          {
            deck: 'Default',
            flds: [
              'What is S1?',
              'Closing of <b>AV</b> valves<br>start of systole',
            ],
          },
          {
            deck: 'Default',
            flds: ['The {{c1::heart}} has {{c2::four}} chambers', 'extra'],
          },
          { deck: 'Default', flds: ['', 'empty front'] },
        ]),
      }),
    )
    const summary = await importAnki(db, ws, parsed, 'Anki: test')
    expect(summary).toMatchObject({
      pages: 1,
      cards: 3,
      skipped: 1,
      notebookTitle: 'Anki: test',
    })
    const page = (await db.pages.toArray()).find((p) => p.title === 'Default')!
    const blocks = (
      await db.blocks.where('pageId').equals(page.id).toArray()
    ).sort((a, b) => (a.order < b.order ? -1 : 1))
    const card = blocks.find((b) => b.type === CARD_BLOCK_TYPE)!
    const answers = blocks.filter((b) => b.parentId === card.id)
    expect(answers).toHaveLength(2)
    expect(JSON.stringify(answers[0].content)).toContain('"bold":true')
    const cards = await db.cards.where('pageId').equals(page.id).toArray()
    expect(cards.every((c) => c.reps === 0 && c.step === 0)).toBe(true)
    expect(cards.filter((c) => c.part !== 'main')).toHaveLength(2) // two blanks
  })

  it('splits a big deck into pages', async () => {
    const notes = Array.from({ length: NOTES_PER_PAGE * 2 + 5 }, (_, i) => ({
      deck: 'Big',
      flds: [`Q${i}`, `A${i}`],
    }))
    const parsed = await readApkg(
      zipSync({ 'collection.anki21': await legacyCollection(notes) }),
    )
    const summary = await importAnki(db, ws, parsed, 'Big')
    expect(summary.pages).toBe(3)
    expect((await db.pages.toArray()).map((p) => p.title).sort()).toEqual([
      'Big (1)',
      'Big (2)',
      'Big (3)',
    ])
    expect(summary.cards).toBe(NOTES_PER_PAGE * 2 + 5)
  }, 120_000)
})

describe('exportApkg + import (round trip)', () => {
  it('exports cards and blanks that read back the same', async () => {
    const nb = await createNotebook(db, ws, 'Cardiology')
    const page = await createPage(db, nb.id, null)
    await renamePage(db, page.id, 'Heart sounds')
    const card = await createBlock(db, {
      pageId: page.id,
      type: CARD_BLOCK_TYPE,
      content: { text: [run('What is <S1> & S2?')] },
    })
    await createBlock(db, {
      pageId: page.id,
      type: 'paragraph',
      parentId: card.id,
      content: {
        text: [run('Closing of '), run('AV', { bold: true }), run(' valves')],
      },
    })
    await createBlock(db, {
      pageId: page.id,
      type: 'paragraph',
      content: {
        text: [
          run('The '),
          run('mitral', { blank: 'b1' }),
          run(' valve and the '),
          run('aortic', { blank: 'b2' }),
        ],
      },
    })
    await syncCardRecords(db, page.id)

    const out = await exportApkg(db, nb.id, 1_700_000_000_000)
    expect(out).toMatchObject({
      fileName: 'Cardiology.apkg',
      notes: 2,
      cards: 3,
    })

    const back = await readApkg(out.file)
    expect(back.notes).toHaveLength(2)
    expect(back.notes[0]).toMatchObject({
      deck: 'Cardiology::Heart sounds',
      kind: 'basic',
    })
    expect(back.notes[0].fields).toEqual([
      'What is &lt;S1&gt; &amp; S2?',
      'Closing of <b>AV</b> valves',
    ])
    expect(back.notes[1].kind).toBe('cloze')
    expect(back.notes[1].fields[0]).toBe(
      'The {{c1::mitral}} valve and the {{c2::aortic}}',
    )

    const summary = await importAnki(db, ws, back, 'Cardiology (from Anki)')
    expect(summary.cards).toBe(3)
    const titles = (await db.pages.toArray()).map((p) => p.title)
    expect(titles).toContain('Cardiology › Heart sounds')
  })

  it('refuses a notebook with no cards', async () => {
    const nb = await createNotebook(db, ws, 'Empty')
    await expect(exportApkg(db, nb.id)).rejects.toThrow(/no cards/)
  })
})
