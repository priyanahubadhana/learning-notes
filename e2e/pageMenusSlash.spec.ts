// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * Slice 12b (flag page.menus): the "/" menu on the shared Command list.
 * One test per spec line PM-01 .. PM-05 and PM-09 (docs/features/page-menus.md).
 */
test.use({ viewport: { width: 1024, height: 900 } })

const list = (page: Page) => page.getByTestId('slash-list')
const items = (page: Page) => list(page).locator('[data-testid^="cl-item-"]')

async function openNote(page: Page, level: 'beginner' | 'professional') {
  await page.addInitScript((l) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: l, unlocked: [] }),
    )
  }, level)
  await page.goto('/?flags=page.menus')
  await createNotebook(page, 'Biology', 'First')
  await page.locator('.bn-editor').click()
}

test('PM-01 "/" on an empty line opens the list with 12 items in 3 groups and Show all', async ({
  page,
}) => {
  await openNote(page, 'beginner')
  await page.keyboard.type('/')
  await expect(list(page)).toBeVisible()
  await expect(items(page)).toHaveCount(12)
  for (const g of ['basic', 'study', 'insert'])
    await expect(list(page).getByTestId(`cl-group-${g}`)).toBeVisible()
  await expect(list(page).getByTestId('cl-group-lists')).toHaveCount(0)
  await expect(list(page).getByTestId('cl-show-all')).toBeVisible()
  // Anchored under the cursor line, inside the screen.
  const box = (await list(page).boundingBox())!
  const caret = await page.evaluate(() => {
    const r = getSelection()!.getRangeAt(0).getBoundingClientRect()
    return { bottom: r.bottom, left: r.left }
  })
  expect(box.y).toBeGreaterThanOrEqual(caret.bottom)
  expect(box.y).toBeLessThan(caret.bottom + 40)
  expect(box.x + box.width).toBeLessThanOrEqual(1024 - 12)
})

test('PM-02 Show all lists every item in 6 groups', async ({ page }) => {
  await openNote(page, 'beginner')
  await page.keyboard.type('/')
  await list(page).getByTestId('cl-show-all').click()
  for (const g of ['basic', 'lists', 'study', 'media', 'data', 'page'])
    await expect(list(page).getByTestId(`cl-group-${g}`)).toBeVisible()
  for (const id of [
    'cardList',
    'mindMap',
    'math',
    'dayRecord',
    'embed',
    'file',
    'camera',
    'database',
    'template',
    'saveTemplate',
    'subpage',
    'link',
  ])
    await expect(list(page).getByTestId(`cl-item-${id}`)).toBeAttached()
  // Professional starts with the full list.
  await page.keyboard.press('Escape')
})

test('PM-02 Professional opens with all 6 groups at once', async ({ page }) => {
  await openNote(page, 'professional')
  await page.keyboard.type('/')
  for (const g of ['basic', 'lists', 'study', 'media', 'data', 'page'])
    await expect(list(page).getByTestId(`cl-group-${g}`)).toBeVisible()
  await expect(list(page).getByTestId('cl-show-all')).toHaveCount(0)
})

test('PM-03 typing filters by name and alias, Enter inserts the first match, Esc keeps the "/"', async ({
  page,
}) => {
  await openNote(page, 'beginner')
  await page.keyboard.type('/todo')
  await expect(items(page)).toHaveCount(1)
  await expect(list(page).getByTestId('cl-item-checklist')).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(list(page)).toHaveCount(0)
  await expect(
    page.locator('.bn-editor [data-content-type="checkListItem"]'),
  ).toHaveCount(1)
  await expect(page.locator('.bn-editor')).not.toContainText('/todo')

  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/hea')
  await expect(list(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(list(page)).toHaveCount(0)
  await expect(page.locator('.bn-editor')).toContainText('/hea')
})

test('PM-04 the last 3 used items show under Recent on top', async ({
  page,
}) => {
  await openNote(page, 'beginner')
  for (const word of ['divider', 'quote', 'bullet']) {
    await page.keyboard.type(`/${word}`)
    await page.keyboard.press('Enter')
    await expect(list(page)).toHaveCount(0)
    await page.keyboard.type('x')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
  }
  await page.keyboard.type('/')
  await expect(list(page)).toBeVisible()
  const recent = list(page).locator('[data-testid^="cl-recent-"]')
  await expect(recent).toHaveCount(3)
  await expect(recent.nth(0)).toHaveAttribute('data-testid', 'cl-recent-bullet')
  await expect(recent.nth(1)).toHaveAttribute('data-testid', 'cl-recent-quote')
  await expect(recent.nth(2)).toHaveAttribute(
    'data-testid',
    'cl-recent-divider',
  )
  await expect(list(page).getByTestId('cl-group-recent')).toBeVisible()
})

test('PM-05 inside a table cell only the items that fit show', async ({
  page,
}) => {
  await openNote(page, 'professional')
  await page.keyboard.type('/table')
  await page.keyboard.press('Enter')
  await expect(page.locator('.bn-editor table')).toBeVisible()
  await page.keyboard.type('/')
  await expect(list(page)).toBeVisible()
  await expect(items(page)).toHaveCount(1)
  await expect(list(page).getByTestId('cl-item-link')).toBeVisible()
  await expect(list(page).getByTestId('cl-item-heading')).toHaveCount(0)
})

test('PM-09 Beginner always has Show all, and nothing is lost behind it', async ({
  page,
}) => {
  await openNote(page, 'beginner')
  await page.keyboard.type('/')
  await expect(list(page).getByTestId('cl-show-all')).toBeVisible()
  // Typing searches every item, also the ones Show all would add.
  await page.keyboard.type('mind')
  await expect(list(page).getByTestId('cl-item-mindMap')).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(
    page.locator('.bn-editor [data-content-type="mindMap"]'),
  ).toHaveCount(1)
})

test.describe('placement', () => {
  const caretBottom = (page: Page) =>
    page.evaluate(
      () => getSelection()!.getRangeAt(0).getBoundingClientRect().bottom,
    )

  test.describe('iPad', () => {
    test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true })
    test('PM-01 the list opens under the cursor line', async ({ page }) => {
      await openNote(page, 'professional')
      await page.keyboard.type('/')
      await expect(list(page)).toBeVisible()
      const box = (await list(page).boundingBox())!
      expect(box.y).toBeGreaterThanOrEqual((await caretBottom(page)) + 4)
    })
  })

  test.describe('phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })
    test('PM-01 the list is fully on screen', async ({ page }) => {
      await openNote(page, 'beginner')
      await page.keyboard.type('/')
      await expect(list(page)).toBeVisible()
      const box = (await list(page).boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(12)
      expect(box.y).toBeGreaterThanOrEqual(12)
      expect(box.x + box.width).toBeLessThanOrEqual(390 - 12)
      expect(box.y + box.height).toBeLessThanOrEqual(844 - 12)
    })
  })
})
