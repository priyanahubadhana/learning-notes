// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  pageAction,
  selectText,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Device modes: Computer keeps the floating toolbar; Touch docks a bar under
 * the top bar; Pencil docks it at the bottom. A tablet-sized touch screen
 * picks Touch by itself.
 */

const OLD_ACTIONS = [
  'Bold',
  'Italic',
  'Underline',
  'Strike',
  'Code',
  'Align text left',
  'Align text center',
  'Align text right',
  'Colors',
  'Create link',
  'Key point',
  'Keyword',
  'Must know',
  'Formula',
  'Make blank',
  'Make card',
]

const bar = (page: Page) => dockedBar(page).getByRole('toolbar')
const tray = (page: Page) => page.locator('[data-bar="tray"]')

/** Names of the buttons on the bar, left to right. */
const barNames = (page: Page) =>
  bar(page)
    .locator('[data-bar-btn][data-action], [data-action]')
    .evaluateAll((els) =>
      els
        .map((el) => el.getAttribute('data-action'))
        .filter((a): a is string => !!a && a !== 'toolbarMenu'),
    )

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
      'Bold',
      'Italic',
      'Underline',
      'Key point',
      'Make card',
      'New line',
      'More',
      'Done',
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

  test('the bar buttons work on the selected words', async ({ page }) => {
    await openPage(page)
    await selectText(page, 'first')
    await dockedBar(page).getByRole('button', { name: 'Bold' }).click()
    await expect(page.locator('.bn-editor strong')).toHaveText('first')
    await selectText(page, 'heart')
    await dockedBar(page).getByRole('button', { name: 'Key point' }).click()
    await expect(page.locator('.bn-editor [data-mark]')).toContainText('heart')
  })

  test('More has every action of the old toolbar', async ({ page }) => {
    await openPage(page)
    await dockedBar(page).getByRole('button', { name: /^More/ }).click()
    const onBar = dockedBar(page).getByRole('toolbar')
    for (const name of OLD_ACTIONS) {
      const start = new RegExp('^' + name)
      const found = tray(page)
        .getByRole('button', { name: start })
        .or(onBar.getByRole('button', { name: start }))
        .or(tray(page).getByText(start))
      await expect(found.first(), name).toBeVisible()
    }
    await expect(
      tray(page).getByText('Nest block', { exact: true }),
    ).toBeVisible()
    // Esc closes it.
    await page.keyboard.press('Escape')
    await expect(tray(page)).toHaveCount(0)
  })

  test('Edit bar: pin, unpin, reorder and reset, kept after a reload', async ({
    page,
  }) => {
    await openPage(page)
    const more = dockedBar(page).getByRole('button', { name: /^More/ })
    const edit = async () => {
      await more.click()
      await tray(page)
        .getByRole('button', { name: /^Edit bar/ })
        .click()
    }
    const panel = () => tray(page).getByRole('group', { name: 'Edit bar' })

    await edit()
    await panel().getByRole('checkbox', { name: 'Italic' }).uncheck()
    await panel().getByRole('checkbox', { name: 'Strike' }).check()
    for (let i = 0; i < 4; i++) {
      await panel().getByRole('button', { name: 'Move Strike earlier' }).click()
    }
    await panel().getByRole('button', { name: 'Done' }).click()
    expect(await barNames(page)).toEqual([
      'bold',
      'strike',
      'underline',
      'mark:key',
      'card',
      'newLine',
    ])

    await page.reload()
    await expect(dockedBar(page)).toBeVisible()
    expect(await barNames(page)).toEqual([
      'bold',
      'strike',
      'underline',
      'mark:key',
      'card',
      'newLine',
    ])

    // Size, position and auto-hide are in the same panel.
    await edit()
    await panel().getByLabel('Size').selectOption('large')
    await expect
      .poll(
        async () =>
          (await bar(page)
            .getByRole('button', { name: 'Bold', exact: true })
            .boundingBox())!.height,
      )
      .toBeGreaterThanOrEqual(53.5)

    await panel().getByRole('button', { name: 'Reset' }).click()
    await panel().getByRole('button', { name: 'Done' }).click()
    expect(await barNames(page)).toEqual([
      'bold',
      'italic',
      'underline',
      'mark:key',
      'card',
      'newLine',
    ])
    await page.reload()
    await expect(dockedBar(page)).toBeVisible()
    expect(await barNames(page)).toEqual([
      'bold',
      'italic',
      'underline',
      'mark:key',
      'card',
      'newLine',
    ])
    expect(
      (await bar(page)
        .getByRole('button', { name: 'Bold', exact: true })
        .boundingBox())!.height,
    ).toBeLessThan(50)
  })

  test('Edit bar: a button can be dragged to a new place', async ({ page }) => {
    await openPage(page)
    await dockedBar(page).getByRole('button', { name: /^More/ }).click()
    await tray(page)
      .getByRole('button', { name: /^Edit bar/ })
      .click()
    const handle = tray(page).getByRole('button', {
      name: 'Drag Underline to reorder',
    })
    const target = tray(page).locator('[data-edit-row="bold"]')
    const from = (await handle.boundingBox())!
    const to = (await target.boundingBox())!
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(to.x + 20, to.y + to.height / 2, { steps: 8 })
    await page.mouse.up()
    await tray(page).getByRole('button', { name: 'Done' }).click()
    expect((await barNames(page)).slice(0, 3)).toEqual([
      'underline',
      'bold',
      'italic',
    ])
  })

  test('Done and a tap on empty page space clear the selection', async ({
    page,
  }) => {
    await openPage(page)
    const selected = () =>
      page.evaluate(() => (window.getSelection()?.toString() ?? '').length)
    await selectText(page, 'first')
    await expect.poll(selected).toBeGreaterThan(0)
    await dockedBar(page).getByRole('button', { name: 'Done' }).click()
    await expect.poll(selected).toBe(0)

    await selectText(page, 'heart')
    await expect.poll(selected).toBeGreaterThan(0)
    const main = (await page.getByRole('main').boundingBox())!
    await page.touchscreen.tap(main.x + 6, main.y + 300)
    await expect.poll(selected).toBe(0)
  })

  test('New line and tapping below add a paragraph', async ({ page }) => {
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

  test('shortcut hints show once a keyboard is used', async ({ page }) => {
    await openPage(page)
    const more = dockedBar(page).getByRole('button', { name: /^More/ })
    await more.click()
    await expect(tray(page).getByText(/Ctrl\+/)).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.locator('.bn-editor').click()
    await page.keyboard.press('Control+ArrowRight')
    await more.click()
    await expect(tray(page).getByText('Ctrl+Shift+S')).toBeVisible()
  })

  test('switching mode from the page menu', async ({ page }) => {
    await openPage(page)
    await pageAction(page, 'Switch to Pencil mode')
    // Pencil is docked on top too (always visible), but the position can change.
    await expect(dockedBar(page)).toHaveAttribute('data-placement', 'top')
    await dockedBar(page).getByRole('button', { name: 'Toolbar menu' }).click()
    await tray(page)
      .getByRole('button', { name: /^Edit bar/ })
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
        .getByRole('button', { name: 'Bold', exact: true })
        .boundingBox())!.height,
    ).toBeGreaterThanOrEqual(53.5)
    await pageAction(page, 'Switch to Computer mode')
    await expect(dockedBar(page)).toHaveCount(0)
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
  test('keeps the floating toolbar and no docked bar', async ({ page }) => {
    await openPage(page)
    await expect(dockedBar(page)).toHaveCount(0)
    await selectText(page, 'first')
    await expect(page.locator('.bn-formatting-toolbar')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Tap here to keep writing' }),
    ).toHaveCount(0)
  })

  test('the page menu switches to Touch mode', async ({ page }) => {
    await openPage(page)
    await pageAction(page, 'Switch to Touch mode')
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
      await selectText(page, 'first')
      await dockedBar(page).getByRole('button', { name: /^More/ }).click()
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
