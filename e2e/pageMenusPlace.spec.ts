// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * Slice 12 rest, final-look fixes (flag page.menus): the strip arrow points
 * at the pressed spot, the strip stays inside the page area, the Paste card
 * opens below the strip, and the paste chooser has a close button, a shared
 * switch and "1 heading" / "2 headings". docs/features/page-menus.md.
 */

async function open(
  page: Page,
  size: { width: number; height: number },
  level = 'professional',
) {
  await page.setViewportSize(size)
  await page.addInitScript((l) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: l, unlocked: [] }),
    )
    localStorage.setItem('learning-notes:general.pasteMode', '"ask"')
  }, level)
  await page.goto('/?flags=page.menus')
  await createNotebook(page, 'Biology', 'First')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('Cells divide by mitosis')
}

/** Right-click on the first line, `dx` px from its left edge. */
async function rightClick(page: Page, dx: number) {
  const box = (await page.locator('.bn-editor p').first().boundingBox())!
  const x = box.x + dx
  await page.mouse.click(x, box.y + box.height / 2, { button: 'right' })
  await expect(page.getByTestId('page-strip')).toBeVisible()
  return x
}

const paste = (page: Page, html: string, text: string) =>
  page.evaluate(
    ([h, t]) => {
      const data = new DataTransfer()
      data.setData('text/html', h)
      data.setData('text/plain', t)
      document.querySelector('.bn-editor')!.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      )
    },
    [html, text] as const,
  )

test('the strip arrow points at the pressed spot', async ({ page }) => {
  await open(page, { width: 1440, height: 900 })
  const x = await rightClick(page, 90)
  const arrow = (await page.locator('.cs__arrow').boundingBox())!
  expect(Math.abs(arrow.x + arrow.width / 2 - x)).toBeLessThanOrEqual(8)
})

test('the strip stays inside the page area, not over the rail or sidebar', async ({
  page,
}) => {
  await open(page, { width: 1440, height: 900 })
  await rightClick(page, 5)
  const strip = (await page.getByTestId('page-strip').boundingBox())!
  const area = (await page.locator('[data-page-scroller]').boundingBox())!
  expect(strip.x).toBeGreaterThanOrEqual(area.x)
})

test('the Paste card opens below the strip with the left edges aligned', async ({
  page,
}) => {
  await open(page, { width: 1180, height: 820 })
  await rightClick(page, 60)
  await page.getByTestId('cs-paste').click()
  const gap = async () => {
    const card = (await page.getByTestId('cs-picker').boundingBox())!
    const bar = (await page.locator('.cs__bar').boundingBox())!
    return { below: card.y - (bar.y + bar.height), left: card.x - bar.x }
  }
  // After the open motion settles: under the strip, same left edge.
  await expect.poll(async () => (await gap()).below).toBeGreaterThanOrEqual(0)
  await expect
    .poll(async () => Math.abs((await gap()).left), { timeout: 3000 })
    .toBeLessThanOrEqual(1)
})

test('on a phone the Paste card ends 12 px above the tab bar, last row on screen', async ({
  page,
}) => {
  await open(page, { width: 390, height: 844 })
  await rightClick(page, 60)
  await page.getByTestId('cs-paste').click()
  const card = page.getByTestId('cs-picker')
  await expect(card).toBeVisible()
  const bar = (await page
    .locator('[data-space]')
    .first()
    .locator('xpath=ancestor::nav')
    .boundingBox())!
  // After the open motion settles.
  await expect
    .poll(async () => {
      const b = (await card.boundingBox())!
      return b.y + b.height
    })
    .toBeLessThanOrEqual(bar.y - 12)
  const last = (await card
    .getByRole('menuitem', { name: 'Link / Embed' })
    .boundingBox())!
  expect(last.y).toBeGreaterThanOrEqual(0)
  expect(last.y + last.height).toBeLessThanOrEqual(bar.y - 12)
})

test('the paste chooser has a close button that cancels, and a shared switch', async ({
  page,
}) => {
  await open(page, { width: 1024, height: 900 })
  await paste(page, '<h2>Heading</h2><p>words</p>', 'Heading\nwords')
  const dialog = page.getByRole('dialog', { name: 'Paste as' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('switch')).toHaveCount(1)
  await expect(dialog.locator('input[type=checkbox]')).toHaveCount(0)
  await dialog.getByTestId('paste-chooser-close').click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.bn-editor')).not.toContainText('Heading')
})

test('the chooser says "1 heading" for one and "2 headings" for two', async ({
  page,
}) => {
  await open(page, { width: 1024, height: 900 })
  await paste(page, '<h2>One</h2><p>words</p>', 'One\nwords')
  const dialog = page.getByRole('dialog', { name: 'Paste as' })
  await expect(dialog.getByText('1 heading', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await paste(page, '<h2>One</h2><h2>Two</h2>', 'One\nTwo')
  await expect(dialog.getByText('2 headings', { exact: true })).toBeVisible()
})

test('on a phone the chooser ends above the tab bar', async ({ page }) => {
  await open(page, { width: 390, height: 844 })
  await paste(page, '<h2>One</h2><p>words</p>', 'One\nwords')
  const card = (await page
    .getByRole('dialog', { name: 'Paste as' })
    .boundingBox())!
  const bar = (await page
    .locator('[data-space]')
    .first()
    .locator('xpath=ancestor::nav')
    .boundingBox())!
  expect(card.y + card.height).toBeLessThanOrEqual(bar.y)
})

test.describe('iPad portrait', () => {
  test.use({ hasTouch: true })
  for (const level of ['beginner', 'professional'] as const) {
    test(`iPad portrait ${level}: the strip stays inside the page area when it fits`, async ({
      page,
    }) => {
      await open(page, { width: 820, height: 1180 }, level)
      // The sidebar is closed on iPad portrait.
      const hide = page.getByRole('button', { name: 'Hide menu' })
      if (await hide.isVisible()) {
        await hide.click()
        await page.waitForTimeout(400)
      }
      await page.locator('.bn-editor').click()
      await rightClick(page, 5)
      const strip = (await page.locator('.cs__bar').boundingBox())!
      const area = (await page.locator('[data-page-scroller]').boundingBox())!
      // Beginner (about 460 px) fits the page area: inside it. A strip wider
      // than the area (Professional) may use the screen instead.
      if (level === 'beginner') expect(strip.x).toBeGreaterThanOrEqual(area.x)
      else expect(strip.x).toBeGreaterThanOrEqual(12)
    })
  }
})
