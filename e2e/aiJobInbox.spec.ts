// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { CLAUDE_JOB } from './aiJobFixture.ts'

/**
 * AF-41: a whole job from Claude waits in Settings › Claude › Inbox (flag
 * `ai.framework`). Show changes -> Accept (one save, Undo in the toast) ->
 * Undo (to Trash). The job is written straight into the page database, as
 * the sync would. No network, no AI.
 */

const FLAGGED = '/?flags=ai.framework#/settings/claude'

const item = (request: 'apply' | 'undo' = 'apply', id = 'inbox-job-1') => ({
  id,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  deletedAt: null,
  pageId: '',
  notebookId: '',
  pageTitle: CLAUDE_JOB.plan.goal,
  baseRevision: '',
  reasons: [],
  status: 'pending',
  batchId: CLAUDE_JOB.id,
  ops: [],
  stats: { replaced: 0, added: 0, existing: 0 },
  job: {
    request,
    reasons: ['asked'],
    from: 'Claude (PC)',
    job: CLAUDE_JOB,
  },
})

async function putItem(page: Page, it: unknown) {
  await page.evaluate(async (value) => {
    const names = (await indexedDB.databases()).map((d) => d.name!)
    const name = names.find((n) => n.startsWith('learning-notes'))!
    const idb = await new Promise<IDBDatabase>((res, rej) => {
      const open = indexedDB.open(name)
      open.onsuccess = () => res(open.result)
      open.onerror = () => rej(open.error)
    })
    await new Promise<void>((res, rej) => {
      const tx = idb.transaction('claudeInbox', 'readwrite')
      tx.objectStore('claudeInbox').put(value)
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
    idb.close()
  }, it)
}

/** Live notebooks and pages by title, straight from the database. */
const live = (page: Page) =>
  page.evaluate(async () => {
    const names = (await indexedDB.databases()).map((d) => d.name!)
    const name = names.find((n) => n.startsWith('learning-notes'))!
    const idb = await new Promise<IDBDatabase>((res, rej) => {
      const open = indexedDB.open(name)
      open.onsuccess = () => res(open.result)
      open.onerror = () => rej(open.error)
    })
    const all = <R>(store: string) =>
      new Promise<R[]>((res) => {
        const q = idb.transaction(store).objectStore(store).getAll()
        q.onsuccess = () => res(q.result as R[])
      })
    type Row = { title?: string; deletedAt: number | null }
    const nb = await all<Row>('notebooks')
    const pg = await all<Row>('pages')
    const cards = await all<Row>('cards')
    idb.close()
    return {
      notebooks: nb.filter(
        (x) => x.deletedAt == null && x.title === 'Habits from Claude',
      ).length,
      pages: pg.filter((x) => x.deletedAt == null && x.title === 'Loops')
        .length,
      cards: cards.filter((x) => x.deletedAt == null).length,
      trashed: nb.filter(
        (x) => x.deletedAt != null && x.title === 'Habits from Claude',
      ).length,
    }
  })

async function open(page: Page, it: unknown) {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  // Wait until the app has made its database.
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await indexedDB.databases()).filter((d) =>
            d.name?.startsWith('learning-notes'),
          ).length,
      ),
    )
    .toBeGreaterThan(0)
  await putItem(page, it)
  await page.goto(FLAGGED)
  await page.reload()
  await page.getByTestId('claude-tab-inbox').click()
}

/** One tap or click, whichever the device has. */
const press = async (loc: ReturnType<Page['getByTestId']>, touch: boolean) =>
  touch ? loc.tap() : loc.click()

async function flow(page: Page, touch: boolean) {
  await open(page, item())
  const card = page.getByTestId('claude-job-item')
  await expect(card).toContainText(
    'Claude wants to run: Build a notebook about habits',
  )
  await expect(card).toContainText('Claude (PC)')
  await expect(card).toContainText('Claude asked you to look first')
  await expect(card).toContainText('records to make or change')
  // Targets are at least 44 px.
  for (const id of [
    'claude-job-show',
    'claude-job-accept',
    'claude-job-reject',
  ]) {
    const box = await card.getByTestId(id).boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }

  // Preview: nothing is saved yet.
  await press(card.getByTestId('claude-job-show'), touch)
  const sheet = page.getByTestId('claude-job-sheet')
  await expect(sheet).toBeVisible()
  await expect(
    sheet
      .getByTestId('claude-job-line')
      .filter({ hasText: 'Habits from Claude' }),
  ).toHaveCount(1)
  await expect(sheet).toContainText('Pages: 1')
  expect(await live(page)).toMatchObject({ notebooks: 0, pages: 0 })
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)

  // Accept: the whole job at once, with Undo in the toast.
  await press(card.getByTestId('claude-job-accept'), touch)
  await expect(page.getByTestId('claude-inbox')).toContainText(
    'Nothing is waiting',
  )
  await expect
    .poll(() => live(page))
    .toMatchObject({ notebooks: 1, pages: 1, cards: 1, trashed: 0 })
  const undo = page.getByRole('button', { name: 'Undo', exact: true })
  await expect(undo).toBeVisible()

  // Undo: everything goes to Trash together.
  await press(undo, touch)
  await expect
    .poll(() => live(page))
    .toMatchObject({ notebooks: 0, pages: 0, cards: 0, trashed: 1 })
}

test.describe('AI framework: Inbox job item (flag on)', () => {
  test.describe('PC', () => {
    test.use({ viewport: { width: 1200, height: 900 } })

    test('preview, accept, undo', async ({ page }) => {
      await flow(page, false)
    })

    test('Reject saves nothing', async ({ page }) => {
      await open(page, item())
      await page.getByTestId('claude-job-reject').click()
      await expect(page.getByTestId('claude-inbox')).toContainText(
        'Nothing is waiting',
      )
      expect(await live(page)).toMatchObject({ notebooks: 0, pages: 0 })
      await page.getByText('Decided (1)').click()
      await expect(page.getByTestId('claude-inbox')).toContainText(
        'Job: Build a notebook about habits',
      )
    })

    test('an undo request shows its own words, and a job never saved here is not undone', async ({
      page,
    }) => {
      await open(page, item('undo'))
      const card = page.getByTestId('claude-job-item')
      await expect(card).toHaveAttribute('data-request', 'undo')
      await expect(card).toContainText('Claude asks to undo')
      await expect(card).toContainText('Nothing is deleted for good')
      // The staged job in the request was never saved here. Accepting an undo of a
      // job that was never applied here tells the person nothing changed.
      await card.getByTestId('claude-job-accept').click()
      await expect(page.getByTestId('claude-job-note')).toContainText(
        'Nothing was changed',
      )
    })
  })

  test.describe('iPad, touch', () => {
    test.use({
      viewport: { width: 820, height: 1180 },
      hasTouch: true,
      isMobile: false,
    })

    test('the same flow works by touch', async ({ page }) => {
      await flow(page, true)
    })
  })
})

test.describe('AI framework: Inbox job item (flag off)', () => {
  test.use({ viewport: { width: 1200, height: 900 } })

  test('a job item is not shown and not counted', async ({ page }) => {
    await page.goto('/')
    await expect
      .poll(() =>
        page.evaluate(
          async () =>
            (await indexedDB.databases()).filter((d) =>
              d.name?.startsWith('learning-notes'),
            ).length,
        ),
      )
      .toBeGreaterThan(0)
    await putItem(page, item())
    await page.goto('/#/settings/claude')
    await page.reload()
    await expect(page.getByTestId('claude-tab-inbox')).toHaveText('Inbox')
    await page.getByTestId('claude-tab-inbox').click()
    await expect(page.getByTestId('claude-job-item')).toHaveCount(0)
    await expect(page.getByTestId('claude-inbox')).toContainText(
      'Nothing is waiting',
    )
  })
})
