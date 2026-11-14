// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, startInTheme } from './helpers.ts'

/**
 * SHOTS-only helper for P1.4 (the scroll bar look): the page bar at rest,
 * scrolled and dragged, the notebook sidebar and the tool bar menu, in light,
 * dark and sepia, on an iPad upright, sideways and a phone. Run with SHOTS=1
 * and `--timeout=180000` (SHOTS_DIR, SHOTS_TAG=after|before,
 * SHOTS_THEMES=dark,..., SHOTS_SIZES=...); without SHOTS no test is defined.
 * Before each shot the theme attribute and the page background are checked,
 * and toasts are closed.
 */
const SHOTS = process.env.SHOTS
const DIR = process.env.SHOTS_DIR ?? 'screenshots/p1-4-scroll-look'
const TAG = process.env.SHOTS_TAG ?? 'after'
const SIZES = {
  'ipad-upright': { width: 820, height: 1180 },
  'ipad-sideways': { width: 1180, height: 820 },
  phone: { width: 390, height: 844 },
} as const
const THEMES = { light: 'day', dark: 'night', sepia: 'sepia' } as const
const ONLY = (process.env.SHOTS_THEMES ?? 'light,dark,sepia').split(',')
const ONLY_SIZES = (
  process.env.SHOTS_SIZES ?? Object.keys(SIZES).join(',')
).split(',')
const ON = '/?flags=foundation.shell'

test.use({ deviceScaleFactor: 2 })

/** The theme is really on, the page background really dark/light/sepia, no toast open. */
async function ready(page: Page, attr: string) {
  await expect(page.locator('html')).toHaveAttribute('data-theme', attr)
  const bg = await page.evaluate(() => {
    const m = document.querySelector('main') ?? document.body
    return getComputedStyle(m).backgroundColor.match(/\d+/g)!.map(Number)
  })
  const mean = (bg[0] + bg[1] + bg[2]) / 3
  if (attr === 'night') expect(mean).toBeLessThan(60)
  else expect(mean).toBeGreaterThan(200)
  await expect(page.getByRole('status')).toHaveCount(0)
  await page.waitForTimeout(250)
}

// Without SHOTS the file still holds one test (an empty file is an error): the picture plan is complete.
test('picture plan covers 3 sizes and 3 themes', () => {
  expect(Object.keys(SIZES)).toHaveLength(3)
  expect(Object.keys(THEMES)).toHaveLength(3)
})

for (const [sizeName, size] of Object.entries(SIZES)) {
  if (!SHOTS || !ONLY_SIZES.includes(sizeName)) continue
  for (const [label, attr] of Object.entries(THEMES)) {
    if (!ONLY.includes(label)) continue
    test(`shots ${sizeName} ${label}`, async ({ page }) => {
      await page.setViewportSize(size)
      await startInMode(page, 'pencil')
      await startInTheme(page, attr)
      await page.goto(ON)
      for (let i = 1; i <= 2; i++)
        await createNotebook(page, `Book ${i}`, `Page ${i}`)
      const main = page.locator('main[data-page-scroller]')
      await expect(main).toBeVisible()
      await main.evaluate((el) => {
        const f = document.createElement('div')
        f.style.height = '5000px'
        el.appendChild(f)
      })
      const thumb = page.locator('[data-pagebar-thumb]')
      const hasBar = await thumb
        .waitFor({ timeout: 4000 })
        .then(() => true)
        .catch(() => false)
      const name = (what: string) =>
        `${DIR}/${TAG}-${what}-${sizeName}-${label}.png`
      // The bar edge, zoomed: the strip along the page's right edge.
      const clipAt = async () => {
        const b = (await page.locator('[data-pagebar-root]').boundingBox())!
        const x = Math.max(0, b.x - 160)
        return {
          x,
          y: b.y,
          width: Math.min(size.width - x, 200),
          height: Math.min(360, b.height),
        }
      }

      await page.mouse.move(5, 5)
      await ready(page, attr)
      await page.screenshot({ path: name('page-rest') })
      if (hasBar) {
        await page.screenshot({
          path: name('bar-rest-zoom'),
          clip: await clipAt(),
        })

        await main.evaluate((el) => (el.scrollTop = 1400))
        await page.waitForTimeout(250)
        await page.screenshot({ path: name('page-scrolled') })

        // Hover, then drag, the thumb.
        const b = (await thumb.boundingBox())!
        const at = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
        await page.mouse.move(at.x, at.y)
        await page.waitForTimeout(300)
        await page.screenshot({
          path: name('bar-hover-zoom'),
          clip: await clipAt(),
        })
        await page.mouse.down()
        await page.mouse.move(at.x, at.y + 60, { steps: 4 })
        await page.waitForTimeout(300)
        await page.screenshot({ path: name('page-dragging') })
        await page.screenshot({
          path: name('bar-drag-zoom'),
          clip: await clipAt(),
        })
        await page.mouse.up()
        await page.mouse.move(5, 5)
      }

      // The tool bar ⋯ menu over the page (the menu's own list shows one bar).
      await main.evaluate((el) => (el.scrollTop = 0))
      await page.getByRole('button', { name: 'Toolbar menu' }).first().click()
      await expect(
        page.getByRole('button', { name: /^Edit toolbar/ }).first(),
      ).toBeVisible()
      await page.waitForTimeout(300)
      await page.screenshot({ path: name('toolbar-menu') })
      await page.keyboard.press('Escape')

      // The notebook sidebar (a drawer on a phone, docked on a wide iPad).
      const rail = page.getByRole('navigation', { name: 'Spaces' })
      if (await rail.isVisible().catch(() => false))
        await rail.locator('[data-space="notebooks"]').click()
      const side = page.locator('aside#sidebar')
      if (await side.isVisible().catch(() => false)) {
        // Enough rows to overflow (copies of the first row, for the picture only).
        await side
          .locator('[data-notebook-row]')
          .first()
          .evaluate((row) => {
            for (let i = 3; i <= 16; i++) {
              const c = row.cloneNode(true) as HTMLElement
              for (const n of Array.from(c.querySelectorAll('*')))
                if (n.children.length === 0 && n.textContent === 'Book 1')
                  n.textContent = `Book ${i}`
              row.parentElement!.appendChild(c)
            }
          })
        await page.waitForTimeout(300)
        await page.screenshot({ path: name('sidebar') })
      }
    })
  }
}
