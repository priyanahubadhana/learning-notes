// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  contrastOf,
  openPage,
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

/** After a reload: back to the page, and the bar is really drawn (not only "no pill"). */
async function reopenAndExpectBar(page: Page) {
  await page.goto('/?flags=toolbar.v8')
  await openPage(page, 'First')
  await hideSidebar(page)
  await expect(bar(page)).toBeVisible()
  await expect(pill(page)).toHaveCount(0)
}

/** Turns the bar off the way a person does: ⋯ then "Hide the tool bar" then Turn off. */
async function turnOff(page: Page) {
  await page.getByTestId('v8-more').click()
  await page.getByTestId('v8-more-hide').click()
  await page.getByRole('button', { name: 'Turn off' }).click()
  await expect(bar(page)).toHaveCount(0)
}

/**
 * Starts a clock inside the page: from the first key press or Pencil down to
 * the moment the bar is gone. Timed in the page, so a busy test machine cannot
 * make it slow (the 200 ms limit itself is never loosened).
 */
async function armTuckClock(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __tuckMs?: Promise<number> }
    w.__tuckMs = new Promise<number>((resolve) => {
      let t0: number | undefined
      const start = (e: Event) => {
        const pen =
          e.type === 'pointerdown' && (e as PointerEvent).pointerType === 'pen'
        if (t0 === undefined && (e.type === 'keydown' || pen)) t0 = e.timeStamp
      }
      addEventListener('keydown', start, true)
      addEventListener('pointerdown', start, true)
      const gone = () => {
        const el = document.querySelector('[data-testid="v8-bar"]')
        if (!el) return true
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return (
          r.width === 0 || cs.display === 'none' || cs.visibility === 'hidden'
        )
      }
      const done = () => {
        if (t0 === undefined || !gone()) return
        obs.disconnect()
        resolve(performance.now() - t0)
      }
      const obs = new MutationObserver(done)
      obs.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
      })
    })
  })
}

/** The bar went away within 200 ms of the key or Pencil, measured in the page. */
async function expectTuckedIn200(page: Page) {
  const ms = await page.evaluate(
    () => (window as unknown as { __tuckMs: Promise<number> }).__tuckMs,
  )
  expect(ms).toBeLessThan(200)
  await expect(bar(page)).toBeHidden()
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
  await armTuckClock(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
  await expectTuckedIn200(page)
  await expectPillOnScreen(page)
  await pill(page).click()
  await expect(bar(page)).toBeVisible()
  await expect(pill(page)).toHaveCount(0)
  await page.getByTestId('v8-tool-pen').click()
  await page.getByTestId('v8-tool-text').click()
  await page.locator('.bn-editor').first().click()
  await armTuckClock(page)
  await page.keyboard.type(' more')
  await expectTuckedIn200(page)
  await expectPillOnScreen(page)
})

test('TB-74 the Pencil down on the page tucks the bar away within 200 ms', async ({
  page,
}) => {
  await open(page, { 'toolbar.hideWhileWriting': true })
  await expect(bar(page)).toBeVisible()
  await armTuckClock(page)
  await page.locator('.bn-editor').first().dispatchEvent('pointerdown', {
    pointerType: 'pen',
    pointerId: 7,
    isPrimary: true,
    bubbles: true,
  })
  await expectTuckedIn200(page)
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

/** Why: the peek flag was cleared only when the peek ended, so choosing On in Settings during a peek hid the bar again on reload. */
test('TB-75 choosing On in Settings during a peek keeps the bar after a reload', async ({
  page,
}) => {
  await open(page)
  await turnOff(page)
  await pill(page).click()
  await expect(bar(page)).toBeVisible()
  await page.getByTestId('v8-more').click()
  await page.getByTestId('v8-more-settings').click()
  await page.getByRole('button', { name: /^Tool bar, / }).click()
  const row = page.locator('[data-setting-id="toolbar.show"]')
  await row.getByRole('button', { name: 'Off', exact: true }).click()
  await page.getByRole('button', { name: 'Turn off' }).click()
  await row.getByRole('button', { name: 'On', exact: true }).click()
  await expect(
    row.getByRole('button', { name: 'On', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  // The bar is still on: no "Show toolbar" pill after the reload (it shows only when the bar is off).
  await page.waitForTimeout(500)
  await expect(pill(page)).toHaveCount(0)
  await expect(
    page
      .locator('[data-setting-id="toolbar.show"]')
      .getByRole('button', { name: 'On', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await reopenAndExpectBar(page)
})

/** Why: changing the bar's place in Settings ends a peek too; the flag was left behind and a reload hid the bar. */
test('TB-75 changing the bar placement during a peek keeps the bar after a reload', async ({
  page,
}) => {
  await open(page)
  await turnOff(page)
  await pill(page).click()
  await expect(bar(page)).toBeVisible()
  await page.getByTestId('v8-more').click()
  await page.getByTestId('v8-more-settings').click()
  await page.getByRole('button', { name: /^Advanced/ }).click()
  const row = page.locator('[data-setting-id="advanced.barPlacement"]')
  await row.getByRole('button', { name: 'Bottom', exact: true }).click()
  await expect(
    row.getByRole('button', { name: 'Bottom', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await page.waitForTimeout(500)
  await expect(pill(page)).toHaveCount(0)
  await expect(
    page
      .locator('[data-setting-id="advanced.barPlacement"]')
      .getByRole('button', { name: 'Bottom', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await reopenAndExpectBar(page)
  const box = (await bar(page).boundingBox())!
  expect(box.y).toBeGreaterThan(page.viewportSize()!.height / 2)
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
  await armTuckClock(page)
  await page.locator('.bn-editor').first().click()
  await page.keyboard.type(' more')
  await expectTuckedIn200(page)
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
