// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { expectStrokes, inkNote, line, stroke, textBox } from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import { section, toolsReady } from './toolsHelpers.ts'

/**
 * Tools robustness, step 6: the soft refresh. "Refresh app" (settings menu)
 * saves, reloads and puts the place back: same page, same scroll, same tool,
 * text and ink saved. The automatic one runs only at a safe moment and at
 * most once every 10 minutes, and says so.
 */
test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const scrollTop = (page: Page) =>
  page.evaluate(
    () => document.querySelector('[data-page-scroller]')?.scrollTop ?? -1,
  )

/** A marker that disappears when the page reloads. */
const mark = (page: Page) =>
  page.evaluate(() => {
    ;(window as unknown as { __marker?: number }).__marker = 1
  })
/** True while the marker is there (false after a reload, or while one begins). */
const marked = (page: Page) =>
  page
    .evaluate(() => (window as unknown as { __marker?: number }).__marker === 1)
    .catch(() => false)

const refreshHooks = (page: Page) => ({
  soft: async () => {
    await toolsReady(page)
    return page.evaluate(() =>
      (
        window.__lnTools as unknown as {
          softRefresh: (why?: string) => boolean
        }
      ).softRefresh('test'),
    )
  },
})

async function longNote(page: Page) {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  await stroke(page, line([box.x + 20, box.y + 90], [box.x + 200, box.y + 100]))
  await expectStrokes(page, 1)
  await tool(page, 'Text').click()
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+End')
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line number ' + i)
  }
  await page.waitForTimeout(800)
}

test('Refresh app: same page, scroll, tool; text and ink saved', async ({
  page,
}) => {
  await longNote(page)
  await tool(page, 'Pen').click()
  await page.evaluate(() => {
    const s = document.querySelector('[data-page-scroller]')!
    s.scrollTop = 300
  })
  await page.waitForTimeout(300)
  const before = await scrollTop(page)
  expect(before).toBeGreaterThan(100)
  await mark(page)
  await page.getByTestId('corner-button').click()
  await page.getByTestId('refresh-app').click()
  await expect.poll(() => marked(page), { timeout: 20_000 }).toBe(false)
  await expect(page.locator('.bn-editor')).toContainText('Line number 39', {
    timeout: 20_000,
  })
  await expect(tool(page, 'Pen')).toHaveAttribute('aria-pressed', 'true')
  await expect
    .poll(async () => Math.abs((await scrollTop(page)) - before), {
      timeout: 10_000,
    })
    .toBeLessThan(20)
  await expectStrokes(page, 1)
  await expect(page.locator('.bn-editor')).toContainText('nucleus')
})

test('an automatic refresh waits for a lifted pointer, runs once, and says so', async ({
  page,
}) => {
  await inkNote(page, 'Lasso')
  await page.keyboard.press('Escape')
  const box = await textBox(page)
  const y = box.y + box.height + 60
  await stroke(page, line([box.x + 20, y], [box.x + 60, y + 6], 6), {
    keepDown: true,
    id: 71,
  })
  await mark(page)
  expect(await refreshHooks(page).soft()).toBe(true)
  // Not while a pointer is down.
  await page.waitForTimeout(1500)
  expect(await marked(page)).toBe(true)
  // The pointer is dropped by the machine (4 s): then it is a safe moment.
  await expect.poll(() => marked(page), { timeout: 20_000 }).toBe(false)
  await expect(page.getByText('App refreshed to fix a stuck tool')).toBeVisible(
    { timeout: 20_000 },
  )
  // At most once every 10 minutes.
  expect(await refreshHooks(page).soft()).toBe(false)
})

test('a heal that fails twice within a minute refreshes the app', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  await page.waitForTimeout(700)
  await toolsReady(page)
  await page.evaluate(() =>
    (
      window.__lnTools as unknown as { stick: { unhealable: () => void } }
    ).stick.unhealable(),
  )
  await mark(page)
  const run = () =>
    page.evaluate(() =>
      (
        window.__lnTools as unknown as { health: (r: string) => string[] }
      ).health('test'),
    )
  await run()
  expect(await marked(page)).toBe(true)
  // The reload may begin before this call has returned.
  await run().catch(() => {})
  await expect.poll(() => marked(page), { timeout: 20_000 }).toBe(false)
  await expect(page.getByText('App refreshed to fix a stuck tool')).toBeVisible(
    { timeout: 20_000 },
  )
  expect((await section(page, 'softRefresh')).capMin).toBe(10)
})
