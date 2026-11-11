// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { seeded } from './claudeMock.ts'
import { createNotebook } from './helpers.ts'

/**
 * Settings › Claude › Inbox and Activity. Changes Claude proposed to a page
 * wait in the Inbox with a diff; Accept saves the page to History first and
 * applies them, Reject changes nothing. The Activity list shows what Claude
 * did, with Undo for a change made at once. The server is mocked; the Inbox
 * items are written straight into the page database, as the sync does.
 */

test.use({ viewport: { width: 1200, height: 800 } })

interface Seed {
  pageId: string
  blocks: { id: string; text: string }[]
}

/** A notebook with a page of three typed lines; returns their ids. */
async function seedPage(page: Page): Promise<Seed> {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  const editor = page.locator('.bn-editor').first()
  await editor.click()
  await page.keyboard.type('alpha')
  await page.keyboard.press('Enter')
  await page.keyboard.type('beta')
  await page.keyboard.press('Enter')
  await page.keyboard.type('gamma')
  let seed: Seed | null = null
  await expect
    .poll(
      async () => {
        seed = await page.evaluate(async () => {
          const names = (await indexedDB.databases()).map((d) => d.name!)
          const name = names.find((n) => n.startsWith('learning-notes'))!
          const idb = await new Promise<IDBDatabase>((res, rej) => {
            const open = indexedDB.open(name)
            open.onsuccess = () => res(open.result)
            open.onerror = () => rej(open.error)
          })
          const all = (store: string) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new Promise<Record<string, any>[]>((res) => {
              const q = idb.transaction(store).objectStore(store).getAll()
              q.onsuccess = () => res(q.result)
            })
          const pg = (await all('pages')).find((p) => p.title === 'Cells')
          const blocks = await all('blocks')
          idb.close()
          if (!pg) return null
          const mine = blocks
            .filter((x) => x.pageId === pg.id)
            .sort((x, y) => (x.order < y.order ? -1 : 1))
            .map((x) => ({
              id: x.id as string,
              text: ((x.content.text ?? []) as { text?: string }[])
                .map((r) => r.text ?? '')
                .join(''),
            }))
            .filter((x) => x.text)
          return { pageId: pg.id as string, blocks: mine }
        })
        return seed?.blocks.map((b) => b.text).join(',')
      },
      { timeout: 15_000 },
    )
    .toBe('alpha,beta,gamma')
  return seed!
}

const run = (text: string) => ({ type: 'text', text, styles: {} })
const para = (id: string, text: string, parentId: string | null = null) => ({
  id,
  parentId,
  type: 'paragraph',
  content: { text: [run(text)] },
  order: 'a0',
})

async function putInbox(page: Page, seed: Seed, id = 'inbox-1') {
  const item = {
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
    pageId: seed.pageId,
    notebookId: 'x',
    pageTitle: 'Cells',
    baseRevision: 'abc',
    reasons: ['big', 'conflict'],
    status: 'pending',
    batchId: 'batch-e2e',
    ops: [
      {
        op: 'replace',
        targetId: seed.blocks[1].id,
        blocks: [para(seed.blocks[1].id, 'BETA REWRITTEN')],
      },
      {
        op: 'add',
        parentId: null,
        place: 'end',
        blocks: [para('new-block-1', 'delta from Claude')],
      },
    ],
    stats: { replaced: 1, added: 1, existing: 3 },
  }
  await page.evaluate(async (it) => {
    const names = (await indexedDB.databases()).map((d) => d.name!)
    const name = names.find((n) => n.startsWith('learning-notes'))!
    const idb = await new Promise<IDBDatabase>((res, rej) => {
      const open = indexedDB.open(name)
      open.onsuccess = () => res(open.result)
      open.onerror = () => rej(open.error)
    })
    await new Promise<void>((res, rej) => {
      const tx = idb.transaction('claudeInbox', 'readwrite')
      tx.objectStore('claudeInbox').put(it)
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
    idb.close()
  }, item)
}

const blockTexts = (page: Page, pageId: string) =>
  page.evaluate(async (pid) => {
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
    const blocks = await all<{
      pageId: string
      order: string
      deletedAt: number | null
      source?: string
      content: { text?: { text?: string }[] }
    }>('blocks')
    const versions = await all<{
      pageId: string
      reason?: string
      blocks: { content: { text?: { text?: string }[] } }[]
    }>('pageVersions')
    idb.close()
    return {
      texts: blocks
        .filter((b) => b.pageId === pid && b.deletedAt === null)
        .sort((a, b) => (a.order < b.order ? -1 : 1))
        .map((b) => (b.content.text ?? []).map((r) => r.text ?? '').join(''))
        .filter(Boolean),
      ai: blocks.filter((b) => b.pageId === pid && b.source === 'ai').length,
      reasons: versions.filter((v) => v.pageId === pid).map((v) => v.reason),
      copies: versions
        .filter((v) => v.pageId === pid)
        .map((v) =>
          v.blocks
            .map((b) =>
              (b.content.text ?? []).map((r) => r.text ?? '').join(''),
            )
            .filter(Boolean),
        ),
    }
  }, pageId)

const inboxTab = (page: Page) => page.getByTestId('claude-tab-inbox')

test('empty Inbox says what will appear here', async ({ page }) => {
  await page.goto('/#/settings/claude')
  await inboxTab(page).click()
  await expect(page.getByTestId('claude-inbox')).toContainText(
    'Nothing is waiting',
  )
})

test('a proposed change shows a clear diff; Accept saves History first, then applies it', async ({
  page,
}) => {
  const seed = await seedPage(page)
  await putInbox(page, seed)
  await page.goto('/#/settings/claude')
  await page.reload()
  // The tab shows how many wait.
  await expect(inboxTab(page)).toHaveText('Inbox (1)')
  await inboxTab(page).click()
  const item = page.getByTestId('claude-inbox-item')
  await expect(item).toContainText('Changes to "Cells"')
  await expect(item).toContainText('1 added, 1 replaced')
  await expect(item).toContainText('More than 30% of the page')
  await expect(item).toContainText('The page changed after Claude read it')
  // Nothing is applied before the person decides.
  await item.getByRole('button', { name: 'Show changes' }).click()
  const diff = page.getByTestId('claude-diff')
  await expect(diff.getByTestId('claude-diff-was').first()).toHaveText('beta')
  await expect(diff.getByTestId('claude-diff-now').first()).toHaveText(
    'BETA REWRITTEN',
  )
  await expect(diff.getByTestId('claude-diff-now').nth(1)).toHaveText(
    'delta from Claude',
  )
  await expect(diff).toContainText('At the end')
  expect((await blockTexts(page, seed.pageId)).texts).toEqual([
    'alpha',
    'beta',
    'gamma',
  ])

  await item.getByTestId('claude-accept').click()
  await expect(page.getByTestId('claude-inbox')).toContainText(
    'Nothing is waiting',
  )
  await expect(inboxTab(page)).toHaveText('Inbox')
  await expect
    .poll(async () => (await blockTexts(page, seed.pageId)).texts)
    .toEqual(['alpha', 'BETA REWRITTEN', 'gamma', 'delta from Claude'])
  const after = await blockTexts(page, seed.pageId)
  // The page as it was is in History (a copy already equal to it is reused);
  // only the new block is an AI result.
  expect(after.copies).toContainEqual(['alpha', 'beta', 'gamma'])
  expect(after.ai).toBe(1)
  await page.getByText('Decided (1)').click()
  await expect(page.getByTestId('claude-inbox')).toContainText('Accepted')
})

test('Reject changes nothing and the item moves to Decided', async ({
  page,
}) => {
  const seed = await seedPage(page)
  await putInbox(page, seed)
  await page.goto('/#/settings/claude')
  await page.reload()
  await inboxTab(page).click()
  await page
    .getByTestId('claude-inbox-item')
    .getByTestId('claude-reject')
    .click()
  await expect(page.getByTestId('claude-inbox')).toContainText(
    'Nothing is waiting',
  )
  await page.getByText('Decided (1)').click()
  await expect(page.getByTestId('claude-inbox')).toContainText('Rejected')
  const after = await blockTexts(page, seed.pageId)
  expect(after.texts).toEqual(['alpha', 'beta', 'gamma'])
  expect(after.reasons).not.toContain('claude')
  expect(after.texts).toEqual(['alpha', 'beta', 'gamma'])
})

test('Inbox works at phone width with no sideways scroll', async ({ page }) => {
  const seed = await seedPage(page)
  await putInbox(page, seed)
  await page.setViewportSize({ width: 375, height: 700 })
  await page.goto('/#/settings/claude')
  await page.reload()
  await inboxTab(page).click()
  await page
    .getByTestId('claude-inbox-item')
    .getByRole('button', { name: 'Show changes' })
    .click()
  await expect(page.getByTestId('claude-diff')).toBeVisible()
  const wider = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(wider).toBe(false)
  await expect(page.getByTestId('claude-accept')).toBeVisible()
})

test('Activity lists what Claude did; Undo opens the page History', async ({
  page,
}) => {
  const seed = await seedPage(page)
  await seeded(page, {
    on: true,
    activity: [
      {
        at: Date.now() - 60_000,
        tool: 'refine_page',
        ids: ['nb', seed.pageId],
        counts: { replaced: 1 },
      },
      {
        at: Date.now() - 120_000,
        tool: 'refine_page',
        ids: ['nb', seed.pageId],
        counts: { replaced: 4, inbox: 1 },
      },
      {
        at: Date.now() - 180_000,
        tool: 'create_notebook',
        ids: ['gone-1'],
        counts: { pages: 2 },
      },
    ],
  })
  await page.goto('/#/settings/claude')
  await page.reload()
  // The seeded session asks for the passphrase; not needed here.
  await page
    .getByTestId('locked-modal')
    .getByRole('button', { name: 'Later' })
    .click()
  await page.getByTestId('claude-tab-activity').click()
  const rows = page.getByTestId('claude-activity-row')
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0)).toContainText('Changed a page: Cells')
  await expect(rows.nth(1)).toContainText('waiting in the Inbox')
  await expect(rows.nth(2)).toContainText('no longer in your notes')
  // Undo only for the change that was made at once.
  await expect(rows.nth(0).getByRole('button', { name: /^Undo/ })).toBeVisible()
  await expect(rows.nth(1).getByRole('button')).toHaveCount(0)
  await expect(rows.nth(2).getByRole('button')).toHaveCount(0)
  await rows.nth(0).getByRole('button', { name: /^Undo/ }).click()
  await expect(page.getByRole('dialog', { name: 'History' })).toBeVisible()
})
