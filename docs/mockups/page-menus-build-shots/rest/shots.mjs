// Takes the pictures for slice 12 rest (strip, Paste ▾, page more-menu sheet).
// Run: PORT=5313 node docs/mockups/page-menus-build-shots/rest/shots.mjs  (needs `npm run preview -- --port 5313`)
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = dirname(fileURLToPath(import.meta.url))
const BASE = `http://localhost:${process.env.PORT ?? 5313}`
const SIZES = {
  ipadL: { width: 1180, height: 820 },
  ipadP: { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
  pc: { width: 1440, height: 900 },
}
const THEMES = ['day', 'night', 'sepia']
const LEVELS = ['beginner', 'professional']
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
for (const [sizeName, viewport] of Object.entries(SIZES)) {
  for (const theme of THEMES) {
    for (const level of LEVELS) {
      const ctx = await browser.newContext({ viewport })
      await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
      const page = await ctx.newPage()
      await page.addInitScript(
        ([l, th]) => {
          localStorage.setItem(
            'learning-notes:level',
            JSON.stringify({ level: l, unlocked: [] }),
          )
          localStorage.setItem('learning-notes:theme', JSON.stringify(th))
        },
        [level, theme],
      )
      await page.goto(`${BASE}/?flags=page.menus`)
      await page.getByRole('button', { name: 'Create notebook' }).click()
      await page.waitForTimeout(800)
      // Name sheet / rename flows differ per size; the first page opens by itself.
      const editor = page.locator('.bn-editor').first()
      await editor.click()
      await page.keyboard.type('Cells divide by mitosis. Chromosomes line up first.')
      const tag = `${sizeName}-${theme}-${level}`
      // Strip: right-click the first line.
      const box = await page.locator('.bn-editor p').first().boundingBox()
      await page.mouse.click(box.x + 60, box.y + box.height / 2, {
        button: 'right',
      })
      await page.getByTestId('page-strip').waitFor({ timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(300)
      await page.screenshot({ path: join(OUT, `strip-${tag}.png`) })
      // Paste ▾ card.
      await page.getByTestId('cs-paste').click().catch(() => {})
      await page.waitForTimeout(300)
      await page.screenshot({ path: join(OUT, `paste-${tag}.png`) })
      await page.keyboard.press('Escape')
      // Page more-menu sheet.
      await page.getByRole('button', { name: 'More options' }).click().catch(() => {})
      await page.getByTestId('page-sheet').waitFor({ timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(500)
      await page.screenshot({ path: join(OUT, `sheet-${tag}.png`) })
      await ctx.close()
    }
  }
}
await browser.close()
