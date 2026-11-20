// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { start, rect } from './cBoxesHelpers.ts'

/**
 * C0-1 first-look pictures: an empty page whose "Use for new boxes" style is
 * set, after a Text-tool tap at the top: the page's first box wears the style.
 * Light and dark; iPad upright, iPad sideways, phone. Written to
 * screenshots/c0-1/<project>/ (see its INDEX.md).
 */
test.use({ hasTouch: true, deviceScaleFactor: 2 })

const OUT = () => 'screenshots/c0-1/' + test.info().project.name
const THEMES = ['light', 'dark'] as const
const SIZES: [string, { width: number; height: number }][] = [
  ['ipad-upright', { width: 834, height: 1194 }],
  ['ipad-sideways', { width: 1194, height: 834 }],
  ['phone', { width: 390, height: 844 }],
]
const MAIN = '[data-paper-box="main"]'

async function setStyle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const tx = open.result.transaction('settings', 'readwrite')
          tx.objectStore('settings').put({
            id: 'paper.boxStyleDefault',
            value: { bg: 'lime', border: 'lime', radius: 12 },
            updatedAt: Date.now(),
            v: 1,
          })
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        }
      }),
  )
}

for (const theme of THEMES)
  for (const [name, size] of SIZES)
    test(`C0-1 pictures: ${theme} ${name}`, async ({ page }) => {
      mkdirSync(OUT(), { recursive: true })
      await page.setViewportSize(size)
      await start(page, 'Shots', false)
      await setStyle(page)
      await page.evaluate(
        (th) => document.documentElement.setAttribute('data-theme', th),
        theme === 'dark' ? 'night' : 'day',
      )
      const text = page
        .getByRole('button', { name: 'Text', exact: true })
        .first()
      if ((await text.getAttribute('aria-pressed')) !== 'true')
        await text.click()
      const first = await rect(
        page.locator(MAIN).locator('.bn-block-content').first(),
      )
      await page.touchscreen.tap(first.x + 6, first.y + 8)
      await expect(page.locator(MAIN + ' .bn-editor')).toBeFocused()
      // The style is on the box: its fill is no longer the page colour.
      await expect
        .poll(() =>
          page
            .locator(MAIN)
            .evaluate((el) => getComputedStyle(el).backgroundColor),
        )
        .not.toBe('rgba(0, 0, 0, 0)')
      await page.screenshot({ path: `${OUT()}/${theme}-${name}.png` })
    })
