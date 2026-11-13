// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  contrastOf,
  createNotebook,
  hideSidebar,
  startInMode,
  startInTheme,
  typeInEditor,
} from './helpers.ts'

/** Toolbar v8, BUG-003 (TB-74, TB-75): Hide toolbar while writing and the one Show toolbar pill. */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

async function open(
  page: Page,
  keys: Record<string, unknown> = {},
  theme: 'day' | 'night' | 'sepia' = 'day',
) {
  await page.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem('learning-notes:' + key, JSON.stringify(value))
    }
  }, keys)
  await startInTheme(page, theme)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await hideSidebar(page)
}

const bar = (page: Page) => page.getByTestId('v8-bar')
const pill = (page: Page) => page.getByTestId('show-tool-bar')

/** Turns the bar off the way a person does: ⋯ then "Hide the tool bar" then Turn off. */
async function turnOff(page: Page) {
  await page.getByTestId('v8-more').click()
  await page.getByTestId('v8-more-hide').click()
  await page.getByRole('button', { name: 'Turn off' }).click()
  await expect(bar(page)).toHaveCount(0)
}

/** The pill is whole, 44 pt high and inside the screen (after its 150 ms slide-in). */
async function expectPillOnScreen(page: Page) {
  await expect(pill(page)).toBeVisible()
  await expect(async () => {
    const r = (await pill(page).boundingBox())!
    const vp = page.viewportSize()!
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.y).toBeGreaterThanOrEqual(0)
    expect(r.x + r.width).toBeLessThanOrEqual(vp.width + 0.5)
    expect(r.height).toBeGreaterThanOrEqual(44)
  }).toPass()
}

test('TB-74 setting on: typing tucks the bar away within 200 ms; the pill brings it back; a tool and more typing hide it again', async ({
  page,
}) => {
  await open(page, { 'toolbar.hideWhileWriting': true })
  await expect(bar(page)).toBeVisible()
  await expect(pill(page)).toHaveCount(0)
  await typeInEditor(page, 'The nucleus holds the DNA')
  await expect(bar(page)).toBeHidden({ timeout: 200 })
  await expectPillOnScreen(page)
  await pill(page).click()
  await expect(bar(page)).toBeVisible()
  await expect(pill(page)).toHaveCount(0)
  await page.getByTestId('v8-tool-pen').click()
  await page.getByTestId('v8-tool-text').click()
  await page.locator('.bn-editor').first().click()
  await page.keyboard.type(' more')
  await expect(bar(page)).toBeHidden({ timeout: 200 })
  await expectPillOnScreen(page)
})

test('TB-74 the Pencil down on the page tucks the bar away within 200 ms', async ({
  page,
}) => {
  await open(page, { 'toolbar.hideWhileWriting': true })
  await expect(bar(page)).toBeVisible()
  await page.locator('.bn-editor').first().dispatchEvent('pointerdown', {
    pointerType: 'pen',
    pointerId: 7,
    isPrimary: true,
    bubbles: true,
  })
  await expect(bar(page)).toBeHidden({ timeout: 200 })
  await expectPillOnScreen(page)
})

test('TB-75 a reload during a peek keeps the bar turned off in Settings', async ({
  page,
}) => {
  await open(page)
  await turnOff(page)
  await pill(page).click()
  await expect(bar(page)).toBeVisible()
  await page.reload()
  await expect(bar(page)).toHaveCount(0)
  await expectPillOnScreen(page)
  await page.reload()
  await expect(bar(page)).toHaveCount(0)
})

test('TB-74 setting off (the default): typing leaves the bar alone and no pill shows', async ({
  page,
}) => {
  await open(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
  await expect(bar(page)).toBeVisible()
  await expect(pill(page)).toHaveCount(0)
})

test('TB-75 bar turned off: the pill is always there; Show brings the bar; a tool and writing hide it again', async ({
  page,
}) => {
  await open(page)
  await turnOff(page)
  await expectPillOnScreen(page)
  await pill(page).click()
  await expect(bar(page)).toBeVisible()
  await typeInEditor(page, 'The nucleus holds the DNA')
  // No tool used yet: the bar stays.
  await expect(bar(page)).toBeVisible()
  await page.getByTestId('v8-tool-pen').click()
  await page.getByTestId('v8-tool-text').click()
  await page.locator('.bn-editor').first().click()
  await page.keyboard.type(' more')
  await expect(bar(page)).toBeHidden({ timeout: 200 })
  await expectPillOnScreen(page)
})

for (const theme of ['day', 'night', 'sepia'] as const) {
  test(`BUG-003 the pill is readable in ${theme} and inside the screen`, async ({
    page,
  }) => {
    await open(page, {}, theme)
    await turnOff(page)
    await expectPillOnScreen(page)
    expect(await contrastOf(pill(page))).toBeGreaterThanOrEqual(4.5)
  })
}

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('BUG-003 phone: the pill is inside the screen', async ({ page }) => {
    await open(page)
    await turnOff(page)
    await expectPillOnScreen(page)
  })
})
