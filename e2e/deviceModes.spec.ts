// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  pageSubAction,
  selectText,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Device modes: Computer keeps the floating toolbar; Touch docks a bar under
 * the top bar; Pencil docks it at the bottom. A tablet-sized touch screen
 * picks Touch by itself.
 */

const bar = (page: Page) => dockedBar(page).getByRole('toolbar')
const tray = (page: Page) => page.locator('[data-bar="tray"]')

async function openPage(page: Page, mode?: 'computer' | 'touch' | 'pencil') {
  if (mode) await startInMode(page, mode)
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'S1 is the first heart sound')
}

test.describe('Touch (a tablet-sized touch screen)', () => {
  test.use({
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
    isMobile: true,
  })

  test('picks Touch by itself and docks the bar under the top bar', async ({
    page,
  }) => {
    await openPage(page)
    await expect(dockedBar(page)).toBeVisible()
    await expect(dockedBar(page)).toHaveAttribute('data-placement', 'top')
    for (const name of [
      'Text',
      'Pen',
      'Highlighter',
      'Eraser',
      'New line',
      'Lasso',
      'Insert',
      'Read',
    ]) {
      await expect(
        dockedBar(page).getByRole('button', { name, exact: true }),
      ).toBeVisible()
    }
    // No floating toolbar, even with text selected.
    await selectText(page, 'first')
    await expect(page.locator('.bn-formatting-toolbar')).toHaveCount(0)
    // Below the top bar, not over the text.
    const box = (await dockedBar(page).boundingBox())!
    const editor = (await page.locator('.bn-editor').boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(editor.y + 1)
    // Buttons are big enough for a finger.
    for (const b of await bar(page).getByRole('button').all()) {
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(43.5)
    }
  })

  test('New line and tapping below add a paragraph', async ({ page }) => {
    // New line is not on the bar from the start: put it there first.
    await page.addInitScript(() =>
      localStorage.setItem(
        'learning-notes:formatBar.pinned',
        JSON.stringify(['bold', 'newLine']),
      ),
    )
    await openPage(page)
    const lines = page.locator(
      '.bn-block-content[data-content-type="paragraph"]',
    )
    await expect(lines).toHaveCount(1)
    await dockedBar(page).getByRole('button', { name: 'New line' }).click()
    await expect(lines).toHaveCount(2)
    await page.keyboard.type('second')
    await expect(lines.nth(1)).toHaveText('second')

    // Tap below: a new empty last line, and not a second one.
    const below = page.getByRole('button', { name: 'Tap here to keep writing' })
    await below.click()
    await expect(lines).toHaveCount(3)
    await below.click()
    await expect(lines).toHaveCount(3)
    await page.keyboard.type('third')
    await expect(lines.nth(2)).toHaveText('third')
  })

  test('switching mode from the page menu', async ({ page }) => {
    await openPage(page)
    await pageSubAction(page, 'Device mode', 'Pencil')
    // Pencil is docked on top too (always visible), but the position can change.
    await expect(dockedBar(page)).toHaveAttribute('data-placement', 'top')
    await dockedBar(page).getByRole('button', { name: 'Toolbar menu' }).click()
    await tray(page)
      .getByRole('button', { name: /^Bar settings/ })
      .click()
    await tray(page).getByLabel('Position').selectOption('bottom')
    await tray(page).getByRole('button', { name: 'Done' }).click()
    await expect(dockedBar(page)).toHaveAttribute('data-placement', 'bottom')
    // Fixed to the bottom of the screen, and the text is not covered.
    const box = (await dockedBar(page).boundingBox())!
    const height = page.viewportSize()!.height
    expect(Math.abs(box.y + box.height - height)).toBeLessThanOrEqual(1)
    const last = (await page.locator('.bn-editor').boundingBox())!
    expect(last.y + last.height).toBeLessThan(box.y)
    expect(
      (await bar(page)
        .getByRole('button', { name: 'Text', exact: true })
        .boundingBox())!.height,
    ).toBeGreaterThanOrEqual(53.5)
    await pageSubAction(page, 'Device mode', 'Computer')
    await expect(dockedBar(page)).toBeVisible()
    await selectText(page, 'first')
    await expect(page.locator('.bn-formatting-toolbar')).toBeVisible()
    await page.reload()
    await expect(page.locator('.bn-editor')).toBeVisible()
    await selectText(page, 'first')
    await expect(page.locator('.bn-formatting-toolbar')).toBeVisible()
  })

  test('Settings has the device mode and the Advanced bar options', async ({
    page,
  }) => {
    await page.goto('/#/settings')
    await page.getByRole('button', { name: /^Advanced/ }).click()
    await expect(
      page.getByRole('heading', { name: 'Device mode' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Pencil', exact: true }).click()
    await expect(
      page
        .locator('[data-setting-id="advanced.barPlacement"]')
        .getByRole('button', { name: 'Top', pressed: true }),
    ).toBeVisible()
    await page
      .locator('[data-setting-id="advanced.barSize"]')
      .getByRole('button', { name: 'Compact' })
      .click()
    await expect(
      page
        .locator('[data-setting-id="general.deviceMode"]')
        .getByRole('button', { name: 'Pencil', pressed: true }),
    ).toBeVisible()
  })
})

test.describe('Computer', () => {
  test('has the short bar and keeps the selection toolbar', async ({
    page,
  }) => {
    await openPage(page)
    await expect(dockedBar(page)).toBeVisible()
    await selectText(page, 'first')
    await expect(page.locator('.bn-formatting-toolbar')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Tap here to keep writing' }),
    ).toHaveCount(0)
  })

  test('the page menu switches to Touch mode', async ({ page }) => {
    await openPage(page)
    await pageSubAction(page, 'Device mode', 'Touch')
    await expect(dockedBar(page)).toBeVisible()
    await expect(dockedBar(page)).toHaveAttribute('data-placement', 'top')
  })
})

test.describe('screenshots', () => {
  for (const [theme, width, height, mode] of [
    ['Day', 820, 1180, 'touch'],
    ['Night', 820, 1180, 'touch'],
    ['Sepia', 820, 1180, 'touch'],
    ['Day', 390, 844, 'touch'],
    ['Night', 820, 1180, 'pencil'],
  ] as const) {
    test(`${mode} bar ${theme} ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await openPage(page, mode)
      await page.locator('[data-setting-id]').count()
      await page.evaluate((th) => {
        localStorage.setItem(
          'learning-notes:theme',
          JSON.stringify(th.toLowerCase()),
        )
      }, theme)
      await page.reload()
      await expect(page.locator('.bn-editor')).toBeVisible()
      await dockedBar(page)
        .getByRole('button', { name: 'Text', exact: true })
        .click()
      await page.waitForTimeout(300)
      await page.screenshot({
        path: `test-results/screens/bar-${mode}-${theme}-${width}x${height}.png`,
      })
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})
