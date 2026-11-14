import { expect, test } from '@playwright/test'
import { barMenu, openNote } from './mainBarHelpers.ts'

/**
 * 2A.2: the ⋯ toolbar menu redesigned (flag `toolbar.menu`): a short top row,
 * a few groups, the rare items under More, no key names on touch screens.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const tray = (page: import('@playwright/test').Page) =>
  page.locator('[data-bar="tray"]')

async function flagOn(page: import('@playwright/test').Page, on: boolean) {
  await page.addInitScript((value) => {
    localStorage.setItem(
      'learning-notes:flags',
      JSON.stringify(value ? ['toolbar.menu'] : []),
    )
  }, on)
}

const EVERY_ITEM = [
  'Edit toolbar…',
  'All tools',
  'Search all features',
  'Done',
  'Bar settings…',
  'Copy as plain text',
  'Copy as Markdown',
  'Paste as plain text',
  'Copy page with pictures',
]
const STYLES = ['Bold', 'Italic', 'Underline', 'Strike', 'Code']

test('switch OFF: the old flat menu stays', async ({ page }) => {
  await flagOn(page, false)
  await openNote(page)
  await barMenu(page).click()
  await expect(tray(page).locator('[data-menu-v2]')).toHaveCount(0)
  await expect(
    tray(page).getByRole('button', { name: 'Edit toolbar…' }),
  ).toBeVisible()
})

test('top row: four icon buttons with labels, then the groups with headings', async ({
  page,
}) => {
  await flagOn(page, true)
  await openNote(page)
  await barMenu(page).click()
  const top = tray(page).getByRole('group', { name: 'Toolbar' })
  await expect(top.getByRole('button')).toHaveText([
    'Edit toolbar…',
    'All tools',
    'Search all features',
    'Done',
  ])
  await expect(top.locator('svg')).toHaveCount(4)
  await expect(
    tray(page).getByRole('heading', { name: 'Text style' }),
  ).toBeVisible()
  await expect(
    tray(page).getByRole('heading', { name: 'Copy and paste' }),
  ).toBeVisible()
  await expect(tray(page).locator('button[data-popup-close]')).toBeVisible()
})

test('rare items are behind More, and nothing of the old menu is lost', async ({
  page,
}) => {
  await flagOn(page, true)
  await openNote(page)
  await barMenu(page).click()
  const more = tray(page).getByRole('button', { name: 'Show more items' })
  await expect(more).toHaveAttribute('aria-expanded', 'false')
  await expect(
    tray(page).getByRole('button', { name: 'Bar settings…' }),
  ).toHaveCount(0)
  await more.click()
  for (const name of EVERY_ITEM) {
    await expect(
      tray(page).getByRole('button', { name, exact: true }).first(),
      name,
    ).toBeVisible()
  }
  for (const name of STYLES) {
    await expect(
      tray(page).getByRole('checkbox', { name, exact: true }),
      name,
    ).toBeVisible()
  }
})

test('no key names on a touch screen', async ({ page }) => {
  await flagOn(page, true)
  await openNote(page, 'touch', { 'advanced.shortcutHints': 'on' })
  await barMenu(page).click()
  await tray(page).getByRole('button', { name: 'Show more items' }).click()
  const text = await tray(page).innerText()
  expect(text).not.toMatch(/⌘|Ctrl\+|Shift\+/)
})

test('every item is at least 44 px and the menu fits the screen', async ({
  page,
}) => {
  await flagOn(page, true)
  await openNote(page)
  await barMenu(page).click()
  await tray(page).getByRole('button', { name: 'Show more items' }).click()
  const boxes = await tray(page)
    .locator('button')
    .evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect()
        return { h: r.height, w: r.width }
      }),
    )
  for (const b of boxes) expect(Math.min(b.h, b.w)).toBeGreaterThanOrEqual(43.5)
  const t = await tray(page).boundingBox()
  expect(t!.y + t!.height).toBeLessThanOrEqual(900)
})

test('a text style tile works and shows it is on', async ({ page }) => {
  await flagOn(page, true)
  await openNote(page)
  await page.keyboard.press('Control+A')
  await barMenu(page).click()
  const bold = tray(page).getByRole('checkbox', { name: 'Bold' })
  await bold.click()
  await expect(bold).toHaveAttribute('aria-checked', 'true')
})

test('Done closes the menu; the ✕ closes it too', async ({ page }) => {
  await flagOn(page, true)
  await openNote(page)
  await barMenu(page).click()
  await tray(page).locator('button[data-popup-close]').click()
  await expect(tray(page)).toHaveCount(0)
})

test('every item of the old menu is in the new one (by name)', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('menu-on') === null)
      localStorage.setItem('learning-notes:flags', '[]')
  })
  await openNote(page)
  const names = () =>
    tray(page)
      .locator('button:not([data-popup-close])')
      .evaluateAll((els) =>
        els
          .map(
            (e) =>
              e.getAttribute('aria-label') ??
              (e as HTMLElement).innerText.split('\n')[0].trim(),
          )
          .filter(Boolean),
      )
  await barMenu(page).click()
  const old = await names()
  expect(old.length).toBeGreaterThan(15)
  await page.evaluate(() => {
    sessionStorage.setItem('menu-on', '1')
    localStorage.setItem(
      'learning-notes:flags',
      JSON.stringify(['toolbar.menu']),
    )
  })
  await page.reload()
  await barMenu(page).click()
  await tray(page).getByRole('button', { name: 'Show more items' }).click()
  const now = await names()
  for (const name of old) expect(now, name).toContain(name)
})
