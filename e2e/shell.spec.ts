import { expect, test, type Page } from '@playwright/test'
import { createNotebook, typeInEditor } from './helpers.ts'

/**
 * Slice 0h: the new app frame (flag foundation.shell). One test per line of
 * docs/features/shared-parts.md SH-01 to SH-05, SH-07, SH-08. The flag is
 * forced ON for the run with `?flags=foundation.shell`.
 */
const ON = '/?flags=foundation.shell'

const spaces = (page: Page) => page.getByRole('navigation', { name: 'Spaces' })
const side = (page: Page) => page.locator('#sidebar')
const top = (page: Page) => page.locator('header[data-shell-top]')

async function start(page: Page, size?: { width: number; height: number }) {
  if (size) await page.setViewportSize(size)
  await page.goto(ON)
  await expect(page.locator('.sh-frame')).toBeVisible()
}

async function withPage(page: Page, size?: { width: number; height: number }) {
  await start(page, size)
  await createNotebook(page, 'Biology', 'Cells')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

test('SH-01 flag off keeps today’s frame; on draws the new one that never scrolls', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('#sidebar')).toBeVisible()
  await expect(page.locator('.sh-frame')).toHaveCount(0)
  await page.goto(ON)
  await expect(page.locator('.sh-frame')).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('SH-01 the skip link is first and moves focus to the page area', async ({
  page,
}) => {
  await start(page)
  await page.keyboard.press('Tab')
  const skip = page.getByRole('button', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  await skip.press('Enter')
  await expect(page.locator('[data-page-scroller]')).toBeFocused()
})

test('SH-02 the rail has the four spaces in order, 44 pt buttons, and switches space', async ({
  page,
}) => {
  await start(page)
  const nav = spaces(page)
  await expect(nav.locator('[data-space]')).toHaveText(['', '', '', ''])
  const order = await nav
    .locator('[data-space]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-space')))
  expect(order).toEqual(['home', 'library', 'notebooks', 'review'])
  await expect(nav.locator('[data-space="notebooks"]')).toHaveAttribute(
    'aria-current',
    'page',
  )
  for (const b of await nav.getByRole('button').all()) {
    const box = await b.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
  }
  await nav.locator('[data-space="library"]').click()
  await expect(nav.locator('[data-space="library"]')).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('SH-02 Day/Night flips in one tap; the gear menu has Settings and the three themes', async ({
  page,
}) => {
  await start(page)
  const html = page.locator('html')
  const before = await html.getAttribute('data-theme')
  await page.getByTestId('shell-daynight').click()
  await expect(html).not.toHaveAttribute('data-theme', before ?? '')
  await page.getByTestId('corner-button').click()
  const menu = page.getByTestId('corner-panel')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('button', { name: 'Settings' })).toBeVisible()
  for (const theme of ['Day', 'Night', 'Sepia']) {
    await expect(menu.getByRole('button', { name: theme })).toBeVisible()
  }
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
})

test('SH-03 on a phone the rail becomes a bottom tab bar with More', async ({
  page,
}) => {
  await start(page, { width: 390, height: 844 })
  const bar = page.locator('nav[data-shell-tabbar]')
  await expect(bar).toBeVisible()
  await expect(page.locator('nav[data-shell-rail]')).toHaveCount(0)
  const box = await bar.boundingBox()
  expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(844)
  expect(box?.width).toBe(390)
  await expect(bar.locator('.sh-tab')).toHaveCount(5)
  await bar.getByRole('button', { name: 'Quiet corner' }).click()
  await expect(page.getByTestId('corner-panel')).toBeVisible()
})

test('SH-04 the top bar has Back, Forward, Undo, Redo and Search; Search opens the popup', async ({
  page,
}) => {
  await start(page)
  const bar = top(page)
  for (const name of ['Back', 'Forward', 'Undo', 'Redo', 'Search']) {
    await expect(bar.getByRole('button', { name })).toBeVisible()
  }
  const box = await bar.boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(52)
  await bar.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible()
})

test('SH-04 the breadcrumbs start with the space as a button', async ({
  page,
}) => {
  await withPage(page)
  const crumbs = page.getByRole('navigation', { name: 'You are here' })
  const space = crumbs.getByRole('button', { name: 'Notebooks' })
  await expect(space).toBeVisible()
  await space.click()
  await expect(
    spaces(page).locator('[data-space="notebooks"]'),
  ).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('panel-toggle')).toHaveCount(0)
})

test('SH-05 Undo and Redo work on the open page, with the same history as today', async ({
  page,
}) => {
  await withPage(page)
  const undo = top(page).getByRole('button', { name: 'Undo' })
  await expect(undo).toBeEnabled()
  await undo.click()
  await expect(page.locator('.bn-editor')).not.toContainText(
    'The nucleus holds the DNA',
  )
  const redo = top(page).getByRole('button', { name: 'Redo' })
  await expect(redo).toBeEnabled()
  await redo.click()
  await expect(page.locator('.bn-editor')).toContainText(
    'The nucleus holds the DNA',
  )
})

test('SH-07 the sidebar is docked at 288 px and hides and shows with its toggle', async ({
  page,
}) => {
  await start(page)
  await expect(side(page)).toBeVisible()
  const box = await side(page).boundingBox()
  expect(Math.round(box?.width ?? 0)).toBe(288)
  await top(page).getByRole('button', { name: 'Hide menu' }).click()
  await expect(side(page)).toBeHidden()
  await top(page).getByRole('button', { name: 'Show menu' }).click()
  await expect(side(page)).toBeVisible()
})

test('SH-07 a phone has the sidebar as a drawer with a scrim, closed by Esc', async ({
  page,
}) => {
  await start(page, { width: 390, height: 844 })
  await expect(side(page)).toBeHidden()
  await top(page).getByRole('button', { name: 'Open menu' }).click()
  await expect(side(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(side(page)).toBeHidden()
})

test('SH-08 the pages panel docks beside the page at 288 px', async ({
  page,
}) => {
  await withPage(page)
  await top(page).getByTestId('panel-toggle').click()
  const panel = page.getByTestId('left-panel')
  await expect(panel).toBeVisible()
  const box = await panel.boundingBox()
  expect(Math.round(box?.width ?? 0)).toBe(286) // 288 less its 1 px card border on each side
})

test('SH-07/08 at 1024 the open panel takes the place of the sidebar, which opens over the page', async ({
  page,
}) => {
  await withPage(page, { width: 1024, height: 768 })
  await top(page).getByTestId('panel-toggle').click()
  await expect(page.getByTestId('left-panel')).toBeVisible()
  await expect(side(page)).toBeHidden()
  await top(page).getByRole('button', { name: 'Show menu' }).click()
  await expect(side(page)).toBeVisible()
  await expect(page.getByTestId('shell-scrim')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(side(page)).toBeHidden()
})

test('SH-08 on a phone the panel is an overlay and the top bar stays reachable', async ({
  page,
}) => {
  await withPage(page, { width: 390, height: 844 })
  await top(page).getByTestId('panel-toggle').click()
  const panel = page.getByTestId('left-panel')
  await expect(panel).toBeVisible()
  const bar = await top(page).boundingBox()
  const box = await panel.boundingBox()
  expect(box?.y ?? 0).toBeGreaterThanOrEqual(
    (bar?.y ?? 0) + (bar?.height ?? 0) - 1,
  )
  await expect(top(page).getByTestId('panel-toggle')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
})

test('works offline once loaded', async ({ page, context }) => {
  await start(page)
  await context.setOffline(true)
  const html = page.locator('html')
  const before = await html.getAttribute('data-theme')
  await page.getByTestId('shell-daynight').click()
  await expect(html).not.toHaveAttribute('data-theme', before ?? '')
  await top(page).getByRole('button', { name: 'Hide menu' }).click()
  await expect(side(page)).toBeHidden()
  await context.setOffline(false)
})

test('SH-06 the view toggle switches Beginner and Professional and is remembered', async ({
  page,
}) => {
  await start(page)
  const toggle = top(page).getByTestId('view-toggle')
  const frame = page.locator('.sh-frame')
  await expect(frame).toHaveAttribute('data-mode', 'pro')
  await toggle.getByRole('button', { name: 'Beginner' }).click()
  await expect(frame).toHaveAttribute('data-mode', 'beg')
  await expect(
    toggle.getByRole('button', { name: 'Beginner' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(page.locator('.sh-frame')).toHaveAttribute('data-mode', 'beg')
})

test('SH-06 on a phone the toggle sits under the top bar', async ({ page }) => {
  await start(page, { width: 390, height: 844 })
  await expect(
    page.locator('.sh-viewrow').getByTestId('view-toggle'),
  ).toBeVisible()
  await expect(top(page).getByTestId('view-toggle')).toBeHidden()
})

test('SH-05 tooltips name the keys; the setting hides the pair on a computer only', async ({
  page,
}) => {
  await start(page)
  await expect(top(page).getByRole('button', { name: 'Undo' })).toHaveAttribute(
    'title',
    /^Undo \((Ctrl|Cmd) Z\)$/,
  )
  await expect(top(page).getByRole('button', { name: 'Redo' })).toHaveAttribute(
    'title',
    /^Redo \((Ctrl Y|Cmd Shift Z)\)$/,
  )
  await page.evaluate(() =>
    localStorage.setItem('learning-notes:general.showUndoRedo', '"off"'),
  )
  await page.reload()
  await expect(page.locator('.sh-frame')).toBeVisible()
  await expect(top(page).getByTestId('history-undo')).toHaveCount(0)
  // Another device mode always shows the pair.
  await page.evaluate(() =>
    localStorage.setItem('learning-notes:general.deviceMode', '"touch"'),
  )
  await page.reload()
  await expect(top(page).getByTestId('history-undo')).toBeVisible()
})

test('SH-05 the editor toolbar drops its own Undo / Redo pair; flag off keeps it', async ({
  page,
}) => {
  await withPage(page)
  await expect(page.locator('[data-main-bar]')).toBeVisible()
  await expect(
    page.locator('[data-main-bar] [data-slot="history"]'),
  ).toHaveCount(0)
  await expect(top(page).getByTestId('history-undo')).toBeVisible()
})

test('SH-05 flag off: the editor toolbar keeps its Undo / Redo pair', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await expect(
    page.locator('[data-main-bar] [data-slot="history"]'),
  ).toHaveCount(1)
})

test('SH-04 the top bar says Saved while a page is open, and nothing otherwise', async ({
  page,
}) => {
  await start(page)
  await expect(top(page).locator('.sh-status')).toHaveCount(0)
  await createNotebook(page, 'Biology', 'Cells')
  await expect(top(page).locator('.sh-status')).toHaveText('Saved')
})

const mainWidth = async (page: Page) =>
  Math.round((await page.locator('.sh-main').boundingBox())?.width ?? 0)

test('SH-08 iPad landscape 1180: the panel opens over the page and the page keeps its writing width', async ({
  page,
}) => {
  await withPage(page, { width: 1180, height: 820 })
  expect(await mainWidth(page)).toBeGreaterThanOrEqual(600)
  const before = await mainWidth(page)
  await top(page).getByTestId('panel-toggle').click()
  const panel = page.getByTestId('left-panel')
  await expect(panel).toBeVisible()
  await expect(side(page)).toBeVisible()
  // Over the page: the page does not shrink, and the panel starts after the sidebar.
  expect(await mainWidth(page)).toBe(before)
  const sideBox = await side(page).boundingBox()
  const box = await panel.boundingBox()
  expect(box?.x ?? 0).toBeGreaterThanOrEqual(
    (sideBox?.x ?? 0) + (sideBox?.width ?? 0),
  )
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await top(page).getByTestId('panel-toggle').click()
  await expect(panel).toBeVisible()
  await page
    .locator('[data-page-scroller]')
    .click({ position: { x: 700, y: 300 } })
  await expect(panel).toBeHidden()
})

test('SH-08 iPad portrait 820: the sidebar sits on the rail and the panel opens over the page', async ({
  page,
}) => {
  await withPage(page)
  await page.setViewportSize({ width: 820, height: 1180 })
  await expect(side(page)).toBeHidden()
  expect(await mainWidth(page)).toBeGreaterThanOrEqual(600)
  const before = await mainWidth(page)
  await top(page).getByTestId('panel-toggle').click()
  await expect(page.getByTestId('left-panel')).toBeVisible()
  expect(await mainWidth(page)).toBe(before)
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('left-panel')).toBeHidden()
  await top(page).getByRole('button', { name: 'Show menu' }).click()
  await expect(side(page)).toBeVisible()
  await expect(page.getByTestId('shell-scrim')).toBeVisible()
})

test('SH-08 1366 wide still docks both and the page keeps 600 or more', async ({
  page,
}) => {
  await withPage(page, { width: 1366, height: 800 })
  await top(page).getByTestId('panel-toggle').click()
  await expect(page.getByTestId('left-panel')).toBeVisible()
  await expect(side(page)).toBeVisible()
  expect(await mainWidth(page)).toBeGreaterThanOrEqual(600)
})
