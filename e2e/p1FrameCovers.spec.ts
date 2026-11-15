// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode } from './helpers.ts'

/**
 * P1.9 (flag foundation.shell): the frame matches panels 1, 2, 3, 4 and 6 of
 * docs/mockups/phase1-fixes/phase1-fixes.html. Every sheet can always be
 * closed (✕, a tap outside, Esc).
 */
const ON = '/?flags=foundation.shell,page.menus'
const sheet = (page: Page) => page.getByTestId('page-sheet')
const topBar = (page: Page) => page.locator('header[data-shell-top]')

async function level(page: Page, l: 'beginner' | 'professional') {
  await page.addInitScript((v) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: v, unlocked: [] }),
    )
  }, l)
}

async function openSheet(
  page: Page,
  l: 'beginner' | 'professional',
  size = { width: 820, height: 1180 },
) {
  await level(page, l)
  await page.setViewportSize(size)
  await page.goto(ON)
  await createNotebook(page, 'Biology', 'Cells')
  await page.getByRole('button', { name: 'More options' }).click()
  await expect(sheet(page)).toBeVisible()
  // The slide-in has landed when the sheet's right edge stops moving.
  const want = size.width < 640 ? 0 : size.width - 12 - 440
  await expect
    .poll(async () => Math.round((await sheet(page).boundingBox())!.x))
    .toBe(want)
}

// ---- Panel 2: right-side sheets start below the top bar ----

test('P1.9 panel 2: Page options starts below the top bar, 440 wide, 12 px from the edges; only the page area is dimmed', async ({
  page,
}) => {
  await openSheet(page, 'professional')
  const bar = (await topBar(page).boundingBox())!
  const box = (await sheet(page).boundingBox())!
  expect(box.y).toBeGreaterThanOrEqual(bar.y + bar.height)
  expect(Math.round(box.width)).toBe(440)
  expect(Math.round(box.x + box.width)).toBe(820 - 12)
  expect(Math.round(box.y + box.height)).toBe(1180 - 12)
  const scrim = (await page.getByTestId('fb-sheet-scrim').boundingBox())!
  expect(scrim.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1)
  expect(scrim.y).toBeLessThanOrEqual(bar.y + bar.height + 1)
  // The top bar itself is not covered: its middle still belongs to it.
  const owner = await page.evaluate(
    ([x, y]) =>
      !!document.elementFromPoint(x, y)?.closest('header[data-shell-top]'),
    [bar.x + bar.width / 2, bar.y + bar.height / 2],
  )
  expect(owner).toBe(true)
})

test('P1.9 panel 2: on a phone the sheet starts below the top bar, full width', async ({
  page,
}) => {
  await openSheet(page, 'professional', { width: 390, height: 844 })
  const bar = (await topBar(page).boundingBox())!
  const box = (await sheet(page).boundingBox())!
  expect(box.y).toBeGreaterThanOrEqual(bar.y + bar.height)
  expect(Math.round(box.width)).toBe(390)
})

test('P1.9 panel 2: ✕, a tap on the page and Esc all close the sheet; the tap does nothing else', async ({
  page,
}) => {
  await openSheet(page, 'professional')
  await sheet(page).getByTestId('fb-sheet-close').click()
  await expect(sheet(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'More options' }).click()
  await expect(sheet(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(sheet(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'More options' }).click()
  await expect(sheet(page)).toBeVisible()
  const scroller = (await page.locator('[data-page-scroller]').boundingBox())!
  await page.mouse.click(scroller.x + 30, scroller.y + scroller.height - 40)
  await expect(sheet(page)).toHaveCount(0)
  await expect(page.locator('.bn-editor:focus')).toHaveCount(0)
})

// ---- Panel 3: a few main actions, the rest folded ----

const fold = (page: Page, name: string) =>
  sheet(page).getByRole('button', { name: new RegExp(`^${name}`) })

test('P1.9 panel 3: Professional shows four tiles and groups folded, each with a grey line; Protect has switches', async ({
  page,
}) => {
  await openSheet(page, 'professional')
  const tiles = await sheet(page)
    .locator('[data-testid^="ps-tile-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))
  expect(tiles).toEqual([
    'ps-tile-export',
    'ps-tile-lock',
    'ps-tile-history',
    'ps-tile-search',
  ])
  for (const name of ['Page', 'View', 'Share', 'Protect', 'Tools'])
    await expect(fold(page, name)).toHaveAttribute('aria-expanded', 'false')
  await expect(fold(page, 'Share')).toContainText('Copy')
  await expect(fold(page, 'Protect')).toContainText('Lock editing')
  await expect(sheet(page).getByTestId('ps-row-rename')).toHaveCount(0)
  await fold(page, 'Protect').click()
  const lock = sheet(page).getByRole('switch', { name: 'Lock editing' })
  await expect(lock).toHaveAttribute('aria-checked', 'false')
  await expect(
    sheet(page).getByRole('switch', { name: 'Pause reviews' }),
  ).toBeVisible()
  await lock.click()
  await expect(lock).toHaveAttribute('aria-checked', 'true') // visible feedback, sheet stays
  await lock.click()
  await expect(lock).toHaveAttribute('aria-checked', 'false')
  // Folded again at every opening.
  await sheet(page).getByTestId('fb-sheet-close').click()
  await expect(sheet(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'More options' }).click()
  await expect(fold(page, 'Protect')).toHaveAttribute('aria-expanded', 'false')
})

test('P1.9 panel 3: nothing is dropped - every group still holds its rows', async ({
  page,
}) => {
  await openSheet(page, 'professional')
  await fold(page, 'Page').click()
  for (const id of ['rename', 'move', 'duplicate', 'delete'])
    await expect(sheet(page).getByTestId(`ps-row-${id}`)).toBeVisible()
  await fold(page, 'Share').click()
  await expect(sheet(page).getByTestId('ps-row-pastePlain')).toBeVisible()
  await fold(page, 'Tools').click()
  await expect(sheet(page).getByTestId('ps-row-review')).toBeVisible()
})

test('P1.9 panel 3: Beginner shows three tiles and the other plain rows in one folded group', async ({
  page,
}) => {
  await openSheet(page, 'beginner')
  await expect(sheet(page).locator('[data-testid^="ps-tile-"]')).toHaveCount(3)
  await expect(fold(page, 'Page')).toHaveAttribute('aria-expanded', 'false')
  await fold(page, 'Page').click()
  const ids = await sheet(page)
    .locator('[data-testid^="ps-row-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))
  expect(ids).toEqual([
    'ps-row-rename',
    'ps-row-move',
    'ps-row-duplicate',
    'ps-row-delete',
    'ps-row-reading',
  ])
})

// ---- Panel 4: Pin an action, ✕ left and ✓ right ----

test('P1.9 panel 4: ✕ at the top left, ✓ at the top right; nothing changes until ✓', async ({
  page,
}) => {
  await openSheet(page, 'professional')
  await sheet(page).getByTestId('ps-pin-add').click()
  const box = (await sheet(page).boundingBox())!
  const x = (await sheet(page).getByTestId('fb-sheet-close').boundingBox())!
  const ok = (await sheet(page).getByTestId('fb-sheet-ok').boundingBox())!
  expect(x.x + x.width / 2).toBeLessThan(box.x + box.width / 3)
  expect(ok.x + ok.width / 2).toBeGreaterThan(box.x + (box.width * 2) / 3)
  expect(Math.abs(x.y - ok.y)).toBeLessThan(2)
  await expect(sheet(page).getByTestId('ps-pin-count')).toHaveText(
    '4 of 5 pinned to your bar',
  )
  await sheet(page).getByTestId('ps-pin-rename').click()
  await expect(sheet(page).getByTestId('ps-pin-count')).toHaveText(
    '5 of 5 pinned to your bar',
  )
  // ✕ leaves without changes.
  await sheet(page).getByTestId('fb-sheet-close').click()
  await expect(sheet(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'More options' }).click()
  await expect(sheet(page).locator('[data-testid^="ps-tile-"]')).toHaveCount(4)
  // Esc also keeps the bar as it was.
  await sheet(page).getByTestId('ps-pin-add').click()
  await sheet(page).getByTestId('ps-pin-rename').click()
  await page.keyboard.press('Escape')
  await expect(sheet(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'More options' }).click()
  await expect(sheet(page).locator('[data-testid^="ps-tile-"]')).toHaveCount(4)
  // ✓ keeps it.
  await sheet(page).getByTestId('ps-pin-add').click()
  await sheet(page).getByTestId('ps-pin-rename').click()
  await sheet(page).getByTestId('fb-sheet-ok').click()
  await expect(sheet(page).getByTestId('ps-tile-rename')).toBeVisible()
  await expect(sheet(page).locator('[data-testid^="ps-tile-"]')).toHaveCount(5)
})

// ---- Panel 1: the side list has its own bar and moves the page aside ----

const side = (page: Page) => page.locator('#sidebar')

test('P1.9 panel 1: on an upright iPad the side list docks beside the rail with its own bar; the page narrows and the top bar is never covered', async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await page.goto(ON)
  await createNotebook(page, 'Biology', 'Cells')
  // The test steps leave the list open on the way: start with it closed.
  if (await side(page).isVisible())
    await side(page).getByTestId('sb-head-close').click()
  await expect(side(page)).toBeHidden()
  const main = page.locator('.sh-main')
  const before = (await main.boundingBox())!
  await topBar(page).getByRole('button', { name: 'Open menu' }).click()
  await expect(side(page)).toBeVisible()
  await expect(page.getByTestId('shell-scrim')).toHaveCount(0)
  const list = (await side(page).boundingBox())!
  const rail = (await page.locator('.sh-rail').boundingBox())!
  expect(list.x).toBeGreaterThanOrEqual(rail.x + rail.width)
  await expect
    .poll(async () => Math.round((await main.boundingBox())!.width))
    .toBeLessThan(before.width - 200)
  const bar = (await topBar(page).boundingBox())!
  expect(bar.x).toBeGreaterThanOrEqual(list.x + list.width)
  // Its own bar: title and a close button; only the list below it scrolls.
  const head = side(page).getByTestId('sb-head')
  await expect(head).toContainText('Notebooks')
  const overflow = await head.evaluate(
    (el) => getComputedStyle(el.parentElement!).overflowY,
  )
  expect(overflow).toBe('hidden')
  const headBox = (await head.boundingBox())!
  expect(Math.abs(headBox.y - list.y)).toBeLessThan(2)
  await side(page).getByTestId('sb-head-close').click()
  await expect(side(page)).toBeHidden()
  await topBar(page).getByRole('button', { name: 'Open menu' }).click()
  await expect(side(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(side(page)).toBeHidden()
})

test('P1.9 panel 1: sideways the list is docked with the same bar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 1024 })
  await page.goto(ON)
  await createNotebook(page, 'Biology', 'Cells')
  await expect(side(page)).toBeVisible()
  await expect(side(page).getByTestId('sb-head')).toContainText('Notebooks')
  await expect(side(page).getByTestId('sb-head-close')).toBeVisible()
})

test('P1.9 panel 1: on a phone the list is a drawer with the same bar and closes with its ✕', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(ON)
  await topBar(page).getByRole('button', { name: 'Open menu' }).click()
  await expect(side(page)).toBeVisible()
  await expect(side(page).getByTestId('sb-head')).toContainText('Notebooks')
  await side(page).getByTestId('sb-head-close').click()
  await expect(side(page)).toBeHidden()
})

// ---- Panel 6: Computer, Touch and Pencil keep one bar height ----

test('P1.9 panel 6: the tool bar is 64 px tall in Computer, Touch and Pencil mode and nothing below it moves', async ({
  page,
}) => {
  const seen: { pill: number; page: number }[] = []
  for (const mode of ['computer', 'touch', 'pencil'] as const) {
    const p = await page.context().newPage()
    await p.setViewportSize({ width: 1180, height: 820 })
    await startInMode(p, mode)
    await p.goto('/?flags=foundation.shell')
    await createNotebook(p, 'Biology', 'Cells')
    await expect(p.locator('[data-pill="short"]')).toBeVisible()
    seen.push(
      await p.evaluate(() => ({
        pill: Math.round(
          document.querySelector('[data-pill="short"]')!.getBoundingClientRect()
            .height,
        ),
        page: Math.round(
          document
            .querySelector('[data-page-scroller]')!
            .getBoundingClientRect().top,
        ),
      })),
    )
    await p.close()
  }
  expect(seen.map((s) => s.pill)).toEqual([64, 64, 64])
  expect(new Set(seen.map((s) => s.page)).size).toBe(1)
})
