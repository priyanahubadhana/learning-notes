import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'
import {
  barTool,
  readSwitch,
  showReadTools,
  writeBook,
} from './readingHelpers.ts'

/**
 * Slice 0h, flag ON: the reader's bar is fixed across the top of the window,
 * the new top bar's menu buttons sit under it. Owner rule: the menu (sidebar)
 * button and the pages-panel button never overlap, or sit under, ✕ Exit reading.
 */
const ON = '/?flags=foundation.shell'

const sizes = [
  { name: 'iPad landscape', width: 1180, height: 820, touch: true },
  { name: 'iPad portrait', width: 820, height: 1180, touch: true },
  { name: 'phone', width: 390, height: 844, touch: true },
]

const rectOf = async (el: Locator) => {
  const b = await el.boundingBox()
  expect(b).not.toBeNull()
  return b!
}

for (const s of sizes) {
  test.describe(`${s.name} (${s.width}x${s.height})`, () => {
    test.use({
      viewport: { width: s.width, height: s.height },
      hasTouch: s.touch,
      isMobile: s.width < 600,
    })

    test('✕ Exit reading and the menu buttons never overlap, and Exit takes the first tap', async ({
      page,
    }: {
      page: Page
    }) => {
      await showReadTools(page)
      // Pinned open, so the full bar is what is measured (it otherwise hides while scrolling).
      await page.addInitScript(() =>
        localStorage.setItem('learning-notes:reading.barPin', '"on"'),
      )
      await page.goto(ON)
      await expect(page.locator('.sh-frame')).toBeVisible()
      await createNotebook(page, 'Heart', 'Cardiology book')
      await writeBook(page, 3)
      await readSwitch(page).tap()
      const exit = barTool(page, 'Exit reading')
      await expect(exit).toBeVisible()
      const leads = page.locator('header[data-shell-top] [data-lead]')
      await expect(leads.first()).toBeAttached()
      const e = await rectOf(exit)
      let shown = 0
      for (const lead of await leads.all()) {
        if (!(await lead.isVisible())) continue
        shown++
        const l = await rectOf(lead)
        const apart =
          l.x + l.width <= e.x ||
          e.x + e.width <= l.x ||
          l.y + l.height <= e.y ||
          e.y + e.height <= l.y
        expect(
          apart,
          `lead button at ${l.x},${l.y} vs Exit at ${e.x},${e.y}`,
        ).toBe(true)
      }
      expect(shown).toBeGreaterThan(0)
      // The Exit button is fully on screen.
      expect(e.x).toBeGreaterThanOrEqual(0)
      expect(e.x + e.width).toBeLessThanOrEqual(s.width)
      // The first tap on it leaves reading (nothing else takes it).
      await exit.tap()
      await expect(page.getByTestId('reader-controls')).toHaveCount(0)
    })
  })
}
