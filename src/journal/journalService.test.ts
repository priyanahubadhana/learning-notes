import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { plainText, toPlainText } from '../editor/mapping'
import { listNotebooks } from '../notebooks/notebookService'
import { deletePage, getPage } from '../pages/pageService'
import { getDailyTemplate } from '../templates/templateService'
import { dateKey, dayTitle, monthKey, monthTitle, shortDayLabel } from './dates'
import { openJournalDay } from './journalService'

let db: LearningNotesDB
let ws: string
const OCT_25 = new Date(2026, 9, 25)

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})

afterEach(async () => {
  await db.delete()
})

describe('dates', () => {
  it('formats keys and titles', () => {
    expect(dateKey(OCT_25)).toBe('2026-10-25')
    expect(monthKey(OCT_25)).toBe('2026-10')
    expect(dayTitle(OCT_25)).toMatch(/Sunday,? 25 October 2026/)
    expect(monthTitle(OCT_25)).toBe('October 2026')
    expect(shortDayLabel('2026-10-25')).toMatch(/Sun,? 25 Oct/)
  })
})

describe('openJournalDay', () => {
  it('creates the Journal notebook, month page and day page from the daily template', async () => {
    const { page, created } = await openJournalDay(db, ws, OCT_25)
    expect(created).toBe(true)
    expect(page).toMatchObject({
      title: dayTitle(OCT_25),
      journalDate: '2026-10-25',
    })

    const month = await getPage(db, page.parentId!)
    expect(month).toMatchObject({
      title: 'October 2026',
      journalMonth: '2026-10',
    })
    expect((await listNotebooks(db, ws)).map((n) => [n.title, n.kind])).toEqual(
      [['Journal', 'journal']],
    )

    const headings = (await listBlocks(db, page.id))
      .filter((b) => b.type === 'heading')
      .map((b) => toPlainText(b.content))
    expect(headings).toEqual([
      'Today I learned',
      'What was hard',
      'Review tomorrow',
    ])
  })

  it('opens the same page again instead of making a second one', async () => {
    const first = await openJournalDay(db, ws, OCT_25)
    const again = await openJournalDay(db, ws, OCT_25)
    expect(again).toEqual({ page: first.page, created: false })
  })

  it('groups days of the same month and starts a new month page', async () => {
    const a = await openJournalDay(db, ws, new Date(2026, 9, 24))
    const b = await openJournalDay(db, ws, OCT_25)
    const c = await openJournalDay(db, ws, new Date(2026, 10, 1))
    expect(a.page.parentId).toBe(b.page.parentId)
    expect(c.page.parentId).not.toBe(b.page.parentId)
    expect((await getPage(db, c.page.parentId!))?.title).toBe('November 2026')
  })

  it('uses the latest version of the daily template', async () => {
    await openJournalDay(db, ws, new Date(2026, 9, 24))
    const daily = await getDailyTemplate(db, ws)
    await createBlock(db, {
      pageId: daily!.id,
      type: 'paragraph',
      content: { text: plainText('Mood:') },
    })
    const { page } = await openJournalDay(db, ws, OCT_25)
    const last = (await listBlocks(db, page.id)).at(-1)!
    expect(toPlainText(last.content)).toBe('Mood:')
  })

  it('makes a fresh page if today’s page was deleted', async () => {
    const first = await openJournalDay(db, ws, OCT_25)
    await deletePage(db, first.page.id)
    const again = await openJournalDay(db, ws, OCT_25)
    expect(again.created).toBe(true)
    expect(again.page.id).not.toBe(first.page.id)
  })
})
