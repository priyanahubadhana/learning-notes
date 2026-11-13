// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  hideSidebar,
  openPage,
  showSidebar,
  sidebar,
} from './helpers.ts'

/**
 * Slice 12e (flag page.menus): the page more-menu as a side Sheet
 * (PM-60 .. PM-64). docs/features/page-menus.md.
 */
test.use({ viewport: { width: 1280, height: 900 } })

const sheet = (page: Page) => page.getByTestId('page-sheet')
const rowsIn = (page: Page) => sheet(page).locator('[data-testid^="ps-row-"]')

async function openSheet(page: Page, level: 'beginner' | 'professional') {
  await page.addInitScript((l) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: l, unlocked: [] }),
    )
  }, level)
  await page.goto('/?flags=page.menus')
  await createNotebook(page, 'Biology', 'First')
  await page.getByRole('button', { name: 'More options' }).click()
  await expect(sheet(page)).toBeVisible()
}

test('PM-60 the page more-menu opens a Sheet docked right at full height', async ({
  page,
}) => {
  await openSheet(page, 'beginner')
  await expect(page.getByRole('menu')).toHaveCount(0)
  // The slide-in takes 240 ms: wait until it has landed on the right edge.
  await expect
    .poll(async () => {
      const b = (await sheet(page).boundingBox())!
      return Math.round(b.x + b.width)
    })
    .toBe(1280)
  const box = (await sheet(page).boundingBox())!
  expect(Math.round(box.width)).toBe(376)
  expect(Math.round(box.height)).toBe(900)
  await sheet(page).getByTestId('fb-sheet-close').click()
  await expect(sheet(page)).toHaveCount(0)
})

test('PM-61 Beginner sees 8 rows', async ({ page }) => {
  await openSheet(page, 'beginner')
  const ids = await rowsIn(page).evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-testid')),
  )
  expect(ids).toEqual(
    [
      'rename',
      'move',
      'duplicate',
      'export',
      'history',
      'lock',
      'delete',
      'reading',
    ].map((id) => `ps-row-${id}`),
  )
  await expect(sheet(page).getByTestId('ps-pinned')).toHaveCount(0)
})

test('PM-62 Professional shows the actions in 5 sections', async ({ page }) => {
  await openSheet(page, 'professional')
  for (const s of ['page', 'view', 'share', 'protect', 'tools'])
    await expect(sheet(page).getByTestId(`ps-section-${s}`)).toBeVisible()
  for (const id of [
    'rename',
    'move',
    'duplicate',
    'favourite',
    'saveTemplate',
    'import',
    'delete',
    'restore',
    'reading',
    'paperStyle',
    'paperSize',
    'deviceMode',
    'toolbar',
    'theme',
    'export',
    'copy',
    'pastePlain',
    'history',
    'review',
    'prompts',
    'search',
  ])
    await expect(sheet(page).getByTestId(`ps-row-${id}`)).toBeAttached()
})

test('PM-63 Professional pins an action to the top row', async ({ page }) => {
  await openSheet(page, 'professional')
  await sheet(page).getByTestId('ps-pin-add').click()
  await sheet(page).getByTestId('ps-pin-history').click()
  await sheet(page).getByTestId('ps-back').click()
  const tile = sheet(page).getByTestId('ps-tile-history')
  await expect(tile).toBeVisible()
  const box = (await tile.boundingBox())!
  expect(Math.round(box.width)).toBe(64)
  expect(Math.round(box.height)).toBe(64)
})

test('PM-63 the Arrange sheet reorders the pinned actions', async ({
  page,
}) => {
  await openSheet(page, 'professional')
  for (const id of ['history', 'review']) {
    await sheet(page).getByTestId('ps-pin-add').click()
    await sheet(page).getByTestId(`ps-pin-${id}`).click()
    await sheet(page).getByTestId('ps-back').click()
  }
  const order = () =>
    sheet(page)
      .locator('[data-testid^="ps-tile-"]')
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-testid')!.slice(8)),
      )
  expect((await order()).filter((id) => id !== 'add')).toEqual([
    'history',
    'review',
  ])
  await sheet(page).getByTestId('ps-arrange').click()
  const arrange = page.getByTestId('arrange-sheet')
  await expect(arrange).toBeVisible()
  await arrange.getByTestId('move-down').first().click()
  await arrange.getByTestId('arrange-done').click()
  await expect(arrange).toHaveCount(0)
  expect((await order()).filter((id) => id !== 'add')).toEqual([
    'review',
    'history',
  ])
  // The order is kept after the sheet is closed and opened again.
  await sheet(page).getByTestId('fb-sheet-close').click()
  await expect(sheet(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'More options' }).click()
  await expect(sheet(page).getByTestId('ps-tile-review')).toBeVisible()
  expect((await order()).filter((id) => id !== 'add')).toEqual([
    'review',
    'history',
  ])
})

test('PM-64 Delete sends the page to Trash with a 6 second Undo toast', async ({
  page,
}) => {
  await openSheet(page, 'beginner')
  await sheet(page).getByTestId('fb-sheet-close').click()
  await addPage(page, 'Biology', 'Second')
  await page.getByRole('button', { name: 'More options' }).click()
  await sheet(page).getByTestId('ps-row-delete').click()
  await expect(sheet(page)).toHaveCount(0)
  const undo = page.getByRole('button', { name: 'Undo' })
  await expect(undo).toBeVisible()
  await undo.click()
  await openPage(page, 'Second')
})

test('PM-60 on a phone the Sheet fills the screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: [] }),
    )
  })
  await page.goto('/?flags=page.menus')
  await createNotebook(page, 'Biology', 'First')
  await page.getByRole('button', { name: 'More options' }).click()
  const box = (await sheet(page).boundingBox())!
  expect(Math.round(box.width)).toBe(390)
  expect(Math.round(box.height)).toBe(844)
})

test('Duplicate adds a copy and Move puts the page under another page', async ({
  page,
}) => {
  await openSheet(page, 'beginner')
  await sheet(page).getByTestId('ps-row-duplicate').click()
  await expect(page.getByText('Page duplicated')).toBeVisible()
  await showSidebar(page)
  await expect(
    sidebar(page).getByRole('button', { name: 'First copy', exact: true }),
  ).toBeVisible()
  await hideSidebar(page)
  await page.getByRole('button', { name: 'More options' }).click()
  await sheet(page).getByTestId('ps-row-move').click()
  await sheet(page).locator('[data-testid^="ps-move-"]').first().click()
  await expect(page.getByText('Page moved')).toBeVisible()
})

test('the focus ring shows for the keyboard only, not after a click', async ({
  page,
}) => {
  await openSheet(page, 'professional')
  const ring = () =>
    page.evaluate(() => {
      const el = document.activeElement
      return el ? getComputedStyle(el).outlineStyle : 'none'
    })
  expect(await ring()).toBe('none')
  await page.keyboard.press('Tab')
  expect(await ring()).not.toBe('none')
})
