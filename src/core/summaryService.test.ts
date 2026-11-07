import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { addBlocks } from './blockBulk'
import type { LearningNotesDB } from './db'
import {
  addBlockToSummary,
  addOwnLine,
  ensureSummaryTab,
  isSafeHref,
  lineText,
  listSummary,
  purgeSummaryOf,
  removeLine,
  updateOwnLine,
} from './summaryService'
import { createTestDb } from './testing'
import { getOrCreateDefaultWorkspace } from './workspaceService'

let db: LearningNotesDB
let nb: string
let page: string

const para = (text: string) => ({
  type: 'paragraph',
  content: { text: [{ type: 'text', text, styles: {} }] } as never,
})

beforeEach(async () => {
  db = createTestDb()
  const ws = (await getOrCreateDefaultWorkspace(db)).id
  nb = (await createNotebook(db, ws, 'Medicine')).id
  page = (await createPage(db, nb, null)).id
})

afterEach(async () => {
  await db.delete()
})

describe('Summary lines', () => {
  it('reads the words of rich text, links included', () => {
    expect(
      lineText({
        text: [
          { type: 'text', text: 'Hello ', styles: {} },
          {
            type: 'link',
            href: 'https://x.org',
            content: [{ type: 'text', text: 'world', styles: {} }],
          },
        ],
      } as never),
    ).toBe('Hello world')
  })

  it('links a note line, keeps it once and follows edits', async () => {
    const [b] = await addBlocks(db, page, [para('The heart has four chambers')])
    const first = await addBlockToSummary(db, b.id)
    expect(first.status).toBe('added')
    expect((await addBlockToSummary(db, b.id)).status).toBe('exists')
    let [group] = await listSummary(db, { kind: 'page', pageId: page })
    expect(group.lines).toHaveLength(1)
    expect(group.lines[0].text).toBe('The heart has four chambers')
    await db.blocks.update(b.id, {
      content: { text: [{ type: 'text', text: 'Four chambers', styles: {} }] },
    })
    ;[group] = await listSummary(db, { kind: 'page', pageId: page })
    expect(group.lines[0].text).toBe('Four chambers')
    expect(group.lines[0].missing).toBe(false)
  })

  it('keeps the saved words when the note line is deleted', async () => {
    const [b] = await addBlocks(db, page, [para('Keep me')])
    await addBlockToSummary(db, b.id)
    await db.blocks.update(b.id, { deletedAt: Date.now() })
    const [group] = await listSummary(db, { kind: 'page', pageId: page })
    expect(group.lines[0]).toMatchObject({ text: 'Keep me', missing: true })
  })

  it('uses the editor words for a line that is not saved yet', async () => {
    const r = await addBlockToSummary(db, 'new-block', page, 'Fresh line')
    expect(r.status).toBe('added')
    const none = await addBlockToSummary(db, 'other', page, '  ')
    expect(none.status).toBe('empty')
  })

  it('adds, edits and removes own lines; linked lines are not edited here', async () => {
    const r = await addOwnLine(db, page, '  My point ')
    if (r.status !== 'added') throw new Error('not added')
    await updateOwnLine(db, r.item.id, 'My better point')
    const [b] = await addBlocks(db, page, [para('Note')])
    const l = await addBlockToSummary(db, b.id)
    if (l.status !== 'added') throw new Error('not added')
    await updateOwnLine(db, l.item.id, 'changed')
    let [group] = await listSummary(db, { kind: 'page', pageId: page })
    expect(group.lines.map((x) => x.text)).toEqual(['My better point', 'Note'])
    await removeLine(db, r.item.id)
    ;[group] = await listSummary(db, { kind: 'page', pageId: page })
    expect(group.lines.map((x) => x.text)).toEqual(['Note'])
  })

  it('accepts only safe links', async () => {
    expect(isSafeHref('https://a.org/x')).toBe(true)
    expect(isSafeHref('#/read/abc?at=1')).toBe(true)
    expect(isSafeHref('javascript:alert(1)')).toBe(false)
    const r = await addOwnLine(db, page, 'Quote', {
      href: 'javascript:alert(1)',
      where: 'p. 1',
    })
    if (r.status !== 'added') throw new Error('not added')
    expect(r.item.href).toBeUndefined()
    const ok = await addOwnLine(db, page, 'Quote 2', {
      href: '#/read/p?at=1',
      where: 'p. 1',
    })
    if (ok.status !== 'added') throw new Error('not added')
    expect(ok.item).toMatchObject({ href: '#/read/p?at=1', where: 'p. 1' })
  })

  it('lists page, notebook and app levels from the same rows', async () => {
    const sub = (await createPage(db, nb, page)).id
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    const nb2 = (await createNotebook(db, ws, 'Law')).id
    const other = (await createPage(db, nb2, null)).id
    await addOwnLine(db, page, 'A')
    await addOwnLine(db, sub, 'B')
    await addOwnLine(db, other, 'C')
    await db.pages.update(page, { summary: 'Own paragraph' })
    const lines = (g: Awaited<ReturnType<typeof listSummary>>) =>
      g.flatMap((x) => x.lines.map((l) => l.text))
    const pg = await listSummary(db, { kind: 'page', pageId: page })
    expect(lines(pg)).toEqual(['A', 'B'])
    expect(pg[0].ownText).toBe('Own paragraph')
    expect(
      lines(await listSummary(db, { kind: 'notebook', notebookId: nb })),
    ).toEqual(['A', 'B'])
    expect(lines(await listSummary(db, { kind: 'app' }))).toEqual([
      'A',
      'B',
      'C',
    ])
    expect(
      lines(await listSummary(db, { kind: 'app', notebookId: nb2 })),
    ).toEqual(['C'])
  })

  it('hides lines of deleted pages', async () => {
    await addOwnLine(db, page, 'A')
    await db.pages.update(page, { deletedAt: Date.now() })
    expect(await listSummary(db, { kind: 'notebook', notebookId: nb })).toEqual(
      [],
    )
  })

  it('Delete forever erases the lines of the page and lines linked to its notes', async () => {
    const other = (await createPage(db, nb, null)).id
    const [b] = await addBlocks(db, page, [para('Secret')])
    await addOwnLine(db, page, 'Own secret')
    await addBlockToSummary(db, b.id, other)
    await addOwnLine(db, other, 'Stays')
    await purgeSummaryOf(db, [page], 5)
    const rows = await db.summaryItems.toArray()
    const erased = rows.filter((r) => r.purgedAt === 5)
    expect(erased).toHaveLength(2)
    expect(
      erased.every((r) => r.text === '' && r.sourceBlockId === undefined),
    ).toBe(true)
    const [group] = await listSummary(db, { kind: 'page', pageId: other })
    expect(group.lines.map((l) => l.text)).toEqual(['Stays'])
  })

  it('adds the Summary tab once, after Notes, and respects a hidden one', async () => {
    const book = (await db.notebooks.get(nb))!
    const old = {
      ...book,
      tabs: book.tabs!.filter((t) => t.kind !== 'summary'),
    }
    await db.notebooks.put(old)
    await ensureSummaryTab(db, old)
    const after = (await db.notebooks.get(nb))!
    expect(after.tabs!.map((t) => t.kind).slice(0, 2)).toEqual([
      'notes',
      'summary',
    ])
    const hidden = {
      ...after,
      tabs: after.tabs!.map((t) =>
        t.kind === 'summary' ? { ...t, hidden: true } : t,
      ),
    }
    await db.notebooks.put(hidden)
    await ensureSummaryTab(db, hidden)
    expect(
      (await db.notebooks.get(nb))!.tabs!.filter((t) => t.kind === 'summary'),
    ).toHaveLength(1)
  })
})
